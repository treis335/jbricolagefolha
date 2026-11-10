// lib/subempreiteiros-service.ts
// Empresas subempreiteiras: role "subcontractor" em users/{uid}.
//   - trabalhos:  coleção `subJobs` (sem horas nem €)
//   - empresa:    users/{uid}.empresa (opcional; o admin/patrão pode editar sempre)
//   - convites:   config/global.subcontractorEmails (+ allowedEmails)
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, deleteField,
  query, where, serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { ServiceFoto } from "@/lib/types"
import type { FotoFlat } from "@/components/admin/visualizador-fotos"

export const fmtEuro = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })

export function explainFirebaseError(err: unknown): string {
  const e = err as { code?: string; message?: string }
  if (e?.code === "permission-denied") return "Sem permissão — falta publicar as regras do Firestore para esta coleção."
  return e?.code || e?.message || "erro desconhecido"
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

// ── Equipa do subempreiteiro (users/{uid}.subEquipa) ─────────────────────────
export interface SubMembro {
  id: string
  nome: string
  valorHora: number // € por hora
}

// ── Registo diário (subDias/{subUid_YYYY-MM-DD}) ─────────────────────────────
export interface SubRegisto {
  id: string
  obraId: string
  obraNome: string
  membroId: string
  membroNome: string
  horas: number
  valorHora: number // snapshot do valor/hora no dia do registo
  custo: number     // horas × valorHora
}

// O que foi feito numa obra nesse dia (descrição + fotos antes/depois)
export interface SubNotaObra {
  descricao: string
  fotos: ServiceFoto[]
}

// Um serviço dentro do dia: obra + equipa (com horas) + o que foi feito + fotos
export interface SubServicoDia {
  id: string
  obraId: string
  obraNome: string
  descricao: string
  fotos: ServiceFoto[]
  registos: SubRegisto[]
}

export interface SubDia {
  id: string
  subUid: string
  empresaNome: string
  date: string // YYYY-MM-DD
  registos: SubRegisto[]
  servicos?: SubServicoDia[]
  notas?: Record<string, SubNotaObra> // formato antigo (por obraId) — lido por compatibilidade
  totalHoras: number
  totalCusto: number
  updatedAt?: string
}

export interface SubEmpresa {
  uid: string
  email: string
  name: string
  ativo: boolean
  empresa: EmpresaPerfil
  equipa: SubMembro[]
}

const clean = <T extends object>(o: T): T =>
  JSON.parse(JSON.stringify(o)) as T // remove undefined (Firestore não aceita)

// ── Atribuição de obras (as obras são as MESMAS dos colaboradores: coleção `obras`) ──
export async function atribuirObra(obraId: string, uid: string, ordens: string): Promise<void> {
  await updateDoc(doc(db, "obras", obraId), { subUids: arrayUnion(uid), [`subOrdens.${uid}`]: ordens.trim() })
}
export async function guardarOrdens(obraId: string, uid: string, ordens: string): Promise<void> {
  await updateDoc(doc(db, "obras", obraId), { [`subOrdens.${uid}`]: ordens.trim() })
}
export async function retirarObra(obraId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "obras", obraId), { subUids: arrayRemove(uid), [`subOrdens.${uid}`]: deleteField() })
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
      equipa: (x.subEquipa ?? []) as SubMembro[],
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

// ── Equipa ───────────────────────────────────────────────────────────────────
export const newId = () => doc(collection(db, "subJobs")).id

export async function getSubEquipa(uid: string): Promise<SubMembro[]> {
  const snap = await getDoc(doc(db, "users", uid))
  return snap.exists() ? ((snap.data().subEquipa ?? []) as SubMembro[]) : []
}

export async function saveSubEquipa(uid: string, equipa: SubMembro[]): Promise<void> {
  await setDoc(doc(db, "users", uid), { subEquipa: clean(equipa) }, { merge: true })
}

// ── Dias (calendário) ────────────────────────────────────────────────────────
export const diaId = (subUid: string, date: string) => `${subUid}_${date}`

export async function getDiasBySub(subUid: string): Promise<SubDia[]> {
  const snap = await getDocs(query(collection(db, "subDias"), where("subUid", "==", subUid)))
  return snap.docs.map(d => ({ ...(d.data() as Omit<SubDia, "id">), id: d.id }))
}

export async function getAllDias(): Promise<SubDia[]> {
  const snap = await getDocs(collection(db, "subDias"))
  return snap.docs.map(d => ({ ...(d.data() as Omit<SubDia, "id">), id: d.id }))
}

/** Serviços de um dia (converte o formato antigo registos+notas, se necessário). */
export function servicosDoDia(d: SubDia): SubServicoDia[] {
  if (d.servicos?.length) return d.servicos
  const porObra = new Map<string, SubRegisto[]>()
  d.registos.forEach(r => porObra.set(r.obraId, [...(porObra.get(r.obraId) ?? []), r]))
  return Array.from(porObra.entries()).map(([obraId, registos]) => ({
    id: `legacy_${obraId}`, obraId, obraNome: registos[0].obraNome,
    descricao: d.notas?.[obraId]?.descricao ?? "", fotos: d.notas?.[obraId]?.fotos ?? [], registos,
  }))
}

export async function saveDia(subUid: string, empresaNome: string, date: string, servicos: SubServicoDia[]): Promise<void> {
  const id = diaId(subUid, date)
  const validos = servicos
    .filter(s => s.obraId && s.registos.length > 0)
    .map(s => ({ ...s, descricao: s.descricao.trim() }))
  if (validos.length === 0) { await deleteDoc(doc(db, "subDias", id)); return }
  const registos = validos.flatMap(s => s.registos)
  const totalHoras = registos.reduce((a, r) => a + r.horas, 0)
  const totalCusto = registos.reduce((a, r) => a + r.custo, 0)
  await setDoc(doc(db, "subDias", id), clean({
    subUid, empresaNome, date, servicos: validos, registos, totalHoras, totalCusto, updatedAt: new Date().toISOString(),
  }))
}

/** Totais por obra a partir dos dias registados. */
export function statsObra(obraId: string, dias: SubDia[]) {
  let horas = 0, custo = 0, nDias = 0
  dias.forEach(d => {
    const rs = d.registos.filter(r => r.obraId === obraId)
    if (rs.length) { nDias++; rs.forEach(r => { horas += r.horas; custo += r.custo }) }
  })
  return { dias: nDias, horas, custo }
}


/** Fotos dos empreiteiros (do calendário) no mesmo formato das dos colaboradores — para a aba Fotos da obra e para os relatórios. */
export function fotosDeEmpreiteiros(dias: SubDia[], obraId?: string): FotoFlat[] {
  const lista: FotoFlat[] = []
  dias.forEach(d => servicosDoDia(d).forEach(sv => {
    if (obraId && sv.obraId !== obraId) return
    sv.fotos.forEach(f => {
      if (!f?.url) return
      lista.push({
        url: f.url,
        tipo: f.tipo === "depois" ? "depois" : "antes",
        uploadedAt: f.uploadedAt ?? "",
        colaboradorId: d.subUid,
        colaboradorNome: `${d.empresaNome || "Empreiteiro"} (empreiteiro)`,
        date: d.date,
        obraNome: sv.obraNome || "Sem obra",
        descricao: sv.descricao || "",
        servicoKey: `sub|${d.subUid}|${d.date}|${sv.id}`,
      })
    })
  }))
  return lista
}

// ── Pagamentos (subPagamentos/{id}) — só o admin/patrão escreve; a empresa só lê os seus ──
export type SubMetodo = "MBWay" | "Dinheiro" | "Transferência"

export interface SubPagamento {
  id: string
  subUid: string
  empresaNome: string
  date: string // YYYY-MM-DD
  valor: number
  metodo: SubMetodo
  nota?: string // ex.: nº da fatura
  criadoEm: string
}

export async function getPagamentosBySub(subUid: string): Promise<SubPagamento[]> {
  const snap = await getDocs(query(collection(db, "subPagamentos"), where("subUid", "==", subUid)))
  return snap.docs.map(d => ({ ...(d.data() as Omit<SubPagamento, "id">), id: d.id }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function getAllPagamentos(): Promise<SubPagamento[]> {
  const snap = await getDocs(collection(db, "subPagamentos"))
  return snap.docs.map(d => ({ ...(d.data() as Omit<SubPagamento, "id">), id: d.id }))
}

export async function addPagamento(p: Omit<SubPagamento, "id" | "criadoEm">): Promise<void> {
  const ref = doc(collection(db, "subPagamentos"))
  await setDoc(ref, clean({ ...p, criadoEm: new Date().toISOString() }))
}

export async function deletePagamento(id: string): Promise<void> {
  await deleteDoc(doc(db, "subPagamentos", id))
}

export const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const r2c = (n: number) => Math.round(n * 100) / 100

export interface SubMesFin {
  mes: string // YYYY-MM
  dias: SubDia[]
  horas: number
  custo: number
  pago: number // quanto deste mês já está coberto pelos pagamentos
  falta: number
}

/** Os pagamentos cobrem o que é mais antigo primeiro (como nos colaboradores), mas POR VALOR: um pagamento parcial conta. */
export function resumoFinanceiro(dias: SubDia[], pagamentos: SubPagamento[]) {
  const ord = [...dias].sort((a, b) => a.date.localeCompare(b.date))
  const totalGanho = r2c(ord.reduce((a, d) => a + d.totalCusto, 0))
  const totalPago = r2c(pagamentos.reduce((a, p) => a + p.valor, 0))
  let restante = totalPago
  const m = new Map<string, SubMesFin>()
  for (const d of ord) {
    const k = d.date.slice(0, 7)
    const x = m.get(k) ?? { mes: k, dias: [], horas: 0, custo: 0, pago: 0, falta: 0 }
    const cobre = Math.min(d.totalCusto, Math.max(0, restante))
    restante = r2c(restante - cobre)
    m.set(k, { ...x, dias: [d, ...x.dias], horas: x.horas + d.totalHoras, custo: r2c(x.custo + d.totalCusto), pago: r2c(x.pago + cobre) })
  }
  const porMes = Array.from(m.values()).map(x => ({ ...x, falta: r2c(x.custo - x.pago) })).sort((a, b) => b.mes.localeCompare(a.mes))
  const saldo = r2c(totalGanho - totalPago) // > 0 falta pagar; < 0 pago a mais (adiantamento)
  return { totalGanho, totalPago, saldo, emDivida: Math.max(0, saldo), porMes }
}
