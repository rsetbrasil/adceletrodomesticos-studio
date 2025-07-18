
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { initialUsers } from '@/lib/users';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, writeBatch, query, where } from 'firebase/firestore';

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
        setIsLoading(true);
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Failed to read user from localStorage", error);
            localStorage.removeItem('user');
        } finally {
            setIsLoading(false);
        }
    };
    checkUser();
  }, []);

  const fetchUsers = async () => {
    try {
        const usersCollection = collection(db, 'users');
        const querySnapshot = await getDocs(usersCollection);

        if (querySnapshot.empty) {
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
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const login = async (username: string, pass: string) => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ title: 'Falha no Login', description: 'Usuário não encontrado.', variant: 'destructive' });
            return;
        }

        const foundUserDoc = querySnapshot.docs[0];
        const userWithId = { ...foundUserDoc.data(), id: foundUserDoc.id } as User;
        
        if (userWithId.password === pass) {
            const userToStore = { ...userWithId };
            // Ensure password is not stored in state or localStorage for security
            delete userToStore.password;
            
            setUser(userToStore); 
            localStorage.setItem('user', JSON.stringify(userToStore));
            router.push('/admin/orders');
            toast({
                title: 'Login bem-sucedido!',
                description: `Bem-vindo(a), ${userWithId.name}.`,
            });
        } else {
            toast({
                title: 'Falha no Login',
                description: 'Senha inválida.',
                variant: 'destructive',
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        toast({ title: 'Erro de Login', description: 'Não foi possível conectar. Verifique as regras do banco de dados.', variant: 'destructive' });
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login');
  };

  const addUser = async (data: Omit<User, 'id'>): Promise<boolean> => {
    const q = query(collection(db, 'users'), where("username", "==", data.username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
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
        
        // If the current user is being updated, update the localStorage object too
        if (user?.id === userId) {
            const updatedCurrentUser = { ...user, ...data };
            delete updatedCurrentUser.password;
            setUser(updatedCurrentUser);
            localStorage.setItem('user', JSON.stringify(updatedCurrentUser));
        }

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
        const usersCollectionRef = collection(db, "users");
        const snapshot = await getDocs(usersCollectionRef);
        const deleteBatch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
        
        const addBatch = writeBatch(db);
        usersToRestore.forEach(u => {
            const docRef = doc(db, 'users', u.id);
            addBatch.set(docRef, u);
        });
        await addBatch.commit();
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
