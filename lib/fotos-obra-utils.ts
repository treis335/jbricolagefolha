// lib/fotos-obra-utils.ts
// Lógica pura (sem Firebase) para corrigir a obra a partir das fotos.
// Ao associar fotos a uma obra, o SERVIÇO do colaborador que contém essas fotos passa a ter essa obra.
// O título original fica guardado no serviço (obraOriginal) para se poder repor.

export interface ObraRef { id: string; nome: string }

function limparFotos(fotos: any[]): { fotos: any[]; mudou: boolean } {
  // remove correções por foto de uma versão anterior (agora a obra vive no serviço)
  let mudou = false
  const novas = fotos.map(f => {
    if (f && (f.obraId !== undefined || f.obraNome !== undefined)) {
      mudou = true
      const { obraId: _id, obraNome: _nome, ...resto } = f
      return resto
    }
    return f
  })
  return { fotos: mudou ? novas : fotos, mudou }
}

function aplicar(s: any, obra: ObraRef): any {
  const { fotos, mudou: fotosMudaram } = limparFotos(s.fotos)
  const jaEra = s.obraId === obra.id && s.obraNome === obra.nome
  if (jaEra && !fotosMudaram) return s

  const novo: any = { ...s, obraNome: obra.nome, obraId: obra.id, fotos }
  // guarda o título original só da primeira vez (nunca o sobrescreve)
  const original = s.obraOriginal ?? (jaEra ? undefined : { obraNome: s.obraNome, ...(s.obraId ? { obraId: s.obraId } : {}) })
  if (original) novo.obraOriginal = original
  return novo
}

function repor(s: any): any {
  const { fotos, mudou: fotosMudaram } = limparFotos(s.fotos)
  if (!s.obraOriginal && !fotosMudaram) return s

  const novo: any = { ...s, fotos }
  if (s.obraOriginal) {
    novo.obraNome = s.obraOriginal.obraNome
    if (s.obraOriginal.obraId) novo.obraId = s.obraOriginal.obraId
    else delete novo.obraId
    delete novo.obraOriginal
  }
  return novo
}

/**
 * Aplica a obra aos serviços que contêm as fotos escolhidas (por URL). Com obra = null, repõe a obra original.
 * Só copia o que muda; o resto fica exatamente igual. Devolve quantos serviços foram alterados.
 */
export function aplicarObraNosServicos(
  entries: any[],
  urls: Set<string>,
  obra: ObraRef | null,
): { entries: any[]; servicos: number } {
  let servicos = 0

  const novas = (entries ?? []).map(entry => {
    if (!Array.isArray(entry?.services)) return entry
    let entryMudou = false

    const services = entry.services.map((s: any) => {
      if (!Array.isArray(s?.fotos) || !s.fotos.some((f: any) => f && urls.has(f.url))) return s
      const novo = obra ? aplicar(s, obra) : repor(s)
      if (novo !== s) { entryMudou = true; servicos++ }
      return novo
    })

    return entryMudou ? { ...entry, services } : entry
  })

  return { entries: novas, servicos }
}
