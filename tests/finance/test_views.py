import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

from apps.finance.models import Account, Category, Transaction


@pytest.mark.django_db
class TestAccountViewSet:
    def test_list_accounts_unauthenticated(self, api_client):
        """Usuário não autenticado não pode listar contas."""
        url = reverse("account-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_accounts_authenticated(self, authenticated_client, user):
        """Usuário autenticado pode listar suas contas."""
        Account.objects.create(user=user, name="PIX", account_type="PIX")
        url = reverse("account-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_create_account(self, authenticated_client):
        """Usuário pode criar conta."""
        url = reverse("account-list")
        data = {"name": "Nubank", "account_type": "BANCO"}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Nubank"


@pytest.mark.django_db
class TestCategoryViewSet:
    def test_list_categories(self, authenticated_client, user):
        """Usuário pode listar suas categorias."""
        Category.objects.create(
            user=user, name="Alimentação", category_type="EXPENSE"
        )
        url = reverse("category-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_filter_categories_by_type(self, authenticated_client, user):
        """Pode filtrar categorias por tipo."""
        Category.objects.create(user=user, name="Salário", category_type="INCOME")
        Category.objects.create(user=user, name="Alimentação", category_type="EXPENSE")

        url = reverse("category-list")
        response = authenticated_client.get(url, {"type": "INCOME"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Salário"


@pytest.mark.django_db
class TestTransactionViewSet:
    def test_create_transaction(self, authenticated_client, user):
        """Usuário pode criar transação."""
        category = Category.objects.create(
            user=user, name="Alimentação", category_type="EXPENSE"
        )
        account = Account.objects.create(user=user, name="PIX", account_type="PIX")

        url = reverse("transaction-list")
        data = {
            "transaction_type": "EXPENSE",
            "amount": "50.00",
            "date": "2026-01-02",
            "description": "Almoço",
            "category": category.id,
            "account": account.id,
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["amount"] == "50.00"

    def test_transaction_amount_must_be_positive(self, authenticated_client):
        """Valor da transação deve ser positivo."""
        url = reverse("transaction-list")
        data = {
            "transaction_type": "EXPENSE",
            "amount": "-50.00",
            "date": "2026-01-02",
            "description": "Teste negativo",
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_transaction_rejects_category_from_other_user(
        self, authenticated_client, user
    ):
        """Não permite usar categoria de outro usuário."""
        other_user = get_user_model().objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="testpass123",
        )
        other_category = Category.objects.create(
            user=other_user, name="Outra", category_type="EXPENSE"
        )

        url = reverse("transaction-list")
        data = {
            "transaction_type": "EXPENSE",
            "amount": "10.00",
            "date": "2026-01-02",
            "description": "Teste categoria",
            "category": other_category.id,
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "category" in response.data

    def test_transaction_rejects_account_from_other_user(
        self, authenticated_client, user
    ):
        """Não permite usar conta de outro usuário."""
        other_user = get_user_model().objects.create_user(
            username="otheruser2",
            email="other2@example.com",
            password="testpass123",
        )
        other_account = Account.objects.create(
            user=other_user, name="Conta Outra", account_type="BANCO"
        )

        url = reverse("transaction-list")
        data = {
            "transaction_type": "EXPENSE",
            "amount": "10.00",
            "date": "2026-01-02",
            "description": "Teste conta",
            "account": other_account.id,
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "account" in response.data


@pytest.mark.django_db
class TestMonthlyReport:
    def test_monthly_report_requires_month(self, authenticated_client):
        """Relatório mensal requer parâmetro month."""
        url = reverse("monthly-report")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_monthly_report_returns_totals(self, authenticated_client, user):
        """Relatório mensal retorna totais corretos."""
        category = Category.objects.create(
            user=user, name="Salário", category_type="INCOME"
        )
        Transaction.objects.create(
            user=user,
            transaction_type="INCOME",
            amount=5000,
            date="2026-01-15",
            description="Salário",
            category=category,
        )
        Transaction.objects.create(
            user=user,
            transaction_type="EXPENSE",
            amount=1000,
            date="2026-01-20",
            description="Aluguel",
        )

        url = reverse("monthly-report")
        response = authenticated_client.get(url, {"month": "2026-01"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["income"] == 5000.0
        assert response.data["expenses"] == 1000.0
        assert response.data["balance"] == 4000.0
