import json
import logging

from django.conf import settings

from .ollama_client import get_llm_model, get_ollama_client

logger = logging.getLogger(__name__)


CATEGORIZE_PROMPT = """Você é um assistente que classifica transações financeiras.

Escolha a categoria MAIS adequada entre as opções disponíveis abaixo.

Categorias disponíveis:
{categories}

Responda APENAS com JSON válido, sem markdown.
Formato:
{{"category":"Nome da categoria ou null","confidence":0.0}}

Texto do usuário: {text}
"""


def categorize_transaction_text(text: str, categories: list[str]) -> tuple[str | None, float, dict]:
    """Sugere categoria para um texto de transação."""
    if not categories:
        return None, 0.0, {"model": get_llm_model(), "total_tokens": 0}

    client = get_ollama_client()
    model = get_llm_model()

    prompt = CATEGORIZE_PROMPT.format(
        categories="\n".join(f"- {name}" for name in categories),
        text=text.strip(),
    )

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Você classifica transações e responde apenas em JSON."},
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
        logger.error(f"Erro ao parsear JSON da IA (categorize): {exc}")
        raise ValueError(f"Resposta inválida da IA: {exc}") from exc

    suggestion = data.get("category")
    confidence = float(data.get("confidence", 0.5))

    if suggestion:
        normalized = suggestion.strip().lower()
        mapped = next(
            (name for name in categories if name.lower() == normalized),
            None,
        )
        if not mapped:
            fallback = next((name for name in categories if name.lower() == "outros"), None)
            suggestion = fallback
        else:
            suggestion = mapped

    usage_info = {
        "model": model,
        "input_tokens": response.usage.prompt_tokens if response.usage else 0,
        "output_tokens": response.usage.completion_tokens if response.usage else 0,
        "total_tokens": response.usage.total_tokens if response.usage else 0,
    }

    logger.info(f"Categorize: {usage_info['total_tokens']} tokens usados")
    return suggestion, confidence, usage_info
