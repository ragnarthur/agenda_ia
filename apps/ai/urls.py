from django.urls import path

from . import views

urlpatterns = [
    path("parse-transaction/", views.parse_transaction, name="parse-transaction"),
    path("insights/", views.insights, name="insights"),
    path("categorize/", views.categorize, name="categorize"),
    path("forecast/", views.forecast, name="forecast"),
    path("budget-check/", views.budget_check, name="budget-check"),
    path("chat/", views.chat, name="chat"),
    path(
        "chat/conversations/",
        views.chat_conversations,
        name="chat-conversations",
    ),
    path(
        "chat/conversations/<int:conversation_id>/",
        views.chat_conversation_detail,
        name="chat-conversation-detail",
    ),
]
