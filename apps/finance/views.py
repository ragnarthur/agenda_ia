from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Q, Sum
from django_filters import rest_framework as filters
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Account, Budget, Category, Goal, Transaction
from .serializers import (
    AccountSerializer,
    BudgetSerializer,
    CategorySerializer,
    GoalContributionSerializer,
    GoalSerializer,
    TransactionSerializer,
)


def _add_months(value: date, months: int) -> date:
    total_months = value.month - 1 + months
    year = value.year + total_months // 12
    month = total_months % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def _get_period_range(start_date: date, period_type: str, today: date) -> tuple[date, date]:
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


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Return all categories without pagination

    def get_queryset(self):
        queryset = Category.objects.filter(user=self.request.user)
        category_type = self.request.query_params.get("type")
        if category_type:
            queryset = queryset.filter(category_type=category_type)
        return queryset.order_by("name")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionFilter(filters.FilterSet):
    month = filters.CharFilter(method="filter_by_month")
    type = filters.CharFilter(field_name="transaction_type")
    category = filters.NumberFilter(field_name="category_id")
    account = filters.NumberFilter(field_name="account_id")
    start_date = filters.DateFilter(field_name="date", lookup_expr="gte")
    end_date = filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = Transaction
        fields = ["month", "type", "category", "account", "start_date", "end_date"]

    def filter_by_month(self, queryset, name, value):
        """Filter by month in format YYYY-MM."""
        try:
            year, month = value.split("-")
            return queryset.filter(date__year=int(year), date__month=int(month))
        except (ValueError, AttributeError):
            return queryset


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = TransactionFilter
    search_fields = ["description", "notes", "tags"]
    ordering_fields = ["date", "amount", "created_at"]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related(
            "category", "account"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BudgetFilter(filters.FilterSet):
    category = filters.NumberFilter(field_name="category_id")
    is_active = filters.BooleanFilter(field_name="is_active")
    period_type = filters.CharFilter(field_name="period_type")

    class Meta:
        model = Budget
        fields = ["category", "is_active", "period_type"]


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = BudgetFilter
    search_fields = ["category__name"]
    ordering_fields = ["created_at", "amount", "start_date"]

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user).select_related("category")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def status(self, request):
        """Retorna status dos orçamentos ativos no período atual."""
        today = timezone.localdate()
        budgets = (
            self.get_queryset()
            .filter(is_active=True)
            .filter(Q(end_date__isnull=True) | Q(end_date__gte=today))
        )

        status_list = []
        for budget in budgets:
            period_start, period_end = _get_period_range(
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
                or Decimal("0")
            )
            percentage = (
                float((spent / budget.amount) * 100) if budget.amount else 0.0
            )
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

        return Response(status_list)


class GoalFilter(filters.FilterSet):
    status = filters.CharFilter(field_name="status")
    goal_type = filters.CharFilter(field_name="goal_type")

    class Meta:
        model = Goal
        fields = ["status", "goal_type"]


class GoalViewSet(viewsets.ModelViewSet):
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = GoalFilter
    search_fields = ["name", "notes"]
    ordering_fields = ["created_at", "target_amount", "current_amount", "target_date"]

    def get_queryset(self):
        return (
            Goal.objects.filter(user=self.request.user)
            .select_related("linked_account")
            .prefetch_related("contributions")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def contribute(self, request, pk=None):
        """Adiciona contribuição a uma meta."""
        goal = self.get_object()
        serializer = GoalContributionSerializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        contribution = serializer.save(goal=goal)

        goal.current_amount += contribution.amount
        if (
            goal.current_amount >= goal.target_amount
            and goal.status != Goal.GoalStatus.COMPLETED
        ):
            goal.status = Goal.GoalStatus.COMPLETED
        goal.save(update_fields=["current_amount", "status", "updated_at"])

        return Response(
            GoalSerializer(goal, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def monthly_report(request):
    """
    Retorna relatório mensal com totais de receitas e despesas.
    Query param: month (YYYY-MM)
    """
    month = request.query_params.get("month")
    if not month:
        return Response({"error": "Parâmetro 'month' é obrigatório (YYYY-MM)"}, status=400)

    try:
        year, month_num = month.split("-")
        year = int(year)
        month_num = int(month_num)
    except (ValueError, AttributeError):
        return Response({"error": "Formato inválido. Use YYYY-MM"}, status=400)

    transactions = Transaction.objects.filter(
        user=request.user,
        date__year=year,
        date__month=month_num,
        is_confirmed=True,
    )

    income = (
        transactions.filter(transaction_type=Transaction.TransactionType.INCOME).aggregate(
            total=Sum("amount")
        )["total"]
        or 0
    )

    expenses = (
        transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE).aggregate(
            total=Sum("amount")
        )["total"]
        or 0
    )

    # Top categorias de gasto
    top_expense_categories = (
        transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE)
        .values("category__name", "category__color")
        .annotate(total=Sum("amount"))
        .order_by("-total")[:5]
    )

    return Response(
        {
            "month": month,
            "income": float(income),
            "expenses": float(expenses),
            "balance": float(income - expenses),
            "top_expense_categories": list(top_expense_categories),
            "transaction_count": transactions.count(),
        }
    )
