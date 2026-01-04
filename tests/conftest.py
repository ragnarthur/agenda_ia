import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """Retorna um cliente API sem autenticação."""
    return APIClient()


@pytest.fixture
def user(db):
    """Cria um usuário de teste."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Retorna um cliente API autenticado."""
    api_client.force_authenticate(user=user)
    return api_client
