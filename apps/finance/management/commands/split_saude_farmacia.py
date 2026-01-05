from django.core.management.base import BaseCommand

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

        for category in qs.select_related("user"):
            target = Category.objects.filter(
                user=category.user,
                name="Saúde",
                category_type=category.category_type,
            ).first()

            if target:
                tx_count = Transaction.objects.filter(category=category).count()
                budget_count = Budget.objects.filter(category=category).count()
                alert_count = (
                    AlertRule.objects.filter(category=category).count()
                    if AlertRule
                    else 0
                )

                if not dry_run:
                    Transaction.objects.filter(category=category).update(
                        category=target
                    )
                    Budget.objects.filter(category=category).update(
                        category=target
                    )
                    if AlertRule:
                        AlertRule.objects.filter(category=category).update(
                            category=target
                        )
                    category.delete()

                merged += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{category.user.username}: mesclado em 'Saúde' "
                        f"(transações {tx_count}, orçamentos {budget_count}, "
                        f"alertas {alert_count})."
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
                f"Concluido. Renomeados: {renamed}. Mesclados: {merged}."
            )
        )
