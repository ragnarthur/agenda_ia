import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../components/ui/alert"
import { Mascot } from "../components/Mascot"

function useTypewriter(text: string, speed = 24, delay = 0, resetKey = 0) {
  const [output, setOutput] = useState("")
  const [isDone, setIsDone] = useState(false)

  useLayoutEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    let index = 0

    setOutput("")
    setIsDone(false)
    timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        index += 1
        setOutput(text.slice(0, index))
        if (index >= text.length) {
          setIsDone(true)
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
        }
      }, speed)
    }, delay)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [text, speed, delay, resetKey])

  return { text: output, isDone }
}

export function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const textCycles = [
    {
      headline: "Controle financeiro inteligente, claro e sempre atual.",
      description:
        "Centralize entradas, saídas e compromissos com uma visão que combina automação e insights para decisões mais seguras.",
      features: [
        "Lançamentos guiados e categorização automática com IA.",
        "Indicadores mensais, metas e alertas em tempo real.",
        "Resumo inteligente para decisões mais seguras.",
      ],
    },
    {
      headline: "Planeje o mês com precisão e veja seu dinheiro render.",
      description:
        "Acompanhe fluxo de caixa, metas e compromissos em um painel que reduz ruído e destaca o que importa.",
      features: [
        "Visão diária e mensal com filtros inteligentes.",
        "Recomendações de ajuste baseadas no seu histórico.",
        "Tendências financeiras para antecipar movimentos.",
      ],
    },
    {
      headline: "Mais clareza, menos esforço na sua rotina financeira.",
      description:
        "Organize gastos, entradas e lembretes com uma experiência contínua e insights práticos para o seu dia.",
      features: [
        "Automatize categorias e economize tempo.",
        "Alertas antecipados para evitar surpresas no mês.",
        "Agenda integrada para manter o controle.",
      ],
    },
    {
      headline: "Sua agenda financeira com IA de ponta a ponta.",
      description:
        "Do lançamento ao resumo mensal, tudo integrado para você decidir rápido e manter o controle.",
      features: [
        "Resumo visual com categorias e tendências.",
        "Metas ativas acompanhadas em tempo real.",
        "Planejamento de gastos com visão preventiva.",
      ],
    },
    {
      headline: "Controle cada decisão com dados limpos e visão imediata.",
      description:
        "Tenha uma leitura rápida do mês e saiba exatamente onde cortar ou investir com tranquilidade.",
      features: [
        "Insights automáticos de gastos por categoria.",
        "Alertas personalizados antes de extrapolar o orçamento.",
        "Painel de evolução para acompanhar resultados.",
      ],
    },
    {
      headline: "Seu financeiro organizado em um painel único e simples.",
      description:
        "Reúna transações, compromissos e metas em uma visão clara que acompanha seu ritmo.",
      features: [
        "Resumo executivo do mês em segundos.",
        "Lembretes inteligentes para compromissos futuros.",
        "Status do saldo com leitura imediata.",
      ],
    },
    {
      headline: "Planejamento financeiro sem complicação, com IA ao seu lado.",
      description:
        "Menos planilhas, mais clareza. A Agenda IA ajuda você a manter o foco no que importa.",
      features: [
        "Sugestões proativas de economia e ajustes.",
        "Categorias inteligentes para evitar retrabalho.",
        "Visão consolidada para decisões rápidas.",
      ],
    },
    {
      headline: "Dados financeiros organizados para decisões mais seguras.",
      description:
        "Acompanhe sua evolução com relatórios objetivos e recomendações diretas.",
      features: [
        "Indicadores-chave com evolução mensal.",
        "Notificações estratégicas para manter o controle.",
        "Histórico visual para identificar padrões.",
      ],
    },
  ]
  const [cycleIndex, setCycleIndex] = useState(0)
  const currentCycle = textCycles[cycleIndex % textCycles.length]
  const headlineText = currentCycle.headline
  const descriptionText = currentCycle.description
  const featureTextOne = currentCycle.features[0] ?? ""
  const featureTextTwo = currentCycle.features[1] ?? ""
  const featureTextThree = currentCycle.features[2] ?? ""
  const headlineSpeed = 24
  const descriptionSpeed = 18
  const blankDelay = 1400
  const holdDelay = 9800
  const headlineDelay = blankDelay + 200
  const descriptionDelay = headlineDelay + headlineText.length * headlineSpeed + 400
  const descriptionTypingTime = descriptionText.length * descriptionSpeed
  const cycleDuration = descriptionDelay + descriptionTypingTime + holdDelay
  const featureDelay = descriptionDelay + descriptionTypingTime + 600
  const featureDuration = Math.max(0, cycleDuration - featureDelay)
  const cycleFadeDelay = headlineDelay
  const cycleFadeDuration = Math.max(0, cycleDuration - cycleFadeDelay)
  const featureStyle = {
    "--feature-delay": `${featureDelay}ms`,
    "--feature-duration": `${featureDuration}ms`,
  } as CSSProperties
  const cycleStyle = {
    "--cycle-fade-duration": `${cycleFadeDuration}ms`,
    "--cycle-fade-delay": `${cycleFadeDelay}ms`,
  } as CSSProperties

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCycleIndex((value) => (value + 1) % textCycles.length)
    }, cycleDuration)

    return () => clearTimeout(timeoutId)
  }, [cycleDuration, textCycles.length, cycleIndex])
  const {
    text: typedHeadline,
    isDone: headlineDone,
  } = useTypewriter(headlineText, headlineSpeed, headlineDelay, cycleIndex)
  const {
    text: typedDescription,
    isDone: descriptionDone,
  } = useTypewriter(descriptionText, descriptionSpeed, descriptionDelay, cycleIndex)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(username, password)
      navigate("/")
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Erro ao fazer login. Verifique suas credenciais."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden border-r border-border/70 bg-card/70 p-12 backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/15" />
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight">Agenda</span>
                <span className="relative text-4xl font-semibold tracking-tight text-violet-400 ia-glow-pulse">
                  IA
                  <span
                    aria-hidden="true"
                    className="absolute -right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-violet-400/90 shadow-[0_0_10px_rgba(167,139,250,0.7)] ia-dot-glow"
                  >
                    <span className="absolute inset-0 rounded-full bg-violet-400/60 animate-ping" />
                  </span>
                </span>
              </div>
              <Mascot className="opacity-85 mascot-pulse-sync" width={176} height={126} />
            </div>
            <div key={cycleIndex} className="mt-6 space-y-4 cycle-fade" style={cycleStyle}>
              <h1 className="text-3xl font-semibold text-foreground">
                {typedHeadline}
                {!headlineDone && <span className="typewriter-cursor" aria-hidden="true">|</span>}
              </h1>
              <p className="max-w-md text-base text-muted-foreground">
                {typedDescription}
                {!descriptionDone && <span className="typewriter-cursor" aria-hidden="true">|</span>}
              </p>
              <div className="mt-[4.25rem] space-y-5 text-sm text-muted-foreground">
                <div
                  className="panel-muted feature-reveal-breathe"
                  style={featureStyle}
                >
                  {featureTextOne}
                </div>
                <div
                  className="panel-muted feature-reveal-breathe"
                  style={featureStyle}
                >
                  {featureTextTwo}
                </div>
                <div
                  className="panel-muted feature-reveal-breathe"
                  style={featureStyle}
                >
                  {featureTextThree}
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-16 -right-10 h-60 w-60 rounded-full bg-[radial-gradient(circle,#1e6f6b,transparent_70%)] opacity-35 blur-3xl" />
          <div className="pointer-events-none absolute -top-24 left-10 h-52 w-52 rounded-full bg-[radial-gradient(circle,#4c1d95,transparent_70%)] opacity-25 blur-3xl" />
        </div>

        <div className="relative flex items-center justify-center overflow-hidden">
          <div className="relative z-10 flex w-full max-w-md flex-col items-end gap-6 p-6 pb-[2.5rem]">
            <Card className="w-full border-violet-500/20 bg-gradient-to-br from-card/90 via-card/80 to-card/70 shadow-[0_28px_60px_-40px_rgba(139,92,246,0.55)]">
              <CardHeader className="relative text-center">
                <CardTitle className="text-2xl">Entrar</CardTitle>
                <CardDescription>
                  Bem-vindo de volta. Vamos organizar suas finanças.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Erro no login</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="arthur_araujo"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  variant="glow"
                  isLoading={isLoading}
                >
                  Entrar
                </Button>
              </form>
            </CardContent>
            </Card>
          </div>
          <Mascot
            className="pointer-events-none absolute bottom-1 -right-3 z-20 opacity-90"
            width={268}
            height={190}
            animationClassName="mascot-float-drift"
          />
        </div>
      </div>
    </div>
  )
}
