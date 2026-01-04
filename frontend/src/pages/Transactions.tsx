import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Link } from "react-router-dom"
import { financeApi } from "../lib/api"
import {
  formatCurrency,
  formatDate,
  getCategoryDotStyle,
} from "../lib/utils"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Skeleton } from "../components/ui/skeleton"
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Receipt,
  Sparkles,
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react"

export function TransactionsPage() {
  const [monthFilter, setMonthFilter] = useState(format(new Date(), "yyyy-MM"))

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", monthFilter],
    queryFn: () => financeApi.getTransactions({ month: monthFilter }),
  })

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => financeApi.getCategories(),
  })

  const categoryLookup = useMemo(() => {
    const entries = categories?.results ?? []
    return new Map(entries.map((category) => [category.id, category]))
  }, [categories])

  // Calcular totais
  const totals = useMemo(() => {
    if (!transactions?.results) return { income: 0, expenses: 0, balance: 0 }

    const income = transactions.results
      .filter(t => t.transaction_type === "INCOME")
      .reduce((acc, t) => acc + parseFloat(t.amount), 0)

    const expenses = transactions.results
      .filter(t => t.transaction_type === "EXPENSE")
      .reduce((acc, t) => acc + parseFloat(t.amount), 0)

    return { income, expenses, balance: income - expenses }
  }, [transactions])

  const monthName = useMemo(() => {
    const [year, month] = monthFilter.split("-")
    return format(new Date(parseInt(year), parseInt(month) - 1), "MMMM 'de' yyyy", { locale: ptBR })
  }, [monthFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Movimentos
        </p>
        <h1 className="text-3xl font-semibold">Transações</h1>
        <p className="text-muted-foreground">
          Histórico de receitas e despesas confirmadas.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card/50 to-card p-4 transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receitas</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-card/50 to-card p-4 transition-all hover:border-red-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="mt-1 text-2xl font-bold text-red-400">
                {formatCurrency(totals.expenses)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
              <ArrowDownRight className="h-5 w-5 text-red-400" />
            </div>
          </div>
        </div>

        <div className={`group relative overflow-hidden rounded-2xl border p-4 transition-all ${
          totals.balance >= 0
            ? "border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card hover:border-primary/30"
            : "border-red-500/20 bg-gradient-to-br from-red-500/10 via-card/50 to-card hover:border-red-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`mt-1 text-2xl font-bold ${totals.balance >= 0 ? "text-primary" : "text-red-400"}`}>
                {formatCurrency(totals.balance)}
              </p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              totals.balance >= 0 ? "bg-primary/15" : "bg-red-500/15"
            }`}>
              <Wallet className={`h-5 w-5 ${totals.balance >= 0 ? "text-primary" : "text-red-400"}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Filter className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período:</span>
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-44 border-border/50 bg-background/50"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              {transactions?.count || 0} registros
            </Badge>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border/40 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
              <Receipt className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold">Transações em {monthName}</h3>
              <p className="text-xs text-muted-foreground">
                {transactions?.count || 0} movimentações encontradas
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="border-primary/30 text-primary hover:bg-primary/10">
            <Link to="/ai">
              <Sparkles className="mr-1.5 h-4 w-4" />
              Nova via IA
            </Link>
          </Button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : transactions?.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20">
                <Search className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">Nenhuma transação encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Use o IA Copiloto para adicionar transações rapidamente
              </p>
              <Button asChild className="mt-4">
                <Link to="/ai">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Adicionar via IA
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions?.results.map((transaction) => {
                const categoryInfo = transaction.category
                  ? categoryLookup.get(transaction.category)
                  : undefined
                const isIncome = transaction.transaction_type === "INCOME"

                return (
                  <div
                    key={transaction.id}
                    className={`group flex flex-col gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                      isIncome
                        ? "border-emerald-500/10 bg-emerald-500/5 hover:border-emerald-500/20 hover:bg-emerald-500/10"
                        : "border-red-500/10 bg-red-500/5 hover:border-red-500/20 hover:bg-red-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                        isIncome ? "bg-emerald-500/15" : "bg-red-500/15"
                      }`}>
                        {isIncome ? (
                          <TrendingUp className="h-6 w-6 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-6 w-6 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{transaction.description}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(transaction.date)}
                          </span>
                          {categoryInfo && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={getCategoryDotStyle(categoryInfo.color)}
                                />
                                {transaction.category_name}
                              </span>
                              {categoryInfo.group && (
                                <Badge
                                  variant="outline"
                                  className="border-muted-foreground/20 bg-muted/20 text-xs"
                                >
                                  {categoryInfo.group}
                                </Badge>
                              )}
                            </>
                          )}
                          {transaction.account_name && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span>{transaction.account_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xl font-bold tabular-nums ${
                      isIncome ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {isIncome ? "+" : "-"}
                      {formatCurrency(parseFloat(transaction.amount))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
