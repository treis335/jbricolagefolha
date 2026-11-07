// lib/subempreiteiros-service.ts
// Empresas subempreiteiras: role "subcontractor" em users/{uid}.
//   - trabalhos:  coleção `subJobs` (sem horas nem €)
//   - empresa:    users/{uid}.empresa (opcional; o admin/patrão pode editar sempre)
//   - convites:   config/global.subcontractorEmails (+ allowedEmails)
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { ServiceFoto } from "@/lib/types"

export type SubJobStatus = "atribuido" | "em_curso" | "concluido"

export const SUB_STATUS_LABELS: Record<SubJobStatus, string> = {
  atribuido: "Atribuído",
  em_curso: "Em curso",
  concluido: "Concluído",
}

export interface SubJob {
  id: string
  subUid: string
  empresaNome: string
  obraId?: string
  obraNome: string
  titulo: string
  descricao: string
  fotos: ServiceFoto[]
  status: SubJobStatus
  date: string // YYYY-MM-DD
  createdBy: "empresa" | "admin"
  createdAt?: string
  updatedAt?: string
}

// Obra atribuída a uma empresa (coleção própria, separada das obras dos colaboradores)
export interface SubObra {
  id: string
  subUid: string
  nome: string
  morada: string
  ordens: string // instruções / o que a empresa tem de fazer
  estado: "ativa" | "concluida"
  criadaEm?: string
}

export interface EmpresaPerfil {
  nome?: string
  nif?: string
  morada?: string
  telefone?: string
  email?: string
  responsavel?: string
  logoUrl?: string
}

export interface SubEmpresa {
  uid: string
  email: string
  name: string
  ativo: boolean
  empresa: EmpresaPerfil
}

const jobsCol = () => collection(db, "subJobs")
const clean = <T extends object>(o: T): T =>
  JSON.parse(JSON.stringify(o)) as T // remove undefined (Firestore não aceita)

// ── Trabalhos ─────────────────────────────────────────────────────────────────
export function newJobId(): string {
  return doc(jobsCol()).id
}

export async function getJobsBySub(subUid: string): Promise<SubJob[]> {
  const snap = await getDocs(query(jobsCol(), where("subUid", "==", subUid)))
  return snap.docs
    .map(d => ({ ...(d.data() as Omit<SubJob, "id">), id: d.id }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
}

export async function getAllJobs(): Promise<SubJob[]> {
  const snap = await getDocs(jobsCol())
  return snap.docs
    .map(d => ({ ...(d.data() as Omit<SubJob, "id">), id: d.id }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
}

export async function saveJob(job: SubJob): Promise<void> {
  const { id, ...rest } = job
  await setDoc(
    doc(db, "subJobs", id),
    { ...clean(rest), fotos: job.fotos ?? [], updatedAt: new Date().toISOString(),
      createdAt: job.createdAt ?? new Date().toISOString() },
    { merge: true },
  )
}

export async function deleteJob(id: string): Promise<void> {
  await deleteDoc(doc(db, "subJobs", id))
}

// ── Obras atribuídas ─────────────────────────────────────────────────────────
const obrasCol = () => collection(db, "subObras")
export const newSubObraId = () => doc(obrasCol()).id

const sortObras = (a: SubObra, b: SubObra) =>
  (a.estado === b.estado ? 0 : a.estado === "ativa" ? -1 : 1) || a.nome.localeCompare(b.nome)

export async function getSubObrasBySub(subUid: string): Promise<SubObra[]> {
  const snap = await getDocs(query(obrasCol(), where("subUid", "==", subUid)))
  return snap.docs.map(d => ({ ...(d.data() as Omit<SubObra, "id">), id: d.id })).sort(sortObras)
}

export async function getAllSubObras(): Promise<SubObra[]> {
  const snap = await getDocs(obrasCol())
  return snap.docs.map(d => ({ ...(d.data() as Omit<SubObra, "id">), id: d.id })).sort(sortObras)
}

export async function saveSubObra(o: SubObra): Promise<void> {
  const { id, ...rest } = o
  await setDoc(doc(db, "subObras", id), { ...clean(rest), criadaEm: o.criadaEm ?? new Date().toISOString() }, { merge: true })
}

export async function deleteSubObra(id: string): Promise<void> {
  await deleteDoc(doc(db, "subObras", id))
}

// ── Empresa (perfil) ─────────────────────────────────────────────────────────
export async function saveEmpresaPerfil(uid: string, empresa: EmpresaPerfil): Promise<void> {
  await setDoc(doc(db, "users", uid), { empresa: clean(empresa) }, { merge: true })
}

export async function getSubEmpresas(): Promise<SubEmpresa[]> {
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "subcontractor")))
  return snap.docs.map(d => {
    const x = d.data()
    return {
      uid: d.id,
      email: x.email ?? "",
      name: x.name ?? x.username ?? "",
      ativo: x.ativo !== false,
      empresa: (x.empresa ?? {}) as EmpresaPerfil,
    }
  })
}

export async function setSubAtivo(uid: string, ativo: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { ativo })
}

// ── Convites por email ───────────────────────────────────────────────────────
const normalizeEmail = (e: string) => e.trim().toLowerCase()

/** Admin: autoriza um email a registar-se como empresa subempreiteira. */
export async function inviteSubcontractor(email: string): Promise<void> {
  const ref = doc(db, "config", "global")
  const snap = await getDoc(ref)
  const data = snap.exists() ? snap.data() : {}
  const e = normalizeEmail(email)
  const allowed: string[] = data.allowedEmails ?? []
  const subs: string[] = data.subcontractorEmails ?? []
  await setDoc(ref, {
    allowedEmails: allowed.includes(e) ? allowed : [...allowed, e],
    subcontractorEmails: subs.includes(e) ? subs : [...subs, e],
  }, { merge: true })
}

export function isSubcontractorEmail(settings: { subcontractorEmails?: string[] }, email?: string | null): boolean {
  if (!email) return false
  return (settings.subcontractorEmails ?? []).includes(normalizeEmail(email))
}

export async function getSubcontractorEmails(): Promise<string[]> {
  const snap = await getDoc(doc(db, "config", "global"))
  return snap.exists() ? (snap.data().subcontractorEmails ?? []) : []
}

// ── Logótipo (Cloudinary, mesmo preset das fotos) ────────────────────────────
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ""
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ""

export function uploadEmpresaLogo(file: File, uid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!CLOUD || !PRESET) { reject(new Error("Cloudinary não configurado.")); return }
    const fd = new FormData()
    fd.append("file", file)
    fd.append("upload_preset", PRESET)
    fd.append("folder", `empresas/${uid}`)
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`)
    xhr.onload = () => xhr.status === 200
      ? resolve(JSON.parse(xhr.responseText).secure_url)
      : reject(new Error(`Upload falhou (${xhr.status})`))
    xhr.onerror = () => reject(new Error("Erro de rede no upload."))
    xhr.send(fd)
  })
}
