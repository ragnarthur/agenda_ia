from django.db.models import Count
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AlertRule, Notification
from .serializers import AlertRuleSerializer, NotificationSerializer


class AlertRuleFilter(filters.FilterSet):
    alert_type = filters.CharFilter(field_name="alert_type")
    is_enabled = filters.BooleanFilter(field_name="is_enabled")
    category = filters.NumberFilter(field_name="category_id")

    class Meta:
        model = AlertRule
        fields = ["alert_type", "is_enabled", "category"]


class AlertRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AlertRuleSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = AlertRuleFilter

    def get_queryset(self):
        return AlertRule.objects.filter(user=self.request.user).select_related("category")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def setup_defaults(self, request):
        """Cria regras de alerta padrão para o usuário."""
        defaults = [
            {"alert_type": AlertRule.AlertType.BUDGET_THRESHOLD, "threshold_percentage": 80},
            {"alert_type": AlertRule.AlertType.BUDGET_EXCEEDED},
            {"alert_type": AlertRule.AlertType.GOAL_ACHIEVED},
            {"alert_type": AlertRule.AlertType.UNUSUAL_EXPENSE},
            {"alert_type": AlertRule.AlertType.EVENT_PAYMENT},
        ]

        created = []
        for default in defaults:
            rule, was_created = AlertRule.objects.get_or_create(
                user=request.user,
                alert_type=default["alert_type"],
                category=None,
                defaults={
                    "is_enabled": True,
                    "threshold_percentage": default.get("threshold_percentage"),
                },
            )
            if was_created:
                created.append(AlertRuleSerializer(rule).data)

        return Response(
            {
                "message": f"{len(created)} regras criadas.",
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class NotificationFilter(filters.FilterSet):
    is_read = filters.BooleanFilter(field_name="is_read")
    notification_type = filters.CharFilter(field_name="notification_type")
    priority = filters.CharFilter(field_name="priority")

    class Meta:
        model = Notification
        fields = ["is_read", "notification_type", "priority"]


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = NotificationFilter
    http_method_names = ["get", "patch", "delete", "post"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST")

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        """Marca notificação como lida."""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def read_all(self, request):
        """Marca todas as notificações como lidas."""
        count = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"message": f"{count} notificações marcadas como lidas."})

    @action(detail=False, methods=["delete"])
    def clear_read(self, request):
        """Remove todas as notificações lidas."""
        count, _ = self.get_queryset().filter(is_read=True).delete()
        return Response({"message": f"{count} notificações removidas."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Retorna contagem de notificações não lidas."""
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    by_priority = (
        Notification.objects.filter(user=request.user, is_read=False)
        .values("priority")
        .annotate(count=Count("id"))
    )
    priority_counts = {item["priority"]: item["count"] for item in by_priority}

    return Response(
        {
            "unread_count": count,
            "by_priority": priority_counts,
        }
    )
