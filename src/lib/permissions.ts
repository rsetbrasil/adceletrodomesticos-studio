

import type { UserRole, AppSection, RolePermissions } from './types';

export const ALL_SECTIONS: { id: AppSection, label: string }[] = [
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'produtos', label: 'Produtos' },
    { id: 'categorias', label: 'Categorias' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'minhas-comissoes', label: 'Minhas Comissões' },
    { id: 'auditoria', label: 'Auditoria' },
    { id: 'configuracao', label: 'Configurações' },
    { id: 'usuarios', label: 'Usuários' },
];

export const initialPermissions: RolePermissions = {
    vendedor: [
        'pedidos',
        'clientes',
        'produtos',
        'minhas-comissoes',
    ],
    gerente: [
        'pedidos',
        'clientes',
        'produtos',
        'categorias',
        'financeiro',
        'minhas-comissoes',
        'auditoria',
        'configuracao',
    ],
    admin: [
        'pedidos',
        'clientes',
        'produtos',
        'categorias',
        'financeiro',
        'minhas-comissoes',
        'auditoria',
        'configuracao',
        'usuarios',
    ],
};


export function hasAccess(role: UserRole, section: AppSection, permissions: RolePermissions): boolean {
    if (role === 'admin') return true; // Admin always has access
    const rolePermissions = permissions[role];
    if (!rolePermissions) {
        return false;
    }
    return rolePermissions.includes(section);
}
