// lib/suggestions.ts
// Sugestões de equipa — quando A adiciona B, B recebe sugestão pendente
// Completamente isolado dos dados existentes — não toca em workData

import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { v4 as uuidv4 } from "uuid"

export interface PendingSuggestion {
  id: string
  date: string           // "YYYY-MM-DD"
  obraNome: string
  descricao: string
  materiais: string[]
  suggestedByName: string
  suggestedByUid: string
  createdAt: string      // ISO timestamp
}

// Escreve sugestões nos documentos dos destinatários
export async function sendSuggestions(
  services: Array<{
    obraNome: string
    descricao: string
    materiais: string[]
    equipa: string[]
    equipaUids: string[]
  }>,
  date: string,
  fromName: string,
  fromUid: string
): Promise<void> {
  // Para cada serviço com equipa com UIDs conhecidos
  for (const svc of services) {
    const uids = (svc.equipaUids || []).filter(Boolean)
    if (!uids.length) continue

    // Só cria sugestão se há dados relevantes
    const hasContent = svc.obraNome?.trim() || svc.descricao?.trim()
    if (!hasContent) continue

    const suggestion: PendingSuggestion = {
      id: uuidv4(),
      date,
      obraNome:        svc.obraNome?.trim()  || "",
      descricao:       svc.descricao?.trim() || "",
      materiais:       svc.materiais || [],
      suggestedByName: fromName,
      suggestedByUid:  fromUid,
      createdAt:       new Date().toISOString(),
    }

    // Escreve em paralelo em cada destinatário
    await Promise.allSettled(
      uids
        .filter(uid => uid !== fromUid) // não se sugere a si próprio
        .map(uid =>
          updateDoc(doc(db, "users", uid), {
            pendingSuggestions: arrayUnion(suggestion),
          }).catch(() => {
            // Se o doc não tem o campo ainda, usa setDoc com merge
            return getDoc(doc(db, "users", uid)).then(snap => {
              if (snap.exists()) {
                const current = snap.data().pendingSuggestions || []
                return updateDoc(doc(db, "users", uid), {
                  pendingSuggestions: [...current, suggestion],
                })
              }
            })
          })
        )
    )
  }
}

// Remove uma sugestão do documento do utilizador
export async function dismissSuggestion(
  uid: string,
  suggestion: PendingSuggestion
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    pendingSuggestions: arrayRemove(suggestion),
  })
}
