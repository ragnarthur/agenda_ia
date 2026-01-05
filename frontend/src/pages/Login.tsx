import { useState } from "react"
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
import { Wallet } from "lucide-react"

export function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

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
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agenda IA</p>
                <h1 className="text-3xl font-semibold">
                  Controle financeiro com IA no seu ritmo.
                </h1>
              </div>
            </div>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              Registre ganhos e gastos, organize sua agenda e receba insights
              claros para tomar decisões melhores todos os meses.
            </p>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="panel-muted">
              Assistente de Lançamentos para sugerir transações.
            </div>
            <div className="panel-muted">
              Dashboard mensal com saldo, categorias e alertas.
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-16 -right-10 h-60 w-60 rounded-full bg-[radial-gradient(circle,#1e6f6b,transparent_70%)] opacity-35 blur-3xl" />
        </div>

        <div className="flex items-center justify-center p-6">
          <Card className="w-full max-w-md border-border/80 bg-card/70">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">Entrar</CardTitle>
              <CardDescription>
                Acesse sua agenda financeira em segundos.
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
      </div>
    </div>
  )
}
