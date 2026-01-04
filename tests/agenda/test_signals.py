from decimal import Decimal

import pytest
from django.utils import timezone

from apps.agenda.models import Event
from apps.finance.models import Category, Transaction


@pytest.mark.django_db
def test_event_paid_creates_transaction(user):
    """Evento pago cria transação automaticamente."""
    category = Category.objects.create(
        user=user, name="Aulas Particulares", category_type="INCOME"
    )
    event = Event.objects.create(
        user=user,
        title="Aula Teste",
        event_type=Event.EventType.CLASS,
        start_datetime=timezone.now(),
        expected_amount=Decimal("150.00"),
        status=Event.EventStatus.PENDING,
    )

    event.status = Event.EventStatus.PAID
    event.save()

    event.refresh_from_db()
    assert event.linked_transaction is not None
    transaction = Transaction.objects.get(pk=event.linked_transaction_id)
    assert transaction.amount == Decimal("150.00")
    assert transaction.category_id == category.id
    assert transaction.source_event_id == event.id
