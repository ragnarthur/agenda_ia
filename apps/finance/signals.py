"""
Signals para criar categorias padrão para novos usuários.
"""

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


# Categorias padrão de despesas com cores distintas
DEFAULT_EXPENSE_CATEGORIES = [
    # Alimentação (tons de laranja)
    {"name": "Alimentação", "color": "#f97316", "group": "Alimentação"},
    {"name": "Mercado", "color": "#fb923c", "group": "Alimentação"},
    {"name": "Padaria e Lanches", "color": "#fdba74", "group": "Alimentação"},
    {"name": "Restaurantes e Delivery", "color": "#f59e0b", "group": "Alimentação"},
    # Transporte (tons de azul)
    {"name": "Transporte", "color": "#3b82f6", "group": "Transporte"},
    {"name": "Combustível", "color": "#60a5fa", "group": "Transporte"},
    {"name": "Estacionamento e Pedágio", "color": "#93c5fd", "group": "Transporte"},
    {"name": "Manutenção Veicular", "color": "#2563eb", "group": "Transporte"},
    # Moradia (tons de violeta/índigo)
    {"name": "Moradia", "color": "#8b5cf6", "group": "Moradia"},
    {"name": "Aluguel", "color": "#a78bfa", "group": "Moradia"},
    {"name": "Condomínio", "color": "#c4b5fd", "group": "Moradia"},
    {"name": "Energia Elétrica", "color": "#7c3aed", "group": "Moradia"},
    {"name": "Água e Esgoto", "color": "#6366f1", "group": "Moradia"},
    {"name": "Gás", "color": "#818cf8", "group": "Moradia"},
    {"name": "Internet e Telefonia", "color": "#a5b4fc", "group": "Moradia"},
    # Saúde (tons de vermelho)
    {"name": "Saúde", "color": "#ef4444", "group": "Saúde"},
    {"name": "Farmácia", "color": "#f87171", "group": "Saúde", "is_essential": True},
    # Família (tons de rosa)
    {"name": "Bebê e Criança", "color": "#ec4899", "group": "Família"},
    {"name": "Educação", "color": "#f472b6", "group": "Família"},
    # Lazer (tons de teal)
    {"name": "Lazer e Cultura", "color": "#14b8a6", "group": "Lazer"},
    {"name": "Streaming e Assinaturas", "color": "#2dd4bf", "group": "Lazer"},
    # Compras (tons de rose)
    {"name": "Compras e Vestuário", "color": "#f43f5e", "group": "Compras"},
    {"name": "Instrumentos", "color": "#fb7185", "group": "Compras"},
    {"name": "Tecnologia", "color": "#e11d48", "group": "Compras"},
    # Outros
    {"name": "Pets", "color": "#84cc16", "group": "Outros"},
    {"name": "Impostos e Taxas", "color": "#6b7280", "group": "Financeiro"},
    {"name": "Seguros", "color": "#9ca3af", "group": "Financeiro"},
    {"name": "Serviços Domésticos", "color": "#d4d4d8", "group": "Outros"},
    {"name": "Doações e Presentes", "color": "#fbbf24", "group": "Outros"},
    {"name": "Bancário e Juros", "color": "#475569", "group": "Financeiro"},
    {"name": "Outros", "color": "#78716c", "group": "Outros"},
]

# Categorias padrão de receitas (tons de verde)
DEFAULT_INCOME_CATEGORIES = [
    {"name": "Salário", "color": "#22c55e", "group": "Trabalho"},
    {"name": "Cachês", "color": "#16a34a", "group": "Trabalho"},
    {"name": "Aulas/CRAS", "color": "#4ade80", "group": "Trabalho"},
    {"name": "Freelance/Projetos", "color": "#86efac", "group": "Trabalho"},
    {"name": "Vendas", "color": "#10b981", "group": "Outros"},
    {"name": "Reembolsos", "color": "#34d399", "group": "Outros"},
    {"name": "Investimentos", "color": "#059669", "group": "Financeiro"},
    {"name": "Outros", "color": "#6ee7b7", "group": "Outros"},
]


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_categories(sender, instance, created, **kwargs):
    """Cria categorias padrão quando um novo usuário é criado."""
    if not created:
        return

    from .models import Category

    # Criar categorias de despesa
    for cat_data in DEFAULT_EXPENSE_CATEGORIES:
        Category.objects.get_or_create(
            user=instance,
            name=cat_data["name"],
            category_type="EXPENSE",
            defaults={
                "color": cat_data["color"],
                "group": cat_data.get("group", ""),
                "is_essential": cat_data.get("is_essential", False),
            },
        )

    # Criar categorias de receita
    for cat_data in DEFAULT_INCOME_CATEGORIES:
        Category.objects.get_or_create(
            user=instance,
            name=cat_data["name"],
            category_type="INCOME",
            defaults={
                "color": cat_data["color"],
                "group": cat_data.get("group", ""),
            },
        )
