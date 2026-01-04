from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Event
from .serializers import EventSerializer


class EventFilter(filters.FilterSet):
    status = filters.CharFilter(field_name="status")
    event_type = filters.CharFilter(field_name="event_type")
    start_date = filters.DateFilter(field_name="start_datetime", lookup_expr="date__gte")
    end_date = filters.DateFilter(field_name="start_datetime", lookup_expr="date__lte")
    month = filters.CharFilter(method="filter_by_month")

    class Meta:
        model = Event
        fields = ["status", "event_type", "start_date", "end_date", "month"]

    def filter_by_month(self, queryset, name, value):
        """Filter by month in format YYYY-MM."""
        try:
            year, month = value.split("-")
            return queryset.filter(
                start_datetime__year=int(year), start_datetime__month=int(month)
            )
        except (ValueError, AttributeError):
            return queryset


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = EventFilter
    search_fields = ["title", "location", "notes"]
    ordering_fields = ["start_datetime", "expected_amount", "created_at"]

    def get_queryset(self):
        return Event.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
