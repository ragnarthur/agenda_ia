import React, { createContext, useContext, useState, useEffect } from "react"
import { authApi, getStoredTokens } from "../lib/api"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    const tokens = getStoredTokens()
    setIsAuthenticated(!!tokens?.access)
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    await authApi.login(username, password)
    setIsAuthenticated(true)
  }

  const logout = () => {
    authApi.logout()
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
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
