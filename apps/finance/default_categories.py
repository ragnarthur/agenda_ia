"""
Categorias padrão do sistema organizadas por grupos.
Ícones usam nomes do Lucide Icons (https://lucide.dev).
"""

# Estrutura: grupo -> lista de categorias
EXPENSE_CATEGORIES = {
    "Alimentacao": {
        "color": "#f97316",
        "icon": "utensils",
        "categories": [
            {"name": "Mercado", "icon": "shopping-cart", "is_essential": True},
            {"name": "Restaurantes", "icon": "utensils", "is_essential": False},
            {"name": "Delivery", "icon": "bike", "is_essential": False},
            {"name": "Padaria e Lanches", "icon": "croissant", "is_essential": False},
            {"name": "Bebidas", "icon": "wine", "is_essential": False},
            {"name": "Cafe", "icon": "coffee", "is_essential": False},
        ],
    },
    "Moradia": {
        "color": "#8b5cf6",
        "icon": "home",
        "categories": [
            {"name": "Aluguel", "icon": "key", "is_essential": True},
            {"name": "Condominio", "icon": "building-2", "is_essential": True},
            {"name": "IPTU", "icon": "file-text", "is_essential": True},
            {"name": "Energia Eletrica", "icon": "zap", "is_essential": True},
            {"name": "Agua e Esgoto", "icon": "droplets", "is_essential": True},
            {"name": "Gas", "icon": "flame", "is_essential": True},
            {"name": "Internet", "icon": "wifi", "is_essential": True},
            {"name": "Telefone", "icon": "phone", "is_essential": False},
            {"name": "Manutencao Casa", "icon": "wrench", "is_essential": False},
            {"name": "Moveis e Decoracao", "icon": "sofa", "is_essential": False},
            {"name": "Limpeza e Higiene", "icon": "spray-can", "is_essential": True},
        ],
    },
    "Transporte": {
        "color": "#3b82f6",
        "icon": "car",
        "categories": [
            {"name": "Combustivel", "icon": "fuel", "is_essential": True},
            {"name": "Transporte Publico", "icon": "bus", "is_essential": True},
            {"name": "Uber e 99", "icon": "navigation", "is_essential": False},
            {"name": "Estacionamento", "icon": "parking-circle", "is_essential": False},
            {"name": "Pedagio", "icon": "circle-dollar-sign", "is_essential": False},
            {"name": "Manutencao Veiculo", "icon": "settings", "is_essential": True},
            {"name": "Seguro Veiculo", "icon": "shield", "is_essential": True},
            {"name": "IPVA e Licenciamento", "icon": "file-badge", "is_essential": True},
            {"name": "Multas", "icon": "alert-triangle", "is_essential": False},
        ],
    },
    "Saude": {
        "color": "#ef4444",
        "icon": "heart-pulse",
        "categories": [
            {"name": "Plano de Saude", "icon": "shield-plus", "is_essential": True},
            {"name": "Farmacia", "icon": "pill", "is_essential": True},
            {"name": "Consultas Medicas", "icon": "stethoscope", "is_essential": True},
            {"name": "Exames", "icon": "test-tubes", "is_essential": False},
            {"name": "Academia", "icon": "dumbbell", "is_essential": False},
            {"name": "Terapia", "icon": "brain", "is_essential": False},
            {"name": "Dentista", "icon": "smile", "is_essential": False},
            {"name": "Otica", "icon": "glasses", "is_essential": False},
        ],
    },
    "Educacao": {
        "color": "#14b8a6",
        "icon": "graduation-cap",
        "categories": [
            {"name": "Mensalidade Escolar", "icon": "school", "is_essential": True},
            {"name": "Cursos Online", "icon": "monitor-play", "is_essential": False},
            {"name": "Livros", "icon": "book-open", "is_essential": False},
            {"name": "Material Escolar", "icon": "pencil", "is_essential": False},
            {"name": "Idiomas", "icon": "languages", "is_essential": False},
            {"name": "Workshops e Eventos", "icon": "presentation", "is_essential": False},
        ],
    },
    "Lazer": {
        "color": "#ec4899",
        "icon": "party-popper",
        "categories": [
            {"name": "Streaming", "icon": "tv", "is_essential": False},
            {"name": "Cinema e Teatro", "icon": "clapperboard", "is_essential": False},
            {"name": "Viagens", "icon": "plane", "is_essential": False},
            {"name": "Hospedagem", "icon": "bed", "is_essential": False},
            {"name": "Hobbies", "icon": "palette", "is_essential": False},
            {"name": "Jogos", "icon": "gamepad-2", "is_essential": False},
            {"name": "Shows e Eventos", "icon": "ticket", "is_essential": False},
            {"name": "Bares e Baladas", "icon": "beer", "is_essential": False},
            {"name": "Esportes e Lazer", "icon": "bike", "is_essential": False},
        ],
    },
    "Compras": {
        "color": "#f59e0b",
        "icon": "shopping-bag",
        "categories": [
            {"name": "Vestuario", "icon": "shirt", "is_essential": False},
            {"name": "Calcados", "icon": "footprints", "is_essential": False},
            {"name": "Acessorios", "icon": "watch", "is_essential": False},
            {"name": "Eletronicos", "icon": "smartphone", "is_essential": False},
            {"name": "Presentes", "icon": "gift", "is_essential": False},
            {"name": "Cosmeticos", "icon": "sparkles", "is_essential": False},
        ],
    },
    "Trabalho e Musica": {
        "color": "#6366f1",
        "icon": "music",
        "categories": [
            {"name": "Instrumentos", "icon": "guitar", "is_essential": False},
            {"name": "Acessorios Musicais", "icon": "mic", "is_essential": False},
            {"name": "Manutencao Instrumentos", "icon": "wrench", "is_essential": False},
            {"name": "Software e Plugins", "icon": "music-2", "is_essential": False},
            {"name": "Equipamento de Som", "icon": "speaker", "is_essential": False},
            {"name": "Material Didatico", "icon": "book-music", "is_essential": False},
            {"name": "Marketing e Divulgacao", "icon": "megaphone", "is_essential": False},
            {"name": "Equipamento Trabalho", "icon": "laptop", "is_essential": False},
            {"name": "Transporte Trabalho", "icon": "truck", "is_essential": False},
        ],
    },
    "Financeiro": {
        "color": "#64748b",
        "icon": "landmark",
        "categories": [
            {"name": "Taxas Bancarias", "icon": "receipt", "is_essential": True},
            {"name": "Juros e Multas", "icon": "percent", "is_essential": False},
            {"name": "Emprestimos", "icon": "hand-coins", "is_essential": True},
            {"name": "Cartao de Credito", "icon": "credit-card", "is_essential": False},
            {"name": "Investimentos", "icon": "trending-up", "is_essential": False},
            {"name": "Seguros", "icon": "shield-check", "is_essential": True},
            {"name": "Impostos", "icon": "file-spreadsheet", "is_essential": True},
            {"name": "Contador", "icon": "calculator", "is_essential": False},
        ],
    },
    "Familia": {
        "color": "#f472b6",
        "icon": "users",
        "categories": [
            {"name": "Bebe e Criancas", "icon": "baby", "is_essential": False},
            {"name": "Escola dos Filhos", "icon": "school", "is_essential": True},
            {"name": "Mesada", "icon": "piggy-bank", "is_essential": False},
            {"name": "Atividades Filhos", "icon": "toy-brick", "is_essential": False},
        ],
    },
    "Outros": {
        "color": "#94a3b8",
        "icon": "more-horizontal",
        "categories": [
            {"name": "Pets", "icon": "dog", "is_essential": False},
            {"name": "Doacoes", "icon": "heart-handshake", "is_essential": False},
            {"name": "Servicos Domesticos", "icon": "home", "is_essential": False},
            {"name": "Assinaturas", "icon": "repeat", "is_essential": False},
            {"name": "Outros", "icon": "circle", "is_essential": False},
        ],
    },
}

INCOME_CATEGORIES = {
    "Trabalho": {
        "color": "#22c55e",
        "icon": "briefcase",
        "categories": [
            {"name": "Salario", "icon": "wallet", "is_essential": True},
            {"name": "Caches", "icon": "music", "is_essential": True},
            {"name": "Aulas Particulares", "icon": "presentation", "is_essential": True},
            {"name": "Aulas CRAS e Projetos", "icon": "users", "is_essential": True},
            {"name": "Freelance", "icon": "laptop", "is_essential": True},
            {"name": "Bonus e Comissoes", "icon": "star", "is_essential": False},
            {"name": "13o Salario", "icon": "gift", "is_essential": False},
            {"name": "Ferias", "icon": "palm-tree", "is_essential": False},
        ],
    },
    "Investimentos": {
        "color": "#10b981",
        "icon": "trending-up",
        "categories": [
            {"name": "Dividendos", "icon": "bar-chart-2", "is_essential": False},
            {"name": "Juros Recebidos", "icon": "percent", "is_essential": False},
            {"name": "Aluguel Recebido", "icon": "home", "is_essential": False},
            {"name": "Rendimento Poupanca", "icon": "piggy-bank", "is_essential": False},
            {"name": "Venda de Acoes", "icon": "trending-up", "is_essential": False},
        ],
    },
    "Outros": {
        "color": "#34d399",
        "icon": "plus-circle",
        "categories": [
            {"name": "Vendas", "icon": "tag", "is_essential": False},
            {"name": "Reembolsos", "icon": "rotate-ccw", "is_essential": False},
            {"name": "Presentes Recebidos", "icon": "gift", "is_essential": False},
            {"name": "Premios e Sorteios", "icon": "trophy", "is_essential": False},
            {"name": "Restituicao IR", "icon": "receipt", "is_essential": False},
            {"name": "Outros", "icon": "circle", "is_essential": False},
        ],
    },
}


def get_all_categories() -> list[dict]:
    """Retorna todas as categorias com seus metadados."""
    categories = []
    order = 0

    # Categorias de despesa
    for group_name, group_data in EXPENSE_CATEGORIES.items():
        for cat in group_data["categories"]:
            categories.append(
                {
                    "name": cat["name"],
                    "category_type": "EXPENSE",
                    "group": group_name,
                    "color": group_data["color"],
                    "icon": cat["icon"],
                    "is_essential": cat["is_essential"],
                    "is_system": True,
                    "order": order,
                }
            )
            order += 1

    # Categorias de receita
    order = 0
    for group_name, group_data in INCOME_CATEGORIES.items():
        for cat in group_data["categories"]:
            categories.append(
                {
                    "name": cat["name"],
                    "category_type": "INCOME",
                    "group": group_name,
                    "color": group_data["color"],
                    "icon": cat["icon"],
                    "is_essential": cat["is_essential"],
                    "is_system": True,
                    "order": order,
                }
            )
            order += 1

    return categories


def get_default_expense_category_names() -> list[str]:
    """Retorna lista de nomes de categorias de despesa."""
    names = []
    for group_data in EXPENSE_CATEGORIES.values():
        for cat in group_data["categories"]:
            names.append(cat["name"])
    return names


def get_default_income_category_names() -> list[str]:
    """Retorna lista de nomes de categorias de receita."""
    names = []
    for group_data in INCOME_CATEGORIES.values():
        for cat in group_data["categories"]:
            names.append(cat["name"])
    return names


def get_expense_groups() -> list[dict]:
    """Retorna lista de grupos de despesa com suas cores e ícones."""
    return [
        {"name": name, "color": data["color"], "icon": data["icon"]}
        for name, data in EXPENSE_CATEGORIES.items()
    ]


def get_income_groups() -> list[dict]:
    """Retorna lista de grupos de receita com suas cores e ícones."""
    return [
        {"name": name, "color": data["color"], "icon": data["icon"]}
        for name, data in INCOME_CATEGORIES.items()
    ]


def ensure_default_categories(user) -> int:
    """
    Cria categorias padrão para o usuário se não existirem.
    Retorna quantidade de categorias criadas.
    """
    from .models import Category

    existing = set(
        Category.objects.filter(user=user).values_list("name", "category_type")
    )
    to_create = []

    for data in get_all_categories():
        key = (data["name"], data["category_type"])
        if key in existing:
            continue
        to_create.append(Category(user=user, **data))

    if to_create:
        Category.objects.bulk_create(to_create)

    return len(to_create)


def get_category_for_event_type(event_type: str) -> str:
    """
    Retorna nome da categoria de receita para um tipo de evento.
    Usado na integração automática Evento → Transação.
    """
    mapping = {
        "AULA": "Aulas Particulares",
        "SHOW": "Caches",
        "FREELA": "Freelance",
        "OUTRO": "Outros",
    }
    return mapping.get(event_type, "Outros")


def get_category_defaults(name: str, category_type: str) -> dict | None:
    """
    Busca os defaults (cor, grupo, ícone) para uma categoria pelo nome.
    Retorna None se não encontrar nas categorias padrão.
    """
    source = EXPENSE_CATEGORIES if category_type == "EXPENSE" else INCOME_CATEGORIES

    for group_name, group_data in source.items():
        for cat in group_data["categories"]:
            if cat["name"].lower() == name.lower():
                return {
                    "group": group_name,
                    "color": group_data["color"],
                    "icon": cat["icon"],
                    "is_essential": cat["is_essential"],
                }

    # Não encontrou nas categorias padrão, retorna defaults genéricos
    return None


def get_or_create_category(user, name: str, category_type: str):
    """
    Busca ou cria uma categoria para o usuário.
    Se a categoria já existe, retorna ela.
    Se não existe, cria com os defaults corretos.
    """
    from .models import Category

    # Primeiro tenta encontrar a categoria existente
    category = Category.objects.filter(
        user=user,
        name__iexact=name,
        category_type=category_type,
    ).first()

    if category:
        return category

    # Busca os defaults da categoria
    defaults = get_category_defaults(name, category_type)

    if defaults:
        category = Category.objects.create(
            user=user,
            name=name,
            category_type=category_type,
            group=defaults["group"],
            color=defaults["color"],
            icon=defaults["icon"],
            is_essential=defaults["is_essential"],
            is_system=False,
        )
    else:
        # Categoria personalizada - usa defaults genéricos
        default_color = "#6366f1" if category_type == "EXPENSE" else "#22c55e"
        category = Category.objects.create(
            user=user,
            name=name,
            category_type=category_type,
            group="Outros",
            color=default_color,
            icon="circle",
            is_essential=False,
            is_system=False,
        )

    return category
