
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product, Category, Order } from '@/lib/types';

interface DataContextType {
  products: Product[];
  categories: Category[];
  orders: Order[];
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const productsUnsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
      setIsLoading(false); // Consider loading finished when a key collection is loaded
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

    return () => {
      productsUnsubscribe();
      categoriesUnsubscribe();
      ordersUnsubscribe();
    };
  }, []);

  return (
    <DataContext.Provider value={{ products, categories, orders, isLoading }}>
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
