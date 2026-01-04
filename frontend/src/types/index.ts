// Auth types
export interface User {
  id: number
  username: string
  email: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

// Finance types
export interface Account {
  id: number
  name: string
  account_type: string
  account_type_display: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  category_type: "INCOME" | "EXPENSE"
  category_type_display: string
  group: string
  parent: number | null
  parent_name: string | null
  color: string
  icon: string
  is_essential: boolean
  is_system: boolean
  order: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  transaction_type: "INCOME" | "EXPENSE"
  transaction_type_display: string
  amount: string
  date: string
  description: string
  category: number | null
  category_name: string | null
  account: number | null
  account_name: string | null
  tags: string
  tags_list: string[]
  notes: string
  is_confirmed: boolean
  source_event: number | null
  source_event_title: string | null
  ai_categorized: boolean
  ai_confidence: number | null
  created_at: string
  updated_at: string
}

export interface Budget {
  id: number
  category: number
  category_name: string
  amount: string
  period_type: "WEEKLY" | "MONTHLY" | "YEARLY"
  period_type_display: string
  alert_threshold: number
  is_active: boolean
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface BudgetStatus {
  id: number
  category: number
  category_name: string
  amount: number
  spent: number
  remaining: number
  percentage_used: number
  alert_threshold: number
  alert_reached: boolean
  period_type: "WEEKLY" | "MONTHLY" | "YEARLY"
  period_start: string
  period_end: string
}

export interface GoalContribution {
  id: number
  goal: number
  amount: string
  date: string
  transaction: number | null
  transaction_description: string | null
  notes: string
  created_at: string
}

export interface Goal {
  id: number
  name: string
  goal_type: "SAVINGS" | "DEBT" | "INVESTMENT" | "PURCHASE" | "EMERGENCY" | "CUSTOM"
  target_amount: string
  current_amount: string
  target_date: string | null
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED"
  linked_account: number | null
  linked_account_name: string | null
  icon: string
  color: string
  notes: string
  progress_percentage: number
  remaining_amount: string
  is_achieved: boolean
  contributions: GoalContribution[]
  created_at: string
  updated_at: string
}

export interface AgendaEvent {
  id: number
  title: string
  event_type: "AULA" | "SHOW" | "FREELA" | "OUTRO"
  event_type_display: string
  start_datetime: string
  end_datetime: string | null
  location: string
  expected_amount: string | null
  actual_amount: string | null
  status: "PENDENTE" | "PAGO" | "CANCELADO"
  status_display: string
  payment_date: string | null
  client_name: string
  auto_create_transaction: boolean
  linked_transaction: number | null
  linked_transaction_description: string | null
  notes: string
  created_at: string
  updated_at: string
}

// AI types
export interface TransactionProposal {
  type: "INCOME" | "EXPENSE"
  amount: number
  date: string
  description: string
  category_suggestion: string | null
  account_suggestion: string | null
  confidence: number
}

export interface ParseTransactionResponse {
  proposal: TransactionProposal
  usage: {
    tokens_used: number
    requests_remaining: number
  }
}

export interface InsightsResponse {
  month: string
  summary: string
  total_income: number
  total_expenses: number
  balance: number
  top_expenses: Array<{
    category: string
    total: number
  }>
  recommendations: string[]
  usage: {
    tokens_used: number
    requests_remaining: number
  }
}

export interface ChatMessage {
  id: number
  role: "user" | "assistant"
  content: string
  tokens_used: number
  created_at: string
}

export interface ChatConversation {
  id: number
  title: string
  is_active: boolean
  updated_at: string
  last_message?: string
}

export interface ChatConversationDetail {
  id: number
  title: string
  messages: ChatMessage[]
}

export interface ChatResponse {
  conversation_id: number
  message: string
  usage: {
    tokens_used: number
    requests_remaining: number
  }
}

export interface CategorizeResponse {
  suggestion: {
    id: number | null
    name: string | null
  }
  confidence: number
  usage: {
    tokens_used: number
    requests_remaining: number
  }
}

export interface ForecastResponse {
  history: Array<{
    month: string
    income: number
    expenses: number
    balance: number
  }>
  forecast: {
    summary: string
    forecast_income: number
    forecast_expenses: number
    forecast_balance: number
    recommendations: string[]
  }
  usage: {
    tokens_used: number
    requests_remaining: number
  }
}

export interface BudgetCheckResponse {
  summary: string
  alerts: string[]
  recommendations: string[]
  budgets: BudgetStatus[]
  usage: {
    tokens_used: number
    requests_remaining: number
  }
}

// Notification types
export interface Notification {
  id: number
  title: string
  message: string
  notification_type: "INFO" | "WARNING" | "SUCCESS" | "ERROR"
  notification_type_display: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  priority_display: string
  is_read: boolean
  action_url: string
  related_budget: number | null
  related_goal: number | null
  related_transaction: number | null
  created_at: string
  time_ago: string
}

export interface AlertRule {
  id: number
  alert_type: string
  alert_type_display: string
  is_enabled: boolean
  threshold_percentage: number | null
  category: number | null
  category_name: string | null
  created_at: string
  updated_at: string
}

export interface UnreadCountResponse {
  unread_count: number
  by_priority: Record<string, number>
}

// API types
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  error: string
  detail?: string
}
