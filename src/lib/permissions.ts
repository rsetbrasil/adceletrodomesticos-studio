

import type { UserRole, AppSection, RolePermissions } from './types';

export const ALL_SECTIONS: { id: AppSection, label: string }[] = [
    { id: 'orders', label: 'Pedidos' },
    { id: 'customers', label: 'Clientes' },
    { id: 'products', label: 'Produtos' },
    { id: 'categories', label: 'Categorias' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'minhas-comissoes', label: 'Minhas Comissões' },
    { id: 'auditoria', label: 'Auditoria' },
    { id: 'configuracao', label: 'Configurações' },
    { id: 'users', label: 'Usuários' },
];

export const initialPermissions: RolePermissions = {
    vendedor: [
        'orders',
        'customers',
        'products',
        'minhas-comissoes',
    ],
    gerente: [
        'orders',
        'customers',
        'products',
        'categories',
        'financeiro',
        'minhas-comissoes',
        'auditoria',
        'configuracao',
    ],
    admin: [
        'orders',
        'customers',
        'products',
        'categories',
        'financeiro',
        'minhas-comissoes',
        'auditoria',
        'configuracao',
        'users',
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

