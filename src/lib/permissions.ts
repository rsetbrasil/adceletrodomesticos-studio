
import type { UserRole } from './types';

// Define as seções do aplicativo que podem ter permissões
export type AppSection = 
    | 'orders' 
    | 'customers' 
    | 'products' 
    | 'categories' 
    | 'financeiro' 
    | 'auditoria'
    | 'configuracao' 
    | 'users';

// Mapeia cada perfil para um conjunto de seções permitidas
const rolePermissions: Record<UserRole, Set<AppSection>> = {
    vendedor: new Set([
        'orders',
        'customers',
        'products',
    ]),
    gerente: new Set([
        'orders',
        'customers',
        'products',
        'categories',
        'financeiro',
        'auditoria',
        'configuracao',
    ]),
    admin: new Set([
        'orders',
        'customers',
        'products',
        'categories',
        'financeiro',
        'auditoria',
        'configuracao',
        'users',
    ]),
};

/**
 * Verifica se um determinado perfil de usuário tem acesso a uma seção do aplicativo.
 * @param role - O perfil do usuário ('admin', 'gerente', 'vendedor').
 * @param section - A seção do aplicativo a ser verificada.
 * @returns `true` se o usuário tiver acesso, `false` caso contrário.
 */
export function hasAccess(role: UserRole, section: AppSection): boolean {
    const permissions = rolePermissions[role];
    if (!permissions) {
        return false;
    }
    return permissions.has(section);
}
