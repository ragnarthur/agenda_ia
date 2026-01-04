import logging
from dataclasses import dataclass
from datetime import date

from django.conf import settings
from django.db.models import Sum

from apps.finance.models import Goal, Transaction

from .ollama_client import get_llm_model, get_ollama_client

logger = logging.getLogger(__name__)


@dataclass
class ChatResponse:
    message: str
    usage_info: dict


def _format_currency(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def build_financial_context(user) -> str:
    """Cria um contexto financeiro resumido do usuário."""
    today = date.today()

    transactions = Transaction.objects.filter(
        user=user,
        date__year=today.year,
        date__month=today.month,
        is_confirmed=True,
    )

    income = (
        transactions.filter(transaction_type=Transaction.TransactionType.INCOME)
        .aggregate(total=Sum("amount"))
        .get("total")
        or 0
    )
    expenses = (
        transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE)
        .aggregate(total=Sum("amount"))
        .get("total")
        or 0
    )
    balance = float(income) - float(expenses)

    recent_transactions = (
        Transaction.objects.filter(user=user, is_confirmed=True)
        .order_by("-date", "-created_at")[:5]
    )
    recent_lines = [
        f"- {t.date}: {t.description} ({t.get_transaction_type_display()}) {_format_currency(float(t.amount))}"
        for t in recent_transactions
    ] or ["- Nenhuma transação recente"]

    goals = Goal.objects.filter(user=user).order_by("-created_at")[:5]
    goal_lines = [
        f"- {goal.name}: {_format_currency(float(goal.current_amount))} de {_format_currency(float(goal.target_amount))} ({goal.progress_percentage:.0f}%)"
        for goal in goals
    ] or ["- Nenhuma meta cadastrada"]

    return "\n".join(
        [
            "Resumo financeiro atual:",
            f"- Receitas do mês: {_format_currency(float(income))}",
            f"- Despesas do mês: {_format_currency(float(expenses))}",
            f"- Saldo do mês: {_format_currency(balance)}",
            "",
            "Transações recentes:",
            *recent_lines,
            "",
            "Metas em acompanhamento:",
            *goal_lines,
        ]
    )


def generate_chat_response(
    user,
    message: str,
    history: list[dict] | None = None,
) -> ChatResponse:
    """Gera resposta do chatbot com contexto financeiro."""
    client = get_ollama_client()
    model = get_llm_model()
    context = build_financial_context(user)

    system_prompt = (
        "Você é um assistente financeiro pessoal. Use o contexto abaixo para responder "
        "com clareza e foco em ações práticas. Se faltar informação, faça perguntas objetivas.\n\n"
        f"{context}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=settings.AI_MAX_OUTPUT_TOKENS,
        temperature=settings.AI_TEMPERATURE,
    )

    content = response.choices[0].message.content.strip()
    usage_info = {
        "model": model,
        "input_tokens": response.usage.prompt_tokens if response.usage else 0,
        "output_tokens": response.usage.completion_tokens if response.usage else 0,
        "total_tokens": response.usage.total_tokens if response.usage else 0,
    }

    logger.info(f"Chat: {usage_info['total_tokens']} tokens usados")
    return ChatResponse(message=content, usage_info=usage_info)
