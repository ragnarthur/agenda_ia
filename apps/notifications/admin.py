from django.contrib import admin

from .models import AlertRule, Notification


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ["user", "alert_type", "is_enabled", "threshold_percentage", "category", "created_at"]
    list_filter = ["alert_type", "is_enabled"]
    search_fields = ["user__username"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["user", "title", "notification_type", "priority", "is_read", "created_at"]
    list_filter = ["notification_type", "priority", "is_read"]
    search_fields = ["user__username", "title", "message"]
