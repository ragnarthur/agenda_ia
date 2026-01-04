from django.contrib import admin

from .models import Account, Budget, Category, Goal, GoalContribution, Transaction


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ["name", "account_type", "user", "is_active", "created_at"]
    list_filter = ["account_type", "is_active"]
    search_fields = ["name", "user__username"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "category_type", "user", "color", "created_at"]
    list_filter = ["category_type"]
    search_fields = ["name", "user__username"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "description",
        "transaction_type",
        "amount",
        "date",
        "category",
        "account",
        "user",
        "is_confirmed",
    ]
    list_filter = ["transaction_type", "is_confirmed", "date", "category"]
    search_fields = ["description", "notes", "tags", "user__username"]
    date_hierarchy = "date"


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = [
        "category",
        "user",
        "amount",
        "period_type",
        "is_active",
        "start_date",
        "end_date",
    ]
    list_filter = ["period_type", "is_active"]
    search_fields = ["category__name", "user__username"]


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "user",
        "goal_type",
        "target_amount",
        "current_amount",
        "status",
        "target_date",
    ]
    list_filter = ["goal_type", "status"]
    search_fields = ["name", "user__username"]


@admin.register(GoalContribution)
class GoalContributionAdmin(admin.ModelAdmin):
    list_display = ["goal", "amount", "date", "transaction", "created_at"]
    list_filter = ["date"]
    search_fields = ["goal__name", "transaction__description"]
