import pytest

from apps.finance.default_categories import ensure_default_categories
from apps.finance.models import Category


@pytest.mark.django_db
def test_ensure_default_categories_creates_once(user):
    created = ensure_default_categories(user)
    assert created > 0
    assert Category.objects.filter(user=user).count() == created

    created_again = ensure_default_categories(user)
    assert created_again == 0
