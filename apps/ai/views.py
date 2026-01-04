import logging
from calendar import monthrange
from datetime import date, timedelta

from django.conf import settings
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.finance.default_categories import (
    get_default_expense_category_names,
    get_default_income_category_names,
)
from apps.finance.models import Budget, Category, Transaction

from .models import AIUsageLog, ChatConversation, ChatMessage
from .services import (
    ChatResponse,
    categorize_transaction_text,
    get_llm_base_url,
    get_llm_model,
    get_llm_provider,
    generate_cashflow_forecast,
    generate_budget_check,
    generate_chat_response,
    generate_monthly_insights,
    is_ollama_available,
    parse_transaction_text,
)

logger = logging.getLogger(__name__)


def _add_months(value: date, months: int) -> date:
    total_months = value.month - 1 + months
    year = value.year + total_months // 12
    month = total_months % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def _get_budget_period_range(start_date: date, period_type: str, today: date) -> tuple[date, date]:
    if today < start_date:
        if period_type == Budget.PeriodType.WEEKLY:
            period_start = start_date
            period_end = start_date + timedelta(days=6)
        elif period_type == Budget.PeriodType.MONTHLY:
            period_start = start_date
            period_end = _add_months(start_date, 1) - timedelta(days=1)
        else:
            period_start = start_date
            period_end = _add_months(start_date, 12) - timedelta(days=1)
        return period_start, period_end

    if period_type == Budget.PeriodType.WEEKLY:
        weeks = (today - start_date).days // 7
        period_start = start_date + timedelta(days=weeks * 7)
        period_end = period_start + timedelta(days=6)
        return period_start, period_end

    if period_type == Budget.PeriodType.MONTHLY:
        months = (today.year - start_date.year) * 12 + (today.month - start_date.month)
        period_start = _add_months(start_date, months)
        if period_start > today:
            period_start = _add_months(period_start, -1)
        period_end = _add_months(period_start, 1) - timedelta(days=1)
        return period_start, period_end

    years = today.year - start_date.year
    period_start = _add_months(start_date, years * 12)
    if period_start > today:
        period_start = _add_months(period_start, -12)
    period_end = _add_months(period_start, 12) - timedelta(days=1)
    return period_start, period_end


@api_view(["GET"])
@permission_classes([AllowAny])
def healthcheck(request):
    """Healthcheck endpoint - verifica se o servidor está funcionando."""
    from .services import get_available_models

    llm_ok = is_ollama_available()
    models = get_available_models() if llm_ok else []

    return Response(
        {
            "status": "ok",
            "service": "agenda-ia-api",
            "version": "1.0.0",
            "llm": {
                "provider": get_llm_provider(),
                "available": llm_ok,
                "url": get_llm_base_url(),
                "model": get_llm_model(),
                "installed_models": models,
            },
        }
    )


def check_rate_limit(user) -> tuple[bool, int]:
    """
    Verifica rate limit do usuário.
    Returns: (is_allowed, requests_remaining)
    """
    one_hour_ago = timezone.now() - timedelta(hours=1)
    usage_count = AIUsageLog.objects.filter(
        user=user,
        created_at__gte=one_hour_ago,
    ).count()

    remaining = settings.AI_RATE_LIMIT_PER_HOUR - usage_count
    return remaining > 0, max(0, remaining)


def log_ai_usage(user, feature, input_text, usage_info, success=True, error_message=""):
    """Registra uso da IA para controle de custos."""
    AIUsageLog.objects.create(
        user=user,
        feature=feature,
        input_text=input_text[:500],  # Limita tamanho
        input_chars=len(input_text),
        output_chars=usage_info.get("output_tokens", 0) * 4,  # ~4 chars por token
        model_name=usage_info.get("model", get_llm_model()),
        success=success,
        error_message=error_message,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def parse_transaction(request):
    """
    Recebe texto livre e retorna proposta de transação.

    Input:
        {"text": "paguei 38,90 em cordas hoje no pix"}

    Output:
        {
            "type": "EXPENSE",
            "amount": 38.90,
            "date": "2026-01-02",
            "category_suggestion": "Instrumentos",
            "account_suggestion": "PIX",
            "description": "Cordas",
            "confidence": 0.86
        }
    """
    text = request.data.get("text", "").strip()

    # Validações
    if not text:
        return Response(
            {"error": "O campo 'text' é obrigatório"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(text) > settings.AI_MAX_INPUT_CHARS:
        return Response(
            {"error": f"Texto muito longo. Máximo: {settings.AI_MAX_INPUT_CHARS} caracteres"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Rate limiting
    is_allowed, remaining = check_rate_limit(request.user)
    if not is_allowed:
        return Response(
            {
                "error": "Limite de requisições atingido. Tente novamente em 1 hora.",
                "rate_limit": settings.AI_RATE_LIMIT_PER_HOUR,
                "remaining": 0,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Verifica se LLM está disponível
    if not is_ollama_available():
        return Response(
            {"error": "LLM não está disponível. Verifique a configuração."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        expense_categories = list(
            Category.objects.filter(
                user=request.user,
                category_type=Category.CategoryType.EXPENSE,
            ).values_list("name", flat=True)
        )
        income_categories = list(
            Category.objects.filter(
                user=request.user,
                category_type=Category.CategoryType.INCOME,
            ).values_list("name", flat=True)
        )

        if not expense_categories:
            expense_categories = get_default_expense_category_names()
        if not income_categories:
            income_categories = get_default_income_category_names()

        # Chama serviço de IA
        proposal, usage_info = parse_transaction_text(
            text,
            expense_categories=expense_categories,
            income_categories=income_categories,
        )

        # Log de uso
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.PARSE_TRANSACTION,
            input_text=text,
            usage_info=usage_info,
        )

        # Converte dataclass para dict
        response_data = {
            "type": proposal.transaction_type,
            "amount": float(proposal.amount),
            "date": proposal.date,
            "description": proposal.description,
            "category_suggestion": proposal.category_suggestion,
            "account_suggestion": proposal.account_suggestion,
            "confidence": proposal.confidence,
        }

        return Response(
            {
                "proposal": response_data,
                "usage": {
                    "tokens_used": usage_info.get("total_tokens", 0),
                    "requests_remaining": remaining - 1,
                },
            }
        )

    except ValueError as e:
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.PARSE_TRANSACTION,
            input_text=text,
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": str(e)},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    except Exception as e:
        logger.exception("Erro no parse_transaction")
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.PARSE_TRANSACTION,
            input_text=text,
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": "Erro interno ao processar transação"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def insights(request):
    """
    Gera insights do mês baseado nas transações.

    Input:
        {"month": "2026-01"}

    Output:
        {
            "summary": "...",
            "total_income": 5000.0,
            "total_expenses": 3000.0,
            "balance": 2000.0,
            "top_expenses": [...],
            "recommendations": [...]
        }
    """
    month = request.data.get("month")

    if not month:
        return Response(
            {"error": "O campo 'month' é obrigatório (YYYY-MM)"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Valida formato do mês
    try:
        year, month_num = month.split("-")
        year = int(year)
        month_num = int(month_num)
        if month_num < 1 or month_num > 12:
            raise ValueError("Mês inválido")
    except (ValueError, AttributeError):
        return Response(
            {"error": "Formato inválido. Use YYYY-MM"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Rate limiting
    is_allowed, remaining = check_rate_limit(request.user)
    if not is_allowed:
        return Response(
            {
                "error": "Limite de requisições atingido. Tente novamente em 1 hora.",
                "rate_limit": settings.AI_RATE_LIMIT_PER_HOUR,
                "remaining": 0,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Verifica se LLM está disponível
    if not is_ollama_available():
        return Response(
            {"error": "LLM não está disponível. Verifique a configuração."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Busca dados do mês
    transactions = Transaction.objects.filter(
        user=request.user,
        date__year=year,
        date__month=month_num,
        is_confirmed=True,
    )

    income = (
        transactions.filter(
            transaction_type=Transaction.TransactionType.INCOME
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    expenses = (
        transactions.filter(
            transaction_type=Transaction.TransactionType.EXPENSE
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    balance = float(income) - float(expenses)

    # Top categorias de gasto
    top_categories = list(
        transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE)
        .values("category__name")
        .annotate(total=Sum("amount"))
        .order_by("-total")[:5]
    )

    # Se não há transações, retorna dados básicos sem chamar IA
    if not transactions.exists():
        return Response(
            {
                "month": month,
                "summary": "Nenhuma transação registrada neste mês.",
                "total_income": 0,
                "total_expenses": 0,
                "balance": 0,
                "top_expenses": [],
                "recommendations": ["Comece registrando suas transações para obter insights personalizados."],
                "usage": {"tokens_used": 0, "requests_remaining": remaining},
            }
        )

    try:
        # Chama serviço de IA
        insights_data, usage_info = generate_monthly_insights(
            month=month,
            income=float(income),
            expenses=float(expenses),
            balance=balance,
            top_categories=top_categories,
        )

        # Log de uso
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.INSIGHTS,
            input_text=f"Insights {month}",
            usage_info=usage_info,
        )

        return Response(
            {
                "month": month,
                "summary": insights_data.summary,
                "total_income": float(income),
                "total_expenses": float(expenses),
                "balance": balance,
                "top_expenses": [
                    {"category": cat.get("category__name") or "Sem categoria", "total": float(cat.get("total", 0))}
                    for cat in top_categories
                ],
                "recommendations": insights_data.recommendations,
                "usage": {
                    "tokens_used": usage_info.get("total_tokens", 0),
                    "requests_remaining": remaining - 1,
                },
            }
        )

    except ValueError as e:
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.INSIGHTS,
            input_text=f"Insights {month}",
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": str(e)},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    except Exception as e:
        logger.exception("Erro no insights")
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.INSIGHTS,
            input_text=f"Insights {month}",
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": "Erro interno ao gerar insights"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def categorize(request):
    """
    Sugere categoria para um texto de transação.

    Input:
        {"text": "...", "category_type": "EXPENSE"}
    """
    text = request.data.get("text", "").strip()
    category_type = request.data.get("category_type")

    if not text:
        return Response(
            {"error": "O campo 'text' é obrigatório"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(text) > settings.AI_MAX_INPUT_CHARS:
        return Response(
            {"error": f"Texto muito longo. Máximo: {settings.AI_MAX_INPUT_CHARS} caracteres"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    is_allowed, remaining = check_rate_limit(request.user)
    if not is_allowed:
        return Response(
            {
                "error": "Limite de requisições atingido. Tente novamente em 1 hora.",
                "rate_limit": settings.AI_RATE_LIMIT_PER_HOUR,
                "remaining": 0,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if not is_ollama_available():
        return Response(
            {"error": "LLM não está disponível. Verifique a configuração."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    categories_qs = Category.objects.filter(user=request.user)
    if category_type in [Category.CategoryType.INCOME, Category.CategoryType.EXPENSE]:
        categories_qs = categories_qs.filter(category_type=category_type)

    category_names = list(categories_qs.values_list("name", flat=True))
    if not category_names:
        if category_type == Category.CategoryType.INCOME:
            category_names = get_default_income_category_names()
        else:
            category_names = get_default_expense_category_names()

    try:
        suggestion, confidence, usage_info = categorize_transaction_text(
            text, category_names
        )

        category_obj = None
        if suggestion:
            category_obj = categories_qs.filter(name__iexact=suggestion).first()

        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.CATEGORIZE,
            input_text=text,
            usage_info=usage_info,
        )

        return Response(
            {
                "suggestion": {
                    "id": category_obj.id if category_obj else None,
                    "name": suggestion,
                },
                "confidence": confidence,
                "usage": {
                    "tokens_used": usage_info.get("total_tokens", 0),
                    "requests_remaining": remaining - 1,
                },
            }
        )
    except ValueError as e:
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.CATEGORIZE,
            input_text=text,
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": str(e)},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    except Exception as e:
        logger.exception("Erro no categorize")
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.CATEGORIZE,
            input_text=text,
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": "Erro interno ao sugerir categoria"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def forecast(request):
    """
    Gera previsão de fluxo de caixa baseada nos últimos meses.

    Input:
        {"months": 3}
    """
    months = request.data.get("months", 3)
    try:
        months = int(months)
        if months <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response(
            {"error": "O campo 'months' deve ser um inteiro positivo."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    is_allowed, remaining = check_rate_limit(request.user)
    if not is_allowed:
        return Response(
            {
                "error": "Limite de requisições atingido. Tente novamente em 1 hora.",
                "rate_limit": settings.AI_RATE_LIMIT_PER_HOUR,
                "remaining": 0,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if not is_ollama_available():
        return Response(
            {"error": "LLM não está disponível. Verifique a configuração."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    today = timezone.localdate()
    history = []
    for offset in range(months):
        month_date = _add_months(today.replace(day=1), -offset)
        year = month_date.year
        month_num = month_date.month

        transactions = Transaction.objects.filter(
            user=request.user,
            date__year=year,
            date__month=month_num,
            is_confirmed=True,
        )
        income = (
            transactions.filter(transaction_type=Transaction.TransactionType.INCOME)
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )
        expenses = (
            transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE)
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )

        history.append(
            {
                "month": f"{year}-{month_num:02d}",
                "income": float(income),
                "expenses": float(expenses),
                "balance": float(income) - float(expenses),
            }
        )

    history = list(reversed(history))

    if not any(item["income"] or item["expenses"] for item in history):
        return Response(
            {
                "history": history,
                "forecast": {
                    "summary": "Sem histórico suficiente para previsão.",
                    "forecast_income": 0,
                    "forecast_expenses": 0,
                    "forecast_balance": 0,
                    "recommendations": [
                        "Registre mais transações para liberar previsões personalizadas."
                    ],
                },
                "usage": {"tokens_used": 0, "requests_remaining": remaining},
            }
        )

    try:
        forecast_data, usage_info = generate_cashflow_forecast(history)

        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.FORECAST,
            input_text=f"Forecast últimos {months} meses",
            usage_info=usage_info,
        )

        return Response(
            {
                "history": history,
                "forecast": {
                    "summary": forecast_data.summary,
                    "forecast_income": forecast_data.forecast_income,
                    "forecast_expenses": forecast_data.forecast_expenses,
                    "forecast_balance": forecast_data.forecast_balance,
                    "recommendations": forecast_data.recommendations,
                },
                "usage": {
                    "tokens_used": usage_info.get("total_tokens", 0),
                    "requests_remaining": remaining - 1,
                },
            }
        )
    except ValueError as e:
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.FORECAST,
            input_text=f"Forecast últimos {months} meses",
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": str(e)},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    except Exception as e:
        logger.exception("Erro no forecast")
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.FORECAST,
            input_text=f"Forecast últimos {months} meses",
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": "Erro interno ao gerar previsão"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def budget_check(request):
    """
    Analisa orçamentos e gera recomendações.
    """
    is_allowed, remaining = check_rate_limit(request.user)
    if not is_allowed:
        return Response(
            {
                "error": "Limite de requisições atingido. Tente novamente em 1 hora.",
                "rate_limit": settings.AI_RATE_LIMIT_PER_HOUR,
                "remaining": 0,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if not is_ollama_available():
        return Response(
            {"error": "LLM não está disponível. Verifique a configuração."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    today = timezone.localdate()
    budgets = (
        Budget.objects.filter(user=request.user, is_active=True)
        .filter(Q(end_date__isnull=True) | Q(end_date__gte=today))
        .select_related("category")
    )

    if not budgets.exists():
        return Response(
            {
                "summary": "Nenhum orçamento ativo cadastrado.",
                "alerts": [],
                "recommendations": [
                    "Crie orçamentos para receber recomendações personalizadas."
                ],
                "budgets": [],
                "usage": {"tokens_used": 0, "requests_remaining": remaining},
            }
        )

    status_list = []
    for budget in budgets:
        period_start, period_end = _get_budget_period_range(
            budget.start_date, budget.period_type, today
        )
        spent = (
            Transaction.objects.filter(
                user=request.user,
                transaction_type=Transaction.TransactionType.EXPENSE,
                category=budget.category,
                date__gte=period_start,
                date__lte=period_end,
                is_confirmed=True,
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )
        percentage = float((spent / budget.amount) * 100) if budget.amount else 0.0
        status_list.append(
            {
                "id": budget.id,
                "category": budget.category_id,
                "category_name": budget.category.name,
                "amount": float(budget.amount),
                "spent": float(spent),
                "remaining": float(budget.amount - spent),
                "percentage_used": round(percentage, 2),
                "alert_threshold": budget.alert_threshold,
                "alert_reached": percentage >= budget.alert_threshold,
                "period_type": budget.period_type,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
            }
        )

    try:
        budget_data, usage_info = generate_budget_check(status_list)

        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.BUDGET_CHECK,
            input_text="Budget check",
            usage_info=usage_info,
        )

        return Response(
            {
                "summary": budget_data.summary,
                "alerts": budget_data.alerts,
                "recommendations": budget_data.recommendations,
                "budgets": status_list,
                "usage": {
                    "tokens_used": usage_info.get("total_tokens", 0),
                    "requests_remaining": remaining - 1,
                },
            }
        )
    except ValueError as e:
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.BUDGET_CHECK,
            input_text="Budget check",
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": str(e)},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    except Exception as e:
        logger.exception("Erro no budget_check")
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.BUDGET_CHECK,
            input_text="Budget check",
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": "Erro interno ao analisar orçamentos"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chat(request):
    """
    Chat financeiro com contexto do usuário.

    Input:
        {"message": "...", "conversation_id": 1}
    """
    message = request.data.get("message", "").strip()
    conversation_id = request.data.get("conversation_id")

    if not message:
        return Response(
            {"error": "O campo 'message' é obrigatório"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(message) > settings.AI_MAX_INPUT_CHARS:
        return Response(
            {"error": f"Texto muito longo. Máximo: {settings.AI_MAX_INPUT_CHARS} caracteres"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Rate limiting
    is_allowed, remaining = check_rate_limit(request.user)
    if not is_allowed:
        return Response(
            {
                "error": "Limite de requisições atingido. Tente novamente em 1 hora.",
                "rate_limit": settings.AI_RATE_LIMIT_PER_HOUR,
                "remaining": 0,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Verifica se IA está disponível
    if not is_ollama_available():
        return Response(
            {"error": "LLM não está disponível. Verifique a configuração."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    conversation = None
    if conversation_id:
        conversation = ChatConversation.objects.filter(
            user=request.user, id=conversation_id
        ).first()
        if not conversation:
            return Response(
                {"error": "Conversa não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

    if not conversation:
        title = message[:60].strip()
        conversation = ChatConversation.objects.create(
            user=request.user,
            title=title or "Nova conversa",
        )

    history_messages = (
        conversation.messages.order_by("-created_at")[:10]
    )
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(history_messages)
    ]

    try:
        chat_response: ChatResponse = generate_chat_response(
            request.user, message, history
        )

        ChatMessage.objects.create(
            conversation=conversation,
            role=ChatMessage.Role.USER,
            content=message,
            tokens_used=0,
        )
        ChatMessage.objects.create(
            conversation=conversation,
            role=ChatMessage.Role.ASSISTANT,
            content=chat_response.message,
            tokens_used=chat_response.usage_info.get("output_tokens", 0),
        )
        conversation.save(update_fields=["updated_at"])

        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.CHAT,
            input_text=message,
            usage_info=chat_response.usage_info,
        )

        return Response(
            {
                "conversation_id": conversation.id,
                "message": chat_response.message,
                "usage": {
                    "tokens_used": chat_response.usage_info.get("total_tokens", 0),
                    "requests_remaining": remaining - 1,
                },
            }
        )

    except Exception as e:
        logger.exception("Erro no chat")
        log_ai_usage(
            user=request.user,
            feature=AIUsageLog.Feature.CHAT,
            input_text=message,
            usage_info={"model": get_llm_model()},
            success=False,
            error_message=str(e),
        )
        return Response(
            {"error": "Erro interno ao processar chat"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_conversations(request):
    """Lista conversas do usuário."""
    conversations = ChatConversation.objects.filter(user=request.user).order_by(
        "-updated_at"
    )
    data = []
    for convo in conversations:
        last_message = convo.messages.order_by("-created_at").first()
        data.append(
            {
                "id": convo.id,
                "title": convo.title,
                "is_active": convo.is_active,
                "updated_at": convo.updated_at,
                "last_message": last_message.content if last_message else "",
            }
        )
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_conversation_detail(request, conversation_id: int):
    """Retorna mensagens de uma conversa."""
    conversation = ChatConversation.objects.filter(
        user=request.user, id=conversation_id
    ).first()
    if not conversation:
        return Response(
            {"error": "Conversa não encontrada."},
            status=status.HTTP_404_NOT_FOUND,
        )

    messages = conversation.messages.order_by("created_at")
    return Response(
        {
            "id": conversation.id,
            "title": conversation.title,
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "tokens_used": msg.tokens_used,
                    "created_at": msg.created_at,
                }
                for msg in messages
            ],
        }
    )
