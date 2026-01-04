from rest_framework import serializers

from .default_categories import get_or_create_category
from .models import Account, Budget, Category, Goal, GoalContribution, Transaction


class AccountSerializer(serializers.ModelSerializer):
    account_type_display = serializers.CharField(
        source="get_account_type_display", read_only=True
    )

    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "account_type",
            "account_type_display",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CategorySerializer(serializers.ModelSerializer):
    category_type_display = serializers.CharField(
        source="get_category_type_display", read_only=True
    )
    parent_name = serializers.CharField(source="parent.name", read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "category_type",
            "category_type_display",
            "group",
            "parent",
            "parent_name",
            "color",
            "icon",
            "is_essential",
            "is_system",
            "order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system", "created_at", "updated_at"]


class TransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(
        source="get_transaction_type_display", read_only=True
    )
    category_name = serializers.CharField(source="category.name", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)
    source_event_title = serializers.CharField(
        source="source_event.title", read_only=True
    )
    tags_list = serializers.ListField(read_only=True)

    # Campo para criar categoria automaticamente se não existir
    category_suggestion = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )

    class Meta:
        model = Transaction
        fields = [
            "id",
            "transaction_type",
            "transaction_type_display",
            "amount",
            "date",
            "description",
            "category",
            "category_name",
            "category_suggestion",
            "account",
            "account_name",
            "tags",
            "tags_list",
            "notes",
            "is_confirmed",
            "source_event",
            "source_event_title",
            "ai_categorized",
            "ai_confidence",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "source_event",
            "ai_categorized",
            "ai_confidence",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        request = self.context.get("request")
        if not request or request.user.is_anonymous:
            return data

        if "category" in data and data["category"] is not None:
            if data["category"].user_id != request.user.id:
                raise serializers.ValidationError(
                    {"category": "Categoria não pertence ao usuário."}
                )

        if "account" in data and data["account"] is not None:
            if data["account"].user_id != request.user.id:
                raise serializers.ValidationError(
                    {"account": "Conta não pertence ao usuário."}
                )

        return data

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("O valor deve ser maior que zero.")
        return value

    def create(self, validated_data):
        # Extrai category_suggestion antes de criar
        category_suggestion = validated_data.pop("category_suggestion", None)

        # Se não tem category mas tem category_suggestion, cria/busca a categoria
        if validated_data.get("category") is None and category_suggestion:
            request = self.context.get("request")
            if request and request.user:
                transaction_type = validated_data.get("transaction_type")
                category_type = (
                    Category.CategoryType.INCOME
                    if transaction_type == Transaction.TransactionType.INCOME
                    else Category.CategoryType.EXPENSE
                )
                category = get_or_create_category(
                    user=request.user,
                    name=category_suggestion,
                    category_type=category_type,
                )
                validated_data["category"] = category
                validated_data["ai_categorized"] = True

        return super().create(validated_data)


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    period_type_display = serializers.CharField(
        source="get_period_type_display", read_only=True
    )

    class Meta:
        model = Budget
        fields = [
            "id",
            "category",
            "category_name",
            "amount",
            "period_type",
            "period_type_display",
            "alert_threshold",
            "is_active",
            "start_date",
            "end_date",
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
        if category and category.category_type != Category.CategoryType.EXPENSE:
            raise serializers.ValidationError(
                {"category": "Orçamentos devem ser vinculados a categorias de despesa."}
            )

        start_date = data.get("start_date")
        end_date = data.get("end_date")
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "A data fim deve ser igual ou posterior à data início."}
            )

        return data

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("O limite deve ser maior que zero.")
        return value

    def validate_alert_threshold(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("O alerta deve estar entre 0 e 100%.")
        return value


class GoalContributionSerializer(serializers.ModelSerializer):
    transaction_description = serializers.CharField(
        source="transaction.description", read_only=True
    )

    class Meta:
        model = GoalContribution
        fields = [
            "id",
            "goal",
            "amount",
            "date",
            "transaction",
            "transaction_description",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "goal", "created_at"]

    def validate(self, data):
        request = self.context.get("request")
        if not request or request.user.is_anonymous:
            return data

        transaction = data.get("transaction")
        if transaction and transaction.user_id != request.user.id:
            raise serializers.ValidationError(
                {"transaction": "Transação não pertence ao usuário."}
            )

        return data

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("O valor deve ser maior que zero.")
        return value


class GoalSerializer(serializers.ModelSerializer):
    linked_account_name = serializers.CharField(
        source="linked_account.name", read_only=True
    )
    progress_percentage = serializers.FloatField(read_only=True)
    remaining_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    is_achieved = serializers.BooleanField(read_only=True)
    contributions = GoalContributionSerializer(many=True, read_only=True)

    class Meta:
        model = Goal
        fields = [
            "id",
            "name",
            "goal_type",
            "target_amount",
            "current_amount",
            "target_date",
            "status",
            "linked_account",
            "linked_account_name",
            "icon",
            "color",
            "notes",
            "progress_percentage",
            "remaining_amount",
            "is_achieved",
            "contributions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        request = self.context.get("request")
        if not request or request.user.is_anonymous:
            return data

        linked_account = data.get("linked_account")
        if linked_account and linked_account.user_id != request.user.id:
            raise serializers.ValidationError(
                {"linked_account": "Conta não pertence ao usuário."}
            )

        return data

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("O valor da meta deve ser maior que zero.")
        return value
