
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Order, Product, Installment, CustomerInfo, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { products as initialProducts } from '@/lib/products';
import { addMonths } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

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
  addOrder: (order: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updateInstallmentStatus: (orderId: string, installmentNumber: number, status: Installment['status']) => Promise<void>;
  updateInstallmentDueDate: (orderId: string, installmentNumber: number, newDueDate: Date) => Promise<void>;
  updateCustomer: (customer: CustomerInfo) => Promise<void>;
  updateOrderDetails: (orderId: string, details: Partial<Order>) => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'data-ai-hint'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  categories: Category[];
  addCategory: (categoryName: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategoryName: (categoryId: string, newName: string) => Promise<void>;
  addSubcategory: (categoryId: string, subcategoryName: string) => Promise<void>;
  updateSubcategory: (categoryId: string, oldSub: string, newSub: string) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryName: string) => Promise<void>;
  isLoading: boolean;
  restoreCartData: (data: { products: Product[], orders: Order[], categories: Category[] }) => Promise<void>;
  resetOrders: () => Promise<void>;
  resetAllCartData: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrderState] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadAllData = async () => {
        setIsLoading(true);
        try {
            // Load Products
            const productsSnapshot = await getDocs(collection(db, 'products'));
            let loadedProducts: Product[];
            if (productsSnapshot.empty) {
                const batch = writeBatch(db);
                initialProducts.forEach(p => {
                    const docRef = doc(db, 'products', p.id);
                    batch.set(docRef, p);
                });
                await batch.commit();
                loadedProducts = initialProducts;
            } else {
                loadedProducts = productsSnapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Product[];
            }
            setProducts(loadedProducts);
            
            // Load Categories
            const categoriesSnapshot = await getDocs(collection(db, 'categories'));
            let loadedCategories: Category[];
            if (categoriesSnapshot.empty) {
                const initialCats = getInitialCategories(loadedProducts);
                const batch = writeBatch(db);
                initialCats.forEach(c => {
                    const docRef = doc(db, 'categories', c.id);
                    batch.set(docRef, c);
                });
                await batch.commit();
                loadedCategories = initialCats;
            } else {
                loadedCategories = categoriesSnapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Category[];
            }
            setCategories(loadedCategories.sort((a,b) => a.name.localeCompare(b.name)));

            // Load Orders
            const ordersSnapshot = await getDocs(collection(db, 'orders'));
            const loadedOrders = ordersSnapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Order[];
            setOrders(loadedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            
            // Load Cart from localStorage
            const storedCart = localStorage.getItem('cartItems');
            if (storedCart) setCartItems(JSON.parse(storedCart));

        } catch (error) {
            console.error("Failed to load data from Firestore:", error);
            toast({ title: "Erro de Conexão", description: "Não foi possível carregar os dados da loja.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    loadAllData();
  }, [toast]);
  
  const restoreCartData = async (data: { products: Product[], orders: Order[], categories: Category[] }) => {
    setIsLoading(true);
    try {
        const batch = writeBatch(db);
        // Clear existing collections (optional, can be dangerous)
        // For simplicity, we'll just overwrite.

        data.products.forEach(p => batch.set(doc(db, 'products', p.id), p));
        data.orders.forEach(o => batch.set(doc(db, 'orders', o.id), o));
        data.categories.forEach(c => batch.set(doc(db, 'categories', c.id), c));

        await batch.commit();
        setProducts(data.products || []);
        setOrders(data.orders || []);
        setCategories(data.categories || []);
        toast({ title: 'Dados restaurados com sucesso!' });
    } catch (error) {
        console.error("Error restoring data to Firestore:", error);
        toast({ title: "Erro", description: "Não foi possível restaurar os dados.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const resetOrders = async () => {
    setIsLoading(true);
    try {
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const batch = writeBatch(db);
        ordersSnapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        setOrders([]);
    } catch (error) {
        console.error("Error resetting orders in Firestore:", error);
    } finally {
        setIsLoading(false);
    }
  };
  
  const resetAllCartData = async () => {
     await restoreCartData({ products: initialProducts, orders: [], categories: getInitialCategories(initialProducts) });
     clearCart();
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'data-ai-hint'>) => {
      const newProductId = `prod-${Date.now()}`;
      const newProduct: Product = {
        ...productData,
        id: newProductId,
        'data-ai-hint': productData.name.toLowerCase().split(' ').slice(0, 2).join(' '),
      };
      try {
        await setDoc(doc(db, 'products', newProductId), newProduct);
        setProducts(prev => [newProduct, ...prev]);
        toast({
            title: "Produto Cadastrado!",
            description: `O produto "${newProduct.name}" foi adicionado ao catálogo.`,
        });
      } catch (error) {
        console.error("Error adding product:", error);
        toast({ title: "Erro", description: "Falha ao cadastrar o produto.", variant: "destructive" });
      }
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
        await setDoc(doc(db, 'products', updatedProduct.id), updatedProduct, { merge: true });
        setProducts(prev => prev.map((p) => p.id === updatedProduct.id ? updatedProduct : p));
        toast({
            title: 'Produto Atualizado!',
            description: `O produto "${updatedProduct.name}" foi atualizado.`,
        });
    } catch (error) {
        console.error("Error updating product:", error);
        toast({ title: "Erro", description: "Falha ao atualizar o produto.", variant: "destructive" });
    }
  };

  const deleteProduct = async (productId: string) => {
      try {
        await deleteDoc(doc(db, 'products', productId));
        setProducts(prev => prev.filter((p) => p.id !== productId));
        toast({
            title: 'Produto Excluído!',
            description: 'O produto foi removido do catálogo.',
            variant: 'destructive',
        });
      } catch (error) {
        console.error("Error deleting product:", error);
        toast({ title: "Erro", description: "Falha ao excluir o produto.", variant: "destructive" });
      }
  };

  const addCategory = async (categoryName: string) => {
    if (categories.some(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
      toast({ title: "Erro", description: "Essa categoria já existe.", variant: "destructive" });
      return;
    }
    const newCategoryId = `cat-${Date.now()}`;
    const newCategory: Category = {
      id: newCategoryId,
      name: categoryName,
      subcategories: []
    };
    try {
        await setDoc(doc(db, 'categories', newCategoryId), newCategory);
        setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)));
        toast({ title: "Categoria Adicionada!" });
    } catch (error) {
        console.error("Error adding category:", error);
        toast({ title: "Erro", description: "Falha ao adicionar a categoria.", variant: "destructive" });
    }
  };

  const updateCategoryName = async (categoryId: string, newName: string) => {
    if (categories.some(c => c.name.toLowerCase() === newName.toLowerCase() && c.id !== categoryId)) {
        toast({ title: "Erro", description: "Uma categoria com esse novo nome já existe.", variant: "destructive" });
        return;
    }
    const oldCategory = categories.find(c => c.id === categoryId);
    if (!oldCategory) return;
    const oldName = oldCategory.name;

    try {
        const batch = writeBatch(db);
        const categoryRef = doc(db, 'categories', categoryId);
        batch.update(categoryRef, { name: newName });
        
        products.forEach(p => {
            if (p.category.toLowerCase() === oldName.toLowerCase()) {
                const productRef = doc(db, 'products', p.id);
                batch.update(productRef, { category: newName });
            }
        });

        await batch.commit();

        setProducts(prev => prev.map(p => (p.category.toLowerCase() === oldName.toLowerCase() ? { ...p, category: newName } : p)));
        setCategories(prev => prev.map(c => (c.id === categoryId ? { ...c, name: newName } : c)).sort((a, b) => a.name.localeCompare(b.name)));

        toast({ title: "Categoria Renomeada!" });
    } catch (error) {
        console.error("Error renaming category:", error);
        toast({ title: "Erro", description: "Falha ao renomear a categoria.", variant: "destructive" });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;

    if (products.some(p => p.category === categoryToDelete.name)) {
        toast({ title: "Erro", description: "Não é possível excluir categorias que contêm produtos.", variant: "destructive" });
        return;
    }
    try {
        await deleteDoc(doc(db, 'categories', categoryId));
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        toast({ title: "Categoria Excluída!", variant: "destructive" });
    } catch(e) {
        toast({ title: "Erro", description: "Falha ao excluir a categoria.", variant: "destructive" });
    }
  };

  const addSubcategory = async (categoryId: string, subcategoryName: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    if (category.subcategories.some(s => s.toLowerCase() === subcategoryName.toLowerCase())) {
      toast({ title: "Erro", description: "Essa subcategoria já existe.", variant: "destructive" });
      return;
    }
    const newSubcategories = [...category.subcategories, subcategoryName].sort();
    try {
        await updateDoc(doc(db, 'categories', categoryId), { subcategories: newSubcategories });
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, subcategories: newSubcategories } : c));
        toast({ title: "Subcategoria Adicionada!" });
    } catch (error) {
        console.error("Error adding subcategory:", error);
        toast({ title: "Erro", description: "Falha ao adicionar a subcategoria.", variant: "destructive" });
    }
  };

  const updateSubcategory = async (categoryId: string, oldSub: string, newSub: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    if (category.subcategories.some(s => s.toLowerCase() === newSub.toLowerCase() && s.toLowerCase() !== oldSub.toLowerCase())) {
        toast({ title: "Erro", description: "Essa subcategoria já existe.", variant: "destructive" });
        return;
    }
    
    try {
        const batch = writeBatch(db);
        const newSubs = category.subcategories.map(s => s.toLowerCase() === oldSub.toLowerCase() ? newSub : s).sort();
        batch.update(doc(db, 'categories', categoryId), { subcategories: newSubs });
        
        products.forEach(p => {
            if (p.category === category.name && p.subcategory?.toLowerCase() === oldSub.toLowerCase()) {
                batch.update(doc(db, 'products', p.id), { subcategory: newSub });
            }
        });
        await batch.commit();

        setProducts(prev => prev.map(p => (p.category === category.name && p.subcategory?.toLowerCase() === oldSub.toLowerCase()) ? { ...p, subcategory: newSub } : p));
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, subcategories: newSubs } : c));

        toast({ title: "Subcategoria Renomeada!" });
    } catch (error) {
        console.error("Error renaming subcategory:", error);
        toast({ title: "Erro", description: "Falha ao renomear a subcategoria.", variant: "destructive" });
    }
  };

  const deleteSubcategory = async (categoryId: string, subcategoryName: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    if (products.some(p => p.category === category.name && p.subcategory?.toLowerCase() === subcategoryName.toLowerCase())) {
        toast({ title: "Erro", description: "Não é possível excluir subcategorias que contêm produtos.", variant: "destructive" });
        return;
    }
    const newSubcategories = category.subcategories.filter(s => s.toLowerCase() !== subcategoryName.toLowerCase());
    try {
        await updateDoc(doc(db, 'categories', categoryId), { subcategories: newSubcategories });
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, subcategories: newSubcategories } : c));
        toast({ title: "Subcategoria Excluída!", variant: "destructive" });
    } catch (error) {
        toast({ title: "Erro", description: "Falha ao excluir a subcategoria.", variant: "destructive" });
    }
  };

  const addToCart = (product: Product) => {
    const imageUrl = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'https://placehold.co/600x600.png';
    const updatedCart = [...cartItems];
    const existingItem = updatedCart.find((item) => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      updatedCart.push({ id: product.id, name: product.name, price: product.price, imageUrl, quantity: 1 });
    }
    setCartItems(updatedCart);
    saveDataToLocalStorage('cartItems', updatedCart);
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
    const newCartItems = cartItems.map((item) => item.id === productId ? { ...item, quantity } : item );
    setCartItems(newCartItems);
    saveDataToLocalStorage('cartItems', newCartItems);
  };

  const clearCart = () => {
    setCartItems([]);
    saveDataToLocalStorage('cartItems', []);
  };

  const getCartTotal = () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const setLastOrder = (order: Order) => setLastOrderState(order);
  
  const manageStockForOrder = async (order: Order | undefined, operation: 'add' | 'subtract') => {
    if (!order) return;
    const batch = writeBatch(db);
    let stockChanged = false;

    const updatedProductState = [...products];

    for (const orderItem of order.items) {
        const productIndex = updatedProductState.findIndex(p => p.id === orderItem.id);
        if (productIndex > -1) {
            const product = updatedProductState[productIndex];
            const stockChange = orderItem.quantity;
            const newStock = operation === 'add' ? product.stock + stockChange : product.stock - stockChange;
            
            if (newStock < 0) {
              toast({title: "Estoque Insuficiente", description: `Não há estoque suficiente para ${product.name}`, variant: "destructive"});
              throw new Error("Estoque insuficiente");
            }
            
            updatedProductState[productIndex] = { ...product, stock: newStock };
            batch.update(doc(db, 'products', product.id), { stock: newStock });
            stockChanged = true;
        }
    }
    if (stockChanged) {
      await batch.commit();
      setProducts(updatedProductState);
    }
  };

  const addOrder = async (order: Order) => {
    try {
        await manageStockForOrder(order, 'subtract');
        await setDoc(doc(db, 'orders', order.id), order);
        setOrders(prev => [order, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch(e) {
        console.error("Failed to add order", e);
        throw e; // re-throw to be caught by the form
    }
  };

  const deleteOrder = async (orderId: string) => {
    const orderToDelete = orders.find(o => o.id === orderId);
    if (!orderToDelete) return;
    
    try {
        if (orderToDelete.status !== 'Cancelado') {
          await manageStockForOrder(orderToDelete, 'add');
        }
        await deleteDoc(doc(db, 'orders', orderId));
        setOrders(prev => prev.filter((order) => order.id !== orderId));
    } catch(e) {
        console.error("Failed to delete order", e);
        toast({ title: "Erro", description: "Falha ao excluir o pedido.", variant: "destructive" });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
  
    const oldStatus = orderToUpdate.status;
    
    try {
        if (newStatus === 'Cancelado' && oldStatus !== 'Cancelado') {
          await manageStockForOrder(orderToUpdate, 'add');
        }
        else if (oldStatus === 'Cancelado' && newStatus !== 'Cancelado') {
          await manageStockForOrder(orderToUpdate, 'subtract');
        }
        await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
        setOrders(prev => prev.map((order) => order.id === orderId ? { ...order, status: newStatus } : order));
        toast({ title: "Status do Pedido Atualizado!", description: `O pedido #${orderId} agora está como "${newStatus}".` });
    } catch(e) {
        console.error("Failed to update order status", e);
        toast({ title: "Erro", description: "Falha ao atualizar o status do pedido.", variant: "destructive" });
    }
  };

  const updateInstallmentStatus = async (orderId: string, installmentNumber: number, status: Installment['status']) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const updatedInstallments = (order.installmentDetails || []).map((inst) =>
      inst.installmentNumber === installmentNumber
        ? { ...inst, status, paymentDate: status === 'Pago' ? new Date().toISOString() : null }
        : inst
    );

    try {
        await updateDoc(doc(db, 'orders', orderId), { installmentDetails: updatedInstallments });
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, installmentDetails: updatedInstallments } : o));
    } catch(e) {
        toast({ title: "Erro", description: "Falha ao atualizar o status da parcela.", variant: "destructive" });
    }
  };

  const updateInstallmentDueDate = async (orderId: string, installmentNumber: number, newDueDate: Date) => {
     const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedInstallments = (order.installmentDetails || []).map((inst) =>
      inst.installmentNumber === installmentNumber ? { ...inst, dueDate: newDueDate.toISOString() } : inst
    );
     try {
        await updateDoc(doc(db, 'orders', orderId), { installmentDetails: updatedInstallments });
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, installmentDetails: updatedInstallments } : o));
        toast({ title: "Vencimento Atualizado!" });
    } catch(e) {
        toast({ title: "Erro", description: "Falha ao atualizar o vencimento.", variant: "destructive" });
    }
  };

  const updateCustomer = async (updatedCustomer: CustomerInfo) => {
    try {
        const batch = writeBatch(db);
        orders.forEach(order => {
            if (order.customer.cpf === updatedCustomer.cpf) {
                batch.update(doc(db, 'orders', order.id), { customer: { ...order.customer, ...updatedCustomer } });
            }
        });
        await batch.commit();

        setOrders(prev => prev.map((order) => {
            if (order.customer.cpf === updatedCustomer.cpf) {
                return { ...order, customer: { ...order.customer, ...updatedCustomer } };
            }
            return order;
        }));
        toast({ title: "Cliente Atualizado!", description: `Os dados de ${updatedCustomer.name} foram salvos.` });
    } catch(e) {
        toast({ title: "Erro", description: "Falha ao atualizar dados do cliente.", variant: "destructive" });
    }
  };

  const updateOrderDetails = async (orderId: string, details: Partial<Order>) => {
    try {
        await updateDoc(doc(db, 'orders', orderId), details);
        setOrders(prev => prev.map((order) => order.id === orderId ? { ...order, ...details } : order));
        toast({ title: "Pedido Atualizado!", description: `Os detalhes do pedido #${orderId} foram atualizados.` });
    } catch(e) {
        toast({ title: "Erro", description: "Falha ao atualizar os detalhes do pedido.", variant: "destructive" });
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, cartCount,
        lastOrder, setLastOrder,
        orders, addOrder, deleteOrder, updateOrderStatus, updateInstallmentStatus, updateInstallmentDueDate, updateCustomer, updateOrderDetails,
        products, addProduct, updateProduct, deleteProduct,
        categories, addCategory, deleteCategory, updateCategoryName, addSubcategory, updateSubcategory, deleteSubcategory,
        isLoading,
        restoreCartData, resetOrders, resetAllCartData,
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
