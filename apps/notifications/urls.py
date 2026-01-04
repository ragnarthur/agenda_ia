from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"alert-rules", views.AlertRuleViewSet, basename="alert-rule")
router.register(r"", views.NotificationViewSet, basename="notification")

urlpatterns = [
    path("unread-count/", views.unread_count, name="unread-count"),
    path("", include(router.urls)),
]
