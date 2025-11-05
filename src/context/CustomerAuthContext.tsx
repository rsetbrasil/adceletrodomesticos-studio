'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { CustomerInfo, Order } from '@/lib/types';
import { useData } from './DataContext';

interface CustomerAuthContextType {
  customer: CustomerInfo | null;
  login: (cpf: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { orders } = useData();
  
  useEffect(() => {
    setIsLoading(true);
    try {
        const storedCustomer = localStorage.getItem('customer');
        if (storedCustomer) {
            setCustomer(JSON.parse(storedCustomer));
        }
    } catch (error) {
        console.error("Failed to read customer from localStorage", error);
        localStorage.removeItem('customer');
    } finally {
        setIsLoading(false);
    }
  }, []);

  const login = async (cpf: string, pass: string): Promise<boolean> => {
    if (!orders) {
        toast({ title: 'Erro', description: 'Os dados dos pedidos ainda não foram carregados. Tente novamente em alguns segundos.', variant: 'destructive' });
        return false;
    }
    const normalizedCpf = cpf.replace(/\D/g, '');
    
    const customerOrders = orders
        .filter(o => o.customer.cpf.replace(/\D/g, '') === normalizedCpf)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (customerOrders.length === 0) {
         toast({ title: 'Falha no Login', description: 'CPF não encontrado.', variant: 'destructive' });
         return false;
    }
    
    const latestCustomerData = customerOrders.find(o => o.customer.password)?.customer;

    if (!latestCustomerData || !latestCustomerData.password) {
        toast({ title: 'Falha no Login', description: 'Esta conta ainda não possui uma senha cadastrada. Por favor, complete uma nova compra para criar uma.', variant: 'destructive' });
        return false;
    }

    if (latestCustomerData.password === pass) {
        const customerToStore = { ...latestCustomerData };
        delete customerToStore.password;
        
        setCustomer(customerToStore); 
        localStorage.setItem('customer', JSON.stringify(customerToStore));
        router.push('/area-cliente/minha-conta');
        toast({
            title: 'Login bem-sucedido!',
            description: `Bem-vindo(a) de volta, ${customerToStore.name.split(' ')[0]}.`,
        });
        return true;
    } else {
        toast({
            title: 'Falha no Login',
            description: 'Senha inválida.',
            variant: 'destructive',
        });
        return false;
    }
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem('customer');
    router.push('/area-cliente/login');
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, login, logout, isLoading, isAuthenticated: !!customer }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
