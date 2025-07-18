'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { initialUsers } from '@/lib/users';

const saveDataToLocalStorage = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Failed to save ${key} to localStorage`, error);
    }
};

interface AuthContextType {
  user: User | null;
  users: User[];
  initialUsers: User[];
  login: (user: string, pass: string) => void;
  logout: () => void;
  addUser: (data: Omit<User, 'id'>) => boolean;
  updateUser: (userId: string, data: Partial<Omit<User, 'id'>>) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  restoreUsers: (users: User[]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
    }
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      const storedUsers = localStorage.getItem('users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        setUsers(initialUsers);
        saveDataToLocalStorage('users', initialUsers);
      }
    } catch (error) {
        console.error("Failed to read state from localStorage", error);
        setUsers(initialUsers);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
        try {
            if (event.key === 'user') {
                if (event.newValue === null) {
                    setUser(null);
                } else {
                    setUser(JSON.parse(event.newValue));
                }
            }
            if (event.key === 'users') {
                 if (event.newValue === null) {
                    setUsers(initialUsers);
                } else {
                    setUsers(JSON.parse(event.newValue));
                }
            }
        } catch (e) { console.error(e) }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  const login = (username: string, pass: string) => {
    const foundUser = users.find(u => u.username === username && u.password === pass);
    
    if (foundUser) {
      const { password, ...userToStore } = foundUser;
      setUser(userToStore);
      saveDataToLocalStorage('user', userToStore);
      router.push('/admin/orders');
      toast({
        title: 'Login bem-sucedido!',
        description: `Bem-vindo(a), ${userToStore.name}.`,
      });
    } else {
      toast({
        title: 'Falha no Login',
        description: 'Usuário ou senha inválidos.',
        variant: 'destructive',
      });
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login');
  };

  const addUser = (data: Omit<User, 'id'>): boolean => {
    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
        toast({
            title: 'Erro ao Criar Usuário',
            description: 'Este nome de usuário já está em uso.',
            variant: 'destructive',
        });
        return false;
    }

    const newUser: User = {
        ...data,
        id: `user-${Date.now()}`,
    };
    const newUsers = [...users, newUser];
    setUsers(newUsers);
    saveDataToLocalStorage('users', newUsers);
    toast({
        title: 'Usuário Criado!',
        description: `O usuário ${data.name} foi criado com sucesso.`,
    });
    return true;
  };

  const updateUser = (userId: string, data: Partial<Omit<User, 'id'>>) => {
    const newUsers = users.map(u => u.id === userId ? { ...u, ...data } : u);
    setUsers(newUsers);
    saveDataToLocalStorage('users', newUsers);
    toast({
        title: 'Usuário Atualizado!',
        description: 'As informações do usuário foram salvas com sucesso.',
    });
  };
  
  const restoreUsers = (usersToRestore: User[]) => {
      setUsers(usersToRestore);
      saveDataToLocalStorage('users', usersToRestore);
  };

  return (
    <AuthContext.Provider value={{ user, users, initialUsers, login, logout, addUser, updateUser, isLoading, isAuthenticated: !!user, restoreUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

    