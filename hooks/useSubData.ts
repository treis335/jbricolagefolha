// hooks/useSubData.ts
// Carrega tudo o que uma empresa subempreiteira precisa (obras, serviços, dias, equipa, perfil).
"use client"
import { useCallback, useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { type Obra, getObrasDaEmpresa } from "@/lib/obras-service"
import {
  type SubDia, type SubMembro, type SubPagamento, type EmpresaPerfil,
  getDiasBySub, getPagamentosBySub, explainFirebaseError,
} from "@/lib/subempreiteiros-service"

export function useSubData(subUid?: string) {
  const [obras, setObras] = useState<Obra[]>([])
  const [dias, setDias] = useState<SubDia[]>([])
  const [pagamentos, setPagamentos] = useState<SubPagamento[]>([])
  const [equipa, setEquipa] = useState<SubMembro[]>([])
  const [empresa, setEmpresa] = useState<EmpresaPerfil>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")

  const reload = useCallback(async () => {
    if (!subUid) return
    const [o, d, u, pg] = await Promise.allSettled([
      getObrasDaEmpresa(subUid), getDiasBySub(subUid), getDoc(doc(db, "users", subUid)), getPagamentosBySub(subUid),
    ])
    if (o.status === "fulfilled") setObras(o.value)
    if (d.status === "fulfilled") setDias(d.value)
    if (pg.status === "fulfilled") setPagamentos(pg.value)
    if (u.status === "fulfilled") {
      const x = u.value.exists() ? u.value.data() : {}
      setEmpresa((x.empresa ?? {}) as EmpresaPerfil)
      setEquipa((x.subEquipa ?? []) as SubMembro[])
    }
    const falhas = [o, d, u, pg].filter(r => r.status === "rejected") as PromiseRejectedResult[]
    setErro(falhas.length ? explainFirebaseError(falhas[0].reason) : "")
    setLoading(false)
  }, [subUid])

  useEffect(() => { setLoading(true); reload() }, [reload])

  return { obras, dias, pagamentos, equipa, empresa, setEmpresa, loading, erro, reload }
}
