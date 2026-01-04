from django.conf import settings
from django.db import models


class AlertRule(models.Model):
    """Regra de alerta configurável pelo usuário."""

    class AlertType(models.TextChoices):
        BUDGET_THRESHOLD = "BUDGET_THRESHOLD", "Orçamento em X%"
        BUDGET_EXCEEDED = "BUDGET_EXCEEDED", "Orçamento estourado"
        GOAL_PROGRESS = "GOAL_PROGRESS", "Progresso de meta"
        GOAL_ACHIEVED = "GOAL_ACHIEVED", "Meta atingida"
        UNUSUAL_EXPENSE = "UNUSUAL_EXPENSE", "Gasto incomum"
        EVENT_PAYMENT = "EVENT_PAYMENT", "Pagamento de evento"
        WEEKLY_SUMMARY = "WEEKLY_SUMMARY", "Resumo semanal"
        MONTHLY_SUMMARY = "MONTHLY_SUMMARY", "Resumo mensal"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="alert_rules",
    )
    alert_type = models.CharField(
        "Tipo de Alerta",
        max_length=30,
        choices=AlertType.choices,
    )
    is_enabled = models.BooleanField("Ativo", default=True)
    threshold_percentage = models.IntegerField(
        "Percentual",
        null=True,
        blank=True,
        help_text="Usado para alertas de orçamento (ex: 80%)",
    )
    category = models.ForeignKey(
        "finance.Category",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="alert_rules",
        verbose_name="Categoria",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Regra de Alerta"
        verbose_name_plural = "Regras de Alerta"
        ordering = ["-created_at"]
        unique_together = ["user", "alert_type", "category"]

    def __str__(self):
        return f"{self.get_alert_type_display()} - {self.user.username}"


class Notification(models.Model):
    """Notificação gerada pelo sistema."""

    class Priority(models.TextChoices):
        LOW = "LOW", "Baixa"
        MEDIUM = "MEDIUM", "Média"
        HIGH = "HIGH", "Alta"
        URGENT = "URGENT", "Urgente"

    class NotificationType(models.TextChoices):
        INFO = "INFO", "Informação"
        WARNING = "WARNING", "Aviso"
        SUCCESS = "SUCCESS", "Sucesso"
        ERROR = "ERROR", "Erro"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField("Título", max_length=200)
    message = models.TextField("Mensagem")
    notification_type = models.CharField(
        "Tipo",
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.INFO,
    )
    priority = models.CharField(
        "Prioridade",
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    is_read = models.BooleanField("Lida", default=False)
    action_url = models.CharField(
        "URL de Ação",
        max_length=255,
        blank=True,
        help_text="URL para redirecionar ao clicar",
    )
    related_budget = models.ForeignKey(
        "finance.Budget",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    related_goal = models.ForeignKey(
        "finance.Goal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    related_transaction = models.ForeignKey(
        "finance.Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.user.username}"
