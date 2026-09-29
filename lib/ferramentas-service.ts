// lib/ferramentas-service.ts
// Catálogo de ferramentas — coleção "ferramentas" no Firestore.
// Cada ferramenta é uma peça física única, com o seu próprio QR code
// (o próprio ID do documento). "comQuem" fica pronto para as fases
// seguintes (entrega/devolução) — por agora é sempre null.

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp,
  query, where, writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import QRCode from "qrcode"

export interface FerramentaComQuem {
  colaboradorUid: string
  colaboradorNome: string
  obraNome: string
  desde: string   // ISO date
}

export interface Ferramenta {
  id: string
  nome: string
  fotoUrl?: string
  ativa: boolean          // false = arquivada/retirada de circulação
  comQuem: FerramentaComQuem | null
  createdAt?: string
}

export interface CreateFerramentaInput {
  nome: string
  fotoUrl?: string
}

export async function getFerramentas(): Promise<Ferramenta[]> {
  const snap = await getDocs(collection(db, "ferramentas"))
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<Ferramenta, "id">) }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function createFerramenta(input: CreateFerramentaInput): Promise<string> {
  const ref = await addDoc(collection(db, "ferramentas"), {
    nome: input.nome.trim(),
    fotoUrl: input.fotoUrl ?? "",
    ativa: true,
    comQuem: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateFerramenta(id: string, data: Partial<Pick<Ferramenta, "nome" | "fotoUrl" | "ativa">>): Promise<void> {
  await updateDoc(doc(db, "ferramentas", id), data)
}

export async function deleteFerramenta(id: string): Promise<void> {
  await deleteDoc(doc(db, "ferramentas", id))
}

// ── Foto (Cloudinary) — mesmo padrão já usado em obras-service.ts ──────────
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ""
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ""

export interface CloudinaryUploadResult {
  url: string
  publicId: string
}

export function uploadFotoFerramenta(
  file: File,
  ferramentaId: string,
  onProgress?: (pct: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      reject(new Error("Cloudinary não configurado.")); return
    }
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
    formData.append("folder", `ferramentas/${ferramentaId}`)
    formData.append("tags", `ferramenta,${ferramentaId}`)
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        resolve({ url: data.secure_url, publicId: data.public_id })
      } else reject(new Error(`Upload falhou: ${xhr.statusText}`))
    }
    xhr.onerror = () => reject(new Error("Erro de rede no upload."))
    xhr.send(formData)
  })
}

// ── QR code ─────────────────────────────────────────────────────────────────
// O conteúdo do QR é só o ID da ferramenta — simples, único, sem ambiguidade.

export async function gerarQrDataUrl(ferramentaId: string): Promise<string> {
  return QRCode.toDataURL(ferramentaId, { width: 320, margin: 1 })
}

// ── Entrega / Devolução ──────────────────────────────────────────────────────
// "ferramentasHistorico" guarda cada ciclo entrega→devolução, mesmo depois de
// o colaborador sair da empresa (nunca se apaga por causa disso).

export interface HistoricoEntrega {
  id: string
  ferramentaId: string
  ferramentaNome: string
  colaboradorUid: string
  colaboradorNome: string
  obraNome: string
  entregueEm: string          // ISO
  entreguePor: string         // uid do admin/chefe de armazém
  devolvidoEm: string | null  // null = ainda por devolver
  devolvidoPor?: string
}

export interface EntregaResultado {
  entregues: { id: string; nome: string }[]
  jaEmUso: { id: string; nome: string; comQuem: FerramentaComQuem }[]
  inexistentes: string[]   // códigos picados que não correspondem a nenhuma ferramenta
}

/**
 * Entrega um lote de ferramentas a um colaborador. Ferramentas já entregues a
 * outra pessoa são ignoradas (reportadas em jaEmUso) em vez de reatribuídas
 * às cegas.
 */
export async function entregarFerramentas(
  ferramentaIds: string[],
  colaboradorUid: string,
  colaboradorNome: string,
  obraNome: string,
  adminUid: string
): Promise<EntregaResultado> {
  const agora = new Date().toISOString()
  const resultado: EntregaResultado = { entregues: [], jaEmUso: [], inexistentes: [] }
  const batch = writeBatch(db)

  for (const id of ferramentaIds) {
    const snap = await getDoc(doc(db, "ferramentas", id))
    if (!snap.exists()) { resultado.inexistentes.push(id); continue }
    const f = snap.data() as Omit<Ferramenta, "id">
    if (f.comQuem) { resultado.jaEmUso.push({ id, nome: f.nome, comQuem: f.comQuem }); continue }

    const comQuem: FerramentaComQuem = { colaboradorUid, colaboradorNome, obraNome, desde: agora }
    batch.update(doc(db, "ferramentas", id), { comQuem })

    const histRef = doc(collection(db, "ferramentasHistorico"))
    batch.set(histRef, {
      ferramentaId: id, ferramentaNome: f.nome,
      colaboradorUid, colaboradorNome, obraNome,
      entregueEm: agora, entreguePor: adminUid, devolvidoEm: null,
    })
    resultado.entregues.push({ id, nome: f.nome })
  }

  if (resultado.entregues.length > 0) await batch.commit()
  return resultado
}

export interface DevolucaoResultado {
  devolvidas: { id: string; nome: string; colaboradorNome: string }[]
  naoEstavamEntregues: string[]   // códigos picados de ferramentas que já estavam em stock
  inexistentes: string[]
}

/** Devolve um lote de ferramentas — cada uma fecha o próprio ciclo, sozinha. */
export async function devolverFerramentas(
  ferramentaIds: string[],
  adminUid: string
): Promise<DevolucaoResultado> {
  const agora = new Date().toISOString()
  const resultado: DevolucaoResultado = { devolvidas: [], naoEstavamEntregues: [], inexistentes: [] }

  for (const id of ferramentaIds) {
    const snap = await getDoc(doc(db, "ferramentas", id))
    if (!snap.exists()) { resultado.inexistentes.push(id); continue }
    const f = snap.data() as Omit<Ferramenta, "id">
    if (!f.comQuem) { resultado.naoEstavamEntregues.push(f.nome); continue }

    const colaboradorNome = f.comQuem.colaboradorNome
    await updateDoc(doc(db, "ferramentas", id), { comQuem: null })

    const histQuery = query(
      collection(db, "ferramentasHistorico"),
      where("ferramentaId", "==", id),
      where("devolvidoEm", "==", null)
    )
    const histSnap = await getDocs(histQuery)
    await Promise.all(histSnap.docs.map(d => updateDoc(d.ref, { devolvidoEm: agora, devolvidoPor: adminUid })))

    resultado.devolvidas.push({ id, nome: f.nome, colaboradorNome })
  }

  return resultado
}

/** Histórico de uma ferramenta específica (mais recente primeiro) */
export async function getHistoricoFerramenta(ferramentaId: string): Promise<HistoricoEntrega[]> {
  const snap = await getDocs(query(collection(db, "ferramentasHistorico"), where("ferramentaId", "==", ferramentaId)))
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<HistoricoEntrega, "id">) }))
    .sort((a, b) => b.entregueEm.localeCompare(a.entregueEm))
}

/** Todas as ferramentas atualmente entregues (para o alerta de atrasos, e para ver "quem tem o quê") */
export async function getFerramentasEmUso(): Promise<Ferramenta[]> {
  const todas = await getFerramentas()
  return todas.filter(f => f.comQuem)
}
