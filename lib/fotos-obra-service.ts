// lib/fotos-obra-service.ts
// Admin: associa fotos (de qualquer colaborador) à obra certa, ou repõe a obra original.
// Cada colaborador é atualizado numa transação: lê as entries mais recentes e só altera as fotos escolhidas,
// por isso não sobrescreve o que ele estiver a registar ao mesmo tempo.

import { doc, runTransaction } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { aplicarObraNasFotos, type ObraRef } from "@/lib/fotos-obra-utils"

export interface FotoRef { colaboradorId: string; url: string }

/** Devolve quantas fotos foram realmente alteradas. `obra = null` repõe a obra original do serviço. */
export async function associarFotosAObra(fotos: FotoRef[], obra: ObraRef | null): Promise<number> {
  const porColaborador = new Map<string, Set<string>>()
  fotos.forEach(f => {
    if (!porColaborador.has(f.colaboradorId)) porColaborador.set(f.colaboradorId, new Set())
    porColaborador.get(f.colaboradorId)!.add(f.url)
  })

  let total = 0
  for (const [uid, urls] of porColaborador) {
    const ref = doc(db, "users", uid)
    const alteradas = await runTransaction(db, async tx => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return 0
      const entries = (snap.data().workData?.entries ?? []) as any[]
      const resultado = aplicarObraNasFotos(entries, urls, obra)
      if (resultado.alteradas > 0) tx.update(ref, { "workData.entries": resultado.entries })
      return resultado.alteradas
    })
    total += alteradas
  }
  return total
}
