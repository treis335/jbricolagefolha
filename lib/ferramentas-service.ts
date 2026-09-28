// lib/ferramentas-service.ts
// Catálogo de ferramentas — coleção "ferramentas" no Firestore.
// Cada ferramenta é uma peça física única, com o seu próprio QR code
// (o próprio ID do documento). "comQuem" fica pronto para as fases
// seguintes (entrega/devolução) — por agora é sempre null.

import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp,
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
