'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { users as appUsers } from '@/lib/users';

interface AuthContextType {
  user: User | null;
  login: (user: string, pass: string) => void;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check for auth state in localStorage on initial load
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
        console.error("Failed to read auth state from localStorage", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const login = (username: string, pass: string) => {
    const foundUser = appUsers.find(u => u.username === username && u.password === pass);
    
    if (foundUser) {
      const { password, ...userToStore } = foundUser; // Don't store password in state/localStorage
      setUser(userToStore);
      localStorage.setItem('user', JSON.stringify(userToStore));
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

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated: !!user }}>
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
