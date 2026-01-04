from django.conf import settings
from django.db import models


class Event(models.Model):
    """Evento na agenda (aula, show, freela)."""

    class EventStatus(models.TextChoices):
        PENDING = "PENDENTE", "Pendente"
        PAID = "PAGO", "Pago"
        CANCELLED = "CANCELADO", "Cancelado"

    class EventType(models.TextChoices):
        CLASS = "AULA", "Aula"
        SHOW = "SHOW", "Show"
        FREELANCE = "FREELA", "Freela"
        OTHER = "OUTRO", "Outro"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events",
    )
    title = models.CharField("Titulo", max_length=200)
    event_type = models.CharField(
        "Tipo",
        max_length=20,
        choices=EventType.choices,
        default=EventType.OTHER,
    )
    start_datetime = models.DateTimeField("Inicio")
    end_datetime = models.DateTimeField("Fim", null=True, blank=True)
    location = models.CharField("Local", max_length=255, blank=True)
    expected_amount = models.DecimalField(
        "Valor Previsto",
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    status = models.CharField(
        "Status",
        max_length=20,
        choices=EventStatus.choices,
        default=EventStatus.PENDING,
    )
    notes = models.TextField("Observacoes", blank=True)

    # Novos campos para integração com finanças
    actual_amount = models.DecimalField(
        "Valor Real",
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Valor efetivamente recebido (se diferente do previsto)",
    )
    linked_transaction = models.OneToOneField(
        "finance.Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_event_link",
        verbose_name="Transacao Vinculada",
    )
    payment_date = models.DateField(
        "Data Pagamento",
        null=True,
        blank=True,
    )
    client_name = models.CharField(
        "Cliente",
        max_length=200,
        blank=True,
        help_text="Nome do cliente/contratante",
    )
    auto_create_transaction = models.BooleanField(
        "Criar Transacao Automatica",
        default=True,
        help_text="Criar transacao automaticamente quando status mudar para PAGO",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Evento"
        verbose_name_plural = "Eventos"
        ordering = ["start_datetime"]

    def __str__(self):
        return f"{self.title} - {self.start_datetime.strftime('%d/%m/%Y %H:%M')}"

    @property
    def final_amount(self):
        """Retorna valor final (real ou previsto)."""
        return self.actual_amount or self.expected_amount or 0

    @property
    def has_transaction(self):
        """Retorna True se já tem transação vinculada."""
        return self.linked_transaction is not None
