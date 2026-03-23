// lib/obras-service.ts
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export type ObraEstado = "ativa" | "pausada" | "concluida"

export interface ObraLocalizacao {
  lat: number
  lng: number
  moradaCompleta: string  // endereço normalizado pelo geocoder
}

export interface Obra {
  id: string
  nome: string
  // Morada estruturada
  moradaRua: string        // ex: "Rua do Ouro, 123"
  moradaCodigoPostal: string // ex: "1100-061"
  moradaCidade: string     // ex: "Lisboa"
  // Localização geocodificada (preenchida automaticamente)
  localizacao?: ObraLocalizacao
  descricao: string
  estado: ObraEstado
  cor: string
  fotoUrl?: string
  fotoPublicId?: string
  criadaEm: string
  criadaPor: string
  criadaPorNome: string
}

export interface CreateObraInput {
  nome: string
  moradaRua: string
  moradaCodigoPostal: string
  moradaCidade: string
  localizacao?: ObraLocalizacao
  descricao: string
  estado: ObraEstado
  cor: string
  criadaPor: string
  criadaPorNome: string
}

// Morada completa formatada para exibição e geocoding
export function formatMorada(obra: Pick<Obra, "moradaRua" | "moradaCodigoPostal" | "moradaCidade">): string {
  return [obra.moradaRua, obra.moradaCodigoPostal, obra.moradaCidade]
    .filter(Boolean)
    .join(", ")
}

// ── Geocoding via OpenStreetMap Nominatim (gratuito, sem API key) ─────────

export async function geocodeMorada(
  rua: string,
  codigoPostal: string,
  cidade: string
): Promise<ObraLocalizacao | null> {
  const query = [rua, codigoPostal, cidade, "Portugal"].filter(Boolean).join(", ")
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=pt`,
      { headers: { "Accept-Language": "pt-PT" } }
    )
    const data = await res.json()
    if (!data?.[0]) return null
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      moradaCompleta: data[0].display_name,
    }
  } catch {
    return null
  }
}

// ── URLs de navegação ─────────────────────────────────────────────────────

export function getGoogleMapsUrl(loc: ObraLocalizacao): string {
  return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`
}

export function getWazeUrl(loc: ObraLocalizacao): string {
  return `https://waze.com/ul?ll=${loc.lat},${loc.lng}&navigate=yes`
}



// ── Cores ─────────────────────────────────────────────────────────────────

export const CORES_DISPONIVEIS = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
]

export function getRandomCorObra(): string {
  return CORES_DISPONIVEIS[Math.floor(Math.random() * CORES_DISPONIVEIS.length)]
}

// ── Labels / Cores de estado ───────────────────────────────────────────────

export const ESTADO_LABELS: Record<ObraEstado, string> = {
  ativa:     "Ativa",
  pausada:   "Pausada",
  concluida: "Concluída",
}

export const ESTADO_COLORS: Record<ObraEstado, { bg: string; text: string; dot: string }> = {
  ativa:     { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  pausada:   { bg: "bg-amber-100 dark:bg-amber-950/40",     text: "text-amber-700 dark:text-amber-400",     dot: "bg-amber-400"  },
  concluida: { bg: "bg-slate-100 dark:bg-slate-800/40",     text: "text-slate-600 dark:text-slate-400",     dot: "bg-slate-400"  },
}

// ── CRUD Firestore ─────────────────────────────────────────────────────────

export async function getObras(): Promise<Obra[]> {
  const q = query(collection(db, "obras"), orderBy("criadaEm", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      nome: data.nome ?? "",
      moradaRua: data.moradaRua ?? data.morada ?? "",
      moradaCodigoPostal: data.moradaCodigoPostal ?? "",
      moradaCidade: data.moradaCidade ?? "",
      localizacao: data.localizacao ?? undefined,
      descricao: data.descricao ?? "",
      estado: data.estado ?? "ativa",
      cor: data.cor ?? "#3B82F6",
      fotoUrl: data.fotoUrl ?? undefined,
      fotoPublicId: data.fotoPublicId ?? undefined,
      criadaEm: data.criadaEm instanceof Timestamp
        ? data.criadaEm.toDate().toISOString()
        : data.criadaEm ?? new Date().toISOString(),
      criadaPor: data.criadaPor ?? "",
      criadaPorNome: data.criadaPorNome ?? "",
    }
  })
}

export async function createObra(input: CreateObraInput): Promise<string> {
  const docRef = await addDoc(collection(db, "obras"), {
    ...input,
    criadaEm: serverTimestamp(),
  })
  return docRef.id
}

export async function updateObra(
  id: string,
  updates: Partial<Omit<Obra, "id" | "criadaEm" | "criadaPor">>
): Promise<void> {
  await updateDoc(doc(db, "obras", id), { ...updates })
}

export async function deleteObra(id: string): Promise<void> {
  await deleteDoc(doc(db, "obras", id))
}

// ── Upload Cloudinary ─────────────────────────────────────────────────────

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ""
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ""

export interface CloudinaryUploadResult {
  url: string
  publicId: string
}

export function uploadFotoObra(
  file: File,
  obraId: string,
  onProgress?: (pct: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      reject(new Error("Cloudinary não configurado.")); return
    }
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
    formData.append("folder", `obras/${obraId}`)
    formData.append("tags", `obra,${obraId}`)
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