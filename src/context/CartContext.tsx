'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Order, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { products as initialProducts } from '@/lib/products';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  cartCount: number;
  lastOrder: Order | null;
  setLastOrder: (order: Order) => void;
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'data-ai-hint'>) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrderState] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedCart = localStorage.getItem('cartItems');
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
      const storedOrders = localStorage.getItem('orders');
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      }
      const storedProducts = localStorage.getItem('products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        localStorage.setItem('products', JSON.stringify(initialProducts));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  }, [cartItems]);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('orders', JSON.stringify(orders));
    } catch (error) {
      console.error("Failed to save orders to localStorage", error);
    }
  }, [orders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('products', JSON.stringify(products));
    } catch (error) {
      console.error("Failed to save products to localStorage", error);
    }
  }, [products]);

  // This effect synchronizes state with localStorage changes from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageChange = (event: StorageEvent) => {
      try {
        if (event.key === 'orders' && event.newValue) {
          setOrders(JSON.parse(event.newValue));
        }
        if (event.key === 'cartItems' && event.newValue) {
          setCartItems(JSON.parse(event.newValue));
        }
        if (event.key === 'products' && event.newValue) {
          setProducts(JSON.parse(event.newValue));
        }
      } catch (error) {
        console.error("Failed to parse localStorage data on change", error);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const addProduct = (productData: Omit<Product, 'id' | 'data-ai-hint'>) => {
      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}`,
        'data-ai-hint': productData.name.toLowerCase().split(' ').slice(0, 2).join(' '),
      };
      setProducts((prevProducts) => [newProduct, ...prevProducts]);
      toast({
          title: "Produto Cadastrado!",
          description: `O produto "${newProduct.name}" foi adicionado ao catálogo.`,
      });
  };

  const addToCart = (product: Product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity: 1 }];
    });
    toast({
        title: "Produto adicionado!",
        description: `${product.name} foi adicionado ao seu carrinho.`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const setLastOrder = (order: Order) => {
    setLastOrderState(order);
  }

  const addOrder = (order: Order) => {
    setOrders((prevOrders) => [order, ...prevOrders]);
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
    toast({
        title: "Status do Pedido Atualizado!",
        description: `O pedido #${orderId} agora está como "${status}".`,
    });
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        cartCount,
        lastOrder,
        setLastOrder,
        orders,
        addOrder,
        updateOrderStatus,
        products,
        addProduct,
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
