import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "../context/AuthContext"
import { notificationsApi } from "../lib/api"
import { Button } from "./ui/button"
import { Mascot } from "./Mascot"
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
  User,
} from "lucide-react"

interface LayoutProps {
  children: React.ReactNode
}

const navItems = [
  { path: "/ai", label: "Assistente IA", icon: Sparkles, featured: true },
  { path: "/", label: "Dashboard", icon: LayoutDashboard, secondary: true },
  { path: "/transactions", label: "Transações", icon: Receipt },
  { path: "/events", label: "Agenda", icon: Calendar },
  { path: "/budgets", label: "Orçamentos", icon: PiggyBank },
  { path: "/goals", label: "Metas", icon: Target },
  { path: "/chat", label: "Chat IA", icon: MessageSquare },
]

export function Layout({ children }: LayoutProps) {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const { data: unreadCount } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 60000, // Refresh every minute
  })

  // Close mobile menu on route change
  const previousPathRef = useRef(location.pathname)
  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMenuOpen(false)
    }
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const unreadNotifications = unreadCount?.unread_count || 0
  const displayName = user?.full_name?.trim() || user?.username || user?.email || ""
  const secondaryName = (() => {
    if (!user) return ""
    const normalize = (value?: string | null) =>
      value ? value.trim().toLowerCase() : ""
    const candidates = [user.email, user.username].filter(
      (value): value is string => Boolean(value)
    )
    return (
      candidates.find(
        (candidate) => normalize(candidate) !== normalize(displayName)
      ) || ""
    )
  })()

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
        className={`fixed left-0 top-0 z-40 h-[100dvh] w-56 overflow-y-auto border-r border-border/70 bg-card/90 p-5 backdrop-blur-xl transition-transform md:translate-x-0 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="group flex items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tracking-tight">Agenda</span>
              <span className="relative text-2xl font-semibold tracking-tight text-violet-400 transition-all duration-300 group-hover:text-violet-300 ia-glow-pulse">
                IA
                <span
                  aria-hidden="true"
                  className="absolute -right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-violet-400/90 shadow-[0_0_10px_rgba(167,139,250,0.7)] transition-all duration-300 group-hover:scale-110 ia-dot-glow"
                >
                  <span className="absolute inset-0 rounded-full bg-violet-400/60 animate-ping" />
                </span>
              </span>
            </div>
            <Mascot
              className="opacity-85 transition-all duration-300 group-hover:opacity-100 group-hover:-translate-y-1 group-hover:scale-[1.04] group-hover:drop-shadow-[0_10px_18px_rgba(45,212,191,0.35)] mascot-pulse-sync"
              width={128}
              height={78}
            />
          </div>
          {/* Navigation */}
          <nav className="mt-4 flex-1 space-y-1">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground/70 opacity-80 transition-all duration-200 hover:text-foreground/80 hover:opacity-100">
              Começo
            </div>
            {navItems.slice(0, 3).map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              const isFeatured = item.featured
              const isSecondary = item.secondary
              const button = (
                <Button
                  asChild
                  variant={isActive && !isFeatured ? "default" : "ghost"}
                  className={`group relative w-full justify-start gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all before:absolute before:left-1 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary/0 before:transition before:duration-200 hover:translate-x-1 ${
                    isActive
                      ? isFeatured
                        ? "border border-violet-500/50 bg-gradient-to-r from-violet-500/35 via-fuchsia-500/25 to-transparent text-white shadow-[0_18px_36px_-24px_rgba(168,85,247,0.75)] before:h-8 before:bg-violet-200/90"
                        : "glow-ring shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)] before:h-8 before:bg-primary-foreground/80"
                      : isFeatured
                        ? "border border-violet-500/40 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-transparent text-foreground shadow-[0_16px_32px_-24px_rgba(168,85,247,0.6)] hover:from-violet-500/30 hover:via-fuchsia-500/20 hover:to-transparent hover:shadow-[0_18px_36px_-24px_rgba(168,85,247,0.75)] before:bg-violet-300/80 before:h-8"
                        : isSecondary
                          ? "border border-primary/20 bg-primary/5 text-foreground hover:bg-primary/10 hover:border-primary/30 hover:ring-1 hover:ring-primary/20 before:bg-primary/60 before:h-6"
                          : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/15 hover:via-transparent hover:to-transparent hover:ring-1 hover:ring-primary/25 hover:shadow-[0_18px_36px_-24px_rgba(45,212,191,0.6)] group-hover:before:bg-primary/70 group-hover:before:h-8"
                  }`}
                >
                  <Link to={item.path}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              )

              return (
                <div key={item.path}>
                  {button}
                </div>
              )
            })}

            <div className="mt-4 border-t border-border/40 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground/70 opacity-80 transition-all duration-200 hover:text-foreground/80 hover:opacity-100">
              Controle
            </div>
            {navItems.slice(3, 6).map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              const isFeatured = item.featured
              const isSecondary = item.secondary
              return (
                <Button
                  key={item.path}
                  asChild
                  variant={isActive && !isFeatured ? "default" : "ghost"}
                  className={`group relative w-full justify-start gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all before:absolute before:left-1 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary/0 before:transition before:duration-200 hover:translate-x-1 ${
                    isActive
                      ? isFeatured
                        ? "border border-violet-500/50 bg-gradient-to-r from-violet-500/35 via-fuchsia-500/25 to-transparent text-white shadow-[0_18px_36px_-24px_rgba(168,85,247,0.75)] before:h-8 before:bg-violet-200/90"
                        : "glow-ring shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)] before:h-8 before:bg-primary-foreground/80"
                      : isFeatured
                        ? "border border-violet-500/40 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-transparent text-foreground shadow-[0_16px_32px_-24px_rgba(168,85,247,0.6)] hover:from-violet-500/30 hover:via-fuchsia-500/20 hover:to-transparent hover:shadow-[0_18px_36px_-24px_rgba(168,85,247,0.75)] before:bg-violet-300/80 before:h-8"
                        : isSecondary
                          ? "border border-primary/30 bg-primary/10 text-foreground shadow-[0_12px_24px_-22px_rgba(45,212,191,0.45)] hover:bg-primary/15 hover:ring-1 hover:ring-primary/30 before:bg-primary/70 before:h-8"
                          : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/15 hover:via-transparent hover:to-transparent hover:ring-1 hover:ring-primary/25 hover:shadow-[0_18px_36px_-24px_rgba(45,212,191,0.6)] group-hover:before:bg-primary/70 group-hover:before:h-8"
                  }`}
                >
                  <Link to={item.path}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {isFeatured && (
                      <span className="ml-auto rounded-full border border-violet-400/40 bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-100">
                        IA
                      </span>
                    )}
                  </Link>
                </Button>
              )
            })}

            <div className="mt-4 border-t border-border/40 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground/70 opacity-80 transition-all duration-200 hover:text-foreground/80 hover:opacity-100">
              Extras
            </div>
            {navItems.slice(6).map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              const isFeatured = item.featured
              const isSecondary = item.secondary
              return (
                <Button
                  key={item.path}
                  asChild
                  variant={isActive && !isFeatured ? "default" : "ghost"}
                  className={`group relative w-full justify-start gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all before:absolute before:left-1 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary/0 before:transition before:duration-200 hover:translate-x-1 ${
                    isActive
                      ? isFeatured
                        ? "border border-violet-500/50 bg-gradient-to-r from-violet-500/35 via-fuchsia-500/25 to-transparent text-white shadow-[0_18px_36px_-24px_rgba(168,85,247,0.75)] before:h-8 before:bg-violet-200/90"
                        : "glow-ring shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)] before:h-8 before:bg-primary-foreground/80"
                      : isFeatured
                        ? "border border-violet-500/40 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-transparent text-foreground shadow-[0_16px_32px_-24px_rgba(168,85,247,0.6)] hover:from-violet-500/30 hover:via-fuchsia-500/20 hover:to-transparent hover:shadow-[0_18px_36px_-24px_rgba(168,85,247,0.75)] before:bg-violet-300/80 before:h-8"
                        : isSecondary
                          ? "border border-primary/30 bg-primary/10 text-foreground shadow-[0_12px_24px_-22px_rgba(45,212,191,0.45)] hover:bg-primary/15 hover:ring-1 hover:ring-primary/30 before:bg-primary/70 before:h-8"
                          : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/15 hover:via-transparent hover:to-transparent hover:ring-1 hover:ring-primary/25 hover:shadow-[0_18px_36px_-24px_rgba(45,212,191,0.6)] group-hover:before:bg-primary/70 group-hover:before:h-8"
                  }`}
                >
                  <Link to={item.path}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {isFeatured && (
                      <span className="ml-auto rounded-full border border-violet-400/40 bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-100">
                        IA
                      </span>
                    )}
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
            {user && (
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    <span
                      className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]"
                      aria-label="Online"
                      title="Online"
                    />
                  </div>
                  {secondaryName && (
                    <p className="truncate text-xs text-muted-foreground">
                      {secondaryName}
                    </p>
                  )}
                </div>
              </div>
            )}
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
      <main className="min-h-screen px-5 pb-12 pt-6 md:ml-56 md:px-10 md:pt-10">
        <div className="page-enter">{children}</div>
      </main>
    </div>
  )
}
