import json
import logging
from dataclasses import dataclass

from django.conf import settings

from .ollama_client import get_llm_model, get_ollama_client

logger = logging.getLogger(__name__)


@dataclass
class BudgetCheckResult:
    summary: str
    alerts: list
    recommendations: list


BUDGET_CHECK_PROMPT = """Você é um consultor financeiro.

Analise os orçamentos abaixo e gere:
- summary: resumo curto da situação
- alerts: lista de alertas objetivos (quando orçamentos estão próximos ou estourados)
- recommendations: 2-4 recomendações práticas

Orçamentos:
{budgets}

Responda APENAS com JSON válido.
"""


def generate_budget_check(status_list: list[dict]) -> tuple[BudgetCheckResult, dict]:
    """Gera análise de orçamentos e recomendações."""
    client = get_ollama_client()
    model = get_llm_model()

    budget_lines = [
        (
            f"- {item['category_name']}: limite {item['amount']:.2f}, "
            f"gasto {item['spent']:.2f}, usado {item['percentage_used']:.1f}%, "
            f"alerta {item['alert_threshold']}%"
        )
        for item in status_list
    ]

    prompt = BUDGET_CHECK_PROMPT.format(budgets="\n".join(budget_lines))

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Você responde apenas em JSON sobre orçamentos."},
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
        logger.error(f"Erro ao parsear JSON da IA (budget-check): {exc}")
        raise ValueError(f"Resposta inválida da IA: {exc}") from exc

    result = BudgetCheckResult(
        summary=data.get("summary", "Sem resumo disponível"),
        alerts=data.get("alerts", []),
        recommendations=data.get("recommendations", []),
    )

    usage_info = {
        "model": model,
        "input_tokens": response.usage.prompt_tokens if response.usage else 0,
        "output_tokens": response.usage.completion_tokens if response.usage else 0,
        "total_tokens": response.usage.total_tokens if response.usage else 0,
    }

    logger.info(f"Budget check: {usage_info['total_tokens']} tokens usados")
    return result, usage_info
