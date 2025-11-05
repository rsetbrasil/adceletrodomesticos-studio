
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product, Category, Order, CommissionPayment, StockAudit, Avaria } from '@/lib/types';

interface DataContextType {
  products: Product[];
  categories: Category[];
  orders: Order[];
  commissionPayments: CommissionPayment[];
  stockAudits: StockAudit[];
  avarias: Avaria[];
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>([]);
  const [stockAudits, setStockAudits] = useState<StockAudit[]>([]);
  const [avarias, setAvarias] = useState<Avaria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const productsUnsubscribe = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching products:", error);
        setIsLoading(false);
    });

    const categoriesUnsubscribe = onSnapshot(query(collection(db, 'categories'), orderBy('order')), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Category)));
    }, (error) => {
        console.error("Error fetching categories:", error);
    });

    const ordersUnsubscribe = onSnapshot(query(collection(db, 'orders'), orderBy('date', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Order)));
    }, (error) => {
        console.error("Error fetching orders:", error);
    });

    const commissionPaymentsUnsubscribe = onSnapshot(query(collection(db, 'commissionPayments'), orderBy('paymentDate', 'desc')), (snapshot) => {
      setCommissionPayments(snapshot.docs.map(d => d.data() as CommissionPayment));
    }, (error) => console.error("Error fetching commission payments:", error));

    const stockAuditsUnsubscribe = onSnapshot(query(collection(db, 'stockAudits'), orderBy('createdAt', 'desc')), (snapshot) => {
      setStockAudits(snapshot.docs.map(d => d.data() as StockAudit));
    }, (error) => console.error("Error fetching stock audits:", error));

    const avariasUnsubscribe = onSnapshot(query(collection(db, 'avarias'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAvarias(snapshot.docs.map(d => d.data() as Avaria));
    }, (error) => console.error("Error fetching avarias:", error));

    return () => {
      productsUnsubscribe();
      categoriesUnsubscribe();
      ordersUnsubscribe();
      commissionPaymentsUnsubscribe();
      stockAuditsUnsubscribe();
      avariasUnsubscribe();
    };
  }, []);

  return (
    <DataContext.Provider value={{ products, categories, orders, commissionPayments, stockAudits, avarias, isLoading }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
