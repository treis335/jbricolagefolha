//lib/authprovider.tsx

"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged, signOut, type User, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { usePathname, useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  isAuthLoading: boolean
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const router = useRouter()
  const pathname = usePathname()

 useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userRef = doc(db, "users", firebaseUser.uid)
      const snap = await getDoc(userRef)

      if (!snap.exists()) {
        // CONTA NOVA: cria documento com username inicial
        const suggestedUsername =
          firebaseUser.displayName?.trim() ||
          (firebaseUser.email ? firebaseUser.email.split('@')[0].trim() : "utilizador");

        await setDoc(userRef, {
          name: firebaseUser.displayName ?? "",
          username: suggestedUsername,          // ← novo campo que vamos usar na app
          email: firebaseUser.email ?? "",
          role: "worker",
          createdAt: serverTimestamp(),
          migrated: false,
        })

        console.log(`[Auth] Nova conta criada → username definido: ${suggestedUsername}`)
      } 
      else if (!snap.data()?.username) {
        // CONTA ANTIGA sem username: adiciona automaticamente (retroativo)
        const suggestedUsername =
          firebaseUser.displayName?.trim() ||
          (firebaseUser.email ? firebaseUser.email.split('@')[0].trim() : "utilizador");

        await setDoc(userRef, {
          username: suggestedUsername
        }, { merge: true })

        console.log(`[Auth] Conta antiga atualizada → username adicionado: ${suggestedUsername}`)
      }
      // Se já tem username → não faz nada, preserva o valor atual
    }

    setUser(firebaseUser)
    setIsAuthLoading(false)
  })

  return () => unsubscribe()
}, [])

  // Proteção simples de rotas
  useEffect(() => {
    if (isAuthLoading) return

    if (!user && pathname !== "/login") {
      router.push("/login")
    }

    if (user && pathname === "/login") {
      router.push("/")
    }
  }, [user, isAuthLoading, pathname, router])

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      setUser(result.user)
      router.push("/")
    } catch (err) {
      console.error("Erro ao fazer login:", err)
    }
  }

  const logout = async () => {
    // ✅ CRITICAL FIX: Limpar localStorage ao fazer logout
    // Isso previne que dados sejam partilhados entre users
    try {
      // Limpa TODAS as chaves de trabalho
      localStorage.removeItem("trabalhoDiario")
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("trabalhoDiario_")) {
          localStorage.removeItem(key)
        }
      })
    } catch (err) {
      console.warn("Erro ao limpar localStorage:", err)
    }
    
    await signOut(auth)
    setUser(null)
    router.push("/login")
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        A verificar sessão…
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, isAuthLoading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return context
}
