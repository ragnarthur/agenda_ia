"""
Signals para gerar notificações automáticas.
"""

import logging
from decimal import Decimal

from django.db.models import Q, Sum
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.finance.models import Budget, Goal, GoalContribution, Transaction

from .models import AlertRule, Notification

logger = logging.getLogger(__name__)


def create_notification(user, title, message, notification_type, priority, **kwargs):
    """Helper para criar notificações."""
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        priority=priority,
        **kwargs,
    )


@receiver(post_save, sender=Transaction)
def check_budget_on_transaction(sender, instance, created, **kwargs):
    """Verifica orçamentos quando uma transação é criada."""
    if not created:
        return

    if instance.transaction_type != Transaction.TransactionType.EXPENSE:
        return

    if not instance.category:
        return

    today = timezone.localdate()
    budgets = Budget.objects.filter(
        user=instance.user,
        category=instance.category,
        is_active=True,
        start_date__lte=today,
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=today)
    )

    for budget in budgets:
        _check_budget_alerts(budget, instance.user)


def _check_budget_alerts(budget, user):
    """Verifica alertas de orçamento."""
    from datetime import timedelta
    from calendar import monthrange

    today = timezone.localdate()

    if budget.period_type == Budget.PeriodType.WEEKLY:
        weeks = (today - budget.start_date).days // 7
        period_start = budget.start_date + timedelta(days=weeks * 7)
        period_end = period_start + timedelta(days=6)
    elif budget.period_type == Budget.PeriodType.MONTHLY:
        period_start = today.replace(day=min(budget.start_date.day, monthrange(today.year, today.month)[1]))
        if period_start > today:
            if today.month == 1:
                period_start = period_start.replace(year=today.year - 1, month=12)
            else:
                new_day = min(budget.start_date.day, monthrange(today.year, today.month - 1)[1])
                period_start = period_start.replace(month=today.month - 1, day=new_day)
        next_month = period_start.month + 1 if period_start.month < 12 else 1
        next_year = period_start.year if period_start.month < 12 else period_start.year + 1
        period_end = period_start.replace(
            year=next_year,
            month=next_month,
            day=min(period_start.day, monthrange(next_year, next_month)[1]),
        ) - timedelta(days=1)
    else:
        period_start = budget.start_date
        period_end = budget.start_date.replace(year=budget.start_date.year + 1) - timedelta(days=1)

    spent = (
        Transaction.objects.filter(
            user=user,
            transaction_type=Transaction.TransactionType.EXPENSE,
            category=budget.category,
            date__gte=period_start,
            date__lte=period_end,
            is_confirmed=True,
        ).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )

    percentage = float(spent / budget.amount * 100) if budget.amount else 0

    threshold_rules = AlertRule.objects.filter(
        user=user,
        alert_type=AlertRule.AlertType.BUDGET_THRESHOLD,
        is_enabled=True,
    ).filter(
        Q(category__isnull=True) | Q(category=budget.category)
    )

    for rule in threshold_rules:
        threshold = rule.threshold_percentage or 80
        if percentage >= threshold and percentage < 100:
            existing = Notification.objects.filter(
                user=user,
                related_budget=budget,
                created_at__date=today,
                title__contains="atingiu",
            ).exists()

            if not existing:
                create_notification(
                    user=user,
                    title=f"Orçamento de {budget.category.name} atingiu {percentage:.0f}%",
                    message=f"Você gastou R$ {spent:.2f} de R$ {budget.amount:.2f} no período.",
                    notification_type=Notification.NotificationType.WARNING,
                    priority=Notification.Priority.MEDIUM,
                    action_url="/budgets",
                    related_budget=budget,
                )

    if percentage >= 100:
        exceeded_rules = AlertRule.objects.filter(
            user=user,
            alert_type=AlertRule.AlertType.BUDGET_EXCEEDED,
            is_enabled=True,
        )

        if exceeded_rules.exists():
            existing = Notification.objects.filter(
                user=user,
                related_budget=budget,
                created_at__date=today,
                title__contains="estourou",
            ).exists()

            if not existing:
                create_notification(
                    user=user,
                    title=f"Orçamento de {budget.category.name} estourou!",
                    message=f"Você gastou R$ {spent:.2f}, {percentage - 100:.0f}% acima do limite de R$ {budget.amount:.2f}.",
                    notification_type=Notification.NotificationType.ERROR,
                    priority=Notification.Priority.HIGH,
                    action_url="/budgets",
                    related_budget=budget,
                )


@receiver(post_save, sender=GoalContribution)
def check_goal_on_contribution(sender, instance, created, **kwargs):
    """Verifica metas quando uma contribuição é adicionada."""
    if not created:
        return

    goal = instance.goal

    if goal.is_achieved and goal.status != Goal.GoalStatus.COMPLETED:
        rules = AlertRule.objects.filter(
            user=goal.user,
            alert_type=AlertRule.AlertType.GOAL_ACHIEVED,
            is_enabled=True,
        )

        if rules.exists():
            create_notification(
                user=goal.user,
                title=f"Meta '{goal.name}' atingida!",
                message=f"Parabéns! Você alcançou R$ {goal.current_amount:.2f} de R$ {goal.target_amount:.2f}.",
                notification_type=Notification.NotificationType.SUCCESS,
                priority=Notification.Priority.HIGH,
                action_url="/goals",
                related_goal=goal,
            )
