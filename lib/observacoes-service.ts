// lib/observacoes-service.ts
// Observações opcionais que os colaboradores escrevem no day form. Se preenchidas, o admin/patrão
// vê um aviso até as marcar como lidas. Estado "lida" guardado em alertasHoras/obs__{uid}__{data}
// (coleção que já é só de admin/patrão — não precisa de regras novas). Se o colaborador alterar o texto,
// o aviso volta a aparecer.
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Collaborator } from "@/hooks/useCollaborators"
import type { EstadoAlerta } from "@/lib/alertas-horas-service"

export interface ObservacaoItem {
  key: string
  uid: string
  nome: string
  date: string
  texto: string
}

interface EstadoObs { lida?: boolean; texto?: string }

export function detectarObservacoes(collaborators: Collaborator[]): ObservacaoItem[] {
  const lista: ObservacaoItem[] = []
  collaborators.forEach(c => {
    ;(c.entries ?? []).forEach(e => {
      const texto = (e.observacoes ?? "").trim()
      if (texto && e.date) lista.push({ key: `obs__${c.id}__${e.date}`, uid: c.id, nome: c.name, date: e.date, texto })
    })
  })
  return lista.sort((a, b) => b.date.localeCompare(a.date))
}

export function observacaoAtiva(item: ObservacaoItem, estado: EstadoAlerta | undefined): boolean {
  const s = estado as unknown as EstadoObs | undefined
  return !(s?.lida && s.texto === item.texto)
}

export async function marcarObservacaoLida(item: ObservacaoItem, adminUid: string): Promise<void> {
  await setDoc(doc(db, "alertasHoras", item.key), {
    lida: true, texto: item.texto, lidaPor: adminUid, lidaEm: serverTimestamp(),
  }, { merge: true })
}
