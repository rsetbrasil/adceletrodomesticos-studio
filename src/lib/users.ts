import type { User } from './types';

// NOTE: In a real application, passwords should be hashed and stored securely in a database.
// This is for prototype purposes only.
export const initialUsers: User[] = [
  { id: 'user-1', username: 'admin', password: 'adminpassword', name: 'Administrador', role: 'admin' },
  { id: 'user-2', username: 'gerente', password: 'gerentepassword', name: 'Gerente Loja', role: 'gerente' },
  { id: 'user-3', username: 'vendedor', password: 'vendedorpassword', name: 'Vendedor Teste', role: 'vendedor' },
];
