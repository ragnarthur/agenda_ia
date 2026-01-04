from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.finance.default_categories import ensure_default_categories


DEFAULT_USERNAME = "arthur_araujo"
DEFAULT_PASSWORD = "teste123@123"


class Command(BaseCommand):
    help = "Cria o usuario padrao se nao existir e garante a senha."

    def add_arguments(self, parser):
        parser.add_argument("--username", default=DEFAULT_USERNAME)
        parser.add_argument("--password", default=DEFAULT_PASSWORD)

    def handle(self, *args, **options):
        user_model = get_user_model()
        username = options["username"]
        password = options["password"]

        user, created = user_model.objects.get_or_create(username=username)
        user.set_password(password)
        user.save(update_fields=["password"])

        created_categories = ensure_default_categories(user)

        if created:
            self.stdout.write(self.style.SUCCESS("Usuario criado com sucesso."))
        else:
            self.stdout.write(
                self.style.WARNING("Usuario ja existia. Senha atualizada.")
            )

        if created_categories:
            self.stdout.write(
                self.style.SUCCESS(
                    f"{created_categories} categorias padrao adicionadas."
                )
            )
