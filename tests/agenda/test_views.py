import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.agenda.models import Event


@pytest.mark.django_db
class TestEventViewSet:
    def test_list_events_unauthenticated(self, api_client):
        """Usuário não autenticado não pode listar eventos."""
        url = reverse("event-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_events_authenticated(self, authenticated_client, user):
        """Usuário autenticado pode listar seus eventos."""
        Event.objects.create(
            user=user,
            title="Aula CRAS",
            event_type="AULA",
            start_datetime=timezone.now(),
        )
        url = reverse("event-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_create_event(self, authenticated_client):
        """Usuário pode criar evento."""
        url = reverse("event-list")
        data = {
            "title": "Show na praça",
            "event_type": "SHOW",
            "start_datetime": "2026-01-10T20:00:00Z",
            "expected_amount": "500.00",
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Show na praça"
        assert response.data["expected_amount"] == "500.00"

    def test_update_event_status(self, authenticated_client, user):
        """Usuário pode atualizar status do evento."""
        event = Event.objects.create(
            user=user,
            title="Aula",
            event_type="AULA",
            start_datetime=timezone.now(),
            status="PENDENTE",
        )
        url = reverse("event-detail", kwargs={"pk": event.id})
        response = authenticated_client.patch(url, {"status": "PAGO"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "PAGO"

    def test_end_datetime_must_be_after_start(self, authenticated_client):
        """Data fim deve ser após data início."""
        url = reverse("event-list")
        data = {
            "title": "Evento inválido",
            "event_type": "OUTRO",
            "start_datetime": "2026-01-10T20:00:00Z",
            "end_datetime": "2026-01-10T18:00:00Z",  # antes do início
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
