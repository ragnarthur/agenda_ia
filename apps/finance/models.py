from django.conf import settings
from django.db import models


class Account(models.Model):
    """Conta financeira (Dinheiro, PIX, Banco, Cartão)."""

    class AccountType(models.TextChoices):
        CASH = "DINHEIRO", "Dinheiro"
        PIX = "PIX", "PIX"
        BANK = "BANCO", "Banco"
        CREDIT_CARD = "CARTAO", "Cartão de Crédito"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="accounts",
    )
    name = models.CharField("Nome", max_length=100)
    account_type = models.CharField(
        "Tipo",
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.BANK,
    )
    is_active = models.BooleanField("Ativo", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Conta"
        verbose_name_plural = "Contas"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_account_type_display()})"


class Category(models.Model):
    """Categoria de transação (Receita ou Despesa)."""

    class CategoryType(models.TextChoices):
        INCOME = "INCOME", "Receita"
        EXPENSE = "EXPENSE", "Despesa"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField("Nome", max_length=100)
    category_type = models.CharField(
        "Tipo",
        max_length=10,
        choices=CategoryType.choices,
    )
    color = models.CharField("Cor", max_length=7, default="#6366f1")
    icon = models.CharField("Ícone", max_length=50, blank=True)

    # Novos campos para organização
    group = models.CharField("Grupo", max_length=50, blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subcategories",
        verbose_name="Categoria Pai",
    )
    is_essential = models.BooleanField(
        "Essencial",
        default=False,
        help_text="Despesa essencial (moradia, alimentação básica, etc)",
    )
    is_system = models.BooleanField(
        "Sistema",
        default=False,
        help_text="Categoria padrão do sistema (não pode ser excluída)",
    )
    order = models.IntegerField("Ordem", default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        ordering = ["group", "order", "name"]
        unique_together = ["user", "name", "category_type"]

    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


class Transaction(models.Model):
    """Transação financeira (Entrada ou Saída)."""

    class TransactionType(models.TextChoices):
        INCOME = "INCOME", "Receita"
        EXPENSE = "EXPENSE", "Despesa"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    transaction_type = models.CharField(
        "Tipo",
        max_length=10,
        choices=TransactionType.choices,
    )
    amount = models.DecimalField("Valor", max_digits=12, decimal_places=2)
    date = models.DateField("Data")
    description = models.CharField("Descrição", max_length=255)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        verbose_name="Categoria",
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        verbose_name="Conta",
    )
    tags = models.CharField(
        "Tags",
        max_length=255,
        blank=True,
        help_text="Tags separadas por vírgula",
    )
    notes = models.TextField("Observações", blank=True)
    is_confirmed = models.BooleanField(
        "Confirmado",
        default=True,
        help_text="False quando criado via IA e aguardando confirmação",
    )

    # Campos para integração com eventos
    source_event = models.ForeignKey(
        "agenda.Event",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        verbose_name="Evento Origem",
    )

    # Campos para IA
    ai_categorized = models.BooleanField(
        "Categorizado por IA",
        default=False,
    )
    ai_confidence = models.FloatField(
        "Confiança IA",
        null=True,
        blank=True,
        help_text="Nível de confiança da categorização (0-1)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Transação"
        verbose_name_plural = "Transações"
        ordering = ["-date", "-created_at"]

    def __str__(self):
        sign = "+" if self.transaction_type == self.TransactionType.INCOME else "-"
        return f"{sign}R${self.amount} - {self.description}"

    @property
    def tags_list(self):
        """Retorna tags como lista."""
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(",") if tag.strip()]


class Budget(models.Model):
    """Orçamento por categoria."""

    class PeriodType(models.TextChoices):
        WEEKLY = "WEEKLY", "Semanal"
        MONTHLY = "MONTHLY", "Mensal"
        YEARLY = "YEARLY", "Anual"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budgets",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="budgets",
        verbose_name="Categoria",
    )
    amount = models.DecimalField("Limite", max_digits=12, decimal_places=2)
    period_type = models.CharField(
        "Período",
        max_length=10,
        choices=PeriodType.choices,
        default=PeriodType.MONTHLY,
    )
    alert_threshold = models.IntegerField(
        "Alerta em %",
        default=80,
        help_text="Percentual do orçamento para disparar alerta",
    )
    is_active = models.BooleanField("Ativo", default=True)
    start_date = models.DateField("Data Início")
    end_date = models.DateField("Data Fim", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Orçamento"
        verbose_name_plural = "Orçamentos"
        ordering = ["-created_at"]
        unique_together = ["user", "category", "period_type", "start_date"]

    def __str__(self):
        return f"{self.category.name}: R${self.amount}/{self.get_period_type_display()}"


class Goal(models.Model):
    """Meta financeira (poupança, quitação de dívida, etc)."""

    class GoalType(models.TextChoices):
        SAVINGS = "SAVINGS", "Poupança"
        DEBT_PAYOFF = "DEBT", "Quitar Dívida"
        INVESTMENT = "INVESTMENT", "Investimento"
        PURCHASE = "PURCHASE", "Compra"
        EMERGENCY = "EMERGENCY", "Reserva de Emergência"
        CUSTOM = "CUSTOM", "Personalizado"

    class GoalStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativa"
        COMPLETED = "COMPLETED", "Concluída"
        PAUSED = "PAUSED", "Pausada"
        CANCELLED = "CANCELLED", "Cancelada"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="goals",
    )
    name = models.CharField("Nome", max_length=200)
    goal_type = models.CharField(
        "Tipo",
        max_length=20,
        choices=GoalType.choices,
        default=GoalType.SAVINGS,
    )
    target_amount = models.DecimalField(
        "Valor Meta",
        max_digits=12,
        decimal_places=2,
    )
    current_amount = models.DecimalField(
        "Valor Atual",
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    target_date = models.DateField("Data Meta", null=True, blank=True)
    status = models.CharField(
        "Status",
        max_length=20,
        choices=GoalStatus.choices,
        default=GoalStatus.ACTIVE,
    )
    linked_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="goals",
        verbose_name="Conta Vinculada",
    )
    icon = models.CharField("Ícone", max_length=50, blank=True, default="target")
    color = models.CharField("Cor", max_length=7, default="#10b981")
    notes = models.TextField("Observações", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Meta"
        verbose_name_plural = "Metas"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name}: R${self.current_amount}/R${self.target_amount}"

    @property
    def progress_percentage(self):
        """Retorna percentual de progresso."""
        if self.target_amount == 0:
            return 100
        return min(100, float(self.current_amount / self.target_amount * 100))

    @property
    def remaining_amount(self):
        """Retorna valor restante para atingir a meta."""
        return max(0, self.target_amount - self.current_amount)

    @property
    def is_achieved(self):
        """Retorna True se a meta foi atingida."""
        return self.current_amount >= self.target_amount


class GoalContribution(models.Model):
    """Contribuição para uma meta."""

    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name="contributions",
        verbose_name="Meta",
    )
    amount = models.DecimalField("Valor", max_digits=12, decimal_places=2)
    date = models.DateField("Data")
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="goal_contributions",
        verbose_name="Transação",
    )
    notes = models.CharField("Observação", max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Contribuição"
        verbose_name_plural = "Contribuições"
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"R${self.amount} para {self.goal.name}"
