from django.core.management.base import BaseCommand
from django.db import transaction

from apps.finance.models import Budget, Category, Transaction

try:
    from apps.notifications.models import AlertRule
except ImportError:  # pragma: no cover - app opcional
    AlertRule = None


class Command(BaseCommand):
    help = (
        "Separa a categoria 'Saúde e Farmácia' em 'Saúde' mantendo "
        "'Farmácia' como categoria própria."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            help="Filtra o ajuste para um usuario especifico.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra as alteracoes sem salvar no banco.",
        )

    def handle(self, *args, **options):
        username = options.get("username")
        dry_run = options.get("dry_run")

        qs = Category.objects.filter(
            name="Saúde e Farmácia",
            category_type=Category.CategoryType.EXPENSE,
        )
        if username:
            qs = qs.filter(user__username=username)

        if not qs.exists():
            self.stdout.write(
                self.style.WARNING(
                    "Nenhuma categoria 'Saúde e Farmácia' encontrada."
                )
            )
            return

        renamed = 0
        merged = 0
        total_budgets_moved = 0
        total_budget_conflicts = 0
        total_alerts_moved = 0
        total_alert_conflicts = 0

        for category in qs.select_related("user"):
            target = Category.objects.filter(
                user=category.user,
                name="Saúde",
                category_type=category.category_type,
            ).first()

            if target:
                tx_qs = Transaction.objects.filter(category=category)
                budget_qs = Budget.objects.filter(category=category)
                alert_qs = (
                    AlertRule.objects.filter(category=category) if AlertRule else None
                )

                tx_count = tx_qs.count()
                budget_count = budget_qs.count()
                alert_count = alert_qs.count() if alert_qs is not None else 0
                budgets_moved = 0
                budget_conflicts = 0
                alerts_moved = 0
                alert_conflicts = 0

                target_budget_keys = set(
                    Budget.objects.filter(category=target).values_list(
                        "period_type",
                        "start_date",
                    )
                )
                target_alert_types = (
                    set(
                        AlertRule.objects.filter(category=target).values_list(
                            "alert_type",
                            flat=True,
                        )
                    )
                    if AlertRule
                    else set()
                )

                if not dry_run:
                    with transaction.atomic():
                        tx_qs.update(category=target)

                        for budget in budget_qs:
                            budget_key = (budget.period_type, budget.start_date)
                            if budget_key in target_budget_keys:
                                budget_conflicts += 1
                                budget.delete()
                                continue

                            budget.category = target
                            budget.save(update_fields=["category"])
                            budgets_moved += 1
                            target_budget_keys.add(budget_key)

                        if alert_qs is not None:
                            for alert_rule in alert_qs:
                                if alert_rule.alert_type in target_alert_types:
                                    alert_conflicts += 1
                                    alert_rule.delete()
                                    continue

                                alert_rule.category = target
                                alert_rule.save(update_fields=["category"])
                                alerts_moved += 1
                                target_alert_types.add(alert_rule.alert_type)

                        category.delete()
                else:
                    for budget in budget_qs:
                        budget_key = (budget.period_type, budget.start_date)
                        if budget_key in target_budget_keys:
                            budget_conflicts += 1
                            continue
                        budgets_moved += 1
                        target_budget_keys.add(budget_key)

                    if alert_qs is not None:
                        for alert_rule in alert_qs:
                            if alert_rule.alert_type in target_alert_types:
                                alert_conflicts += 1
                                continue
                            alerts_moved += 1
                            target_alert_types.add(alert_rule.alert_type)

                merged += 1
                total_budgets_moved += budgets_moved
                total_budget_conflicts += budget_conflicts
                total_alerts_moved += alerts_moved
                total_alert_conflicts += alert_conflicts
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{category.user.username}: mesclado em 'Saúde' "
                        f"(transações {tx_count}, orçamentos {budget_count} "
                        f"-> movidos {budgets_moved}, conflitos {budget_conflicts}; "
                        f"alertas {alert_count} -> movidos {alerts_moved}, "
                        f"conflitos {alert_conflicts})."
                    )
                )
                continue

            if not dry_run:
                fields = ["name"]
                category.name = "Saúde"
                if category.group != "Saúde":
                    category.group = "Saúde"
                    fields.append("group")
                category.save(update_fields=fields)

            renamed += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"{category.user.username}: renomeado para 'Saúde'."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Concluido. "
                f"Renomeados: {renamed}. "
                f"Mesclados: {merged}. "
                f"Orcamentos movidos: {total_budgets_moved}, "
                f"conflitos: {total_budget_conflicts}. "
                f"Alertas movidos: {total_alerts_moved}, "
                f"conflitos: {total_alert_conflicts}."
            )
        )
