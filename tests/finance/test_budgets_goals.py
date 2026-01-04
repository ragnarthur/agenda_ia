from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.finance.models import Budget, Category, Goal, Transaction


@pytest.mark.django_db
class TestBudgetViewSet:
    def test_create_budget_requires_expense_category(self, authenticated_client, user):
        """Orçamento deve ser vinculado a categoria de despesa."""
        income_category = Category.objects.create(
            user=user, name="Salário", category_type="INCOME"
        )
        url = reverse("budget-list")
        data = {
            "category": income_category.id,
            "amount": "300.00",
            "period_type": "MONTHLY",
            "start_date": timezone.localdate().isoformat(),
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "category" in response.data

    def test_budget_status_returns_spent(self, authenticated_client, user):
        """Status de orçamento retorna gasto no período atual."""
        category = Category.objects.create(
            user=user, name="Mercado", category_type="EXPENSE"
        )
        today = timezone.localdate()
        Budget.objects.create(
            user=user,
            category=category,
            amount=Decimal("200.00"),
            period_type="MONTHLY",
            start_date=today.replace(day=1),
        )
        Transaction.objects.create(
            user=user,
            transaction_type="EXPENSE",
            amount=Decimal("50.00"),
            date=today,
            description="Compra",
            category=category,
            is_confirmed=True,
        )
        url = reverse("budget-status")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data
        status_item = next(item for item in response.data if item["category"] == category.id)
        assert status_item["spent"] == 50.0
        assert status_item["percentage_used"] == 25.0


@pytest.mark.django_db
class TestGoalViewSet:
    def test_goal_contribute_updates_amount(self, authenticated_client, user):
        """Contribuição atualiza valor atual e status quando atingido."""
        goal = Goal.objects.create(
            user=user,
            name="Reserva",
            goal_type="EMERGENCY",
            target_amount=Decimal("100.00"),
            current_amount=Decimal("40.00"),
        )
        url = reverse("goal-contribute", kwargs={"pk": goal.id})
        data = {"amount": "60.00", "date": timezone.localdate().isoformat()}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        goal.refresh_from_db()
        assert goal.current_amount == Decimal("100.00")
        assert goal.status == Goal.GoalStatus.COMPLETED
        assert goal.contributions.count() == 1
