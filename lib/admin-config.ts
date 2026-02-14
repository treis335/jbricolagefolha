// lib/admin-config.ts
/**
 * Configuração de Administradores
 * 
 * Lista de UIDs autorizados a aceder ao painel de administração.
 * Durante o desenvolvimento, apenas utilizadores específicos podem aceder.
 * 
 * TODO: Em produção, implementar sistema de roles no Firebase
 * com campo 'isAdmin' ou 'role: "admin"' na coleção users
 */

export const AUTHORIZED_ADMIN_UIDS = [
  "HQP0hz3E4sOwtaEszaYYWqGeeXV2", // Admin 1
  "wtjVy1CXcEgLj8liLLrsjeMzK163", // Admin 2
] as const

/**
 * Verifica se um UID está autorizado como admin
 */
export function isAuthorizedAdmin(uid: string | undefined): boolean {
  if (!uid) return false
  return AUTHORIZED_ADMIN_UIDS.includes(uid as any)
}

/**
 * Informação sobre o sistema de permissões
 */
export const ADMIN_SYSTEM_INFO = {
  version: "1.0.0-dev",
  type: "hardcoded-uids",
  description: "Sistema temporário de autenticação baseado em UIDs fixos",
  
  // Instruções para atualizar em produção
  productionInstructions: `
    Para implementar em produção:
    
    1. Adicionar campo 'role' na coleção users:
       users/{uid}/
         ├─ role: "admin" | "worker" | "manager"
         └─ ...
    
    2. Atualizar a verificação em app/admin/page.tsx:
       const userDoc = await getDoc(doc(db, 'users', user.uid))
       const isAdmin = userDoc.data()?.role === 'admin'
    
    3. Criar interface de gestão de permissões no próprio painel admin
  `
}