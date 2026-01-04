from rest_framework import serializers

from .models import AlertRule, Notification


class AlertRuleSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(
        source="get_alert_type_display", read_only=True
    )
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = AlertRule
        fields = [
            "id",
            "alert_type",
            "alert_type_display",
            "is_enabled",
            "threshold_percentage",
            "category",
            "category_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        request = self.context.get("request")
        if not request or request.user.is_anonymous:
            return data

        category = data.get("category")
        if category and category.user_id != request.user.id:
            raise serializers.ValidationError(
                {"category": "Categoria não pertence ao usuário."}
            )

        alert_type = data.get("alert_type")
        if alert_type in [
            AlertRule.AlertType.BUDGET_THRESHOLD,
            AlertRule.AlertType.BUDGET_EXCEEDED,
        ]:
            if not data.get("threshold_percentage") and alert_type == AlertRule.AlertType.BUDGET_THRESHOLD:
                raise serializers.ValidationError(
                    {"threshold_percentage": "Percentual é obrigatório para alertas de orçamento."}
                )

        return data


class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(
        source="get_notification_type_display", read_only=True
    )
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "notification_type_display",
            "priority",
            "priority_display",
            "is_read",
            "action_url",
            "related_budget",
            "related_goal",
            "related_transaction",
            "created_at",
            "time_ago",
        ]
        read_only_fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "priority",
            "action_url",
            "related_budget",
            "related_goal",
            "related_transaction",
            "created_at",
        ]

    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        diff = now - obj.created_at

        if diff < timedelta(minutes=1):
            return "agora"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes}min"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}h"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days}d"
        else:
            return obj.created_at.strftime("%d/%m")
