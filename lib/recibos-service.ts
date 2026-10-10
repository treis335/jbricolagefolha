// lib/recibos-service.ts
// Recibos mensais dos colaboradores independentes.
// O PDF fica no Cloudinary (nome aleatório, impossível de adivinhar); no Firestore guarda-se só a ligação.
// Coleção: recibos/{uid}_{YYYY-MM}  → um recibo por colaborador e mês (voltar a enviar substitui).

import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { criarZip } from "@/lib/zip-simples"
import { resolveDisplayName } from "@/hooks/useCollaborators"

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ""
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ""

export const TAMANHO_MAX_RECIBO = 5 * 1024 * 1024 // 5 MB

export type TipoContrato = "funcionario" | "independente"

export interface Recibo {
  id: string
  colaboradorUid: string
  mes: string               // "YYYY-MM"
  url: string
  publicId: string
  nomeOriginal: string
  tamanho: number
  enviadoEm?: { toDate?: () => Date } | null
  enviadoPor: string
}

export const reciboId = (uid: string, mes: string) => `${uid}_${mes}`

// ── Meses ────────────────────────────────────────────────────────────────────
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

export function mesAtualISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
export function somarMeses(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
export function mesPorExtenso(mes: string): string {
  const [a, m] = mes.split("-").map(Number)
  return `${MESES[m - 1]} ${a}`
}
/** "João Silva", "2026-10" → "recibo-joao-silva-10-2026.pdf" */
export function nomeFicheiroRecibo(nomeColaborador: string, mes: string): string {
  const [ano, m] = mes.split("-")
  const slug = nomeColaborador.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "colaborador"
  return `recibo-${slug}-${m}-${ano}.pdf`
}

export function formatarTamanho(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Leitura em tempo real ────────────────────────────────────────────────────
/** Tipo de contrato do próprio colaborador (por defeito: funcionário). */
export function subscreverTipoContrato(uid: string, onChange: (t: TipoContrato, nome: string) => void): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid),
    snap => {
      const d = snap.data()
      onChange(d?.tipoContrato === "independente" ? "independente" : "funcionario", d ? resolveDisplayName(d) : "")
    },
    () => onChange("funcionario", ""),
  )
}

const paraRecibo = (d: { id: string; data: () => any }): Recibo => ({ id: d.id, ...(d.data() as Omit<Recibo, "id">) })

/** Todos os recibos de um colaborador (poucos por ano). */
export function subscreverRecibosDoColaborador(
  uid: string, onChange: (porMes: Record<string, Recibo>) => void, onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "recibos"), where("colaboradorUid", "==", uid)),
    snap => {
      const mapa: Record<string, Recibo> = {}
      snap.docs.map(paraRecibo).forEach(r => { mapa[r.mes] = r })
      onChange(mapa)
    },
    err => onError?.(err),
  )
}

/** Admin: todos os recibos de um mês. */
export function subscreverRecibosDoMes(
  mes: string, onChange: (porColaborador: Record<string, Recibo>) => void, onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "recibos"), where("mes", "==", mes)),
    snap => {
      const mapa: Record<string, Recibo> = {}
      snap.docs.map(paraRecibo).forEach(r => { mapa[r.colaboradorUid] = r })
      onChange(mapa)
    },
    err => onError?.(err),
  )
}

// ── Envio ────────────────────────────────────────────────────────────────────
function uploadPdf(file: File, onProgress?: (pct: number) => void): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) { reject(new Error("Cloudinary não configurado.")); return }
    const aleatorio = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "")
    const fd = new FormData()
    fd.append("file", file)
    fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
    fd.append("folder", "recibos")
    fd.append("public_id", aleatorio)
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`)
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        resolve({ url: data.secure_url, publicId: data.public_id })
      } else reject(new Error("O envio falhou. Tenta novamente."))
    }
    xhr.onerror = () => reject(new Error("Erro de rede no envio."))
    xhr.send(fd)
  })
}

/**
 * Envia o PDF e associa-o ao mês. Se já existir um recibo desse mês, é substituído.
 * O ficheiro é renomeado automaticamente para recibo-nome-mes-ano.pdf.
 */
export async function enviarRecibo(
  fileOriginal: File, colaboradorUid: string, nomeColaborador: string, mes: string, enviadoPor: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const file = fileOriginal
  const ePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  if (!ePdf) throw new Error("O ficheiro tem de ser um PDF.")
  if (file.size > TAMANHO_MAX_RECIBO) throw new Error("O PDF é demasiado grande (máximo 5 MB).")
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mês inválido.")

  const nomeFinal = nomeFicheiroRecibo(nomeColaborador, mes)
  const renomeado = new File([file], nomeFinal, { type: "application/pdf" })
  const { url, publicId } = await uploadPdf(renomeado, onProgress)
  await setDoc(doc(db, "recibos", reciboId(colaboradorUid, mes)), {
    colaboradorUid, mes, url, publicId,
    nomeOriginal: nomeFinal, tamanho: file.size,
    enviadoEm: serverTimestamp(), enviadoPor,
  })
}

/** Remove a associação do recibo ao mês (o ficheiro deixa de aparecer na app). */
export async function removerRecibo(colaboradorUid: string, mes: string): Promise<void> {
  await deleteDoc(doc(db, "recibos", reciboId(colaboradorUid, mes)))
}

// ── Download ─────────────────────────────────────────────────────────────────
/** Descarrega todos os recibos indicados num único ZIP. Devolve os nomes dos que não foi possível obter. */
export async function descarregarRecibosZip(
  itens: { colaborador: string; recibo: Recibo }[], mes: string,
): Promise<string[]> {
  const falhados: string[] = []
  const usados = new Set<string>()
  const ficheiros: { nome: string; dados: Uint8Array }[] = []

  for (const { colaborador, recibo } of itens) {
    try {
      const res = await fetch(recibo.url)
      if (!res.ok) throw new Error(String(res.status))
      const base = nomeFicheiroRecibo(colaborador, mes)
      let nome = base
      for (let i = 2; usados.has(nome); i++) nome = base.replace(/\.pdf$/, `-${i}.pdf`)
      usados.add(nome)
      ficheiros.push({ nome, dados: new Uint8Array(await res.arrayBuffer()) })
    } catch {
      falhados.push(colaborador)
    }
  }

  if (ficheiros.length > 0) {
    const url = URL.createObjectURL(criarZip(ficheiros))
    const a = document.createElement("a")
    a.href = url
    a.download = `recibos_${mes}.zip`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
  return falhados
}
