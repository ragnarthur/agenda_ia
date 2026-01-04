"""
URL configuration for agenda_ia project.
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.ai.views import healthcheck

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # Health check
    path("api/health/", healthcheck, name="healthcheck"),
    # Auth (JWT)
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Apps
    path("api/", include("apps.finance.urls")),
    path("api/", include("apps.agenda.urls")),
    path("api/ai/", include("apps.ai.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]
