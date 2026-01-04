import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command


@pytest.mark.django_db
def test_create_default_user_creates_user():
    call_command("create_default_user")

    user = get_user_model().objects.get(username="arthur_araujo")
    assert user.check_password("teste123@123")


@pytest.mark.django_db
def test_create_default_user_updates_existing_password():
    user_model = get_user_model()
    user_model.objects.create_user(username="arthur_araujo", password="oldpass123")

    call_command("create_default_user")

    user = user_model.objects.get(username="arthur_araujo")
    assert user.check_password("teste123@123")
    assert user_model.objects.filter(username="arthur_araujo").count() == 1
