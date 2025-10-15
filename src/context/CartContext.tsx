

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Order, Product, Installment, CustomerInfo, Category, User, CommissionPayment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { products as initialProducts } from '@/lib/products';
import { addMonths } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, setDoc, updateDoc, deleteDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useAudit } from './AuditContext';
import { useRouter } from 'next/navigation';

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
  orders: Order[];
  addOrder: (order: Partial<Order>) => Promise<Order | null>;
  deleteOrder: (orderId: string) => Promise<void>;
  permanentlyDeleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updateInstallmentStatus: (orderId: string, installmentNumber: number, status: Installment['status']) => Promise<void>;
  updateInstallmentDueDate: (orderId: string, installmentNumber: number, newDueDate: Date) => Promise<void>;
  updateCustomer: (customer: CustomerInfo) => Promise<void>;
  updateOrderDetails: (orderId: string, details: Partial<Order>) => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'data-ai-hint' | 'createdAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  categories: Category[];
  addCategory: (categoryName: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategoryName: (categoryId: string, newName: string) => Promise<void>;
  addSubcategory: (categoryId: string, subcategoryName: string) => Promise<void>;
  updateSubcategory: (categoryId: string, oldSub: string, newSub: string) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryName: string) => Promise<void>;
  moveCategory: (categoryId: string, direction: 'up' | 'down') => Promise<void>;
  reorderSubcategories: (categoryId: string, draggedSub: string, targetSub: string) => Promise<void>;
  moveSubcategory: (sourceCategoryId: string, subName: string, targetCategoryId: string) => Promise<void>;
  commissionPayments: CommissionPayment[];
  payCommissions: (sellerId: string, sellerName: string, amount: number, orderIds: string[], period: string) => Promise<string | null>;
  reverseCommissionPayment: (paymentId: string) => Promise<void>;
  isLoading: boolean;
  restoreCartData: (data: { products: Product[], orders: Order[], categories: Category[] }) => Promise<void>;
  resetOrders: () => Promise<void>;
  resetAllCartData: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedCategoryForSheet, setSelectedCategoryForSheet] = useState<string | null>(null);
  const [lastOrder, setLastOrderState] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>([]);
  const { toast } = useToast();
  const { logAction, user } = useAudit();
  const router = useRouter();


  useEffect(() => {
    setIsLoading(true);
    let activeListeners = true;

    const productsUnsubscribe = onSnapshot(collection(db, 'products'), async (productsSnapshot) => {
        if (!activeListeners) return;
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
    }, (error) => {
        console.error("Failed to load products from Firestore:", error);
        toast({ title: "Erro de Conexão", description: "Não foi possível carregar os produtos.", variant: "destructive" });
    });
    
    const categoriesUnsubscribe = onSnapshot(query(collection(db, 'categories'), orderBy('order')), async (categoriesSnapshot) => {
        if (!activeListeners) return;
        let loadedCategories: Category[];
        if (categoriesSnapshot.empty) {
            const currentProducts = (await getDocs(collection(db, 'products'))).docs.map(d => d.data() as Product);
            const initialCats = Array.from(new Set(currentProducts.map(p => p.category))).map((catName, index) => ({
                id: `cat-${Date.now()}-${index}`,
                name: catName,
                order: index,
                subcategories: Array.from(new Set(currentProducts.filter(p => p.category === catName && p.subcategory).map(p => p.subcategory!))).sort()
            })).sort((a, b) => a.order - b.order);
            
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
        setCategories(loadedCategories);
    }, (error) => {
        console.error("Failed to load categories from Firestore:", error);
    });

    const ordersUnsubscribe = onSnapshot(collection(db, 'orders'), (ordersSnapshot) => {
        if (!activeListeners) return;
        const loadedOrders = ordersSnapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Order[];
        setOrders(loadedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsLoading(false);
    }, (error) => {
        console.error("Failed to load orders from Firestore:", error);
        setIsLoading(false);
    });
    
    const commissionPaymentsUnsubscribe = onSnapshot(collection(db, 'commissionPayments'), (snapshot) => {
        if (!activeListeners) return;
        const loadedPayments = snapshot.docs.map(d => d.data() as CommissionPayment);
        setCommissionPayments(loadedPayments);
    }, (error) => {
        console.error("Failed to load commission payments from Firestore:", error);
    });

    const storedCart = loadDataFromLocalStorage('cartItems');
    if (storedCart) setCartItems(storedCart);

    return () => {
        activeListeners = false;
        productsUnsubscribe();
        categoriesUnsubscribe();
        ordersUnsubscribe();
        commissionPaymentsUnsubscribe();
    };
  }, [toast]);
  
  const restoreCartData = async (data: { products: Product[], orders: Order[], categories: Category[] }) => {
    setIsLoading(true);
    try {
        const batch = writeBatch(db);
        
        const productsCollectionRef = collection(db, "products");
        const productsSnapshot = await getDocs(productsCollectionRef);
        productsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        const ordersCollectionRef = collection(db, "orders");
        const ordersSnapshot = await getDocs(ordersCollectionRef);
        ordersSnapshot.forEach(doc => batch.delete(doc.ref));

        const categoriesCollectionRef = collection(db, "categories");
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        categoriesSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit(); // Commit deletions first

        const addBatch = writeBatch(db);
        data.products.forEach(p => addBatch.set(doc(db, 'products', p.id), p));
        data.orders.forEach(o => addBatch.set(doc(db, 'orders', o.id), o));
        data.categories.forEach(c => addBatch.set(doc(db, 'categories', c.id), c));

        await addBatch.commit();
        // Real-time listeners will update the state
        logAction('Restauração de Backup', 'Todos os dados de produtos, pedidos e categorias foram restaurados.', user);
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
        // Real-time listener will update the state
        logAction('Reset de Pedidos', 'Todos os pedidos e clientes foram zerados.', user);
    } catch (error) {
        console.error("Error resetting orders in Firestore:", error);
    } finally {
        setIsLoading(false);
    }
  };
  
  const resetAllCartData = async () => {
    const initialCats = Array.from(new Set(initialProducts.map(p => p.category))).map((catName, index) => ({
        id: `cat-${Date.now()}-${index}`,
        name: catName,
        order: index,
        subcategories: Array.from(new Set(initialProducts.filter(p => p.category === catName && p.subcategory).map(p => p.subcategory!))).sort()
    })).sort((a, b) => a.name.localeCompare(b.name));
    await restoreCartData({ products: initialProducts, orders: [], categories: initialCats });
    logAction('Reset da Loja', 'Todos os dados da loja foram resetados para o padrão.', user);
    clearCart();
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'data-ai-hint' | 'createdAt'>) => {
      const newProductId = `prod-${Date.now()}`;
      const newProduct: Product = {
        ...productData,
        id: newProductId,
        createdAt: new Date().toISOString(),
        'data-ai-hint': productData.name.toLowerCase().split(' ').slice(0, 2).join(' '),
      };
      try {
        await setDoc(doc(db, 'products', newProductId), newProduct);
        // Real-time listener will update the state
        logAction('Criação de Produto', `Produto "${newProduct.name}" (ID: ${newProductId}) foi criado.`, user);
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
        const productRef = doc(db, 'products', updatedProduct.id);
        const productToUpdate = { ...updatedProduct };
        await setDoc(productRef, productToUpdate, { merge: true });

        // Real-time listener will update the state
        logAction('Atualização de Produto', `Produto "${updatedProduct.name}" (ID: ${updatedProduct.id}) foi atualizado.`, user);
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
        const productToDelete = products.find(p => p.id === productId);
        await deleteDoc(doc(db, 'products', productId));
        // Real-time listener will update the state
        if (productToDelete) {
          logAction('Exclusão de Produto', `Produto "${productToDelete.name}" (ID: ${productId}) foi excluído.`, user);
        }
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
    const newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 0;
    const newCategory: Category = {
      id: newCategoryId,
      name: categoryName,
      order: newOrder,
      subcategories: []
    };
    try {
        await setDoc(doc(db, 'categories', newCategoryId), newCategory);
        // Real-time listener will update the state
        logAction('Criação de Categoria', `Categoria "${categoryName}" foi criada.`, user);
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

        // Real-time listeners will update the state
        logAction('Atualização de Categoria', `Categoria "${oldName}" foi renomeada para "${newName}".`, user);

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
        // Real-time listener will update the state
        logAction('Exclusão de Categoria', `Categoria "${categoryToDelete.name}" foi excluída.`, user);
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
        // Real-time listener will update the state
        logAction('Criação de Subcategoria', `Subcategoria "${subcategoryName}" foi adicionada à categoria "${category.name}".`, user);
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

        // Real-time listeners will update the state
        logAction('Atualização de Subcategoria', `Subcategoria "${oldSub}" foi renomeada para "${newSub}" na categoria "${category.name}".`, user);

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
        // Real-time listener will update the state
        logAction('Exclusão de Subcategoria', `Subcategoria "${subcategoryName}" foi excluída da categoria "${category.name}".`, user);
        toast({ title: "Subcategoria Excluída!", variant: "destructive" });
    } catch (error) {
        toast({ title: "Erro", description: "Falha ao excluir a subcategoria.", variant: "destructive" });
    }
  };
    
  const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    const index = sortedCategories.findIndex(c => c.id === categoryId);

    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedCategories.length - 1) return;

    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    
    const category1 = sortedCategories[index];
    const category2 = sortedCategories[otherIndex];

    const order1 = category1.order;
    const order2 = category2.order;
    
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'categories', category1.id), { order: order2 });
        batch.update(doc(db, 'categories', category2.id), { order: order1 });
        await batch.commit();
        // Real-time listener will handle state update
        logAction('Reordenação de Categoria', `Categoria "${category1.name}" foi movida ${direction === 'up' ? 'para cima' : 'para baixo'}.`, user);
    } catch(e) {
        console.error('Error moving category:', e);
        toast({ title: "Erro", description: "Falha ao reordenar a categoria.", variant: "destructive" });
    }
  };

  const reorderSubcategories = async (categoryId: string, draggedSub: string, targetSub: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const subs = Array.from(category.subcategories);
    const draggedIndex = subs.indexOf(draggedSub);
    const targetIndex = subs.indexOf(targetSub);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove the dragged subcategory and insert it before the target
    const [removed] = subs.splice(draggedIndex, 1);
    subs.splice(targetIndex, 0, removed);
    
    try {
        await updateDoc(doc(db, 'categories', categoryId), { subcategories: subs });
        logAction('Reordenação de Subcategoria', `Subcategorias da categoria "${category.name}" foram reordenadas.`, user);
        // Real-time listener will update UI
    } catch (e) {
        console.error('Error reordering subcategories:', e);
        toast({ title: "Erro", description: "Falha ao reordenar as subcategorias.", variant: "destructive" });
    }
  };

  const moveSubcategory = async (sourceCategoryId: string, subName: string, targetCategoryId: string) => {
    const sourceCategory = categories.find(c => c.id === sourceCategoryId);
    const targetCategory = categories.find(c => c.id === targetCategoryId);

    if (!sourceCategory || !targetCategory) return;
    if (targetCategory.subcategories.some(s => s.toLowerCase() === subName.toLowerCase())) {
        toast({ title: 'Subcategoria já existe', description: `A categoria "${targetCategory.name}" já possui uma subcategoria chamada "${subName}".`, variant: "destructive" });
        return;
    }

    const newSourceSubs = sourceCategory.subcategories.filter(s => s.toLowerCase() !== subName.toLowerCase());
    const newTargetSubs = [...targetCategory.subcategories, subName].sort();
    
    try {
        const batch = writeBatch(db);
        // Update products
        products.forEach(p => {
            if (p.category === sourceCategory.name && p.subcategory?.toLowerCase() === subName.toLowerCase()) {
                batch.update(doc(db, 'products', p.id), { category: targetCategory.name });
            }
        });
        // Update categories
        batch.update(doc(db, 'categories', sourceCategoryId), { subcategories: newSourceSubs });
        batch.update(doc(db, 'categories', targetCategoryId), { subcategories: newTargetSubs });
        
        await batch.commit();

        logAction('Movimentação de Subcategoria', `Subcategoria "${subName}" foi movida de "${sourceCategory.name}" para "${targetCategory.name}".`, user);
        toast({ title: 'Subcategoria Movida!', description: `"${subName}" agora faz parte de "${targetCategory.name}".`});

    } catch(e) {
        console.error('Error moving subcategory:', e);
        toast({ title: "Erro", description: "Falha ao mover a subcategoria.", variant: "destructive" });
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
    setIsCartOpen(true);
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
  
    const calculateCommission = (order: Order) => {
        if (!order.sellerId) return 0;

        if (order.isCommissionManual) {
          return order.commission || 0;
        }

        return order.items.reduce((totalCommission, item) => {
            const product = products.find(p => p.id === item.id);
            if (!product || !product.commissionType || typeof product.commissionValue === 'undefined' || product.commissionValue === null) {
                return totalCommission;
            }
            if (product.commissionType === 'fixed') {
                return totalCommission + (product.commissionValue * item.quantity);
            }
            if (product.commissionType === 'percentage') {
                const itemTotal = item.price * item.quantity;
                return totalCommission + (itemTotal * product.commissionValue / 100);
            }
            return totalCommission;
        }, 0);
    }

  const manageStockForOrder = async (order: Order | undefined, operation: 'add' | 'subtract'): Promise<boolean> => {
    if (!order) return false;
    const batch = writeBatch(db);
    
    for (const orderItem of order.items) {
        const product = products.find(p => p.id === orderItem.id);
        if (product) {
            const stockChange = orderItem.quantity;
            const newStock = operation === 'add' ? product.stock + stockChange : product.stock - stockChange;
            
            if (newStock < 0) {
              toast({
                  title: 'Estoque Insuficiente',
                  description: `Não há estoque suficiente para ${product.name}. Disponível: ${product.stock}, Pedido: ${stockChange}.`,
                  variant: 'destructive'
              });
              return false; // Indicate failure
            }
            
            batch.update(doc(db, 'products', product.id), { stock: newStock });
        }
    }
    
    await batch.commit();
    return true; // Indicate success
  };

  const addOrder = async (order: Partial<Order>): Promise<Order | null> => {
    try {
        const orderToSave = {
            ...order,
            sellerId: '',
            sellerName: '',
            commission: 0,
            commissionPaid: false,
        } as Order;
        
        if (!await manageStockForOrder(orderToSave, 'subtract')) {
          throw new Error(`Estoque insuficiente para um ou mais produtos.`);
        }

        await setDoc(doc(db, 'orders', orderToSave.id), orderToSave);
        // Real-time listener will update the state
        
        const creator = user ? `por ${user.name}`: 'pelo cliente';
        logAction('Criação de Pedido', `Novo pedido #${orderToSave.id} para ${orderToSave.customer.name} no valor de R$${orderToSave.total?.toFixed(2)} foi criado ${creator}.`, user);
        return orderToSave;
    } catch(e) {
        console.error("Failed to add order", e);
        // Re-throw to be caught by the form and prevent stock issues
        if (e instanceof Error && e.message.startsWith('Estoque insuficiente')) {
          throw e;
        }
        // If stock was modified, we need to revert it.
        await manageStockForOrder(order as Order, 'add');
        throw e;
    }
  };

  const deleteOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'Excluído');
  };

  const permanentlyDeleteOrder = async (orderId: string) => {
    const orderToDelete = orders.find(o => o.id === orderId);
    if (!orderToDelete || orderToDelete.status !== 'Excluído') {
      toast({ title: "Erro", description: "Só é possível excluir permanentemente pedidos que estão na lixeira.", variant: "destructive" });
      return;
    }
    
    try {
        await deleteDoc(doc(db, 'orders', orderId));
        // Real-time listener will update the state
        logAction('Exclusão Permanente de Pedido', `Pedido #${orderId} foi excluído permanentemente.`, user);
    } catch(e) {
        console.error("Failed to permanently delete order", e);
        toast({ title: "Erro", description: "Falha ao excluir o pedido permanentemente.", variant: "destructive" });
    }
  };


  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const oldStatus = orderToUpdate.status;
    const wasCanceledOrDeleted = oldStatus === 'Cancelado' || oldStatus === 'Excluído';
    const isNowCanceledOrDeleted = newStatus === 'Cancelado' || newStatus === 'Excluído';

    // if moving out of canceled/deleted, subtract stock
    if (wasCanceledOrDeleted && !isNowCanceledOrDeleted) {
        if (!await manageStockForOrder(orderToUpdate, 'subtract')) {
            // Stop update if not enough stock
            return;
        }
    }
    
    const detailsToUpdate: Partial<Order> = { status: newStatus };

    // Recalculate commission if status is 'Entregue' and commission is not manual, otherwise zero it out.
    if (newStatus === 'Entregue' && orderToUpdate.sellerId) {
      detailsToUpdate.commission = calculateCommission(orderToUpdate);
    } else {
        // If status is not 'Entregue', commission should be 0 and not paid
        if (!orderToUpdate.isCommissionManual) {
          detailsToUpdate.commission = 0;
        }
        detailsToUpdate.commissionPaid = false;
    }
    
    try {
        await updateDoc(doc(db, 'orders', orderId), detailsToUpdate);

        // If moving TO canceled/deleted, add stock back *after* DB update
        if (!wasCanceledOrDeleted && isNowCanceledOrDeleted) {
            await manageStockForOrder(orderToUpdate, 'add');
        }
        
        // Real-time listener will update the state
        logAction('Atualização de Status de Pedido', `Status do pedido #${orderId} alterado de "${oldStatus}" para "${newStatus}".`, user);
        
        if (newStatus !== 'Excluído') {
          toast({ title: "Status do Pedido Atualizado!", description: `O pedido #${orderId} agora está como "${newStatus}".` });
        } else {
          logAction('Exclusão de Pedido', `Pedido #${orderId} movido para a lixeira.`, user);
          toast({ title: "Pedido movido para a Lixeira", description: `O pedido #${orderId} foi movido para a lixeira.` });
        }
    } catch(e) {
        console.error('Failed to update order status:', e);
        // If there was an error and we subtracted stock, we need to add it back.
        if (wasCanceledOrDeleted && !isNowCanceledOrDeleted) {
            await manageStockForOrder(orderToUpdate, 'add');
        }
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
        // Real-time listener will update the state
        logAction('Atualização de Parcela', `Parcela ${installmentNumber} do pedido #${orderId} foi marcada como "${status}".`, user);
    } catch(e) {
        toast({ title: "Erro", description: "Falha ao atualizar o status da parcela.", variant: "destructive" });
    }
  };

  const updateInstallmentDueDate = async (orderId: string, installmentNumber: number, newDueDate: Date) => {
     const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const oldDueDate = order.installmentDetails?.find(i => i.installmentNumber === installmentNumber)?.dueDate;

    const updatedInstallments = (order.installmentDetails || []).map((inst) =>
      inst.installmentNumber === installmentNumber ? { ...inst, dueDate: newDueDate.toISOString() } : inst
    );
     try {
        await updateDoc(doc(db, 'orders', orderId), { installmentDetails: updatedInstallments });
        // Real-time listener will update the state
        logAction('Atualização de Vencimento', `Vencimento da parcela ${installmentNumber} do pedido #${orderId} alterado de ${oldDueDate ? new Date(oldDueDate).toLocaleDateString() : 'N/A'} para ${newDueDate.toLocaleDateString()}.`, user);
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

        // Real-time listener will update the state
        logAction('Atualização de Cliente', `Dados do cliente ${updatedCustomer.name} (CPF: ${updatedCustomer.cpf}) foram atualizados.`, user);
        toast({ title: "Cliente Atualizado!", description: `Os dados de ${updatedCustomer.name} foram salvos.` });
    } catch(e) {
        toast({ title: "Erro", description: "Falha ao atualizar dados do cliente.", variant: "destructive" });
    }
  };

  const updateOrderDetails = async (orderId: string, details: Partial<Order>) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      let detailsToUpdate = { ...details };

      // If the seller is being changed or the commission is not being set manually
      if ('sellerId' in details && details.sellerId) {
          const tempOrderForCommissionCalc = {...order, ...detailsToUpdate};
          if (!tempOrderForCommissionCalc.isCommissionManual) {
            detailsToUpdate.commission = calculateCommission(tempOrderForCommissionCalc);
          }
      }
      
      // If manual commission is being updated, set the flag
      if ('commission' in details && details.commission !== order.commission) {
        if ('isCommissionManual' in details) {
          // do nothing, the flag is being passed
        } else {
          detailsToUpdate.isCommissionManual = true;
        }
      }

    try {
        await updateDoc(doc(db, 'orders', orderId), detailsToUpdate);
        // Real-time listener will update the state
        logAction('Atualização de Detalhes do Pedido', `Detalhes do pedido #${orderId} foram atualizados.`, user);
        toast({ title: "Pedido Atualizado!", description: `Os detalhes do pedido #${orderId} foram atualizados.` });
    } catch(e) {
        toast({ title: "Erro", description: "Falha ao atualizar os detalhes do pedido.", variant: "destructive" });
    }
  };

  const payCommissions = async (sellerId: string, sellerName: string, amount: number, orderIds: string[], period: string): Promise<string | null> => {
    const paymentId = `comp-${sellerId}-${Date.now()}`;
    const payment: CommissionPayment = {
        id: paymentId,
        sellerId,
        sellerName,
        amount,
        paymentDate: new Date().toISOString(),
        period,
        orderIds
    };
    try {
        const batch = writeBatch(db);

        // Create the payment record
        const paymentRef = doc(db, 'commissionPayments', paymentId);
        batch.set(paymentRef, payment);

        // Mark orders' commissions as paid
        orderIds.forEach(orderId => {
            const orderRef = doc(db, 'orders', orderId);
            batch.update(orderRef, { commissionPaid: true });
        });

        await batch.commit();
        
        logAction('Pagamento de Comissão', `Comissão de ${sellerName} no valor de R$${amount.toFixed(2)} referente a ${period} foi paga.`, user);
        toast({ title: "Comissão Paga!", description: `O pagamento para ${sellerName} foi registrado.` });
        return paymentId;

    } catch (e) {
        console.error("Error paying commissions:", e);
        toast({ title: "Erro", description: "Não foi possível registrar o pagamento da comissão.", variant: "destructive" });
        return null;
    }
  };

  const reverseCommissionPayment = async (paymentId: string) => {
    const paymentToReverse = commissionPayments.find(p => p.id === paymentId);
    if (!paymentToReverse) {
      toast({ title: "Erro", description: "Pagamento não encontrado.", variant: "destructive" });
      return;
    }
    
    try {
      const batch = writeBatch(db);
      
      // Delete the payment record
      batch.delete(doc(db, 'commissionPayments', paymentId));

      // Mark commissions as not paid again on the orders
      paymentToReverse.orderIds.forEach(orderId => {
        batch.update(doc(db, 'orders', orderId), { commissionPaid: false });
      });

      await batch.commit();

      logAction('Estorno de Comissão', `O pagamento de comissão ID ${paymentId} foi estornado.`, user);
      toast({ title: "Pagamento Estornado!", description: "As comissões dos pedidos voltaram a ficar pendentes." });

    } catch (e) {
      console.error("Error reversing commission payment:", e);
      toast({ title: "Erro", description: "Não foi possível estornar o pagamento.", variant: "destructive" });
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
        orders, addOrder, deleteOrder, permanentlyDeleteOrder, updateOrderStatus, updateInstallmentStatus, updateInstallmentDueDate, updateCustomer, updateOrderDetails,
        products, addProduct, updateProduct, deleteProduct,
        categories, addCategory, deleteCategory, updateCategoryName, addSubcategory, updateSubcategory, deleteSubcategory, moveCategory, reorderSubcategories, moveSubcategory,
        commissionPayments, payCommissions, reverseCommissionPayment,
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
