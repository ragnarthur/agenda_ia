import React, { createContext, useContext, useEffect, useState } from "react"
import { authApi, getStoredTokens, type UserInfo } from "../lib/api"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: UserInfo | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const tokens = getStoredTokens()
    return !!tokens?.access
  })
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch user info when authenticated
  useEffect(() => {
    const fetchUser = async () => {
      if (isAuthenticated) {
        try {
          const userInfo = await authApi.getCurrentUser()
          setUser(userInfo)
        } catch {
          // If fetching user fails, logout
          authApi.logout()
          setIsAuthenticated(false)
          setUser(null)
        }
      }
      setIsLoading(false)
    }
    fetchUser()
  }, [isAuthenticated])

  const login = async (username: string, password: string) => {
    await authApi.login(username, password)
    setIsAuthenticated(true)
    // User info will be fetched by useEffect
  }

  const logout = () => {
    authApi.logout()
    setIsAuthenticated(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
