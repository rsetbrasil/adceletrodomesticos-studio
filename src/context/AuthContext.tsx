

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { initialUsers } from '@/lib/users';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, writeBatch, query, where, getDoc, onSnapshot } from 'firebase/firestore';
import { useAudit } from './AuditContext';

interface AuthContextType {
  user: User | null;
  users: User[];
  initialUsers: User[];
  login: (user: string, pass: string) => void;
  logout: () => void;
  addUser: (data: Omit<User, 'id'>) => Promise<boolean>;
  updateUser: (userId: string, data: Partial<Omit<User, 'id'>>) => Promise<void>;
  changeMyPassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
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
  const { logAction } = useAudit();
  
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
        } 
    };
    checkUser();

    const usersCollection = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCollection, async (querySnapshot) => {
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
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching users from Firestore:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
            logAction('Login', `Usuário "${userWithId.name}" realizou login.`, userToStore);
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
    if (user) {
        logAction('Logout', `Usuário "${user.name}" realizou logout.`, user);
    }
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
        // Real-time listener will update the state
        logAction('Criação de Usuário', `Novo usuário "${data.name}" (Perfil: ${data.role}) foi criado.`, user);
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
    
    // Check for username uniqueness if it's being changed
    if (data.username) {
        const q = query(collection(db, 'users'), where("username", "==", data.username.toLowerCase()));
        const querySnapshot = await getDocs(q);
        const isUsernameTaken = querySnapshot.docs.some(d => d.id !== userId);

        if (isUsernameTaken) {
            toast({
                title: 'Erro ao Atualizar',
                description: 'Este nome de usuário já está em uso por outra conta.',
                variant: 'destructive',
            });
            return;
        }
    }
    
    try {
        const userRef = doc(db, 'users', userId);
        const updatedUser = users.find(u => u.id === userId);
        
        if (updatedUser) {
            let details = `Dados do usuário "${updatedUser.name}" foram alterados.`;
            if (data.name && data.name !== updatedUser.name) {
                details += ` Nome: de "${updatedUser.name}" para "${data.name}".`
            }
            if (data.username && data.username !== updatedUser.username) {
                details += ` Username: de "${updatedUser.username}" para "${data.username}".`
            }
            if (data.password) {
                details += ' Senha foi alterada.';
            }
            logAction('Atualização de Usuário', details, user);
        }
        
        await updateDoc(userRef, data);
        // Real-time listener will update the state
        
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

  const changeMyPassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
      if (!user) {
          toast({ title: "Erro", description: "Você não está logado.", variant: "destructive" });
          return false;
      }
      try {
          const userRef = doc(db, 'users', user.id);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists() || userDoc.data().password !== currentPassword) {
              toast({ title: "Erro", description: "A senha atual está incorreta.", variant: "destructive" });
              return false;
          }

          await updateDoc(userRef, { password: newPassword });
          logAction('Alteração de Senha', `O usuário "${user.name}" alterou a própria senha.`, user);
          toast({ title: "Senha Alterada!", description: "Sua senha foi atualizada com sucesso." });
          return true;

      } catch (error) {
          console.error("Error changing password:", error);
          toast({ title: "Erro", description: "Não foi possível alterar a senha.", variant: "destructive" });
          return false;
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
        // Real-time listener will update the state
        logAction('Restauração de Usuários', 'Todos os usuários foram restaurados a partir de um backup.', user);
      } catch (error) {
        console.error("Error restoring users to Firestore:", error);
        toast({ title: "Erro", description: "Não foi possível restaurar os usuários.", variant: "destructive" });
      }
  };

  return (
    <AuthContext.Provider value={{ user, users, initialUsers, login, logout, addUser, updateUser, changeMyPassword, isLoading, isAuthenticated: !!user, restoreUsers }}>
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
