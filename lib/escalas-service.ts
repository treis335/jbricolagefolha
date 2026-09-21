// lib/escalas-service.ts
// Distribuição diária de colaboradores por obra ("escala do dia").
// Guardado em escalas/{YYYY-MM-DD} — um documento por dia.
// Dias passados são limpos por oportunidade (quando o admin abre a ferramenta),
// nunca por um cron — a app não tem execução em segundo plano.

import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface EscalaEquipa {
  obraId: string | null   // null quando o nome foi escrito à mão, sem ligação à coleção "obras"
  obraNome: string
  obraMorada?: string
  colaboradorUids: string[]
}

export interface EscalaDia {
  date: string             // YYYY-MM-DD
  equipas: EscalaEquipa[]
}

const REF = (date: string) => doc(db, "escalas", date)

/** Admin: lê a escala de um dia específico (para editar) */
export async function getEscalaDia(date: string): Promise<EscalaEquipa[]> {
  const snap = await getDoc(REF(date))
  if (!snap.exists()) return []
  return (snap.data().equipas as EscalaEquipa[]) ?? []
}

/** Admin: guarda (substitui) a escala completa de um dia */
export async function saveEscalaDia(date: string, equipas: EscalaEquipa[]): Promise<void> {
  if (equipas.length === 0) {
    // Sem equipas = sem escala nesse dia, não vale a pena guardar documento vazio
    await deleteDoc(REF(date)).catch(() => {})
    return
  }
  await setDoc(REF(date), { date, equipas, updatedAt: serverTimestamp() })
}

/** Admin: apaga a escala de um dia por completo */
export async function deleteEscalaDia(date: string): Promise<void> {
  await deleteDoc(REF(date))
}

/** Admin: lista todas as escalas a partir de hoje (inclusive), ordenadas por data */
export async function getEscalasFuturas(hojeStr: string): Promise<EscalaDia[]> {
  const q = query(collection(db, "escalas"), where("date", ">=", hojeStr))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => d.data() as EscalaDia)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Admin: apaga escalas de dias já passados. Corre só quando o admin abre a
 * ferramenta de escalas — não há infraestrutura de cron nesta app.
 */
export async function limparEscalasPassadas(hojeStr: string): Promise<void> {
  const q = query(collection(db, "escalas"), where("date", "<", hojeStr))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

/**
 * Colaborador: escalas a partir de hoje onde o seu UID está presente numa equipa.
 * Um colaborador pode estar em mais do que uma obra no mesmo dia — devolve
 * uma entrada por cada equipa em que apareça (não só a primeira).
 */
export async function getMinhasEscalas(
  uid: string,
  hojeStr: string
): Promise<{ date: string; equipa: EscalaEquipa }[]> {
  const dias = await getEscalasFuturas(hojeStr)
  const minhas: { date: string; equipa: EscalaEquipa }[] = []
  for (const dia of dias) {
    const minhasEquipas = dia.equipas.filter(eq => eq.colaboradorUids.includes(uid))
    for (const equipa of minhasEquipas) {
      minhas.push({ date: dia.date, equipa })
    }
  }
  return minhas.sort((a, b) => a.date.localeCompare(b.date))
}
