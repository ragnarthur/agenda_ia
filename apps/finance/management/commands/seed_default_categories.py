from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.finance.default_categories import ensure_default_categories


class Command(BaseCommand):
    help = "Cria categorias padrão de despesas e receitas para usuários."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            help="Define um usuario especifico para receber as categorias.",
        )

    def handle(self, *args, **options):
        username = options.get("username")
        user_model = get_user_model()

        if username:
            users = user_model.objects.filter(username=username)
            if not users.exists():
                raise CommandError(f"Usuario '{username}' nao encontrado.")
        else:
            users = user_model.objects.all()

        total_created = 0

        for user in users:
            created = ensure_default_categories(user)
            total_created += created
            self.stdout.write(
                self.style.SUCCESS(
                    f"{user.username}: {created} categorias criadas."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Concluido. Total de categorias criadas: {total_created}."
            )
        )
