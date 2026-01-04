from decimal import Decimal
from unittest.mock import patch

import pytest

from apps.ai.services.ollama_client import parse_transaction_text


class FakeResponse:
    def __init__(self, content: str):
        self.choices = [
            type(
                "Choice",
                (),
                {"message": type("Message", (), {"content": content})()},
            )
        ]
        self.usage = type(
            "Usage",
            (),
            {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        )()


class FakeChatCompletions:
    def __init__(self, content: str):
        self._content = content

    def create(self, *args, **kwargs):
        return FakeResponse(self._content)


class FakeChat:
    def __init__(self, content: str):
        self._content = content
        self.completions = FakeChatCompletions(content)


class FakeClient:
    def __init__(self, content: str):
        self.chat = FakeChat(content)


@pytest.mark.django_db
@patch("apps.ai.services.ollama_client.get_ollama_client")
def test_parse_transaction_text_handles_comma_amount(mock_client):
    content = (
        '{"type":"EXPENSE","amount":"38,90","date":"2026-01-02",'
        '"description":"Cordas","confidence":0.8}'
    )
    mock_client.return_value = FakeClient(content)

    proposal, usage = parse_transaction_text("paguei 38,90 em cordas")

    assert proposal.amount == Decimal("38.90")
    assert usage["total_tokens"] == 2


@pytest.mark.django_db
@patch("apps.ai.services.ollama_client.get_ollama_client")
def test_parse_transaction_text_handles_income(mock_client):
    content = (
        '{"type":"INCOME","amount":500.00,"date":"2026-01-02",'
        '"description":"Cachê show","category_suggestion":"Cachê","confidence":0.9}'
    )
    mock_client.return_value = FakeClient(content)

    proposal, usage = parse_transaction_text("recebi 500 reais de cachê")

    assert proposal.transaction_type == "INCOME"
    assert proposal.amount == Decimal("500.00")
    assert proposal.category_suggestion == "Cachê"


@pytest.mark.django_db
@patch("apps.ai.services.ollama_client.get_ollama_client")
def test_parse_transaction_text_handles_markdown_response(mock_client):
    content = (
        '```json\n{"type":"EXPENSE","amount":50,"date":"2026-01-02",'
        '"description":"Almoço","confidence":0.85}\n```'
    )
    mock_client.return_value = FakeClient(content)

    proposal, usage = parse_transaction_text("almocei por 50 reais")

    assert proposal.amount == Decimal("50")
    assert proposal.description == "Almoço"
