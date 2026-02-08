"use client"

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useState } from "react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGoogleLogin = async () => {
    setError("")
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      // AuthProvider vai tratar do redirect
    } catch (err: any) {
      console.error(err)
      setError("Erro ao entrar com Google")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow">
        <h1 className="text-xl font-semibold text-center mb-6">
          Entrar
        </h1>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 48 48"
            aria-hidden
          >
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.2-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 16.2 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.7 26.7 36 24 36c-5.3 0-9.7-3.5-11.3-8.4l-6.6 5.1C9.5 39.5 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.3-5.6 6.9l6.3 5.3C39.6 36.9 44 31.4 44 24c0-1.3-.1-2.2-.4-3.5z"
            />
          </svg>

          {loading ? "A entrar…" : "Entrar com Google"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-500 text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
