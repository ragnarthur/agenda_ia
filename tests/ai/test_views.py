from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.ai.models import AIUsageLog, ChatConversation
from apps.ai.services.budget_service import BudgetCheckResult
from apps.ai.services.forecast_service import ForecastResult
from apps.ai.services.ollama_client import MonthlyInsights, TransactionProposal
from apps.finance.models import Budget, Category, Transaction


@pytest.mark.django_db
class TestHealthcheck:
    def test_healthcheck_returns_ok(self, api_client):
        """Healthcheck retorna status ok sem autenticação."""
        url = reverse("healthcheck")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "ok"
        assert response.data["service"] == "agenda-ia-api"

    @patch("apps.ai.views.is_ollama_available")
    @patch("apps.ai.services.is_ollama_available")
    @patch("apps.ai.services.get_available_models")
    def test_healthcheck_shows_llm_status(
        self,
        mock_models,
        mock_service_available,
        mock_view_available,
        api_client,
        settings,
    ):
        """Healthcheck mostra status do LLM."""
        mock_view_available.return_value = True
        mock_service_available.return_value = True
        mock_models.return_value = ["llama3.1:8b", "mistral:7b"]
        settings.LLM_PROVIDER = "ollama"

        url = reverse("healthcheck")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["llm"]["available"] is True
        assert response.data["llm"]["provider"] == "ollama"
        assert "llama3.1:8b" in response.data["llm"]["installed_models"]


@pytest.mark.django_db
class TestParseTransaction:
    def test_parse_transaction_requires_auth(self, api_client):
        """Parse transaction requer autenticação."""
        url = reverse("parse-transaction")
        response = api_client.post(url, {"text": "teste"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_parse_transaction_requires_text(self, authenticated_client):
        """Parse transaction requer campo text."""
        url = reverse("parse-transaction")
        response = authenticated_client.post(url, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_parse_transaction_text_too_long(self, authenticated_client, settings):
        """Parse transaction rejeita texto muito longo."""
        settings.AI_MAX_INPUT_CHARS = 10
        url = reverse("parse-transaction")
        response = authenticated_client.post(url, {"text": "a" * 100})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "muito longo" in response.data["error"]

    @patch("apps.ai.views.is_ollama_available")
    @patch("apps.ai.views.parse_transaction_text")
    def test_parse_transaction_success(
        self, mock_parse, mock_ollama, authenticated_client, user, settings
    ):
        """Parse transaction retorna proposta corretamente."""
        mock_ollama.return_value = True

        mock_proposal = TransactionProposal(
            transaction_type="EXPENSE",
            amount=Decimal("38.90"),
            date="2026-01-02",
            description="Cordas de violão",
            category_suggestion="Instrumentos",
            account_suggestion="PIX",
            confidence=0.85,
        )
        mock_usage = {"model": "llama3.1:8b", "total_tokens": 150}
        mock_parse.return_value = (mock_proposal, mock_usage)

        url = reverse("parse-transaction")
        response = authenticated_client.post(
            url, {"text": "paguei 38,90 em cordas no pix"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["proposal"]["type"] == "EXPENSE"
        assert response.data["proposal"]["amount"] == 38.90
        assert response.data["proposal"]["category_suggestion"] == "Instrumentos"
        assert response.data["usage"]["tokens_used"] == 150

    @patch("apps.ai.views.is_ollama_available")
    @patch("apps.ai.views.parse_transaction_text")
    def test_parse_transaction_logs_usage(
        self, mock_parse, mock_ollama, authenticated_client, user, settings
    ):
        """Parse transaction registra uso no banco."""
        mock_ollama.return_value = True

        mock_proposal = TransactionProposal(
            transaction_type="EXPENSE",
            amount=Decimal("50.00"),
            date="2026-01-02",
            description="Teste",
            confidence=0.8,
        )
        mock_parse.return_value = (mock_proposal, {"model": "llama3.1:8b", "total_tokens": 100})

        url = reverse("parse-transaction")
        authenticated_client.post(url, {"text": "teste"})

        # Verifica log criado
        log = AIUsageLog.objects.filter(user=user).first()
        assert log is not None
        assert log.feature == "parse_transaction"
        assert log.success is True

    @patch("apps.ai.views.is_ollama_available")
    def test_parse_transaction_ollama_unavailable(self, mock_ollama, authenticated_client):
        """Parse transaction retorna erro se LLM nao esta disponivel."""
        mock_ollama.return_value = False

        url = reverse("parse-transaction")
        response = authenticated_client.post(url, {"text": "teste"})
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "LLM" in response.data["error"]

    @patch("apps.ai.views.check_rate_limit")
    def test_parse_transaction_rate_limited(
        self, mock_rate_limit, authenticated_client, settings
    ):
        """Parse transaction retorna 429 quando rate limited."""
        mock_rate_limit.return_value = (False, 0)

        url = reverse("parse-transaction")
        response = authenticated_client.post(url, {"text": "teste"})
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
class TestInsights:
    def test_insights_requires_auth(self, api_client):
        """Insights requer autenticação."""
        url = reverse("insights")
        response = api_client.post(url, {"month": "2026-01"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_insights_requires_month(self, authenticated_client):
        """Insights requer campo month."""
        url = reverse("insights")
        response = authenticated_client.post(url, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("apps.ai.views.is_ollama_available")
    def test_insights_invalid_month_format(self, mock_ollama, authenticated_client, settings):
        """Insights rejeita formato de mês inválido."""
        mock_ollama.return_value = True
        url = reverse("insights")
        response = authenticated_client.post(url, {"month": "invalid"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Formato inválido" in response.data["error"]

    @patch("apps.ai.views.is_ollama_available")
    def test_insights_no_transactions(self, mock_ollama, authenticated_client, settings):
        """Insights retorna mensagem quando não há transações."""
        mock_ollama.return_value = True
        url = reverse("insights")
        response = authenticated_client.post(url, {"month": "2026-01"})
        assert response.status_code == status.HTTP_200_OK
        assert "Nenhuma transação" in response.data["summary"]
        assert response.data["total_income"] == 0
        assert response.data["total_expenses"] == 0

    @patch("apps.ai.views.is_ollama_available")
    @patch("apps.ai.views.generate_monthly_insights")
    def test_insights_with_transactions(
        self, mock_insights, mock_ollama, authenticated_client, user, settings
    ):
        """Insights retorna dados corretos com transações."""
        mock_ollama.return_value = True

        # Cria categoria e transações
        category = Category.objects.create(
            user=user, name="Alimentação", category_type="EXPENSE"
        )
        Transaction.objects.create(
            user=user,
            transaction_type="INCOME",
            amount=5000,
            date="2026-01-15",
            description="Salário",
        )
        Transaction.objects.create(
            user=user,
            transaction_type="EXPENSE",
            amount=500,
            date="2026-01-20",
            description="Mercado",
            category=category,
        )

        mock_insights_data = MonthlyInsights(
            summary="Mês com saldo positivo.",
            total_income=5000,
            total_expenses=500,
            balance=4500,
            top_expenses=[{"category__name": "Alimentação", "total": 500}],
            recommendations=["Continue assim!", "Guarde 10% do salário"],
        )
        mock_insights.return_value = (
            mock_insights_data,
            {"model": "llama3.1:8b", "total_tokens": 200},
        )

        url = reverse("insights")
        response = authenticated_client.post(url, {"month": "2026-01"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_income"] == 5000
        assert response.data["total_expenses"] == 500
        assert response.data["balance"] == 4500
        assert response.data["summary"] == "Mês com saldo positivo."
        assert len(response.data["recommendations"]) == 2

    @patch("apps.ai.views.is_ollama_available")
    def test_insights_ollama_unavailable(self, mock_ollama, authenticated_client):
        """Insights retorna erro se LLM nao esta disponivel."""
        mock_ollama.return_value = False
        url = reverse("insights")
        response = authenticated_client.post(url, {"month": "2026-01"})
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "LLM" in response.data["error"]

    @patch("apps.ai.views.check_rate_limit")
    def test_insights_rate_limited(self, mock_rate_limit, authenticated_client, settings):
        """Insights retorna 429 quando rate limited."""
        mock_rate_limit.return_value = (False, 0)

        url = reverse("insights")
        response = authenticated_client.post(url, {"month": "2026-01"})
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
class TestCategorize:
    def test_categorize_requires_auth(self, api_client):
        url = reverse("categorize")
        response = api_client.post(url, {"text": "teste"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_categorize_requires_text(self, authenticated_client):
        url = reverse("categorize")
        response = authenticated_client.post(url, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("apps.ai.views.is_ollama_available")
    @patch("apps.ai.views.categorize_transaction_text")
    def test_categorize_success(
        self, mock_categorize, mock_ollama, authenticated_client, user
    ):
        mock_ollama.return_value = True
        category = Category.objects.create(
            user=user, name="Mercado", category_type="EXPENSE"
        )
        mock_categorize.return_value = ("Mercado", 0.8, {"total_tokens": 42})

        url = reverse("categorize")
        response = authenticated_client.post(
            url, {"text": "mercado do mes", "category_type": "EXPENSE"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["suggestion"]["id"] == category.id
        assert response.data["suggestion"]["name"] == "Mercado"
        assert response.data["confidence"] == 0.8


@pytest.mark.django_db
class TestForecast:
    def test_forecast_requires_auth(self, api_client):
        url = reverse("forecast")
        response = api_client.post(url, {"months": 3})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch("apps.ai.views.is_ollama_available")
    def test_forecast_without_history(self, mock_ollama, authenticated_client):
        mock_ollama.return_value = True
        url = reverse("forecast")
        response = authenticated_client.post(url, {"months": 2})
        assert response.status_code == status.HTTP_200_OK
        assert "Sem histórico" in response.data["forecast"]["summary"]

    @patch("apps.ai.views.is_ollama_available")
    @patch("apps.ai.views.generate_cashflow_forecast")
    def test_forecast_with_transactions(
        self, mock_forecast, mock_ollama, authenticated_client, user
    ):
        mock_ollama.return_value = True
        today = timezone.localdate()
        Transaction.objects.create(
            user=user,
            transaction_type="INCOME",
            amount=1000,
            date=today,
            description="Receita",
        )
        mock_forecast.return_value = (
            ForecastResult(
                summary="Previsão positiva",
                forecast_income=1200,
                forecast_expenses=500,
                forecast_balance=700,
                recommendations=["Manter controle"],
            ),
            {"total_tokens": 120},
        )

        url = reverse("forecast")
        response = authenticated_client.post(url, {"months": 1})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["forecast"]["forecast_income"] == 1200
        assert response.data["forecast"]["forecast_balance"] == 700


@pytest.mark.django_db
class TestBudgetCheck:
    @patch("apps.ai.views.is_ollama_available")
    def test_budget_check_without_budgets(self, mock_ollama, authenticated_client):
        mock_ollama.return_value = True
        url = reverse("budget-check")
        response = authenticated_client.post(url, {})
        assert response.status_code == status.HTTP_200_OK
        assert "Nenhum orçamento" in response.data["summary"]

    @patch("apps.ai.views.is_ollama_available")
    @patch("apps.ai.views.generate_budget_check")
    def test_budget_check_with_budgets(
        self, mock_budget_check, mock_ollama, authenticated_client, user
    ):
        mock_ollama.return_value = True
        category = Category.objects.create(
            user=user, name="Mercado", category_type="EXPENSE"
        )
        Budget.objects.create(
            user=user,
            category=category,
            amount=200,
            period_type="MONTHLY",
            start_date="2026-01-01",
        )
        Transaction.objects.create(
            user=user,
            transaction_type="EXPENSE",
            amount=100,
            date="2026-01-10",
            description="Mercado",
            category=category,
        )

        mock_budget_check.return_value = (
            BudgetCheckResult(
                summary="Orçamento sob controle",
                alerts=[],
                recommendations=["Continuar monitorando"],
            ),
            {"total_tokens": 80},
        )

        url = reverse("budget-check")
        response = authenticated_client.post(url, {})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["summary"] == "Orçamento sob controle"
        assert response.data["budgets"]


@pytest.mark.django_db
class TestChat:
    def test_chat_requires_auth(self, api_client):
        url = reverse("chat")
        response = api_client.post(url, {"message": "oi"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_chat_requires_message(self, authenticated_client):
        url = reverse("chat")
        response = authenticated_client.post(url, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("apps.ai.views.is_ollama_available")
    @patch("apps.ai.views.generate_chat_response")
    def test_chat_creates_conversation(
        self, mock_chat, mock_ollama, authenticated_client, user
    ):
        mock_ollama.return_value = True
        mock_chat.return_value = MagicMock(
            message="Resposta IA",
            usage_info={"total_tokens": 40, "output_tokens": 20},
        )
        url = reverse("chat")
        response = authenticated_client.post(url, {"message": "Como vai?"})

        assert response.status_code == status.HTTP_200_OK
        assert ChatConversation.objects.filter(user=user).exists()
