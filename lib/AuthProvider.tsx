// lib/AuthProvider.tsx
"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { auth, db } from "@/lib/firebase"
import {
  onAuthStateChanged,
  signOut,
  type User,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { usePathname, useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  isAuthLoading: boolean
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// ── Página de conta suspensa ──────────────────────────────────────────────────
// Mostrada quando o admin marca ativo: false num colaborador.
// Tem botão de logout e não permite navegar para o resto da app.

function ContaSuspensaScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-5">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Ícone */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-3xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Conta desativada</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O teu acesso foi desativado. Os teus dados estão preservados.
            Contacta o teu supervisor para mais informações.
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Terminar sessão
        </button>
      </div>
    </div>
  )
}

// ── AuthProvider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isSuspended, setIsSuspended] = useState(false)

  const router = useRouter()
  const pathname = usePathname()

  const performLogout = async () => {
    try {
      localStorage.removeItem("trabalhoDiario")
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("trabalhoDiario_")) localStorage.removeItem(key)
      })
    } catch (err) {
      console.warn("Erro ao limpar localStorage:", err)
    }
    await signOut(auth)
    setUser(null)
    setIsSuspended(false)
    router.push("/login")
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid)
        const snap = await getDoc(userRef)

        if (!snap.exists()) {
          // Conta nova
          const suggestedUsername =
            firebaseUser.displayName?.trim() ||
            (firebaseUser.email ? firebaseUser.email.split("@")[0].trim() : "utilizador")

          await setDoc(userRef, {
            name: firebaseUser.displayName ?? "",
            username: suggestedUsername,
            email: firebaseUser.email ?? "",
            role: "worker",
            ativo: true,          // ✅ todos os novos utilizadores começam ativos
            createdAt: serverTimestamp(),
            migrated: false,
          })

          console.log(`[Auth] Nova conta criada → username: ${suggestedUsername}`)
          setIsSuspended(false)
        } else {
          const data = snap.data()

          // ✅ Verifica se a conta foi suspensa pelo admin
          // ativo: undefined ou true → conta normal
          // ativo: false → conta suspensa → mostra ecrã de bloqueio
          if (data?.ativo === false) {
            console.warn(`[Auth] Conta suspensa: ${firebaseUser.uid}`)
            setIsSuspended(true)
            setUser(firebaseUser)   // mantemos o user para poder fazer logout
            setIsAuthLoading(false)
            return
          }

          setIsSuspended(false)

          // Retroativo: adiciona username se faltar
          if (!data?.username) {
            const suggestedUsername =
              firebaseUser.displayName?.trim() ||
              (firebaseUser.email ? firebaseUser.email.split("@")[0].trim() : "utilizador")
            await setDoc(userRef, { username: suggestedUsername }, { merge: true })
            console.log(`[Auth] Username adicionado retroativamente: ${suggestedUsername}`)
          }
        }
      } else {
        setIsSuspended(false)
      }

      setUser(firebaseUser)
      setIsAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Proteção de rotas
  useEffect(() => {
    if (isAuthLoading) return
    if (!user && pathname !== "/login") router.push("/login")
    if (user && pathname === "/login") router.push("/")
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        A verificar sessão…
      </div>
    )
  }

  // ✅ Conta suspensa — bloqueia toda a app, mostra ecrã informativo
  if (isSuspended) {
    return <ContaSuspensaScreen onLogout={performLogout} />
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthLoading, loginWithGoogle, logout: performLogout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return context
}