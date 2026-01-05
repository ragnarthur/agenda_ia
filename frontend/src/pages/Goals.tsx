import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { financeApi } from "../lib/api"
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  formatDate,
  getMaxAllowedDate,
  isDateWithinLimit,
  openNativePicker,
} from "../lib/utils"
import type { Goal } from "../types"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Badge } from "../components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import { Progress } from "../components/ui/progress"
import { Skeleton } from "../components/ui/skeleton"
import {
  PiggyBank,
  PlusCircle,
  Target,
  Trophy,
  TrendingUp,
  Calendar,
  Wallet,
  CheckCircle2,
  Pause,
  XCircle,
  Sparkles,
} from "lucide-react"

const goalTypeLabels: Record<Goal["goal_type"], string> = {
  SAVINGS: "Poupança",
  DEBT: "Quitar Dívida",
  INVESTMENT: "Investimento",
  PURCHASE: "Compra",
  EMERGENCY: "Reserva de Emergência",
  CUSTOM: "Personalizado",
}

const goalTypeIcons: Record<Goal["goal_type"], typeof PiggyBank> = {
  SAVINGS: PiggyBank,
  DEBT: TrendingUp,
  INVESTMENT: TrendingUp,
  PURCHASE: Wallet,
  EMERGENCY: Target,
  CUSTOM: Sparkles,
}

const goalStatusConfig: Record<Goal["status"], { label: string; color: string; icon: typeof CheckCircle2 }> = {
  ACTIVE: { label: "Ativa", color: "emerald", icon: Target },
  COMPLETED: { label: "Concluída", color: "primary", icon: Trophy },
  PAUSED: { label: "Pausada", color: "amber", icon: Pause },
  CANCELLED: { label: "Cancelada", color: "red", icon: XCircle },
}

export function GoalsPage() {
  const queryClient = useQueryClient()
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const maxDate = useMemo(() => getMaxAllowedDate(), [])
  const dateLimitLabel = useMemo(() => formatDate(maxDate), [maxDate])
  const [dateError, setDateError] = useState("")
  const [contributionErrors, setContributionErrors] = useState<Record<number, string>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const selectTriggerClasses = "h-11 w-full"
  const [formData, setFormData] = useState({
    name: "",
    goal_type: "SAVINGS",
    target_amount: "",
    target_date: "",
  })
  const [contributions, setContributions] = useState<
    Record<number, { amount: string; date: string }>
  >({})

  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => financeApi.getGoals(),
  })

  const createGoalMutation = useMutation({
    mutationFn: () =>
      financeApi.createGoal({
        name: formData.name,
        goal_type: formData.goal_type as Goal["goal_type"],
        target_amount: parseCurrencyInput(formData.target_amount),
        target_date: formData.target_date || null,
      }),
    onSuccess: () => {
      handleCreateDialogChange(false)
      queryClient.invalidateQueries({ queryKey: ["goals"] })
    },
  })

  const resetCreateForm = () => {
    setFormData({
      name: "",
      goal_type: "SAVINGS",
      target_amount: "",
      target_date: "",
    })
    setDateError("")
  }

  const handleCreateDialogChange = (open: boolean) => {
    setCreateOpen(open)
    if (!open) {
      resetCreateForm()
    }
  }

  const contributeMutation = useMutation({
    mutationFn: (payload: { goalId: number; amount: string; date: string }) =>
      financeApi.contributeGoal(payload.goalId, {
        amount: parseCurrencyInput(payload.amount),
        date: payload.date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.name || !formData.target_amount) {
      return
    }
    if (formData.target_date && !isDateWithinLimit(formData.target_date)) {
      setDateError(`Datas devem ser até ${dateLimitLabel}.`)
      return
    }
    createGoalMutation.mutate()
  }

  const handleContribute = (goalId: number) => {
    const contribution = contributions[goalId]
    if (!contribution?.amount) {
      return
    }
    if (contribution.date && !isDateWithinLimit(contribution.date)) {
      setContributionErrors((prev) => ({
        ...prev,
        [goalId]: `Datas devem ser até ${dateLimitLabel}.`,
      }))
      return
    }
    setContributionErrors((prev) => ({ ...prev, [goalId]: "" }))
    contributeMutation.mutate({
      goalId,
      amount: contribution.amount,
      date: contribution.date || today,
    })
    setContributions((prev) => ({
      ...prev,
      [goalId]: { amount: "", date: today },
    }))
    setContributionErrors((prev) => ({ ...prev, [goalId]: "" }))
  }

  // Estatísticas
  const stats = useMemo(() => {
    if (!goals?.results) return { total: 0, active: 0, completed: 0, totalSaved: 0 }

    const active = goals.results.filter(g => g.status === "ACTIVE").length
    const completed = goals.results.filter(g => g.status === "COMPLETED").length
    const totalSaved = goals.results.reduce((acc, g) => acc + parseFloat(g.current_amount), 0)

    return { total: goals.results.length, active, completed, totalSaved }
  }, [goals])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Objetivos
          </p>
          <h1 className="text-3xl font-semibold">Metas Financeiras</h1>
          <p className="text-muted-foreground">
            Defina objetivos e acompanhe o progresso.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => handleCreateDialogChange(true)}
          className="gap-2 self-start bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 md:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Metas</p>
              <p className="mt-1 text-2xl font-bold text-primary">{stats.total}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Target className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ativas</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{stats.active}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Concluídas</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">{stats.completed}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Acumulado</p>
              <p className="mt-1 text-xl font-bold text-violet-400">{formatCurrency(stats.totalSaved)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
              <PiggyBank className="h-5 w-5 text-violet-400" />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="border-b border-border/60 pb-4">
            <DialogTitle>Nova meta</DialogTitle>
            <DialogDescription>
              Defina um objetivo financeiro para alcançar.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 via-card/70 to-card/60 p-6 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.6)]">
            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-muted-foreground">
                  Nome da Meta <span className="text-emerald-300">*</span>
                </Label>
                <Input
                  placeholder="Ex: Reserva de emergência"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="h-11 border-border/50 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Tipo <span className="text-emerald-300">*</span>
                </Label>
                <Select
                  value={formData.goal_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      goal_type: value,
                    }))
                  }
                >
                  <SelectTrigger className={selectTriggerClasses}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(goalTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Valor da Meta (R$) <span className="text-emerald-300">*</span>
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={formData.target_amount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        target_amount: formatCurrencyInput(e.target.value),
                      }))
                    }
                    className="h-11 border-border/50 bg-background/50 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Data Alvo (opcional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.target_date}
                    onClick={(event) => openNativePicker(event.currentTarget)}
                    onChange={(e) => {
                      const nextDate = e.target.value
                      setFormData((prev) => ({
                        ...prev,
                        target_date: nextDate,
                      }))
                      setDateError(
                        nextDate && !isDateWithinLimit(nextDate)
                          ? `Datas devem ser até ${dateLimitLabel}.`
                          : ""
                      )
                    }}
                    max={maxDate}
                    className="h-11 border-border/50 bg-background/50 pl-10"
                  />
                </div>
                {dateError ? (
                  <p className="text-xs text-red-400">{dateError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Datas máximas permitidas: {dateLimitLabel}.
                  </p>
                )}
              </div>

              <DialogFooter className="md:col-span-2 lg:col-span-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCreateDialogChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createGoalMutation.isPending || !formData.name || !formData.target_amount}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {createGoalMutation.isPending ? "Salvando..." : "Criar Meta"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goals List */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 border-b border-border/40 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Suas Metas</h3>
            <p className="text-xs text-muted-foreground">
              {goals?.count || 0} metas cadastradas
            </p>
          </div>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : goals?.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20">
                <Target className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">Nenhuma meta cadastrada</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Use o botão Nova Meta para criar sua primeira meta
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {goals?.results.map((goal) => {
                const progress = Math.min(goal.progress_percentage, 100)
                const contribution = contributions[goal.id] || {
                  amount: "",
                  date: today,
                }
                const statusConfig = goalStatusConfig[goal.status]
                const GoalTypeIcon = goalTypeIcons[goal.goal_type]
                const isCompleted = goal.status === "COMPLETED"

                return (
                  <div
                    key={goal.id}
                    className={`rounded-xl border p-5 transition-all ${
                      isCompleted
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/40 bg-muted/5 hover:border-border/60"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                          isCompleted ? "bg-primary/15" : "bg-emerald-500/15"
                        }`}>
                          <GoalTypeIcon className={`h-6 w-6 ${isCompleted ? "text-primary" : "text-emerald-400"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold">{goal.name}</p>
                            <Badge
                              variant="outline"
                              className={`border-${statusConfig.color}-500/30 bg-${statusConfig.color}-500/10 text-${statusConfig.color}-400`}
                            >
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {goalTypeLabels[goal.goal_type]}
                            {goal.target_date && ` • Meta: ${formatDate(goal.target_date)}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Progresso</p>
                        <p className={`text-2xl font-bold ${isCompleted ? "text-primary" : "text-emerald-400"}`}>
                          {progress.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                      <Progress
                        value={progress}
                        className="h-3"
                        indicatorClassName={
                          isCompleted
                            ? "bg-gradient-to-r from-primary to-violet-400"
                            : "bg-gradient-to-r from-emerald-500 to-teal-400"
                        }
                      />
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          <span className={isCompleted ? "text-primary" : "text-emerald-400"}>
                            {formatCurrency(parseFloat(goal.current_amount))}
                          </span>
                          {" "}de {formatCurrency(parseFloat(goal.target_amount))}
                        </span>
                        <span className="text-muted-foreground">
                          Falta <span className="font-medium">{formatCurrency(parseFloat(goal.remaining_amount))}</span>
                        </span>
                      </div>
                    </div>

                    {/* Contribution Form */}
                    {goal.status === "ACTIVE" && (
                      <div className="mt-4 rounded-xl border border-border/30 bg-muted/10 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <PlusCircle className="h-4 w-4 text-emerald-400" />
                          Nova Contribuição
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="relative">
                            <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="R$ 0,00"
                              value={contribution.amount}
                              onChange={(e) =>
                                setContributions((prev) => ({
                                  ...prev,
                                  [goal.id]: {
                                    ...contribution,
                                    amount: formatCurrencyInput(e.target.value),
                                  },
                                }))
                              }
                              className="h-10 border-border/50 bg-background/50 pl-10"
                            />
                          </div>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="date"
                              value={contribution.date}
                              onClick={(event) => openNativePicker(event.currentTarget)}
                              onChange={(e) => {
                                const nextDate = e.target.value
                                setContributions((prev) => ({
                                  ...prev,
                                  [goal.id]: {
                                    ...contribution,
                                    date: nextDate,
                                  },
                                }))
                                setContributionErrors((prev) => ({
                                  ...prev,
                                  [goal.id]:
                                    nextDate && !isDateWithinLimit(nextDate)
                                      ? `Datas devem ser até ${dateLimitLabel}.`
                                      : "",
                                }))
                              }}
                              max={maxDate}
                              className="h-10 border-border/50 bg-background/50 pl-10"
                            />
                            {contributionErrors[goal.id] ? (
                              <p className="mt-2 text-xs text-red-400">
                                {contributionErrors[goal.id]}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            onClick={() => handleContribute(goal.id)}
                            disabled={contributeMutation.isPending || !contribution.amount}
                            className="h-10 bg-emerald-500 hover:bg-emerald-600"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Contribuir
                          </Button>
                        </div>
                      </div>
                    )}
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
