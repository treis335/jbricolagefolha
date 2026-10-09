// lib/ferramentas-service.ts
// Catálogo de ferramentas — coleção "ferramentas" no Firestore.
// Cada ferramenta é uma peça física única, com o seu próprio QR code
// (o próprio ID do documento). "comQuem" fica pronto para as fases
// seguintes (entrega/devolução) — por agora é sempre null.

import {
  collection, doc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp,
  query, where, orderBy, limit, runTransaction, onSnapshot, type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { compressImage } from "@/lib/service-fotos"
import QRCode from "qrcode"

export interface FerramentaComQuem {
  colaboradorUid: string
  colaboradorNome: string
  obraNome: string
  desde: string   // ISO date
}

export interface Ferramenta {
  id: string
  numero?: number         // nº sequencial (1, 2, 3…), nunca repetido nem reutilizado
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

function porNumero(a: Ferramenta, b: Ferramenta): number {
  const na = a.numero ?? Number.MAX_SAFE_INTEGER
  const nb = b.numero ?? Number.MAX_SAFE_INTEGER
  return na - nb || a.nome.localeCompare(b.nome)
}

function docParaFerramenta(d: { id: string; data: () => any }): Ferramenta {
  return { id: d.id, ...(d.data() as Omit<Ferramenta, "id">) }
}

export async function getFerramentas(): Promise<Ferramenta[]> {
  const snap = await getDocs(collection(db, "ferramentas"))
  return snap.docs.map(docParaFerramenta).sort(porNumero)
}

/** Lista em tempo real — qualquer alteração (entrega, devolução, edição) aparece logo a todos. */
export function subscreverFerramentas(
  onChange: (lista: Ferramenta[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "ferramentas"),
    snap => onChange(snap.docs.map(docParaFerramenta).sort(porNumero)),
    err => onError?.(err),
  )
}

/**
 * Lado do colaborador (só leitura): as ferramentas que estão com ele neste momento.
 * Filtra no servidor por comQuem.colaboradorUid — as regras do Firestore devem
 * permitir ler uma ferramenta apenas ao admin ou ao colaborador a quem está atribuída.
 */
export function subscreverFerramentasDoColaborador(
  uid: string,
  onChange: (lista: Ferramenta[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "ferramentas"), where("comQuem.colaboradorUid", "==", uid)),
    snap => onChange(
      snap.docs.map(docParaFerramenta).sort((a, b) => (a.comQuem!.desde < b.comQuem!.desde ? -1 : 1)) // mais antigas primeiro
    ),
    err => onError?.(err),
  )
}

// ── Numeração sequencial ────────────────────────────────────────────────────
// O contador só sobe: apagar ou arquivar uma ferramenta nunca liberta o número.
// Fica em config/ferramentasContador ({ ultimo }) e é incrementado em transação,
// por isso dois admins a criar em simultâneo nunca recebem o mesmo número.
const CONTADOR_REF = () => doc(db, "config", "ferramentasContador")

async function maiorNumeroExistente(): Promise<number> {
  const snap = await getDocs(query(collection(db, "ferramentas"), orderBy("numero", "desc"), limit(1)))
  return (snap.docs[0]?.data().numero as number | undefined) ?? 0
}

export async function createFerramenta(input: CreateFerramentaInput): Promise<string> {
  const ref = doc(collection(db, "ferramentas"))
  // Salvaguarda: mesmo que o contador se perdesse, nunca ficamos abaixo de um número já usado
  const maxExistente = await maiorNumeroExistente()
  await runTransaction(db, async tx => {
    const c = await tx.get(CONTADOR_REF())
    const ultimo = Math.max((c.exists() ? (c.data().ultimo as number) : 0) ?? 0, maxExistente)
    const numero = ultimo + 1
    tx.set(CONTADOR_REF(), { ultimo: numero })
    tx.set(ref, {
      numero,
      nome: input.nome.trim(),
      fotoUrl: input.fotoUrl ?? "",
      ativa: true,
      comQuem: null,
      createdAt: serverTimestamp(),
    })
  })
  return ref.id
}

/**
 * Dá número às ferramentas que ainda não têm (as criadas antes da numeração),
 * por ordem de criação. Seguro para correr em simultâneo: cada ferramenta é
 * revista dentro da transação e só recebe número se ainda não tiver.
 * Devolve quantas foram numeradas por esta chamada.
 */
export async function numerarFerramentasEmFalta(): Promise<number> {
  const snap = await getDocs(collection(db, "ferramentas"))
  const faltam = snap.docs.filter(d => d.data().numero == null)
  if (faltam.length === 0) return 0

  const quando = (d: (typeof faltam)[number]) => {
    const c = d.data().createdAt
    return c?.toMillis ? (c.toMillis() as number) : 0
  }
  faltam.sort((a, b) => quando(a) - quando(b) || String(a.data().nome ?? "").localeCompare(String(b.data().nome ?? "")))
  const maxExistente = snap.docs.reduce((m, d) => Math.max(m, (d.data().numero as number | undefined) ?? 0), 0)

  const TAMANHO_LOTE = 200
  for (let i = 0; i < faltam.length; i += TAMANHO_LOTE) {
    const lote = faltam.slice(i, i + TAMANHO_LOTE)
    await runTransaction(db, async tx => {
      const c = await tx.get(CONTADOR_REF())
      const frescos = await Promise.all(lote.map(d => tx.get(d.ref)))
      let n = Math.max((c.exists() ? (c.data().ultimo as number) : 0) ?? 0, maxExistente)
      for (const f of frescos) {
        if (f.exists() && f.data().numero == null) { n += 1; tx.update(f.ref, { numero: n }) }
      }
      tx.set(CONTADOR_REF(), { ultimo: n })
    })
  }
  return faltam.length
}

/**
 * Encontra uma ferramenta pelo que foi lido/escrito: o conteúdo do QR (id) ou
 * o número simples ("12" ou "#12"). Devolve null se não existir.
 */
export async function buscarFerramentaPorCodigo(codigo: string): Promise<Ferramenta | null> {
  const c = codigo.trim().replace(/^#/, "")
  if (!c) return null
  if (/^\d{1,7}$/.test(c)) {
    const snap = await getDocs(query(collection(db, "ferramentas"), where("numero", "==", Number(c)), limit(1)))
    return snap.docs[0] ? docParaFerramenta(snap.docs[0]) : null
  }
  if (c.includes("/")) return null
  const snap = await getDoc(doc(db, "ferramentas", c))
  return snap.exists() ? docParaFerramenta(snap) : null
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

/** Versão leve da foto para listas (Cloudinary redimensiona e escolhe o melhor formato). */
export function miniaturaUrl(url: string | undefined, largura = 480): string {
  if (!url) return ""
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${largura}/`)
}

export async function uploadFotoFerramenta(
  fileOriginal: File,
  ferramentaId: string,
  onProgress?: (pct: number) => void
): Promise<CloudinaryUploadResult> {
  // fotos de telemóvel têm vários MB — reduz antes de enviar
  const file = await compressImage(fileOriginal).catch(() => fileOriginal)
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
  ferramentaNumero?: number
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
 * Entrega um lote de ferramentas a um colaborador, tudo numa única transação:
 * ou fica tudo registado ou nada, e duas pessoas a entregar a mesma ferramenta
 * ao mesmo tempo nunca a duplicam. Ferramentas já entregues a outra pessoa são
 * ignoradas (reportadas em jaEmUso) em vez de reatribuídas às cegas.
 */
export async function entregarFerramentas(
  ferramentaIds: string[],
  colaboradorUid: string,
  colaboradorNome: string,
  obraNome: string,
  adminUid: string
): Promise<EntregaResultado> {
  const agora = new Date().toISOString()
  const ids = Array.from(new Set(ferramentaIds))

  return runTransaction(db, async tx => {
    const resultado: EntregaResultado = { entregues: [], jaEmUso: [], inexistentes: [] }
    const snaps = await Promise.all(ids.map(id => tx.get(doc(db, "ferramentas", id))))

    snaps.forEach((snap, i) => {
      const id = ids[i]
      if (!snap.exists()) { resultado.inexistentes.push(id); return }
      const f = snap.data() as Omit<Ferramenta, "id">
      if (f.comQuem) { resultado.jaEmUso.push({ id, nome: f.nome, comQuem: f.comQuem }); return }

      const comQuem: FerramentaComQuem = { colaboradorUid, colaboradorNome, obraNome, desde: agora }
      tx.update(snap.ref, { comQuem })
      tx.set(doc(collection(db, "ferramentasHistorico")), {
        ferramentaId: id, ferramentaNome: f.nome, ferramentaNumero: f.numero ?? null,
        colaboradorUid, colaboradorNome, obraNome,
        entregueEm: agora, entreguePor: adminUid, devolvidoEm: null,
      })
      resultado.entregues.push({ id, nome: f.nome })
    })
    return resultado
  })
}

export interface DevolucaoResultado {
  devolvidas: { id: string; nome: string; colaboradorNome: string }[]
  naoEstavamEntregues: string[]   // nomes das ferramentas que já estavam em stock
  inexistentes: string[]
}

/** Devolve um lote de ferramentas — ferramenta e histórico fecham juntos, numa transação. */
export async function devolverFerramentas(
  ferramentaIds: string[],
  adminUid: string
): Promise<DevolucaoResultado> {
  const agora = new Date().toISOString()
  const ids = Array.from(new Set(ferramentaIds))

  // ciclos de entrega ainda em aberto (a consulta não pode correr dentro da transação)
  const abertos = await Promise.all(ids.map(async id => {
    const s = await getDocs(query(
      collection(db, "ferramentasHistorico"),
      where("ferramentaId", "==", id),
      where("devolvidoEm", "==", null)
    ))
    return s.docs.map(d => d.ref)
  }))

  return runTransaction(db, async tx => {
    const resultado: DevolucaoResultado = { devolvidas: [], naoEstavamEntregues: [], inexistentes: [] }
    const snaps = await Promise.all(ids.map(id => tx.get(doc(db, "ferramentas", id))))
    const hists = await Promise.all(abertos.map(refs => Promise.all(refs.map(r => tx.get(r)))))

    snaps.forEach((snap, i) => {
      const id = ids[i]
      if (!snap.exists()) { resultado.inexistentes.push(id); return }
      const f = snap.data() as Omit<Ferramenta, "id">
      if (!f.comQuem) { resultado.naoEstavamEntregues.push(f.nome); return }

      tx.update(snap.ref, { comQuem: null })
      hists[i].forEach(h => {
        if (h.exists() && h.data().devolvidoEm == null) {
          tx.update(h.ref, { devolvidoEm: agora, devolvidoPor: adminUid })
        }
      })
      resultado.devolvidas.push({ id, nome: f.nome, colaboradorNome: f.comQuem.colaboradorNome })
    })
    return resultado
  })
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
