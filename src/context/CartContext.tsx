

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Order, Product, CustomerInfo, Installment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { products as initialProducts } from '@/lib/products';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const saveDataToLocalStorage = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Failed to save ${key} to localStorage`, error);
    }
};

const loadDataFromLocalStorage = (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Failed to load ${key} from localStorage`, error);
        return null;
    }
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  isFilterSheetOpen: boolean;
  setIsFilterSheetOpen: (isOpen: boolean) => void;
  selectedCategoryForSheet: string | null;
  setSelectedCategoryForSheet: (category: string | null) => void;
  lastOrder: Order | null;
  setLastOrder: (order: Order) => void;
  addOrder: (order: Partial<Order>, products: Product[], allOrders: Order[]) => Promise<Order | null>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedCategoryForSheet, setSelectedCategoryForSheet] = useState<string | null>(null);
  const [lastOrder, setLastOrderState] = useState<Order | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { logAction } = useAudit();
  const [allProducts, setAllProducts] = useState<Product[]>([]);


  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
        setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    },
    (error) => {
        console.error("Error fetching products in CartContext:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'products',
            operation: 'list',
        }));
    });

    const storedCart = loadDataFromLocalStorage('cartItems');
    if (storedCart) setCartItems(storedCart);

    const storedLastOrder = loadDataFromLocalStorage('lastOrder');
    if(storedLastOrder) setLastOrderState(storedLastOrder);
    
    return () => unsubscribe();
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock < 1) {
      toast({ title: "Produto Esgotado", description: "Este produto está fora de estoque.", variant: "destructive" });
      return;
    }

    const updatedCart = [...cartItems];
    const existingItemIndex = updatedCart.findIndex(item => item.id === product.id);

    if (existingItemIndex > -1) {
      const existingItem = updatedCart[existingItemIndex];
      if (existingItem.quantity < product.stock) {
        existingItem.quantity += 1;
      } else {
        toast({ title: "Limite de Estoque Atingido", description: `Você já tem a quantidade máxima (${product.stock}) deste item no carrinho.` });
        return;
      }
    } else {
      updatedCart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrls[0] || '',
      });
    }

    setCartItems(updatedCart);
    saveDataToLocalStorage('cartItems', updatedCart);
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    const newCartItems = cartItems.filter(item => item.id !== productId);
    setCartItems(newCartItems);
    saveDataToLocalStorage('cartItems', newCartItems);
  };
  
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    const productInCatalog = allProducts.find(p => p.id === productId);
    const stockLimit = productInCatalog?.stock ?? 0;

    if (quantity > stockLimit) {
      toast({ title: "Limite de Estoque Atingido", description: `A quantidade máxima para este item é ${stockLimit}.` });
      quantity = stockLimit;
    }

    const newCartItems = cartItems.map(item =>
      (item.id === productId)
        ? { ...item, quantity }
        : item
    );
    setCartItems(newCartItems);
    saveDataToLocalStorage('cartItems', newCartItems);
  };

  const clearCart = () => {
    setCartItems([]);
    saveDataToLocalStorage('cartItems', []);
  };

  const getCartTotal = () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const setLastOrder = (order: Order) => {
      setLastOrderState(order);
      saveDataToLocalStorage('lastOrder', order);
  }
  
  const manageStockForOrder = async (order: Order, operation: 'add' | 'subtract', allProducts: Product[]): Promise<boolean> => {
    const batch = writeBatch(db);
    let hasEnoughStock = true;

    for (const orderItem of order.items) {
        const product = allProducts.find(p => p.id === orderItem.id);
        if (product) {
            const stockChange = orderItem.quantity;
            const currentStock = product.stock;
            const newStock = operation === 'add' ? currentStock + stockChange : currentStock - stockChange;
            
            if (operation === 'subtract' && newStock < 0) {
              hasEnoughStock = false;
              toast({
                  title: 'Estoque Insuficiente',
                  description: `Não há estoque suficiente para ${product.name}. Disponível: ${currentStock}, Pedido: ${stockChange}.`,
                  variant: 'destructive'
              });
              break; 
            }
            
            batch.update(doc(db, 'products', product.id), { stock: newStock });
        }
    }
    
    if (hasEnoughStock) {
        await batch.commit();
        return true;
    }
    
    return false;
  };

  const addOrder = async (order: Partial<Order>, allProducts: Product[], allOrders: Order[]): Promise<Order | null> => {
    try {
        const orderToSave = {
            ...order,
            sellerId: '',
            sellerName: 'Não atribuído',
            commission: 0,
            commissionPaid: false,
        } as Order;
        
        if (orderToSave.installmentDetails) {
            orderToSave.installmentDetails = orderToSave.installmentDetails.map(inst => ({
                ...inst,
                id: `inst-${orderToSave.id}-${inst.installmentNumber}`,
                paidAmount: 0,
                payments: [],
            }));
        }
        
        if (!await manageStockForOrder(orderToSave, 'subtract', allProducts)) {
          throw new Error(`Estoque insuficiente para um ou mais produtos.`);
        }

        // Add new customer info to other orders if they exist
        const customerOrders = allOrders.filter(o => o.customer.cpf === orderToSave.customer.cpf);
        const hasExistingPassword = customerOrders.some(o => o.customer.password);

        let customerToSave = { ...orderToSave.customer };

        if (!hasExistingPassword) {
            // First time this customer is ordering, generate password
            customerToSave.password = orderToSave.customer.cpf.replace(/\D/g, '').substring(0, 6);
        } else {
            // Customer exists, don't include password in this new order record
            delete customerToSave.password;
        }

        orderToSave.customer = customerToSave;

        await setDoc(doc(db, 'orders', orderToSave.id), orderToSave);
        
        const creator = user ? `por ${user.name}`: 'pelo cliente';
        logAction('Criação de Pedido', `Novo pedido #${orderToSave.id} para ${orderToSave.customer.name} no valor de R$${orderToSave.total?.toFixed(2)} foi criado ${creator}.`, user);
        return orderToSave;
    } catch(e) {
        console.error("Failed to add order", e);
        if (e instanceof Error && e.message.startsWith('Estoque insuficiente')) {
          throw e;
        }
        await manageStockForOrder(order as Order, 'add', allProducts);
        throw e;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, cartCount, 
        isCartOpen, setIsCartOpen, 
        isFilterSheetOpen, setIsFilterSheetOpen,
        selectedCategoryForSheet, setSelectedCategoryForSheet,
        lastOrder, setLastOrder,
        addOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
