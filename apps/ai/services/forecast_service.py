import json
import logging
from dataclasses import dataclass

from django.conf import settings

from .ollama_client import get_llm_model, get_ollama_client

logger = logging.getLogger(__name__)


@dataclass
class ForecastResult:
    summary: str
    forecast_income: float
    forecast_expenses: float
    forecast_balance: float
    recommendations: list


FORECAST_PROMPT = """Você é um analista financeiro pessoal.

Com base no histórico abaixo, estime o próximo mês.
Retorne JSON com:
- summary: resumo curto do cenário esperado
- forecast_income: valor previsto de receitas
- forecast_expenses: valor previsto de despesas
- forecast_balance: saldo previsto
- recommendations: 2-4 recomendações práticas

Histórico:
{history}

Responda APENAS com JSON válido.
"""


def generate_cashflow_forecast(history: list[dict]) -> tuple[ForecastResult, dict]:
    """Gera previsão de fluxo de caixa com base no histórico."""
    client = get_ollama_client()
    model = get_llm_model()

    history_lines = [
        f"- {item['month']}: receitas {item['income']:.2f}, despesas {item['expenses']:.2f}, saldo {item['balance']:.2f}"
        for item in history
    ]
    prompt = FORECAST_PROMPT.format(history="\n".join(history_lines))

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Você responde apenas em JSON com previsões financeiras."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=settings.AI_MAX_OUTPUT_TOKENS,
        temperature=settings.AI_TEMPERATURE,
    )

    content = response.choices[0].message.content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        logger.error(f"Erro ao parsear JSON da IA (forecast): {exc}")
        raise ValueError(f"Resposta inválida da IA: {exc}") from exc

    result = ForecastResult(
        summary=data.get("summary", "Sem resumo disponível"),
        forecast_income=float(data.get("forecast_income", 0)),
        forecast_expenses=float(data.get("forecast_expenses", 0)),
        forecast_balance=float(data.get("forecast_balance", 0)),
        recommendations=data.get("recommendations", []),
    )

    usage_info = {
        "model": model,
        "input_tokens": response.usage.prompt_tokens if response.usage else 0,
        "output_tokens": response.usage.completion_tokens if response.usage else 0,
        "total_tokens": response.usage.total_tokens if response.usage else 0,
    }

    logger.info(f"Forecast: {usage_info['total_tokens']} tokens usados")
    return result, usage_info
