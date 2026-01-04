from django.conf import settings
from django.db import models


class AIUsageLog(models.Model):
    """Log de uso da IA para controle de custos."""

    class Feature(models.TextChoices):
        PARSE_TRANSACTION = "parse_transaction", "Parse Transaction"
        INSIGHTS = "insights", "Insights"
        CHAT = "chat", "Chat"
        CATEGORIZE = "categorize", "Categorize"
        FORECAST = "forecast", "Forecast"
        BUDGET_CHECK = "budget_check", "Budget Check"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_usage_logs",
    )
    feature = models.CharField(
        "Feature",
        max_length=50,
        choices=Feature.choices,
    )
    input_text = models.TextField("Input", blank=True)
    input_chars = models.IntegerField("Input Chars", default=0)
    output_chars = models.IntegerField("Output Chars", default=0)
    model_name = models.CharField("Model", max_length=50)
    success = models.BooleanField("Sucesso", default=True)
    error_message = models.TextField("Erro", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log de Uso IA"
        verbose_name_plural = "Logs de Uso IA"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.feature} - {self.created_at}"


class ChatConversation(models.Model):
    """Conversa de chat financeiro."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_conversations",
    )
    title = models.CharField("Título", max_length=200)
    is_active = models.BooleanField("Ativa", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Conversa"
        verbose_name_plural = "Conversas"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class ChatMessage(models.Model):
    """Mensagem de chat."""

    class Role(models.TextChoices):
        USER = "user", "Usuário"
        ASSISTANT = "assistant", "Assistente"

    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField("Papel", max_length=20, choices=Role.choices)
    content = models.TextField("Conteúdo")
    tokens_used = models.IntegerField("Tokens", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Mensagem"
        verbose_name_plural = "Mensagens"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role} - {self.conversation_id}"
