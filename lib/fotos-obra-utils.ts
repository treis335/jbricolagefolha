// lib/fotos-obra-utils.ts
// Lógica pura (sem Firebase) para associar fotos de serviços a uma obra.
// A associação é guardada na própria foto (obraId/obraNome); não altera o serviço, as horas nem a obra do serviço.

export interface ObraRef { id: string; nome: string }

/**
 * Aplica (ou remove, com obra = null) a obra nas fotos cujo URL está em `urls`.
 * Só copia o que muda; tudo o resto fica exatamente igual. Devolve quantas fotos foram alteradas.
 */
export function aplicarObraNasFotos(
  entries: any[],
  urls: Set<string>,
  obra: ObraRef | null,
): { entries: any[]; alteradas: number } {
  let alteradas = 0

  const novas = (entries ?? []).map(entry => {
    if (!Array.isArray(entry?.services)) return entry
    let entryMudou = false

    const services = entry.services.map((s: any) => {
      if (!Array.isArray(s?.fotos)) return s
      let servicoMudou = false

      const fotos = s.fotos.map((f: any) => {
        if (!f || !urls.has(f.url)) return f
        if (obra) {
          if (f.obraId === obra.id && f.obraNome === obra.nome) return f
          servicoMudou = true; alteradas++
          return { ...f, obraId: obra.id, obraNome: obra.nome }
        }
        if (f.obraId === undefined && f.obraNome === undefined) return f
        servicoMudou = true; alteradas++
        const { obraId: _id, obraNome: _nome, ...resto } = f
        return resto
      })

      if (!servicoMudou) return s
      entryMudou = true
      return { ...s, fotos }
    })

    return entryMudou ? { ...entry, services } : entry
  })

  return { entries: novas, alteradas }
}
