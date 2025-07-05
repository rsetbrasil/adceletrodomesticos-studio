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
  login: (user: string, pass: string) => void;
  logout: () => void;
  addUser: (data: Omit<User, 'id'>) => void;
  updateUser: (userId: string, data: Partial<Omit<User, 'id'>>) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check for auth state and user list in localStorage on initial load
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      const storedUsers = localStorage.getItem('users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        saveDataToLocalStorage('users', initialUsers);
      }
    } catch (error) {
        console.error("Failed to read state from localStorage", error);
    } finally {
        setIsLoading(false);
    }
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

  const addUser = (data: Omit<User, 'id'>) => {
    setUsers(prevUsers => {
        if (prevUsers.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
            toast({
                title: 'Erro ao Criar Usuário',
                description: 'Este nome de usuário já está em uso.',
                variant: 'destructive',
            });
            return prevUsers;
        }

        const newUser: User = {
            ...data,
            id: `user-${Date.now()}`,
        };
        const newUsers = [...prevUsers, newUser];
        saveDataToLocalStorage('users', newUsers);
        toast({
            title: 'Usuário Criado!',
            description: `O usuário ${newUser.name} foi criado com sucesso.`,
        });
        return newUsers;
    });
  };

  const updateUser = (userId: string, data: Partial<Omit<User, 'id'>>) => {
    setUsers(prevUsers => {
        const newUsers = prevUsers.map(u => u.id === userId ? { ...u, ...data } : u);
        saveDataToLocalStorage('users', newUsers);
        return newUsers;
    });
    toast({
        title: 'Usuário Atualizado!',
        description: 'As informações do usuário foram salvas com sucesso.',
    });
  };

  return (
    <AuthContext.Provider value={{ user, users, login, logout, addUser, updateUser, isLoading, isAuthenticated: !!user }}>
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
