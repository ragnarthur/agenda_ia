import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Link } from "react-router-dom"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Receipt,
  PiggyBank,
  ArrowRight,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from "lucide-react"
import { financeApi, aiApi } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { PageHeader } from "../components/ui/page-header"
import { Skeleton } from "../components/ui/skeleton"

const CHART_COLORS = [
  "#2dd4bf", // teal
  "#f97316", // orange
  "#a855f7", // purple
  "#ec4899", // pink
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
  "#ef4444", // red
]

export function DashboardPage() {
  const currentMonth = useMemo(() => format(new Date(), "yyyy-MM"), [])
  const lastMonth = useMemo(
    () => format(subMonths(new Date(), 1), "yyyy-MM"),
    []
  )

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["monthlyReport", currentMonth],
    queryFn: () => financeApi.getMonthlyReport(currentMonth),
  })

  const { data: lastMonthReport } = useQuery({
    queryKey: ["monthlyReport", lastMonth],
    queryFn: () => financeApi.getMonthlyReport(lastMonth),
  })

  const { data: goals } = useQuery({
    queryKey: ["goals", "ACTIVE"],
    queryFn: () => financeApi.getGoals({ status: "ACTIVE" }),
  })

  const { data: budgetStatus } = useQuery({
    queryKey: ["budgetStatus"],
    queryFn: () => financeApi.getBudgetStatus(),
  })

  const { data: transactions } = useQuery({
    queryKey: ["transactions", { month: currentMonth }],
    queryFn: () => financeApi.getTransactions({ month: currentMonth }),
  })

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["insights", currentMonth],
    queryFn: () => aiApi.getInsights(currentMonth),
    enabled: !!report && report.transaction_count > 0,
    staleTime: 1000 * 60 * 30,
  })

  const incomeTrend = useMemo(() => {
    if (!report || !lastMonthReport || lastMonthReport.income === 0) return null
    const change =
      ((report.income - lastMonthReport.income) / lastMonthReport.income) * 100
    return Math.round(change)
  }, [report, lastMonthReport])

  const expensesTrend = useMemo(() => {
    if (!report || !lastMonthReport || lastMonthReport.expenses === 0)
      return null
    const change =
      ((report.expenses - lastMonthReport.expenses) /
        lastMonthReport.expenses) *
      100
    return Math.round(change)
  }, [report, lastMonthReport])

  const chartData = useMemo(() => {
    if (!transactions?.results) return []
    const grouped = transactions.results.reduce(
      (acc, tx) => {
        const day = format(new Date(tx.date + "T12:00:00"), "dd")
        if (!acc[day]) acc[day] = { day, income: 0, expenses: 0 }
        if (tx.transaction_type === "INCOME") {
          acc[day].income += parseFloat(tx.amount)
        } else {
          acc[day].expenses += parseFloat(tx.amount)
        }
        return acc
      },
      {} as Record<string, { day: string; income: number; expenses: number }>
    )
    return Object.values(grouped).sort((a, b) => a.day.localeCompare(b.day))
  }, [transactions])

  const pieData = useMemo(() => {
    if (!report?.top_expense_categories) return []
    return report.top_expense_categories.map((cat) => ({
      name: cat.category__name || "Sem categoria",
      value: cat.total,
    }))
  }, [report])

  const activeGoals = goals?.results.slice(0, 3) || []
  const alertedBudgets =
    budgetStatus?.filter((b) => b.alert_reached).slice(0, 3) || []

  if (reportLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          badge={format(new Date(), "MMMM yyyy", { locale: ptBR })}
          title="Dashboard"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge={format(new Date(), "MMMM yyyy", { locale: ptBR })}
        title="Dashboard"
        description="Visao geral das suas financas"
        actions={
          <Button asChild>
            <Link to="/ai">
              <Sparkles className="mr-2 h-4 w-4" />
              IA Copiloto
            </Link>
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Receitas */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card/50 to-card p-5 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Receitas</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-emerald-400">
                {formatCurrency(report?.income || 0)}
              </span>
            </div>
            {incomeTrend !== null && (
              <div className="mt-2 flex items-center gap-1.5">
                {incomeTrend >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-400" />
                )}
                <span className={`text-sm font-medium ${incomeTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {Math.abs(incomeTrend)}%
                </span>
                <span className="text-xs text-muted-foreground">vs. mês anterior</span>
              </div>
            )}
          </div>
        </div>

        {/* Despesas */}
        <div className="group relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-card/50 to-card p-5 transition-all hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-red-500/10 blur-2xl transition-all group-hover:bg-red-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Despesas</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-red-400">
                {formatCurrency(report?.expenses || 0)}
              </span>
            </div>
            {expensesTrend !== null && (
              <div className="mt-2 flex items-center gap-1.5">
                {expensesTrend <= 0 ? (
                  <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-red-400" />
                )}
                <span className={`text-sm font-medium ${expensesTrend <= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {Math.abs(expensesTrend)}%
                </span>
                <span className="text-xs text-muted-foreground">vs. mês anterior</span>
              </div>
            )}
          </div>
        </div>

        {/* Saldo */}
        <div className={`group relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-lg ${
          (report?.balance || 0) >= 0
            ? "border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card hover:border-primary/30 hover:shadow-primary/5"
            : "border-red-500/20 bg-gradient-to-br from-red-500/10 via-card/50 to-card hover:border-red-500/30 hover:shadow-red-500/5"
        }`}>
          <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl transition-all ${
            (report?.balance || 0) >= 0 ? "bg-primary/10 group-hover:bg-primary/20" : "bg-red-500/10 group-hover:bg-red-500/20"
          }`} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Saldo do Mês</span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                (report?.balance || 0) >= 0 ? "bg-primary/15" : "bg-red-500/15"
              }`}>
                <Wallet className={`h-5 w-5 ${(report?.balance || 0) >= 0 ? "text-primary" : "text-red-400"}`} />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-3xl font-bold ${(report?.balance || 0) >= 0 ? "text-primary" : "text-red-400"}`}>
                {formatCurrency(report?.balance || 0)}
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xs text-muted-foreground">
                {(report?.balance || 0) >= 0 ? "Você está no positivo!" : "Atenção: saldo negativo"}
              </span>
            </div>
          </div>
        </div>

        {/* Transações */}
        <div className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card/50 to-card p-5 transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Transações</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                <Receipt className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-400">
                {report?.transaction_count || 0}
              </span>
              <span className="text-sm text-muted-foreground">movimentações</span>
            </div>
            <div className="mt-2">
              <span className="text-xs text-muted-foreground">
                em {format(new Date(), "MMMM", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fluxo do Mês */}
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Fluxo do Mês</h3>
                <p className="text-xs text-muted-foreground">Receitas vs Despesas por dia</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">Receitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="text-muted-foreground">Despesas</span>
              </div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 14%, 18%)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="hsl(215, 14%, 40%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(215, 14%, 40%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 20%, 10%)",
                    border: "1px solid hsl(222, 14%, 20%)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                  }}
                  labelStyle={{ color: "hsl(210, 24%, 96%)", fontWeight: 600 }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                  name="Receitas"
                  dot={{ fill: "#34d399", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#34d399", stroke: "#fff", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f87171"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorExpenses)"
                  name="Despesas"
                  dot={{ fill: "#f87171", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#f87171", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20">
                <TrendingUp className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-muted-foreground">Sem dados no período</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Adicione transações para visualizar</p>
            </div>
          )}
        </div>

        {/* Gastos por Categoria */}
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
              <PiggyBank className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold">Gastos por Categoria</h3>
              <p className="text-xs text-muted-foreground">Distribuição das despesas</p>
            </div>
          </div>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="relative">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 20%, 10%)",
                        border: "1px solid hsl(222, 14%, 20%)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centro do gráfico com total */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-lg font-bold">{formatCurrency(report?.expenses || 0)}</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {pieData.map((item, index) => {
                  const percentage = ((item.value / (report?.expenses || 1)) * 100).toFixed(0)
                  return (
                    <div key={item.name} className="group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full transition-all"
                            style={{
                              backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                              boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${CHART_COLORS[index % CHART_COLORS.length]}40`,
                            }}
                          />
                          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{percentage}%</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30 mr-3">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-[180px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20">
                <PiggyBank className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-muted-foreground">Sem despesas</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Registre gastos para ver a distribuição</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* AI Insights */}
        <div className="group rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-card/80 to-card p-6 transition-all hover:border-violet-500/30">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                <Sparkles className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="font-semibold">Insights IA</h3>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-violet-400 hover:text-violet-300">
              <Link to="/chat">
                Ver mais <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {insightsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : insights ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {insights.summary}
              </p>
              {insights.recommendations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Recomendações
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {insights.recommendations.slice(0, 3).map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-muted/20 p-2.5 text-sm text-muted-foreground"
                      >
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-[160px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/20">
                <Sparkles className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-muted-foreground">Sem insights</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Adicione transações para receber dicas</p>
            </div>
          )}
        </div>

        {/* Active Goals */}
        <div className="group rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card/80 to-card p-6 transition-all hover:border-emerald-500/30">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <Target className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold">Metas Ativas</h3>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-emerald-400 hover:text-emerald-300">
              <Link to="/goals">
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {activeGoals.length > 0 ? (
            <div className="space-y-4">
              {activeGoals.map((goal) => (
                <div key={goal.id} className="rounded-xl bg-muted/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{goal.name}</span>
                    <Badge
                      variant="outline"
                      className={goal.progress_percentage >= 100
                        ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                        : "border-muted-foreground/30"}
                    >
                      {goal.progress_percentage.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <Progress
                      value={goal.progress_percentage}
                      className="h-2"
                      indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-400"
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(parseFloat(goal.current_amount))}</span>
                    <span className="font-medium text-emerald-400">
                      {formatCurrency(parseFloat(goal.target_amount))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[160px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/20">
                <Target className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-muted-foreground">Sem metas</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Defina objetivos financeiros</p>
              <Button variant="outline" size="sm" asChild className="mt-3">
                <Link to="/goals">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Criar meta
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Budget Alerts */}
        <div className="group rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card/80 to-card p-6 transition-all hover:border-amber-500/30">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold">Alertas de Orçamento</h3>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-amber-400 hover:text-amber-300">
              <Link to="/budgets">
                Ver todos <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {alertedBudgets.length > 0 ? (
            <div className="space-y-3">
              {alertedBudgets.map((budget) => (
                <div
                  key={budget.id}
                  className={`rounded-xl p-3 ${
                    budget.percentage_used >= 100
                      ? "bg-red-500/10 border border-red-500/20"
                      : "bg-amber-500/10 border border-amber-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{budget.category_name}</span>
                    <Badge
                      variant="outline"
                      className={
                        budget.percentage_used >= 100
                          ? "border-red-400/40 bg-red-400/15 text-red-300"
                          : "border-amber-400/40 bg-amber-400/15 text-amber-300"
                      }
                    >
                      {budget.percentage_used >= 100 ? "Estourado" : `${budget.percentage_used.toFixed(0)}%`}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <Progress
                      value={Math.min(budget.percentage_used, 100)}
                      className="h-2"
                      indicatorClassName={
                        budget.percentage_used >= 100
                          ? "bg-gradient-to-r from-red-500 to-rose-400"
                          : "bg-gradient-to-r from-amber-500 to-orange-400"
                      }
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>
                      Gasto: <span className={budget.percentage_used >= 100 ? "text-red-400" : "text-amber-400"}>
                        {formatCurrency(budget.spent)}
                      </span>
                    </span>
                    <span>Limite: {formatCurrency(budget.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[160px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="font-medium text-emerald-400">Tudo certo!</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Nenhum orçamento em alerta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
