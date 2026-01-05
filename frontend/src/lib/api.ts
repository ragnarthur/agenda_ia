import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import type {
  AuthTokens,
  ParseTransactionResponse,
  InsightsResponse,
  ChatConversation,
  ChatConversationDetail,
  ChatResponse,
  CategorizeResponse,
  ForecastResponse,
  BudgetCheckResponse,
  Transaction,
  Category,
  Account,
  Budget,
  BudgetStatus,
  Goal,
  AgendaEvent,
  PaginatedResponse,
  Notification,
  AlertRule,
  UnreadCountResponse,
} from "../types"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
})

// Token management
const TOKEN_KEY = "auth_tokens"

export function getStoredTokens(): AuthTokens | null {
  const tokens = localStorage.getItem(TOKEN_KEY)
  return tokens ? JSON.parse(tokens) : null
}

export function setStoredTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

export function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// Request interceptor - add auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = getStoredTokens()
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`
  }
  return config
})

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const tokens = getStoredTokens()

      if (tokens?.refresh) {
        try {
          const response = await axios.post<AuthTokens>(
            `${API_URL}/api/auth/token/refresh/`,
            { refresh: tokens.refresh }
          )
          setStoredTokens(response.data)
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`
          return api(originalRequest)
        } catch {
          clearStoredTokens()
          window.location.href = "/login"
        }
      }
    }
    return Promise.reject(error)
  }
)

// User info type
export interface UserInfo {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
}

// Auth API
export const authApi = {
  login: async (username: string, password: string): Promise<AuthTokens> => {
    const response = await api.post<AuthTokens>("/auth/token/", {
      username,
      password,
    })
    setStoredTokens(response.data)
    return response.data
  },

  logout: () => {
    clearStoredTokens()
  },

  isAuthenticated: (): boolean => {
    return !!getStoredTokens()?.access
  },

  getCurrentUser: async (): Promise<UserInfo> => {
    const response = await api.get<UserInfo>("/auth/me/")
    return response.data
  },
}

// Finance API
export const financeApi = {
  // Transactions
  getTransactions: async (params?: {
    month?: string
    type?: string
    category?: number
  }): Promise<PaginatedResponse<Transaction>> => {
    const response = await api.get<PaginatedResponse<Transaction>>(
      "/transactions/",
      { params }
    )
    return response.data
  },

  createTransaction: async (data: {
    transaction_type: "INCOME" | "EXPENSE"
    amount: number | string
    date: string
    description: string
    category?: number | null
    category_suggestion?: string
    account?: number | null
    tags?: string
    notes?: string
  }): Promise<Transaction> => {
    const response = await api.post<Transaction>("/transactions/", data)
    return response.data
  },

  updateTransaction: async (
    id: number,
    data: Partial<{
      transaction_type: "INCOME" | "EXPENSE"
      amount: number | string
      date: string
      description: string
      category?: number | null
      account?: number | null
      tags?: string
      notes?: string
    }>
  ): Promise<Transaction> => {
    const response = await api.patch<Transaction>(`/transactions/${id}/`, data)
    return response.data
  },

  deleteTransaction: async (id: number): Promise<void> => {
    await api.delete(`/transactions/${id}/`)
  },

  // Categories (returns all without pagination)
  getCategories: async (
    type?: "INCOME" | "EXPENSE"
  ): Promise<PaginatedResponse<Category>> => {
    const response = await api.get<Category[]>(
      "/categories/",
      { params: { type } }
    )
    // Wrap in PaginatedResponse format for compatibility
    return {
      count: response.data.length,
      next: null,
      previous: null,
      results: response.data,
    }
  },

  createCategory: async (data: Partial<Category>): Promise<Category> => {
    const response = await api.post<Category>("/categories/", data)
    return response.data
  },

  // Accounts
  getAccounts: async (): Promise<PaginatedResponse<Account>> => {
    const response = await api.get<PaginatedResponse<Account>>("/accounts/")
    return response.data
  },

  createAccount: async (data: Partial<Account>): Promise<Account> => {
    const response = await api.post<Account>("/accounts/", data)
    return response.data
  },

  // Reports
  getMonthlyReport: async (
    month: string
  ): Promise<{
    month: string
    income: number
    expenses: number
    balance: number
    top_expense_categories: Array<{
      category__name: string | null
      category__color?: string | null
      total: number
    }>
    transaction_count: number
  }> => {
    const response = await api.get("/reports/monthly/", { params: { month } })
    return response.data
  },

  // Budgets
  getBudgets: async (params?: {
    category?: number
    is_active?: boolean
    period_type?: "WEEKLY" | "MONTHLY" | "YEARLY"
  }): Promise<PaginatedResponse<Budget>> => {
    const response = await api.get<PaginatedResponse<Budget>>("/budgets/", {
      params,
    })
    return response.data
  },

  createBudget: async (data: {
    category: number
    amount: number | string
    period_type: "WEEKLY" | "MONTHLY" | "YEARLY"
    alert_threshold?: number
    is_active?: boolean
    start_date: string
    end_date?: string | null
  }): Promise<Budget> => {
    const response = await api.post<Budget>("/budgets/", data)
    return response.data
  },

  getBudgetStatus: async (): Promise<BudgetStatus[]> => {
    const response = await api.get<BudgetStatus[]>("/budgets/status/")
    return response.data
  },

  // Goals
  getGoals: async (params?: {
    status?: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED"
    goal_type?: Goal["goal_type"]
  }): Promise<PaginatedResponse<Goal>> => {
    const response = await api.get<PaginatedResponse<Goal>>("/goals/", { params })
    return response.data
  },

  createGoal: async (data: {
    name: string
    goal_type: Goal["goal_type"]
    target_amount: number | string
    current_amount?: number | string
    target_date?: string | null
    status?: Goal["status"]
    linked_account?: number | null
    icon?: string
    color?: string
    notes?: string
  }): Promise<Goal> => {
    const response = await api.post<Goal>("/goals/", data)
    return response.data
  },

  contributeGoal: async (
    goalId: number,
    data: {
      amount: number | string
      date: string
      transaction?: number | null
      notes?: string
    }
  ): Promise<Goal> => {
    const response = await api.post<Goal>(`/goals/${goalId}/contribute/`, data)
    return response.data
  },
}

// Agenda API
export const agendaApi = {
  getEvents: async (params?: {
    month?: string
    status?: string
    event_type?: string
  }): Promise<PaginatedResponse<AgendaEvent>> => {
    const response = await api.get<PaginatedResponse<AgendaEvent>>("/events/", {
      params,
    })
    return response.data
  },

  createEvent: async (data: {
    title: string
    event_type: "AULA" | "SHOW" | "FREELA" | "OUTRO"
    start_datetime: string
    end_datetime?: string | null
    location?: string
    expected_amount?: number | string | null
    actual_amount?: number | string | null
    status?: "PENDENTE" | "PAGO" | "CANCELADO"
    payment_date?: string | null
    client_name?: string
    auto_create_transaction?: boolean
    notes?: string
  }): Promise<AgendaEvent> => {
    const response = await api.post<AgendaEvent>("/events/", data)
    return response.data
  },

  updateEvent: async (
    id: number,
    data: Partial<{
      title: string
      event_type: "AULA" | "SHOW" | "FREELA" | "OUTRO"
      start_datetime: string
      end_datetime?: string | null
      location?: string
      expected_amount?: number | string | null
      actual_amount?: number | string | null
      status?: "PENDENTE" | "PAGO" | "CANCELADO"
      payment_date?: string | null
      client_name?: string
      auto_create_transaction?: boolean
      notes?: string
    }>
  ): Promise<AgendaEvent> => {
    const response = await api.patch<AgendaEvent>(`/events/${id}/`, data)
    return response.data
  },

  deleteEvent: async (id: number): Promise<void> => {
    await api.delete(`/events/${id}/`)
  },
}

// AI API
export const aiApi = {
  parseTransaction: async (
    text: string
  ): Promise<ParseTransactionResponse> => {
    const response = await api.post<ParseTransactionResponse>(
      "/ai/parse-transaction/",
      { text }
    )
    return response.data
  },

  getInsights: async (month: string): Promise<InsightsResponse> => {
    const response = await api.post<InsightsResponse>("/ai/insights/", {
      month,
    })
    return response.data
  },

  chat: async (payload: {
    message: string
    conversation_id?: number
  }): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>("/ai/chat/", payload)
    return response.data
  },

  getChatConversations: async (): Promise<ChatConversation[]> => {
    const response = await api.get<ChatConversation[]>("/ai/chat/conversations/")
    return response.data
  },

  getChatConversation: async (
    conversationId: number
  ): Promise<ChatConversationDetail> => {
    const response = await api.get<ChatConversationDetail>(
      `/ai/chat/conversations/${conversationId}/`
    )
    return response.data
  },

  deleteChatConversation: async (conversationId: number): Promise<void> => {
    await api.delete(`/ai/chat/conversations/${conversationId}/`)
  },

  categorize: async (payload: {
    text: string
    category_type?: "INCOME" | "EXPENSE"
  }): Promise<CategorizeResponse> => {
    const response = await api.post<CategorizeResponse>("/ai/categorize/", payload)
    return response.data
  },

  forecast: async (months = 3): Promise<ForecastResponse> => {
    const response = await api.post<ForecastResponse>("/ai/forecast/", { months })
    return response.data
  },

  budgetCheck: async (): Promise<BudgetCheckResponse> => {
    const response = await api.post<BudgetCheckResponse>("/ai/budget-check/", {})
    return response.data
  },
}

// Notifications API
export const notificationsApi = {
  getNotifications: async (params?: {
    is_read?: boolean
    notification_type?: string
    priority?: string
  }): Promise<PaginatedResponse<Notification>> => {
    const response = await api.get<PaginatedResponse<Notification>>(
      "/notifications/",
      { params }
    )
    return response.data
  },

  markAsRead: async (id: number): Promise<Notification> => {
    const response = await api.post<Notification>(`/notifications/${id}/read/`)
    return response.data
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(
      "/notifications/read_all/"
    )
    return response.data
  },

  clearRead: async (): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(
      "/notifications/clear_read/"
    )
    return response.data
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await api.get<UnreadCountResponse>(
      "/notifications/unread-count/"
    )
    return response.data
  },

  getAlertRules: async (): Promise<PaginatedResponse<AlertRule>> => {
    const response = await api.get<PaginatedResponse<AlertRule>>(
      "/notifications/alert-rules/"
    )
    return response.data
  },

  updateAlertRule: async (
    id: number,
    data: Partial<AlertRule>
  ): Promise<AlertRule> => {
    const response = await api.patch<AlertRule>(
      `/notifications/alert-rules/${id}/`,
      data
    )
    return response.data
  },

  setupDefaults: async (): Promise<{ message: string; created: AlertRule[] }> => {
    const response = await api.post<{ message: string; created: AlertRule[] }>(
      "/notifications/alert-rules/setup_defaults/"
    )
    return response.data
  },
}

// Health check
export const healthCheck = async (): Promise<{ status: string }> => {
  const response = await api.get("/health/")
  return response.data
}
