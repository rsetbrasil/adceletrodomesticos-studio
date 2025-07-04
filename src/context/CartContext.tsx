'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Order, Product, Installment, CustomerInfo, PaymentMethod } from '@/lib/types';
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
  updateOrderPaymentMethod: (orderId: string, paymentMethod: PaymentMethod) => void;
  updateInstallmentStatus: (orderId: string, installmentNumber: number, status: Installment['status']) => void;
  updateCustomer: (customer: CustomerInfo) => void;
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

      const storedOrders = localStorage.getItem('orders');
      if (storedOrders) setOrders(JSON.parse(storedOrders));

      const storedProducts = localStorage.getItem('products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        localStorage.setItem('products', JSON.stringify(initialProducts));
      }

      const storedCategories = localStorage.getItem('categories');
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      } else {
        const initialCategories = Array.from(new Set(initialProducts.map(p => p.category)));
        setCategories(initialCategories.sort());
        localStorage.setItem('categories', JSON.stringify(initialCategories.sort()));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  }, [cartItems, isLoading]);
  
  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    try {
      localStorage.setItem('orders', JSON.stringify(orders));
    } catch (error) {
      console.error("Failed to save orders to localStorage", error);
    }
  }, [orders, isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    try {
      localStorage.setItem('products', JSON.stringify(products));
    } catch (error) {
      console.error("Failed to save products to localStorage", error);
    }
  }, [products, isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    try {
      localStorage.setItem('categories', JSON.stringify(categories));
    } catch (error) {
      console.error("Failed to save categories to localStorage", error);
    }
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
      setProducts((prevProducts) => [newProduct, ...prevProducts]);
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
      // Synchronously update localStorage to ensure data is fresh for new tabs.
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('products', JSON.stringify(newProducts));
        } catch (error) {
          console.error("Failed to save products to localStorage", error);
        }
      }
      return newProducts;
    });
    toast({
      title: 'Produto Atualizado!',
      description: `O produto "${updatedProduct.name}" foi atualizado.`,
    });
  };

  const deleteProduct = (productId: string) => {
      setProducts((prevProducts) => prevProducts.filter((p) => p.id !== productId));
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
    setCategories((prev) => [...prev, category].sort());
    toast({ title: 'Categoria Adicionada!', description: `A categoria "${category}" foi criada.` });
  };

  const updateCategory = (oldCategory: string, newCategory: string) => {
    if (categories.map(c => c.toLowerCase()).includes(newCategory.toLowerCase())) {
        toast({ title: 'Erro', description: 'Essa categoria já existe.', variant: 'destructive' });
        return;
    }
    setCategories((prev) => prev.map((c) => (c === oldCategory ? newCategory : c)).sort());
    setProducts((prevProducts) =>
      prevProducts.map((p) => (p.category === oldCategory ? { ...p, category: newCategory } : p))
    );
    toast({ title: 'Categoria Atualizada!', description: `Categoria "${oldCategory}" foi renomeada para "${newCategory}".` });
  };

  const deleteCategory = (categoryToDelete: string) => {
    const productsInCategory = products.some(p => p.category === categoryToDelete);
    if (productsInCategory) {
        toast({ title: 'Erro ao Excluir', description: 'Não é possível excluir uma categoria que contém produtos.', variant: 'destructive' });
        return;
    }
    setCategories((prev) => prev.filter((c) => c !== categoryToDelete));
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

  const updateOrderPaymentMethod = (orderId: string, paymentMethod: PaymentMethod) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId) {
          const wasCrediario = !order.paymentMethod || order.paymentMethod === 'Crediário';
          const updatedOrder = { ...order, paymentMethod };

          // Consolidate installments if changing away from or to Crediário to ensure consistency
          if (wasCrediario !== (paymentMethod === 'Crediário')) {
            updatedOrder.installments = 1;
            updatedOrder.installmentValue = order.total;
            updatedOrder.installmentDetails = [{
              installmentNumber: 1,
              amount: order.total,
              dueDate: order.installmentDetails?.[0]?.dueDate || order.date,
              status: 'Pendente' // Assume it becomes pending again
            }];
          }
          
          return updatedOrder;
        }
        return order;
      })
    );
    toast({
        title: "Forma de Pagamento Atualizada!",
        description: `A forma de pagamento do pedido #${orderId} foi alterada para "${paymentMethod}".`,
    });
  };

  const updateInstallmentStatus = (orderId: string, installmentNumber: number, status: Installment['status']) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId) {
          const updatedInstallments = (order.installmentDetails || []).map((inst) =>
            inst.installmentNumber === installmentNumber ? { ...inst, status } : inst
          );
          return { ...order, installmentDetails: updatedInstallments };
        }
        return order;
      })
    );
     toast({
        title: "Status da Parcela Atualizado!",
        description: `A parcela ${installmentNumber} do pedido #${orderId} foi marcada como ${status}.`,
    });
  };

  const updateCustomer = (updatedCustomer: CustomerInfo) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.customer.cpf === updatedCustomer.cpf) {
          return { ...order, customer: updatedCustomer };
        }
        return order;
      })
    );
    toast({
      title: "Cliente Atualizado!",
      description: `Os dados de ${updatedCustomer.name} foram salvos.`,
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
        updateOrderPaymentMethod,
        updateInstallmentStatus,
        updateCustomer,
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
