// lib/alertas-horas-service.ts
// Compara as horas que colaboradores que trabalharam juntos (equipaUids num
// serviço) apontaram no mesmo dia. Se a diferença for grande, é sinal de que
// alguém pode ter apontado horas a mais/menos por engano — fica marcado como
// divergência para o admin confirmar.
//
// Estado (verificado / comentário) fica em Firestore, na coleção
// alertasHoras/{groupId}. O groupId é estável (data + UIDs ordenados), por
// isso um comentário sobrevive mesmo que a divergência reapareça depois de
// alguém editar as horas — só o "verificado" é que perde validade nesse caso,
// porque compara sempre as horas atuais com a fotografia guardada no momento
// da verificação.

import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Collaborator } from "@/hooks/useCollaborators"

export interface DivergenciaMembro {
  uid: string
  nome: string
  horas: number
}

export interface DivergenciaGrupo {
  groupId: string
  date: string
  membros: DivergenciaMembro[]   // ordenados por horas, do maior para o menor
  diff: number
}

export interface EstadoAlerta {
  verificado?: boolean
  horasVerificadas?: Record<string, number>
  verificadoPor?: string
  verificadoEm?: unknown
  comentario?: string
  comentarioPor?: string
  comentarioEm?: unknown
}

const LIMIAR_HORAS = 1
const REF = (groupId: string) => doc(db, "alertasHoras", groupId)

/** Deteta todos os grupos com divergência de horas, a partir das entries já carregadas de useCollaborators() */
export function detectarDivergencias(collaborators: Collaborator[]): DivergenciaGrupo[] {
  const nomeById = new Map(collaborators.map(c => [c.id, c.name]))

  // horas por dia, por uid
  const horasPorDia = new Map<string, Map<string, number>>()
  // union-find para agrupar quem "trabalhou junto" num dado dia
  const parent = new Map<string, string>()
  const key = (date: string, uid: string) => `${date}|${uid}`

  function find(k: string): string {
    if (!parent.has(k)) parent.set(k, k)
    let root = k
    while (parent.get(root) !== root) root = parent.get(root)!
    let cur = k
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!
      parent.set(cur, root)
      cur = next
    }
    return root
  }
  function union(a: string, b: string) {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  collaborators.forEach(col => {
    const entries: any[] = (col as any).entries || []
    entries.forEach(entry => {
      if (!entry?.date) return
      const dateMap = horasPorDia.get(entry.date) ?? new Map<string, number>()
      dateMap.set(col.id, entry.totalHoras || 0)
      horasPorDia.set(entry.date, dateMap)

      find(key(entry.date, col.id)) // garante que o nó existe

      const services: any[] = entry.services || []
      services.forEach(s => {
        const uids: string[] = Array.isArray(s.equipaUids) ? s.equipaUids : []
        uids.forEach(otherUid => {
          if (otherUid && otherUid !== col.id) {
            find(key(entry.date, otherUid))
            union(key(entry.date, col.id), key(entry.date, otherUid))
          }
        })
      })
    })
  })

  // agrupar por raiz
  const gruposPorRaiz = new Map<string, Set<string>>() // raiz -> keys "date|uid"
  for (const k of parent.keys()) {
    const raiz = find(k)
    const set = gruposPorRaiz.get(raiz) ?? new Set<string>()
    set.add(k)
    gruposPorRaiz.set(raiz, set)
  }

  const resultado: DivergenciaGrupo[] = []
  gruposPorRaiz.forEach(keys => {
    if (keys.size < 2) return
    const primeiraKey = [...keys][0]
    const date = primeiraKey.split("|")[0]
    const dateMap = horasPorDia.get(date)
    if (!dateMap) return

    const membros: DivergenciaMembro[] = [...keys]
      .map(k => k.split("|")[1])
      .map(uid => ({ uid, nome: nomeById.get(uid) ?? uid, horas: dateMap.get(uid) ?? 0 }))
      .filter(m => m.horas > 0) // só quem realmente registou horas nesse dia

    if (membros.length < 2) return

    const horasVals = membros.map(m => m.horas)
    const diff = Math.max(...horasVals) - Math.min(...horasVals)
    if (diff > LIMIAR_HORAS) {
      const sortedUids = membros.map(m => m.uid).sort()
      resultado.push({
        groupId: `${date}__${sortedUids.join("_")}`,
        date,
        membros: membros.sort((a, b) => b.horas - a.horas),
        diff,
      })
    }
  })

  return resultado.sort((a, b) => b.date.localeCompare(a.date))
}

/** Lê o estado (verificado/comentário) de todos os alertas de uma vez */
export async function getEstadosAlertas(): Promise<Map<string, EstadoAlerta>> {
  const snap = await getDocs(collection(db, "alertasHoras"))
  const map = new Map<string, EstadoAlerta>()
  snap.docs.forEach(d => map.set(d.id, d.data() as EstadoAlerta))
  return map
}

/** Um grupo está ativo (deve aparecer na lista) se nunca foi verificado, ou
 *  se as horas mudaram desde a última verificação. */
export function grupoAtivo(grupo: DivergenciaGrupo, estado: EstadoAlerta | undefined): boolean {
  if (!estado?.verificado) return true
  const snapshot = estado.horasVerificadas ?? {}
  const mesmoNumeroMembros = Object.keys(snapshot).length === grupo.membros.length
  const horasIguais = grupo.membros.every(m => snapshot[m.uid] === m.horas)
  return !(mesmoNumeroMembros && horasIguais)
}

/** Admin: marca o grupo como verificado, guardando a fotografia das horas atuais */
export async function marcarVerificado(grupo: DivergenciaGrupo, adminUid: string): Promise<void> {
  const horasVerificadas = Object.fromEntries(grupo.membros.map(m => [m.uid, m.horas]))
  await setDoc(REF(grupo.groupId), {
    verificado: true,
    horasVerificadas,
    verificadoPor: adminUid,
    verificadoEm: serverTimestamp(),
  }, { merge: true })
}

/** Admin: guarda/atualiza o comentário interno do grupo — sobrevive a reaparecimentos */
export async function salvarComentario(groupId: string, texto: string, adminUid: string): Promise<void> {
  await setDoc(REF(groupId), {
    comentario: texto,
    comentarioPor: adminUid,
    comentarioEm: serverTimestamp(),
  }, { merge: true })
}
