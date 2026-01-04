from django.contrib import admin

from .models import AIUsageLog, ChatConversation, ChatMessage


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "feature",
        "model_name",
        "input_chars",
        "output_chars",
        "success",
        "created_at",
    ]
    list_filter = ["feature", "model_name", "success", "created_at"]
    search_fields = ["user__username", "input_text", "error_message"]
    readonly_fields = [
        "user",
        "feature",
        "input_text",
        "input_chars",
        "output_chars",
        "model_name",
        "success",
        "error_message",
        "created_at",
    ]


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "is_active", "updated_at"]
    list_filter = ["is_active"]
    search_fields = ["title", "user__username"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["conversation", "role", "tokens_used", "created_at"]
    list_filter = ["role"]
    search_fields = ["conversation__title", "content"]
