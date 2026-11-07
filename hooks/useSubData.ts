// hooks/useSubData.ts
// Carrega tudo o que uma empresa subempreiteira precisa (obras, serviços, dias, equipa, perfil).
"use client"
import { useCallback, useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  type SubJob, type SubObra, type SubDia, type SubMembro, type EmpresaPerfil,
  getJobsBySub, getSubObrasBySub, getDiasBySub, explainFirebaseError,
} from "@/lib/subempreiteiros-service"

export function useSubData(subUid?: string) {
  const [obras, setObras] = useState<SubObra[]>([])
  const [jobs, setJobs] = useState<SubJob[]>([])
  const [dias, setDias] = useState<SubDia[]>([])
  const [equipa, setEquipa] = useState<SubMembro[]>([])
  const [empresa, setEmpresa] = useState<EmpresaPerfil>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")

  const reload = useCallback(async () => {
    if (!subUid) return
    const [o, j, d, u] = await Promise.allSettled([
      getSubObrasBySub(subUid), getJobsBySub(subUid), getDiasBySub(subUid), getDoc(doc(db, "users", subUid)),
    ])
    if (o.status === "fulfilled") setObras(o.value)
    if (j.status === "fulfilled") setJobs(j.value)
    if (d.status === "fulfilled") setDias(d.value)
    if (u.status === "fulfilled") {
      const x = u.value.exists() ? u.value.data() : {}
      setEmpresa((x.empresa ?? {}) as EmpresaPerfil)
      setEquipa((x.subEquipa ?? []) as SubMembro[])
    }
    const falhas = [o, j, d, u].filter(r => r.status === "rejected") as PromiseRejectedResult[]
    setErro(falhas.length ? explainFirebaseError(falhas[0].reason) : "")
    setLoading(false)
  }, [subUid])

  useEffect(() => { setLoading(true); reload() }, [reload])

  return { obras, jobs, dias, equipa, empresa, setEmpresa, loading, erro, reload }
}
