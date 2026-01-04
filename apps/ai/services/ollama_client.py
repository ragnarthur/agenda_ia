"""
Servico de integracao com LLM via API compativel com OpenAI.
Suporta Ollama local e Groq hospedado.
"""

import json
import logging
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional

import httpx
from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

SUPPORTED_LLM_PROVIDERS = {"ollama", "groq"}


@dataclass
class TransactionProposal:
    """Proposta de transação gerada pela IA."""

    transaction_type: str  # INCOME ou EXPENSE
    amount: Decimal
    date: str
    description: str
    category_suggestion: Optional[str] = None
    account_suggestion: Optional[str] = None
    confidence: float = 0.0


@dataclass
class MonthlyInsights:
    """Insights mensais gerados pela IA."""

    summary: str
    total_income: float
    total_expenses: float
    balance: float
    top_expenses: list
    recommendations: list


def get_llm_provider() -> str:
    """Retorna o provedor ativo de LLM."""
    provider = getattr(settings, "LLM_PROVIDER", "ollama") or "ollama"
    provider = provider.lower()
    if provider not in SUPPORTED_LLM_PROVIDERS:
        provider = "ollama"
    return provider


def get_llm_base_url() -> str:
    """Retorna a URL base do provedor ativo."""
    provider = get_llm_provider()
    if provider == "groq":
        return getattr(settings, "GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    return getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434/v1")


def get_llm_api_key() -> str:
    """Retorna a API key do provedor ativo."""
    provider = get_llm_provider()
    if provider == "groq":
        return getattr(settings, "GROQ_API_KEY", "")
    return getattr(settings, "OLLAMA_API_KEY", "") or "ollama"


def get_llm_model() -> str:
    """Retorna o modelo configurado para o provedor ativo."""
    provider = get_llm_provider()
    if provider == "groq":
        return getattr(settings, "GROQ_MODEL", "llama3-8b-8192")
    return getattr(settings, "OLLAMA_MODEL", "llama3.1:8b")


PARSE_TRANSACTION_PROMPT = """Você é um assistente que extrai informações financeiras de texto em português brasileiro.

Analise o texto e extraia:
- type: "INCOME" (receita/entrada) ou "EXPENSE" (despesa/saída)
- amount: valor numérico (apenas números, sem R$)
- date: data no formato YYYY-MM-DD (se não mencionada, use hoje: {today})
- description: descrição curta do que foi comprado/recebido
- category_suggestion: categoria sugerida (ex: Alimentação, Transporte, Instrumentos, Salário, Cachê, etc)
- account_suggestion: forma de pagamento se mencionada (PIX, Dinheiro, Cartão, Banco)
- confidence: sua confiança de 0.0 a 1.0

Categorias de despesas disponíveis:
{expense_categories}

Categorias de receitas disponíveis:
{income_categories}

Se nenhuma categoria se encaixar, use "Outros".

Responda APENAS com JSON válido, sem markdown ou explicações.

Exemplo de saída:
{{"type":"EXPENSE","amount":38.90,"date":"2026-01-02","description":"Cordas de violão","category_suggestion":"Instrumentos","account_suggestion":"PIX","confidence":0.85}}

Texto do usuário: {text}"""


def get_llm_client() -> OpenAI:
    """Retorna cliente do provedor ativo usando API compatível com OpenAI."""
    return OpenAI(api_key=get_llm_api_key(), base_url=get_llm_base_url())


def get_ollama_client() -> OpenAI:
    """Compat: retorna cliente do provedor ativo."""
    return get_llm_client()


def is_ollama_available() -> bool:
    """Verifica se o servidor de IA está disponível."""
    base_url = get_llm_base_url()
    api_key = get_llm_api_key()

    try:
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        response = httpx.get(f"{base_url}/models", headers=headers, timeout=5.0)
        return response.status_code == 200
    except Exception as e:
        logger.warning(f"Serviço de IA não disponível: {e}")
        return False


def get_available_models() -> list[str]:
    """Retorna lista de modelos disponíveis."""
    base_url = get_llm_base_url()
    api_key = get_llm_api_key()

    try:
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        response = httpx.get(f"{base_url}/models", headers=headers, timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            return [model["id"] for model in data.get("data", [])]
    except Exception as e:
        logger.warning(f"Erro ao listar modelos: {e}")
    return []


def _normalize_categories(categories: list[str] | None, limit: int = 30) -> list[str]:
    if not categories:
        return []

    cleaned = []
    seen = set()
    for name in categories:
        normalized = name.strip()
        if not normalized or normalized.lower() in seen:
            continue
        seen.add(normalized.lower())
        cleaned.append(normalized)
        if len(cleaned) >= limit:
            break
    return cleaned


def _format_categories(categories: list[str]) -> str:
    if not categories:
        return "- Nenhuma categoria cadastrada"
    return "\n".join(f"- {name}" for name in categories)


def parse_transaction_text(
    text: str,
    expense_categories: list[str] | None = None,
    income_categories: list[str] | None = None,
) -> tuple[TransactionProposal, dict]:
    """
    Analisa texto e retorna proposta de transação.

    Args:
        text: Texto livre do usuário descrevendo a transação

    Returns:
        tuple: (TransactionProposal, usage_info)

    Raises:
        ValueError: Se o LLM nao estiver disponivel ou resposta invalida
    """
    client = get_ollama_client()
    model = get_llm_model()

    expense_list = _normalize_categories(expense_categories)
    income_list = _normalize_categories(income_categories)

    prompt = PARSE_TRANSACTION_PROMPT.format(
        today=date.today().isoformat(),
        text=text.strip(),
        expense_categories=_format_categories(expense_list),
        income_categories=_format_categories(income_list),
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Você extrai dados financeiros de texto e responde apenas em JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=settings.AI_MAX_OUTPUT_TOKENS,
            temperature=settings.AI_TEMPERATURE,
        )

        content = response.choices[0].message.content.strip()

        # Remove possíveis marcadores de código markdown
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        # Parse JSON
        data = json.loads(content)

        raw_amount = data.get("amount", 0)
        amount_str = str(raw_amount).strip() or "0"
        if "," in amount_str and "." in amount_str:
            if amount_str.rfind(",") > amount_str.rfind("."):
                amount_str = amount_str.replace(".", "").replace(",", ".")
        elif "," in amount_str:
            amount_str = amount_str.replace(",", ".")

        # Cria proposta
        proposal = TransactionProposal(
            transaction_type=data.get("type", "EXPENSE"),
            amount=Decimal(amount_str),
            date=data.get("date", date.today().isoformat()),
            description=data.get("description", text[:50]),
            category_suggestion=data.get("category_suggestion"),
            account_suggestion=data.get("account_suggestion"),
            confidence=float(data.get("confidence", 0.5)),
        )

        # Info de uso para logging
        usage_info = {
            "model": model,
            "input_tokens": response.usage.prompt_tokens if response.usage else 0,
            "output_tokens": response.usage.completion_tokens if response.usage else 0,
            "total_tokens": response.usage.total_tokens if response.usage else 0,
        }

        logger.info(
            f"Parse transaction: {usage_info['total_tokens']} tokens usados"
        )

        return proposal, usage_info

    except json.JSONDecodeError as e:
        logger.error(f"Erro ao parsear JSON da IA: {e}")
        raise ValueError(f"Resposta inválida da IA: {e}")
    except Exception as e:
        logger.error(f"Erro na chamada LLM: {e}")
        raise


INSIGHTS_PROMPT = """Você é um consultor financeiro pessoal analisando os dados de {month}.

Dados do mês:
- Receitas: R$ {income:.2f}
- Despesas: R$ {expenses:.2f}
- Saldo: R$ {balance:.2f}

Top categorias de gasto:
{top_categories}

Gere um JSON com:
- summary: resumo de 1-2 frases sobre a saúde financeira do mês
- recommendations: lista de 2-4 dicas práticas e objetivas para melhorar

Seja direto e prático. Foque em ações concretas.
Responda APENAS com JSON válido, sem markdown.

Exemplo:
{{"summary":"Mês equilibrado com saldo positivo. Gastos com alimentação acima da média.","recommendations":["Reduzir pedidos de delivery em 20%","Separar 10% do saldo para reserva"]}}"""


def generate_monthly_insights(
    month: str,
    income: float,
    expenses: float,
    balance: float,
    top_categories: list[dict],
) -> tuple[MonthlyInsights, dict]:
    """
    Gera insights do mês baseado nos dados financeiros.

    Args:
        month: Mês no formato YYYY-MM
        income: Total de receitas
        expenses: Total de despesas
        balance: Saldo do mês
        top_categories: Lista de categorias com maior gasto

    Returns:
        tuple: (MonthlyInsights, usage_info)
    """
    client = get_ollama_client()
    model = get_llm_model()

    # Formata categorias para o prompt
    categories_text = "\n".join(
        f"- {cat.get('category__name', 'Sem categoria')}: R$ {cat.get('total', 0):.2f}"
        for cat in top_categories
    ) or "- Nenhuma categoria registrada"

    prompt = INSIGHTS_PROMPT.format(
        month=month,
        income=income,
        expenses=expenses,
        balance=balance,
        top_categories=categories_text,
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um consultor financeiro que responde apenas em JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=settings.AI_MAX_OUTPUT_TOKENS,
            temperature=settings.AI_TEMPERATURE,
        )

        content = response.choices[0].message.content.strip()

        # Remove possíveis marcadores de código markdown
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        data = json.loads(content)

        insights = MonthlyInsights(
            summary=data.get("summary", "Sem resumo disponível"),
            total_income=income,
            total_expenses=expenses,
            balance=balance,
            top_expenses=top_categories,
            recommendations=data.get("recommendations", []),
        )

        usage_info = {
            "model": model,
            "input_tokens": response.usage.prompt_tokens if response.usage else 0,
            "output_tokens": response.usage.completion_tokens if response.usage else 0,
            "total_tokens": response.usage.total_tokens if response.usage else 0,
        }

        logger.info(f"Insights: {usage_info['total_tokens']} tokens usados")

        return insights, usage_info

    except json.JSONDecodeError as e:
        logger.error(f"Erro ao parsear JSON da IA (insights): {e}")
        raise ValueError(f"Resposta inválida da IA: {e}")
    except Exception as e:
        logger.error(f"Erro na chamada LLM (insights): {e}")
        raise
