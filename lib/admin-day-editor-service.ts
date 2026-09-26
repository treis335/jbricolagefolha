// lib/admin-day-editor-service.ts
// Permite ao admin corrigir um dia de um colaborador (horas, descrição,
// serviços). A entry passa a ficar marcada como "editadoPorAdmin" — o
// colaborador deixa de conseguir editá-la (independentemente das regras
// normais de bloqueio por data) até o admin voltar a mexer nela.

import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { DayEntry } from "@/lib/types"
import { calculateHours } from "@/lib/types"

/** Lê as entries mais recentes diretamente da Firestore (evita sobrescrever edições concorrentes) */
export async function getEntriesFrescas(uid: string): Promise<DayEntry[]> {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return []
  return (snap.data().workData?.entries ?? []) as DayEntry[]
}

/**
 * Admin: guarda a edição de um dia. Substitui a entry existente (ou cria uma
 * nova, se o colaborador nunca tinha registado nada nesse dia) e marca-a
 * como editada pelo admin.
 */
export async function salvarEdicaoAdmin(
  uid: string,
  entryEditada: DayEntry,
  adminUid: string,
  adminNome: string
): Promise<void> {
  const entries = await getEntriesFrescas(uid)
  const { normalHoras, extraHoras } = calculateHours(entryEditada.date, entryEditada.totalHoras)

  const nova: DayEntry = {
    ...entryEditada,
    normalHoras,
    extraHoras,
    editadoPorAdmin: true,
    editadoPorAdminInfo: { adminUid, adminNome, em: new Date().toISOString() },
    notificacaoVista: false,
  }

  const outras = entries.filter(e => e.date !== entryEditada.date)
  const novasEntries = [...outras, nova].sort((a, b) => a.date.localeCompare(b.date))

  await updateDoc(doc(db, "users", uid), { "workData.entries": novasEntries })
}

/** Admin: remove o bloqueio de edição de um dia (deixa o colaborador voltar a editar) */
export async function desbloquearEdicaoAdmin(uid: string, date: string): Promise<void> {
  const entries = await getEntriesFrescas(uid)
  const novasEntries = entries.map(e =>
    e.date === date ? { ...e, editadoPorAdmin: false } : e
  )
  await updateDoc(doc(db, "users", uid), { "workData.entries": novasEntries })
}

/** Colaborador: marca que já viu o aviso de edição de um dia específico */
export async function marcarNotificacaoVista(uid: string, date: string): Promise<void> {
  const entries = await getEntriesFrescas(uid)
  const novasEntries = entries.map(e =>
    e.date === date ? { ...e, notificacaoVista: true } : e
  )
  await updateDoc(doc(db, "users", uid), { "workData.entries": novasEntries })
}
