"""
URL configuration for agenda_ia project.
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.ai.views import healthcheck


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Return current authenticated user info."""
    user = request.user
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.get_full_name() or user.username,
    }, status=status.HTTP_200_OK)


urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # Health check
    path("api/health/", healthcheck, name="healthcheck"),
    # Auth (JWT)
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", get_current_user, name="current_user"),
    # Apps
    path("api/", include("apps.finance.urls")),
    path("api/", include("apps.agenda.urls")),
    path("api/ai/", include("apps.ai.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]
