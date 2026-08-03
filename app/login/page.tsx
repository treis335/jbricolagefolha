"use client"

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useState } from "react"
import Image from "next/image"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGoogleLogin = async () => {
    setError("")
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: "select_account" })
      await signInWithPopup(auth, provider)
    } catch (err: any) {
      console.error(err)
      setError("Erro ao entrar com Google. Tenta novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-5 relative overflow-hidden">

      {/* Background — layered radial blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-indigo-400/5 blur-3xl" />

        {/* Concentric rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-border/15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-border/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-border/25" />

        {/* Floating dots decoration */}
        <div className="absolute top-[18%] left-[12%] w-2 h-2 rounded-full bg-primary/20 animate-pulse-dot" style={{ animationDelay: "0ms" }} />
        <div className="absolute top-[28%] right-[15%] w-1.5 h-1.5 rounded-full bg-primary/15 animate-pulse-dot" style={{ animationDelay: "700ms" }} />
        <div className="absolute bottom-[22%] left-[20%] w-1 h-1 rounded-full bg-primary/20 animate-pulse-dot" style={{ animationDelay: "400ms" }} />
        <div className="absolute bottom-[30%] right-[12%] w-2 h-2 rounded-full bg-indigo-400/20 animate-pulse-dot" style={{ animationDelay: "1100ms" }} />
        <div className="absolute top-[55%] left-[8%] w-1.5 h-1.5 rounded-full bg-primary/10 animate-pulse-dot" style={{ animationDelay: "200ms" }} />
        <div className="absolute top-[65%] right-[9%] w-1 h-1 rounded-full bg-primary/15 animate-pulse-dot" style={{ animationDelay: "900ms" }} />
      </div>

      {/* Main card wrapper */}
      <div className="relative w-full max-w-sm animate-fade-in-up">

        {/* Logo area */}
        <div className="text-center mb-7 animate-fade-in">
          {/* Logo with glowing rings */}
          <div className="relative inline-block mb-5">
            {/* Outer glow ring */}
            <div className="absolute -inset-4 rounded-full bg-primary/5 blur-lg" />
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem] bg-card border border-border/50 shadow-2xl shadow-black/10">
              <Image
                src="/apple-icon.png"
                alt="JBricolage"
                width={52}
                height={52}
                className="object-contain"
              />
              {/* Online indicator */}
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background shadow-sm">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
              </span>
            </div>
          </div>

          <h1 className="text-[28px] font-black tracking-tight text-foreground mb-1">
            JBRICOLAGE
          </h1>
          <p className="text-xs text-muted-foreground/70 font-medium tracking-wide">
            Gestão de obras e horas de trabalho
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl shadow-black/8 animate-fade-in delay-100"
          style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
        >
          {/* Card header */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/50" />
            <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-[0.15em]">Acesso Seguro</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/50" />
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-background px-5 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:bg-muted/50 hover:border-border hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed press-effect"
          >
            {loading ? (
              <>
                <svg className="w-[18px] h-[18px] animate-spin-slow shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>A entrar…</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="shrink-0">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.2-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.2 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.7 26.7 36 24 36c-5.3 0-9.7-3.5-11.3-8.4l-6.6 5.1C9.5 39.5 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.3-5.6 6.9l6.3 5.3C39.6 36.9 44 31.4 44 24c0-1.3-.1-2.2-.4-3.5z" />
                </svg>
                <span>Entrar com Google</span>
              </>
            )}
          </button>

          {/* Error message */}
          {error && (
            <div className="mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-destructive/8 border border-destructive/20 animate-scale-in">
              <svg className="h-4 w-4 text-destructive shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs font-medium text-destructive">{error}</p>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-5 pt-4 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
              Apenas contas autorizadas pela equipa JBRICOLAGE têm acesso a esta plataforma.
            </p>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 mt-5 animate-fade-in delay-200">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Ligação segura
          </div>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Acesso restrito
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-[10px] text-muted-foreground/30 mt-4 animate-fade-in delay-300">
          © {new Date().getFullYear()} JBRICOLAGE · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
