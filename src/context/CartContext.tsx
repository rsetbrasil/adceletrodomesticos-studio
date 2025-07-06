'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Order, Product, Installment, CustomerInfo, PaymentMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { products as initialProducts } from '@/lib/products';
import { addMonths } from 'date-fns';

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
  updateInstallmentStatus: (orderId: string, installmentNumber: number, status: Installment['status']) => void;
  updateInstallmentDueDate: (orderId: string, installmentNumber: number, newDueDate: Date) => void;
  updateCustomer: (customer: CustomerInfo) => void;
  updateOrderDetails: (orderId: string, details: Partial<Order>) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'data-ai-hint'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  categories: string[];
  addCategory: (category: string) => void;
  updateCategory: (oldCategory: string, newCategory: string) => void;
  deleteCategory: (category: string) => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const saveDataToLocalStorage = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Failed to save ${key} to localStorage`, error);
    }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrderState] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
    }
    try {
      const storedCart = localStorage.getItem('cartItems');
      if (storedCart) setCartItems(JSON.parse(storedCart));

      let loadedOrders: Order[] = [];
      const storedOrdersRaw = localStorage.getItem('orders');
      if (storedOrdersRaw) {
        loadedOrders = JSON.parse(storedOrdersRaw);
      }

      // Check if migration is needed for old order IDs
      const needsMigration = loadedOrders.length > 0 && loadedOrders.some(o => !o.id.startsWith('PED-'));

      if (needsMigration) {
          // Sort by date to make IDs sequential and meaningful
          const sortedByDate = loadedOrders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          const migratedOrders = sortedByDate.map((order, index) => {
              // Force re-ID for all orders to ensure sequence
              return { ...order, id: `PED-${index + 1}` };
          });

          // Sort back to newest first for UI display
          const finalOrders = migratedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setOrders(finalOrders);
      } else {
          // Ensure orders are always sorted newest first, even without migration
          const sortedOrders = loadedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setOrders(sortedOrders);
      }

      const storedProducts = localStorage.getItem('products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        saveDataToLocalStorage('products', initialProducts)
      }

      const storedCategories = localStorage.getItem('categories');
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      } else {
        const initialCategories = Array.from(new Set(initialProducts.map(p => p.category)));
        initialCategories.sort();
        setCategories(initialCategories);
        saveDataToLocalStorage('categories', initialCategories);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    saveDataToLocalStorage('cartItems', cartItems);
  }, [cartItems, isLoading]);
  
  useEffect(() => {
    if (isLoading) return;
    saveDataToLocalStorage('orders', orders);
  }, [orders, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    saveDataToLocalStorage('products', products);
  }, [products, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    saveDataToLocalStorage('categories', categories);
  }, [categories, isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageChange = (event: StorageEvent) => {
      try {
        if (event.key === 'orders' && event.newValue) setOrders(JSON.parse(event.newValue));
        if (event.key === 'cartItems' && event.newValue) setCartItems(JSON.parse(event.newValue));
        if (event.key === 'products' && event.newValue) setProducts(JSON.parse(event.newValue));
        if (event.key === 'categories' && event.newValue) setCategories(JSON.parse(event.newValue));
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
      setProducts((prevProducts) => {
        const newProducts = [newProduct, ...prevProducts];
        saveDataToLocalStorage('products', newProducts);
        return newProducts;
      });
      toast({
          title: "Produto Cadastrado!",
          description: `O produto "${newProduct.name}" foi adicionado ao catálogo.`,
      });
  };

  const updateProduct = (updatedProduct: Product) => {
    const finalProduct = {
      ...updatedProduct,
      'data-ai-hint': updatedProduct.name.toLowerCase().split(' ').slice(0, 2).join(' '),
    };

    setProducts((prevProducts) => {
      const newProducts = prevProducts.map((p) =>
        p.id === finalProduct.id ? finalProduct : p
      );
      saveDataToLocalStorage('products', newProducts);
      return newProducts;
    });
    toast({
      title: 'Produto Atualizado!',
      description: `O produto "${updatedProduct.name}" foi atualizado.`,
    });
  };

  const deleteProduct = (productId: string) => {
      setProducts((prevProducts) => {
        const newProducts = prevProducts.filter((p) => p.id !== productId);
        saveDataToLocalStorage('products', newProducts);
        return newProducts;
      });
      toast({
        title: 'Produto Excluído!',
        description: 'O produto foi removido do catálogo.',
        variant: 'destructive',
      });
  };

  const addCategory = (category: string) => {
    if (categories.map(c => c.toLowerCase()).includes(category.toLowerCase())) {
      toast({ title: 'Erro', description: 'Essa categoria já existe.', variant: 'destructive' });
      return;
    }
    setCategories((prev) => {
        const newCategories = [...prev, category].sort();
        saveDataToLocalStorage('categories', newCategories);
        return newCategories;
    });
    toast({ title: 'Categoria Adicionada!', description: `A categoria "${category}" foi criada.` });
  };

  const updateCategory = (oldCategory: string, newCategory: string) => {
    if (categories.map(c => c.toLowerCase()).includes(newCategory.toLowerCase())) {
        toast({ title: 'Erro', description: 'Essa categoria já existe.', variant: 'destructive' });
        return;
    }
    setCategories((prev) => {
        const newCategories = prev.map((c) => (c === oldCategory ? newCategory : c)).sort();
        saveDataToLocalStorage('categories', newCategories);
        return newCategories;
    });
    setProducts((prevProducts) => {
        const newProducts = prevProducts.map((p) => (p.category === oldCategory ? { ...p, category: newCategory } : p));
        saveDataToLocalStorage('products', newProducts);
        return newProducts;
    });
    toast({ title: 'Categoria Atualizada!', description: `Categoria "${oldCategory}" foi renomeada para "${newCategory}".` });
  };

  const deleteCategory = (categoryToDelete: string) => {
    const productsInCategory = products.some(p => p.category === categoryToDelete);
    if (productsInCategory) {
        toast({ title: 'Erro ao Excluir', description: 'Não é possível excluir uma categoria que contém produtos.', variant: 'destructive' });
        return;
    }
    setCategories((prev) => {
        const newCategories = prev.filter((c) => c !== categoryToDelete);
        saveDataToLocalStorage('categories', newCategories);
        return newCategories;
    });
    toast({ title: 'Categoria Excluída!', description: `A categoria "${categoryToDelete}" foi removida.`, variant: 'destructive' });
  };

  const addToCart = (product: Product) => {
    const imageUrl = (product.imageUrls && product.imageUrls.length > 0) 
      ? product.imageUrls[0] 
      : 'https://placehold.co/600x600.png';

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { id: product.id, name: product.name, price: product.price, imageUrl, quantity: 1 }];
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
    setOrders((prevOrders) => {
      const newOrders = [order, ...prevOrders];
      saveDataToLocalStorage('orders', newOrders);
      return newOrders;
    });
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((prevOrders) => {
      const newOrders = prevOrders.map((order) =>
        order.id === orderId ? { ...order, status } : order
      );
      saveDataToLocalStorage('orders', newOrders);
      return newOrders;
    });
    toast({
        title: "Status do Pedido Atualizado!",
        description: `O pedido #${orderId} agora está como "${status}".`,
    });
  };

  const updateInstallmentStatus = (orderId: string, installmentNumber: number, status: Installment['status']) => {
    setOrders((prevOrders) => {
      const newOrders = prevOrders.map((order) => {
        if (order.id === orderId) {
          const updatedInstallments = (order.installmentDetails || []).map((inst) => {
            if (inst.installmentNumber === installmentNumber) {
              return { 
                ...inst, 
                status,
                paymentDate: status === 'Pago' ? new Date().toISOString() : null,
              };
            }
            return inst;
          });
          return { ...order, installmentDetails: updatedInstallments };
        }
        return order;
      });
      saveDataToLocalStorage('orders', newOrders);
      return newOrders;
    });
  };

  const updateInstallmentDueDate = (orderId: string, installmentNumber: number, newDueDate: Date) => {
    setOrders((prevOrders) => {
      const newOrders = prevOrders.map((order) => {
        if (order.id === orderId) {
          const updatedInstallments = (order.installmentDetails || []).map((inst) => {
            if (inst.installmentNumber === installmentNumber) {
              return {
                ...inst,
                dueDate: newDueDate.toISOString(),
              };
            }
            return inst;
          });
          return { ...order, installmentDetails: updatedInstallments };
        }
        return order;
      });
      saveDataToLocalStorage('orders', newOrders);
      return newOrders;
    });
    toast({
        title: "Vencimento Atualizado!",
        description: `A data de vencimento da parcela ${installmentNumber} do pedido #${orderId} foi alterada.`,
    });
  };

  const updateCustomer = (updatedCustomer: CustomerInfo) => {
    setOrders((prevOrders) => {
      const newOrders = prevOrders.map((order) => {
        if (order.customer.cpf === updatedCustomer.cpf) {
          return { ...order, customer: updatedCustomer };
        }
        return order;
      });
      saveDataToLocalStorage('orders', newOrders);
      return newOrders;
    });
    toast({
      title: "Cliente Atualizado!",
      description: `Os dados de ${updatedCustomer.name} foram salvos.`,
    });
  };

  const updateOrderDetails = (orderId: string, details: Partial<Order>) => {
    setOrders((prevOrders) => {
        const newOrders = prevOrders.map((order) =>
            order.id === orderId ? { ...order, ...details } : order
        );
        saveDataToLocalStorage('orders', newOrders);
        return newOrders;
    });
    toast({
        title: "Pedido Atualizado!",
        description: `Os detalhes do pedido #${orderId} foram atualizados.`,
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
        updateInstallmentStatus,
        updateInstallmentDueDate,
        updateCustomer,
        updateOrderDetails,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        isLoading,
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
