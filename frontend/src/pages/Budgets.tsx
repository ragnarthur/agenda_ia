import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { financeApi } from "../lib/api"
import {
  formatCurrency,
  getCategoryDotStyle,
} from "../lib/utils"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Skeleton } from "../components/ui/skeleton"
import {
  AlertTriangle,
  PlusCircle,
  Target,
  PiggyBank,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Percent,
  Wallet,
  ChevronRight,
} from "lucide-react"

const periodLabels = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
}

export function BudgetsPage() {
  const queryClient = useQueryClient()
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    period_type: "MONTHLY",
    alert_threshold: "80",
    start_date: today,
    end_date: "",
  })

  const { data: categories } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => financeApi.getCategories("EXPENSE"),
  })

  const categoryLookup = useMemo(() => {
    const entries = categories?.results ?? []
    return new Map(entries.map((category) => [category.id, category]))
  }, [categories])

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => financeApi.getBudgets(),
  })

  const { data: budgetStatus } = useQuery({
    queryKey: ["budgetStatus"],
    queryFn: () => financeApi.getBudgetStatus(),
  })

  const createBudgetMutation = useMutation({
    mutationFn: () =>
      financeApi.createBudget({
        category: Number(formData.category),
        amount: formData.amount,
        period_type: formData.period_type as "WEEKLY" | "MONTHLY" | "YEARLY",
        alert_threshold: Number(formData.alert_threshold || 0),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
      }),
    onSuccess: () => {
      setFormData({
        category: "",
        amount: "",
        period_type: "MONTHLY",
        alert_threshold: "80",
        start_date: today,
        end_date: "",
      })
      queryClient.invalidateQueries({ queryKey: ["budgets"] })
      queryClient.invalidateQueries({ queryKey: ["budgetStatus"] })
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.category || !formData.amount) {
      return
    }
    createBudgetMutation.mutate()
  }

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!budgetStatus) return { total: 0, inAlert: 0, exceeded: 0, healthy: 0 }

    const total = budgetStatus.length
    const exceeded = budgetStatus.filter(b => b.percentage_used >= 100).length
    const inAlert = budgetStatus.filter(b => b.alert_reached && b.percentage_used < 100).length
    const healthy = total - exceeded - inAlert

    return { total, inAlert, exceeded, healthy }
  }, [budgetStatus])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Planejamento
        </p>
        <h1 className="text-3xl font-semibold">Orçamentos</h1>
        <p className="text-muted-foreground">
          Defina limites e acompanhe seu consumo por categoria.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-bold text-primary">{stats.total}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <PiggyBank className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saudáveis</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{stats.healthy}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Em Alerta</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">{stats.inAlert}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estourados</p>
              <p className="mt-1 text-2xl font-bold text-red-400">{stats.exceeded}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
              <TrendingUp className="h-5 w-5 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* New Budget Form */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-card/80 to-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
            <PlusCircle className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold">Novo Orçamento</h3>
            <p className="text-xs text-muted-foreground">Defina um limite de gastos para uma categoria</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Categoria</Label>
            <select
              className="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              <option value="">Selecione uma categoria</option>
              {categories?.results.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} {category.group ? `(${category.group})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Limite (R$)</Label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="h-11 border-border/50 bg-background/50 pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Período</Label>
            <select
              className="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              value={formData.period_type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  period_type: e.target.value,
                }))
              }
            >
              {Object.entries(periodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Alerta em (%)</Label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.alert_threshold}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    alert_threshold: e.target.value,
                  }))
                }
                className="h-11 border-border/50 bg-background/50 pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Data Início</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
                className="h-11 border-border/50 bg-background/50 pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Data Fim (opcional)</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    end_date: e.target.value,
                  }))
                }
                className="h-11 border-border/50 bg-background/50 pl-10"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <Button
              type="submit"
              disabled={createBudgetMutation.isPending || !formData.category || !formData.amount}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {createBudgetMutation.isPending ? "Salvando..." : "Criar Orçamento"}
            </Button>
          </div>
        </form>
      </div>

      {/* Budget Status */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 border-b border-border/40 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <Target className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold">Status Atual</h3>
            <p className="text-xs text-muted-foreground">Acompanhe seus gastos em tempo real</p>
          </div>
        </div>

        <div className="p-5">
          {budgetStatus && budgetStatus.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {budgetStatus.map((statusItem) => {
                const category = categoryLookup.get(statusItem.category)
                const isExceeded = statusItem.percentage_used >= 100
                const isAlert = statusItem.alert_reached && !isExceeded

                return (
                  <div
                    key={statusItem.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isExceeded
                        ? "border-red-500/30 bg-red-500/5"
                        : isAlert
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border/40 bg-muted/5 hover:border-border/60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={getCategoryDotStyle(category?.color)}
                        />
                        <div>
                          <p className="font-semibold">{statusItem.category_name}</p>
                          {category?.group && (
                            <Badge variant="outline" className="mt-1 border-muted-foreground/20 bg-muted/20 text-xs">
                              {category.group}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExceeded ? (
                          <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
                            Estourado
                          </Badge>
                        ) : isAlert ? (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Alerta
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            OK
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatCurrency(statusItem.spent)} de {formatCurrency(statusItem.amount)}
                        </span>
                        <span className={`font-semibold ${
                          isExceeded ? "text-red-400" : isAlert ? "text-amber-400" : "text-muted-foreground"
                        }`}>
                          {statusItem.percentage_used.toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(statusItem.percentage_used, 100)}
                        className="mt-2 h-2"
                        indicatorClassName={
                          isExceeded
                            ? "bg-gradient-to-r from-red-500 to-rose-400"
                            : isAlert
                              ? "bg-gradient-to-r from-amber-500 to-orange-400"
                              : "bg-gradient-to-r from-emerald-500 to-teal-400"
                        }
                      />
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{periodLabels[statusItem.period_type]}</span>
                        <span>
                          Restante: <span className={isExceeded ? "text-red-400" : "text-emerald-400"}>
                            {formatCurrency(Math.max(0, statusItem.remaining))}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20">
                <Target className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-muted-foreground">Nenhum orçamento ativo</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Crie um orçamento acima para começar a acompanhar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Budget List */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 border-b border-border/40 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <PiggyBank className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Orçamentos Cadastrados</h3>
            <p className="text-xs text-muted-foreground">
              {budgets?.count || 0} orçamentos configurados
            </p>
          </div>
        </div>

        <div className="p-5">
          {budgetsLoading ? (
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
          ) : budgets?.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20">
                <PiggyBank className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-muted-foreground">Nenhum orçamento cadastrado</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Use o formulário acima para criar seu primeiro orçamento
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets?.results.map((budget) => {
                const category = categoryLookup.get(budget.category)

                return (
                  <div
                    key={budget.id}
                    className="group flex items-center justify-between rounded-xl border border-border/40 bg-muted/5 p-4 transition-all hover:border-border/60 hover:bg-muted/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105">
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={getCategoryDotStyle(category?.color)}
                          />
                          <p className="font-semibold">{budget.category_name}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="border-muted-foreground/20 bg-muted/20 text-xs">
                            {periodLabels[budget.period_type]}
                          </Badge>
                          {category?.group && (
                            <span className="text-xs">{category.group}</span>
                          )}
                          <span className="text-xs">• Início {budget.start_date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(parseFloat(budget.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Alerta em {budget.alert_threshold}%
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/40 transition-transform group-hover:translate-x-1" />
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
