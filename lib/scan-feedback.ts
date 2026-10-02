// lib/scan-feedback.ts
// Bip curto (Web Audio, sem ficheiros externos) + vibração, para o operador
// saber que uma leitura foi registada sem ter de olhar sempre para o ecrã.

type Resultado = "sucesso" | "aviso" | "erro"

let audioCtx: AudioContext | null = null

function beep(freq: number, durationMs: number, delayMs = 0) {
  try {
    audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = freq
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(ctx.destination)
    const start = ctx.currentTime + delayMs / 1000
    osc.start(start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000)
    osc.stop(start + durationMs / 1000)
  } catch {
    // Web Audio pode falhar por falta de interação do utilizador — ignora silenciosamente
  }
}

export function feedbackScan(resultado: Resultado) {
  if (resultado === "sucesso") {
    beep(880, 90)
    navigator.vibrate?.(40)
  } else if (resultado === "aviso") {
    beep(520, 140)
    navigator.vibrate?.([30, 40, 30])
  } else {
    beep(220, 220)
    navigator.vibrate?.(150)
  }
}
