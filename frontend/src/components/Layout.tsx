import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "../context/AuthContext"
import { notificationsApi } from "../lib/api"
import { Button } from "./ui/button"
import {
  LayoutDashboard,
  Receipt,
  Calendar,
  Sparkles,
  MessageSquare,
  LogOut,
  Wallet,
  PiggyBank,
  Target,
  Menu,
  X,
  Bell,
} from "lucide-react"

interface LayoutProps {
  children: React.ReactNode
}

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/transactions", label: "Transações", icon: Receipt },
  { path: "/budgets", label: "Orçamentos", icon: PiggyBank },
  { path: "/goals", label: "Metas", icon: Target },
  { path: "/chat", label: "Chat IA", icon: MessageSquare },
  { path: "/ai", label: "IA Copiloto", icon: Sparkles },
  { path: "/events", label: "Agenda", icon: Calendar },
]

export function Layout({ children }: LayoutProps) {
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const { data: unreadCount } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 60000, // Refresh every minute
  })

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const unreadNotifications = unreadCount?.unread_count || 0

  return (
    <div className="relative min-h-screen">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-[radial-gradient(circle,#1a7a72,transparent_70%)] opacity-25 blur-3xl float-slow" />
        <div className="absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,#6b4b1b,transparent_70%)] opacity-25 blur-3xl" />
        <div className="absolute left-10 top-1/3 h-32 w-32 rounded-full bg-[radial-gradient(circle,#1b3a52,transparent_70%)] opacity-20 blur-2xl" />
      </div>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/70 bg-background/80 px-5 py-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Agenda IA</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative"
          >
            <Link to="/notifications">
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Abrir menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 border-r border-border/70 bg-card/90 p-6 backdrop-blur-xl transition-transform md:translate-x-0 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Painel</p>
              <p className="text-xl font-semibold">Agenda IA</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Button
                  key={item.path}
                  asChild
                  variant={isActive ? "default" : "ghost"}
                  className={`group relative w-full justify-start gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all before:absolute before:left-1 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary/0 before:transition before:duration-200 hover:translate-x-1 hover:shadow-[0_18px_36px_-24px_rgba(45,212,191,0.6)] ${
                    isActive
                      ? "glow-ring shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)] before:h-8 before:bg-primary-foreground/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/15 hover:via-transparent hover:to-transparent hover:ring-1 hover:ring-primary/25 group-hover:before:bg-primary/70 group-hover:before:h-8"
                  }`}
                >
                  <Link to={item.path}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}

            {/* Notifications Link */}
            <Button
              asChild
              variant={location.pathname === "/notifications" ? "default" : "ghost"}
              className={`group relative w-full justify-start gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all before:absolute before:left-1 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary/0 before:transition before:duration-200 hover:translate-x-1 hover:shadow-[0_18px_36px_-24px_rgba(45,212,191,0.6)] ${
                location.pathname === "/notifications"
                  ? "glow-ring shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)] before:h-8 before:bg-primary-foreground/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/15 hover:via-transparent hover:to-transparent hover:ring-1 hover:ring-primary/25 group-hover:before:bg-primary/70 group-hover:before:h-8"
              }`}
            >
              <Link to="/notifications">
                <Bell className="h-4 w-4" />
                Notificações
                {unreadNotifications > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
            </Button>
          </nav>

          {/* Footer */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
              Controle financeiro e agenda em um so lugar.
            </div>

            <Button
              variant="ghost"
              className="group w-full justify-start gap-3 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 transition-colors group-hover:text-red-400" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-h-screen px-5 pb-12 pt-6 md:ml-72 md:px-10 md:pt-10">
        <div className="page-enter">{children}</div>
      </main>
    </div>
  )
}
