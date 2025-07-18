
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Order, Product, Installment, CustomerInfo, PaymentMethod, Category } from '@/lib/types';
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
  deleteOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateInstallmentStatus: (orderId: string, installmentNumber: number, status: Installment['status']) => void;
  updateInstallmentDueDate: (orderId: string, installmentNumber: number, newDueDate: Date) => void;
  updateCustomer: (customer: CustomerInfo) => void;
  updateOrderDetails: (orderId: string, details: Partial<Order>) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'data-ai-hint'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  categories: Category[];
  addCategory: (categoryName: string) => void;
  deleteCategory: (categoryId: string) => void;
  updateCategoryName: (categoryId: string, newName: string) => void;
  addSubcategory: (categoryId: string, subcategoryName: string) => void;
  updateSubcategory: (categoryId: string, oldSub: string, newSub: string) => void;
  deleteSubcategory: (categoryId: string, subcategoryName: string) => void;
  isLoading: boolean;
  restoreCartData: (data: { products: Product[], orders: Order[], categories: Category[] }) => void;
  resetOrders: () => void;
  resetAllCartData: () => void;
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

const getInitialCategories = (products: Product[]): Category[] => {
    const mainCategories = Array.from(new Set(products.map(p => p.category)));
    
    return mainCategories.map((catName, index) => {
        const subcategories = Array.from(new Set(
            products
                .filter(p => p.category === catName && p.subcategory)
                .map(p => p.subcategory!)
        )).sort();
        return { id: `cat-${Date.now()}-${index}`, name: catName, subcategories };
    }).sort((a, b) => a.name.localeCompare(b.name));
};


export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrderState] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
    }
    try {
      const storedCart = localStorage.getItem('cartItems');
      if (storedCart) setCartItems(JSON.parse(storedCart));

      const storedOrdersRaw = localStorage.getItem('orders');
      if (storedOrdersRaw) {
        const loadedOrders = JSON.parse(storedOrdersRaw) as Order[];
        const sortedOrders = loadedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setOrders(sortedOrders);
      }

      let currentProducts = initialProducts;
      const storedProducts = localStorage.getItem('products');
      if (storedProducts) {
        currentProducts = JSON.parse(storedProducts);
        setProducts(currentProducts);
      } else {
        saveDataToLocalStorage('products', initialProducts)
      }

      const storedCategories = localStorage.getItem('categories');
      if (storedCategories) {
        const parsedCategories = JSON.parse(storedCategories);
        setCategories(parsedCategories || []);
      } else {
        const initialCats = getInitialCategories(currentProducts);
        setCategories(initialCats);
        saveDataToLocalStorage('categories', initialCats);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  // Effect to listen for changes in localStorage from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
        try {
            if (event.key === 'products') {
                setProducts(event.newValue ? JSON.parse(event.newValue) : initialProducts);
            }
            if (event.key === 'categories') {
                setCategories(event.newValue ? JSON.parse(event.newValue) : getInitialCategories(products));
            }
            if (event.key === 'orders') {
                setOrders(event.newValue ? JSON.parse(event.newValue) : []);
            }
            if (event.key === 'cartItems') {
                setCartItems(event.newValue ? JSON.parse(event.newValue) : []);
            }
        } catch (error) {
            console.error("Failed to parse localStorage data on change", error);
        }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [products]);
  
  const restoreCartData = (data: { products: Product[], orders: Order[], categories: Category[] }) => {
    const prods = data.products || initialProducts;
    const ords = data.orders || [];
    const cats = data.categories || getInitialCategories(prods);
    setProducts(prods);
    setOrders(ords);
    setCategories(cats);
    saveDataToLocalStorage('products', prods);
    saveDataToLocalStorage('orders', ords);
    saveDataToLocalStorage('categories', cats);
  };

  const resetOrders = () => {
    setOrders([]);
    saveDataToLocalStorage('orders', []);
  };
  
  const resetAllCartData = () => {
    const initialCats = getInitialCategories(initialProducts);
    setProducts(initialProducts);
    setOrders([]);
    setCategories(initialCats);
    setCartItems([]);
    saveDataToLocalStorage('products', initialProducts);
    saveDataToLocalStorage('orders', []);
    saveDataToLocalStorage('categories', initialCats);
    saveDataToLocalStorage('cartItems', []);
  };

  const addProduct = (productData: Omit<Product, 'id' | 'data-ai-hint'>) => {
      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}`,
        'data-ai-hint': productData.name.toLowerCase().split(' ').slice(0, 2).join(' '),
      };
      const updatedProducts = [newProduct, ...products];
      setProducts(updatedProducts);
      saveDataToLocalStorage('products', updatedProducts);
      toast({
          title: "Produto Cadastrado!",
          description: `O produto "${newProduct.name}" foi adicionado ao catálogo.`,
      });
  };

  const updateProduct = (updatedProduct: Product) => {
    const updatedProductsList = products.map((p) =>
      p.id === updatedProduct.id ? updatedProduct : p
    );
    setProducts(updatedProductsList);
    saveDataToLocalStorage('products', updatedProductsList);
    toast({
      title: 'Produto Atualizado!',
      description: `O produto "${updatedProduct.name}" foi atualizado.`,
    });
  };

  const deleteProduct = (productId: string) => {
      const updatedProducts = products.filter((p) => p.id !== productId);
      setProducts(updatedProducts);
      saveDataToLocalStorage('products', updatedProducts);
      toast({
        title: 'Produto Excluído!',
        description: 'O produto foi removido do catálogo.',
        variant: 'destructive',
      });
  };

  const addCategory = (name: string) => {
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Erro", description: "Essa categoria já existe.", variant: "destructive" });
      return;
    }
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      subcategories: []
    };
    const updatedCategories = [...categories, newCategory].sort((a, b) => a.name.localeCompare(b.name));
    setCategories(updatedCategories);
    saveDataToLocalStorage('categories', updatedCategories);
    toast({ title: "Categoria Adicionada!" });
  };

  const updateCategoryName = (categoryId: string, newName: string) => {
    if (categories.some(c => c.name.toLowerCase() === newName.toLowerCase() && c.id !== categoryId)) {
        toast({ title: "Erro", description: "Uma categoria com esse novo nome já existe.", variant: "destructive" });
        return;
    }

    const oldCategory = categories.find(c => c.id === categoryId);
    if (!oldCategory) return;
    const oldName = oldCategory.name;

    const updatedProducts = products.map(p => (p.category.toLowerCase() === oldName.toLowerCase() ? { ...p, category: newName } : p));
    setProducts(updatedProducts);
    saveDataToLocalStorage('products', updatedProducts);

    const updatedCategories = categories
      .map(c => (c.id === categoryId ? { ...c, name: newName } : c))
      .sort((a, b) => a.name.localeCompare(b.name));
    setCategories(updatedCategories);
    saveDataToLocalStorage('categories', updatedCategories);

    toast({ title: "Categoria Renomeada!" });
  };


  const deleteCategory = (categoryId: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;

    if (products.some(p => p.category === categoryToDelete.name)) {
        toast({ title: "Erro", description: "Não é possível excluir categorias que contêm produtos.", variant: "destructive" });
        return;
    }
    const updatedCategories = categories.filter(c => c.id !== categoryId);
    setCategories(updatedCategories);
    saveDataToLocalStorage('categories', updatedCategories);
    toast({ title: "Categoria Excluída!", variant: "destructive" });
  };

  const addSubcategory = (categoryId: string, subcategoryName: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    if (category.subcategories.some(s => s.toLowerCase() === subcategoryName.toLowerCase())) {
      toast({ title: "Erro", description: "Essa subcategoria já existe.", variant: "destructive" });
      return;
    }
    
    const updatedCategories = categories.map(c => 
      c.id === categoryId 
        ? { ...c, subcategories: [...c.subcategories, subcategoryName].sort() } 
        : c
    );
    setCategories(updatedCategories);
    saveDataToLocalStorage('categories', updatedCategories);
    toast({ title: "Subcategoria Adicionada!" });
  };

  const updateSubcategory = (categoryId: string, oldSub: string, newSub: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    if (category.subcategories.some(s => s.toLowerCase() === newSub.toLowerCase() && s.toLowerCase() !== oldSub.toLowerCase())) {
        toast({ title: "Erro", description: "Essa subcategoria já existe.", variant: "destructive" });
        return;
    }

    const updatedProducts = products.map(p => 
      (p.category === category.name && p.subcategory?.toLowerCase() === oldSub.toLowerCase()) 
        ? { ...p, subcategory: newSub } 
        : p
    );
    setProducts(updatedProducts);
    saveDataToLocalStorage('products', updatedProducts);

    const updatedCategories = categories.map(c => {
        if (c.id === categoryId) {
            const newSubs = c.subcategories.map(s => s.toLowerCase() === oldSub.toLowerCase() ? newSub : s).sort();
            return { ...c, subcategories: newSubs };
        }
        return c;
    });
    setCategories(updatedCategories);
    saveDataToLocalStorage('categories', updatedCategories);
    toast({ title: "Subcategoria Renomeada!" });
  };

  const deleteSubcategory = (categoryId: string, subcategoryName: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    if (products.some(p => p.category === category.name && p.subcategory?.toLowerCase() === subcategoryName.toLowerCase())) {
        toast({ title: "Erro", description: "Não é possível excluir subcategorias que contêm produtos.", variant: "destructive" });
        return;
    }
    const updatedCategories = categories.map(c => 
        c.id === categoryId
            ? { ...c, subcategories: c.subcategories.filter(s => s.toLowerCase() !== subcategoryName.toLowerCase()) } 
            : c
    );
    setCategories(updatedCategories);
    saveDataToLocalStorage('categories', updatedCategories);
    toast({ title: "Subcategoria Excluída!", variant: "destructive" });
  };


  const addToCart = (product: Product) => {
    const imageUrl = (product.imageUrls && product.imageUrls.length > 0) 
      ? product.imageUrls[0] 
      : 'https://placehold.co/600x600.png';

    let newCartItems: CartItem[] = [];
    const existingItem = cartItems.find((item) => item.id === product.id);
    if (existingItem) {
      newCartItems = cartItems.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCartItems = [...cartItems, { id: product.id, name: product.name, price: product.price, imageUrl, quantity: 1 }];
    }
    setCartItems(newCartItems);
    saveDataToLocalStorage('cartItems', newCartItems);
    toast({
        title: "Produto adicionado!",
        description: `${product.name} foi adicionado ao seu carrinho.`,
    });
  };

  const removeFromCart = (productId: string) => {
    const newCartItems = cartItems.filter((item) => item.id !== productId);
    setCartItems(newCartItems);
    saveDataToLocalStorage('cartItems', newCartItems);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    const newCartItems = cartItems.map((item) =>
      item.id === productId ? { ...item, quantity } : item
    );
    setCartItems(newCartItems);
    saveDataToLocalStorage('cartItems', newCartItems);
  };

  const clearCart = () => {
    setCartItems([]);
    saveDataToLocalStorage('cartItems', []);
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
  
  const manageStockForOrder = (order: Order | undefined, operation: 'add' | 'subtract') => {
    if (!order) return;
  
    const currentProducts = JSON.parse(localStorage.getItem('products') || '[]') as Product[];
    const updatedProducts = [...currentProducts];

    order.items.forEach(orderItem => {
      const productIndex = updatedProducts.findIndex(p => p.id === orderItem.id);
      if (productIndex !== -1) {
        const product = updatedProducts[productIndex];
        const stockChange = orderItem.quantity;
        const newStock = operation === 'add' ? product.stock + stockChange : product.stock - stockChange;
        
        updatedProducts[productIndex] = {
          ...product,
          stock: newStock >= 0 ? newStock : 0,
        };
      }
    });

    setProducts(updatedProducts);
    saveDataToLocalStorage('products', updatedProducts);
  };

  const addOrder = (order: Order) => {
    manageStockForOrder(order, 'subtract');
    const newOrders = [order, ...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setOrders(newOrders);
    saveDataToLocalStorage('orders', newOrders);
  };

  const deleteOrder = (orderId: string) => {
    const orderToDelete = orders.find(o => o.id === orderId);
    if (!orderToDelete) return;

    if (orderToDelete.status !== 'Cancelado') {
      manageStockForOrder(orderToDelete, 'add');
    }

    const updatedOrders = orders.filter((order) => order.id !== orderId);
    setOrders(updatedOrders);
    saveDataToLocalStorage('orders', updatedOrders);
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
  
    const oldStatus = orderToUpdate.status;
  
    if (newStatus === 'Cancelado' && oldStatus !== 'Cancelado') {
      manageStockForOrder(orderToUpdate, 'add');
    }
    else if (oldStatus === 'Cancelado' && newStatus !== 'Cancelado') {
      manageStockForOrder(orderToUpdate, 'subtract');
    }

    const updatedOrders = orders.map((order) =>
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);
    saveDataToLocalStorage('orders', updatedOrders);
    toast({
        title: "Status do Pedido Atualizado!",
        description: `O pedido #${orderId} agora está como "${newStatus}".`,
    });
  };

  const updateInstallmentStatus = (orderId: string, installmentNumber: number, status: Installment['status']) => {
    const updatedOrders = orders.map((order) => {
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
    setOrders(updatedOrders);
    saveDataToLocalStorage('orders', updatedOrders);
  };

  const updateInstallmentDueDate = (orderId: string, installmentNumber: number, newDueDate: Date) => {
    const updatedOrders = orders.map((order) => {
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
    setOrders(updatedOrders);
    saveDataToLocalStorage('orders', updatedOrders);
    toast({
        title: "Vencimento Atualizado!",
        description: `A data de vencimento da parcela ${installmentNumber} do pedido #${orderId} foi alterada.`,
    });
  };

  const updateCustomer = (updatedCustomer: CustomerInfo) => {
    const updatedOrders = orders.map((order) => {
      if (order.customer.cpf === updatedCustomer.cpf) {
        return { ...order, customer: { ...order.customer, ...updatedCustomer } };
      }
      return order;
    });
    setOrders(updatedOrders);
    saveDataToLocalStorage('orders', updatedOrders);
    toast({
      title: "Cliente Atualizado!",
      description: `Os dados de ${updatedCustomer.name} foram salvos.`,
    });
  };

  const updateOrderDetails = (orderId: string, details: Partial<Order>) => {
    const updatedOrders = orders.map((order) =>
        order.id === orderId ? { ...order, ...details } : order
    );
    setOrders(updatedOrders);
    saveDataToLocalStorage('orders', updatedOrders);
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
        deleteOrder,
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
        deleteCategory,
        updateCategoryName,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        isLoading,
        restoreCartData,
        resetOrders,
        resetAllCartData,
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
