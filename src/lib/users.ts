import type { UserRole } from './types';

// NOTE: In a real application, passwords should be hashed and stored securely in a database.
// This is for prototype purposes only.
export const users: { username: string; password; string; role: UserRole; name: string; }[] = [
  { username: 'admin', password: 'adminpassword', name: 'Administrador', role: 'admin' },
  { username: 'gerente', password: 'gerentepassword', name: 'Gerente Loja', role: 'gerente' },
  { username: 'vendedor', password: 'vendedorpassword', name: 'Vendedor Teste', role: 'vendedor' },
];
