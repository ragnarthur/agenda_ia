"""
Signals para integração automática entre Agenda e Finanças.
Quando um evento muda para PAGO, cria automaticamente uma transação de receita.
"""

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from apps.finance.default_categories import get_category_for_event_type
from apps.finance.models import Category, Transaction

from .models import Event

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Event)
def track_status_change(sender, instance, **kwargs):
    """Guarda status anterior para detectar mudança."""
    if instance.pk:
        try:
            old_instance = Event.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Event.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=Event)
def handle_event_paid(sender, instance, created, **kwargs):
    """
    Cria transação automaticamente quando evento muda para PAGO.

    Condições:
    - Status mudou para PAGO (não era PAGO antes)
    - auto_create_transaction está habilitado
    - Não existe transação vinculada ainda
    - Existe um valor (esperado ou real)
    """
    old_status = getattr(instance, "_old_status", None)

    # Só processa se status mudou PARA PAGO
    if old_status == Event.EventStatus.PAID:
        return

    if instance.status != Event.EventStatus.PAID:
        return

    # Verifica condições
    if not instance.auto_create_transaction:
        logger.debug(f"Evento {instance.pk}: auto_create_transaction desabilitado")
        return

    if instance.linked_transaction:
        logger.debug(f"Evento {instance.pk}: já tem transação vinculada")
        return

    amount = instance.actual_amount or instance.expected_amount
    if not amount:
        logger.warning(f"Evento {instance.pk}: sem valor definido, transação não criada")
        return

    try:
        transaction = create_transaction_from_event(instance)

        # Atualiza evento com a transação vinculada (sem disparar signal novamente)
        Event.objects.filter(pk=instance.pk).update(
            linked_transaction=transaction,
            payment_date=instance.payment_date or timezone.now().date(),
        )

        logger.info(
            f"Transação #{transaction.pk} criada automaticamente do evento #{instance.pk}"
        )

    except Exception as e:
        logger.error(f"Erro ao criar transação do evento {instance.pk}: {e}")


def create_transaction_from_event(event: Event) -> Transaction:
    """
    Cria uma transação de receita a partir de um evento pago.

    Mapeamento de tipos:
    - AULA → Aulas Particulares
    - SHOW → Cachês
    - FREELA → Freelance
    - OUTRO → Outros
    """
    # Busca categoria apropriada
    category_name = get_category_for_event_type(event.event_type)

    category = Category.objects.filter(
        user=event.user,
        name=category_name,
        category_type=Category.CategoryType.INCOME,
    ).first()

    # Se não encontrou a categoria específica, tenta "Outros"
    if not category:
        category = Category.objects.filter(
            user=event.user,
            name="Outros",
            category_type=Category.CategoryType.INCOME,
        ).first()

    # Monta descrição
    description = f"{event.get_event_type_display()}: {event.title}"
    if event.client_name:
        description += f" ({event.client_name})"

    # Data da transação
    transaction_date = (
        event.payment_date
        or event.start_datetime.date()
    )

    # Cria transação
    transaction = Transaction.objects.create(
        user=event.user,
        transaction_type=Transaction.TransactionType.INCOME,
        amount=event.actual_amount or event.expected_amount,
        date=transaction_date,
        description=description[:255],  # Limita ao tamanho do campo
        category=category,
        source_event=event,
        is_confirmed=True,
        notes=f"Gerado automaticamente do evento: {event.title}",
    )

    return transaction
