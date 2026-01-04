from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"accounts", views.AccountViewSet, basename="account")
router.register(r"categories", views.CategoryViewSet, basename="category")
router.register(r"transactions", views.TransactionViewSet, basename="transaction")
router.register(r"budgets", views.BudgetViewSet, basename="budget")
router.register(r"goals", views.GoalViewSet, basename="goal")

urlpatterns = [
    path("", include(router.urls)),
    path("reports/monthly/", views.monthly_report, name="monthly-report"),
]
