
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { initialUsers } from '@/lib/users';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  users: User[];
  initialUsers: User[];
  login: (user: string, pass: string) => void;
  logout: () => void;
  addUser: (data: Omit<User, 'id'>) => Promise<boolean>;
  updateUser: (userId: string, data: Partial<Omit<User, 'id'>>) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  restoreUsers: (users: User[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = () => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Failed to read user from localStorage", error);
            localStorage.removeItem('user');
        }
    };
    
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const usersCollection = collection(db, 'users');
            const querySnapshot = await getDocs(usersCollection);

            if (querySnapshot.empty) {
                // Seed the database if it's empty
                const batch = writeBatch(db);
                initialUsers.forEach(u => {
                    const docRef = doc(db, 'users', u.id);
                    batch.set(docRef, u);
                });
                await batch.commit();
                setUsers(initialUsers);
            } else {
                const fetchedUsers = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id })) as User[];
                setUsers(fetchedUsers);
            }
        } catch (error) {
            console.error("Error fetching users from Firestore:", error);
            toast({ title: "Erro de Conexão", description: "Não foi possível carregar os usuários do banco de dados.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    checkUser();
    fetchUsers();

  }, [toast]);

  const login = (username: string, pass: string) => {
    const foundUser = users.find(u => u.username === username && u.password === pass);
    
    if (foundUser) {
      const { password, ...userToStore } = foundUser;
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

  const addUser = async (data: Omit<User, 'id'>): Promise<boolean> => {
    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
        toast({
            title: 'Erro ao Criar Usuário',
            description: 'Este nome de usuário já está em uso.',
            variant: 'destructive',
        });
        return false;
    }

    const newUserId = `user-${Date.now()}`;
    const newUser: User = { ...data, id: newUserId };
    
    try {
        await setDoc(doc(db, 'users', newUserId), newUser);
        setUsers(prev => [...prev, newUser]);
        toast({
            title: 'Usuário Criado!',
            description: `O usuário ${data.name} foi criado com sucesso.`,
        });
        return true;
    } catch (error) {
        console.error("Error adding user to Firestore:", error);
        toast({ title: "Erro", description: "Não foi possível criar o usuário.", variant: "destructive" });
        return false;
    }
  };

  const updateUser = async (userId: string, data: Partial<Omit<User, 'id'>>) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, data);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
        toast({
            title: 'Usuário Atualizado!',
            description: 'As informações do usuário foram salvas com sucesso.',
        });
    } catch (error) {
        console.error("Error updating user in Firestore:", error);
        toast({ title: "Erro", description: "Não foi possível atualizar o usuário.", variant: "destructive" });
    }
  };
  
  const restoreUsers = async (usersToRestore: User[]) => {
      try {
        const batch = writeBatch(db);
        usersToRestore.forEach(u => {
            const docRef = doc(db, 'users', u.id);
            batch.set(docRef, u);
        });
        await batch.commit();
        setUsers(usersToRestore);
      } catch (error) {
        console.error("Error restoring users to Firestore:", error);
        toast({ title: "Erro", description: "Não foi possível restaurar os usuários.", variant: "destructive" });
      }
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
