from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "event_type",
        "start_datetime",
        "expected_amount",
        "status",
        "user",
    ]
    list_filter = ["event_type", "status", "start_datetime"]
    search_fields = ["title", "location", "notes", "user__username"]
    date_hierarchy = "start_datetime"
