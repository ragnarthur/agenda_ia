import factory
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.agenda.models import Event
from apps.finance.models import Account, Category, Transaction

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")


class AccountFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Account

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Conta {n}")
    account_type = Account.AccountType.BANK


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Categoria {n}")
    category_type = Category.CategoryType.EXPENSE
    color = "#6366f1"


class TransactionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Transaction

    user = factory.SubFactory(UserFactory)
    transaction_type = Transaction.TransactionType.EXPENSE
    amount = factory.Faker("pydecimal", left_digits=4, right_digits=2, positive=True)
    date = factory.Faker("date_this_month")
    description = factory.Faker("sentence", nb_words=4)
    category = factory.SubFactory(CategoryFactory)
    account = factory.SubFactory(AccountFactory)
    is_confirmed = True


class EventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Event

    user = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f"Evento {n}")
    event_type = Event.EventType.CLASS
    start_datetime = factory.LazyFunction(timezone.now)
    status = Event.EventStatus.PENDING
