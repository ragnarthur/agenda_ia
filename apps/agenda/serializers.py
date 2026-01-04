from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    event_type_display = serializers.CharField(
        source="get_event_type_display", read_only=True
    )
    linked_transaction_description = serializers.CharField(
        source="linked_transaction.description", read_only=True
    )

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "event_type",
            "event_type_display",
            "start_datetime",
            "end_datetime",
            "location",
            "expected_amount",
            "actual_amount",
            "status",
            "status_display",
            "payment_date",
            "client_name",
            "auto_create_transaction",
            "linked_transaction",
            "linked_transaction_description",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "linked_transaction",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        start = data.get("start_datetime")
        end = data.get("end_datetime")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_datetime": "O fim deve ser após o início."}
            )
        return data
