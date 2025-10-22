

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Order, Product, Installment, CustomerInfo, Category, User, CommissionPayment, Payment, StockAudit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { products as initialProducts } from '@/lib/products';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, setDoc, updateDoc, deleteDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
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

interface AdminContextType {
  orders: Order[];
  products: Product[];
  categories: Category[];
  commissionPayments: CommissionPayment[];
  stockAudits: StockAudit[];
  isLoading: boolean;
  deleteOrder: (orderId: string) => Promise<void>;
  permanentlyDeleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  recordInstallmentPayment: (orderId: string, installmentNumber: number, payment: Payment) => Promise<void>;
  reversePayment: (orderId: string, installmentNumber: number, paymentId: string) => Promise<void>;
  updateInstallmentDueDate: (orderId: string, installmentNumber: number, newDueDate: Date) => Promise<void>;
  updateCustomer: (customer: CustomerInfo) => Promise<void>;
  updateOrderDetails: (orderId: string, details: Partial<Order>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'data-ai-hint' | 'createdAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCategory: (categoryName: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategoryName: (categoryId: string, newName: string) => Promise<void>;
  addSubcategory: (categoryId: string, subcategoryName: string) => Promise<void>;
  updateSubcategory: (categoryId: string, oldSub: string, newSub: string) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryName: string) => Promise<void>;
  moveCategory: (categoryId: string, direction: 'up' | 'down') => Promise<void>;
  reorderSubcategories: (categoryId: string, draggedSub: string, targetSub: string) => Promise<void>;
  moveSubcategory: (sourceCategoryId: string, subName: string, targetCategoryId: string) => Promise<void>;
  payCommissions: (sellerId: string, sellerName: string, amount: number, orderIds: string[], period: string) => Promise<string | null>;
  reverseCommissionPayment: (paymentId: string) => Promise<void>;
  restoreAdminData: (data: { products: Product[], orders: Order[], categories: Category[] }) => Promise<void>;
  resetOrders: () => Promise<void>;
  resetAllAdminData: () => Promise<void>;
  saveStockAudit: (audit: StockAudit) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>([]);
  const [stockAudits, setStockAudits] = useState<StockAudit[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { logAction } = useAudit();


  useEffect(() => {
    setIsLoading(true);
    const productsUnsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
    },
    (error) => {
      console.error("Error fetching products:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'products',
        operation: 'list',
      }));
    });
    const categoriesUnsubscribe = onSnapshot(query(collection(db, 'categories'), orderBy('order')), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Category)));
    },
    (error) => {
      console.error("Error fetching categories:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'categories',
        operation: 'list',
      }));
    });
    const ordersUnsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Order)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    },
    (error) => {
      console.error("Error fetching orders:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'orders',
        operation: 'list',
      }));
    });
    const commissionPaymentsUnsubscribe = onSnapshot(collection(db, 'commissionPayments'), (snapshot) => {
      setCommissionPayments(snapshot.docs.map(d => d.data() as CommissionPayment));
    },
    (error) => {
      console.error("Error fetching commission payments:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'commissionPayments',
        operation: 'list',
      }));
    });
     const stockAuditsUnsubscribe = onSnapshot(collection(db, 'stockAudits'), (snapshot) => {
      setStockAudits(snapshot.docs.map(d => d.data() as StockAudit));
    }, (error) => {
      console.error("Error fetching stock audits:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'stockAudits',
        operation: 'list',
      }));
    });


    setIsLoading(false);

    return () => {
      productsUnsubscribe();
      categoriesUnsubscribe();
      ordersUnsubscribe();
      commissionPaymentsUnsubscribe();
      stockAuditsUnsubscribe();
    }
  }, []);
  
  const restoreAdminData = async (data: { products: Product[], orders: Order[], categories: Category[] }) => {
    setIsLoading(true);
    const batch = writeBatch(db);
    
    try {
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
    } catch (error) {
        console.error("Error clearing existing data:", error);
        // Do not emit here, as it might be a general error, not a permission one.
    }

    const addBatch = writeBatch(db);
    data.products.forEach(p => addBatch.set(doc(db, 'products', p.id), p));
    data.orders.forEach(o => addBatch.set(doc(db, 'orders', o.id), o));
    data.categories.forEach(c => addBatch.set(doc(db, 'categories', c.id), c));

    addBatch.commit().then(() => {
        logAction('Restauração de Backup', 'Todos os dados de produtos, pedidos e categorias foram restaurados.', user);
        toast({ title: 'Dados restaurados com sucesso!' });
        setIsLoading(false);
    }).catch(async (error) => {
        setIsLoading(false);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'multiple', operation: 'write' }));
    });
  };

  const resetOrders = async () => {
    setIsLoading(true);
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    const batch = writeBatch(db);
    ordersSnapshot.docs.forEach(d => batch.delete(d.ref));
    batch.commit().then(() => {
        logAction('Reset de Pedidos', 'Todos os pedidos e clientes foram zerados.', user);
        setIsLoading(false);
    }).catch(async (error) => {
        setIsLoading(false);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'orders', operation: 'delete' }));
    });
  };
  
  const resetAllAdminData = async () => {
    const initialCats = Array.from(new Set(initialProducts.map(p => p.category))).map((catName, index) => ({
        id: `cat-${Date.now()}-${index}`,
        name: catName,
        order: index,
        subcategories: Array.from(new Set(initialProducts.filter(p => p.category === catName && p.subcategory).map(p => p.subcategory!))).sort()
    })).sort((a, b) => a.name.localeCompare(b.name));
    await restoreAdminData({ products: initialProducts, orders: [], categories: initialCats });
    logAction('Reset da Loja', 'Todos os dados da loja foram resetados para o padrão.', user);
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'data-ai-hint' | 'createdAt'>) => {
      const newProductId = `prod-${Date.now()}`;
      const newProduct: Product = {
        ...productData,
        id: newProductId,
        createdAt: new Date().toISOString(),
        'data-ai-hint': productData.name.toLowerCase().split(' ').slice(0, 2).join(' '),
      };
      
      const productRef = doc(db, 'products', newProductId);
      setDoc(productRef, newProduct).then(() => {
        logAction('Criação de Produto', `Produto "${newProduct.name}" (ID: ${newProductId}) foi criado.`, user);
        toast({
            title: "Produto Cadastrado!",
            description: `O produto "${newProduct.name}" foi adicionado ao catálogo.`,
        });
      }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productRef.path,
            operation: 'create',
            requestResourceData: newProduct,
        }));
      });
  };

  const updateProduct = async (updatedProduct: Product) => {
    const productRef = doc(db, 'products', updatedProduct.id);
    const productToUpdate = { ...updatedProduct };
    
    setDoc(productRef, productToUpdate, { merge: true }).then(() => {
        logAction('Atualização de Produto', `Produto "${updatedProduct.name}" (ID: ${updatedProduct.id}) foi atualizado.`, user);
    }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productRef.path,
            operation: 'update',
            requestResourceData: productToUpdate,
        }));
    });
  };

  const deleteProduct = async (productId: string) => {
      const productRef = doc(db, 'products', productId);
      const productToDelete = products.find(p => p.id === productId);

      deleteDoc(productRef).then(() => {
        if (productToDelete) {
          logAction('Exclusão de Produto', `Produto "${productToDelete.name}" (ID: ${productId}) foi excluído.`, user);
        }
        toast({
            title: 'Produto Excluído!',
            description: 'O produto foi removido do catálogo.',
            variant: 'destructive',
        });
      }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productRef.path,
            operation: 'delete',
        }));
      });
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
    
    const categoryRef = doc(db, 'categories', newCategoryId);
    setDoc(categoryRef, newCategory).then(() => {
        logAction('Criação de Categoria', `Categoria "${categoryName}" foi criada.`, user);
        toast({ title: "Categoria Adicionada!" });
    }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: categoryRef.path,
            operation: 'create',
            requestResourceData: newCategory,
        }));
    });
  };

  const updateCategoryName = async (categoryId: string, newName: string) => {
    if (categories.some(c => c.name.toLowerCase() === newName.toLowerCase() && c.id !== categoryId)) {
        toast({ title: "Erro", description: "Uma categoria com esse novo nome já existe.", variant: "destructive" });
        return;
    }
    const oldCategory = categories.find(c => c.id === categoryId);
    if (!oldCategory) return;
    const oldName = oldCategory.name;

    const batch = writeBatch(db);
    const categoryRef = doc(db, 'categories', categoryId);
    batch.update(categoryRef, { name: newName });
    
    const productsSnapshot = await getDocs(collection(db, 'products'));
    productsSnapshot.forEach(productDoc => {
        const p = productDoc.data() as Product;
        if (p.category.toLowerCase() === oldName.toLowerCase()) {
            const productRef = doc(db, 'products', productDoc.id);
            batch.update(productRef, { category: newName });
        }
    });

    batch.commit().then(() => {
        logAction('Atualização de Categoria', `Categoria "${oldName}" foi renomeada para "${newName}".`, user);
        toast({ title: "Categoria Renomeada!" });
    }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `categories/${categoryId}`,
            operation: 'update',
            requestResourceData: { name: newName },
        }));
    });
  };

  const deleteCategory = async (categoryId: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;

    const productsSnapshot = await getDocs(collection(db, 'products'));
    const productsInCategory = productsSnapshot.docs.some(d => (d.data() as Product).category === categoryToDelete.name);

    if (productsInCategory) {
        toast({ title: "Erro", description: "Não é possível excluir categorias que contêm produtos.", variant: "destructive" });
        return;
    }
    const categoryRef = doc(db, 'categories', categoryId);
    deleteDoc(categoryRef).then(() => {
        logAction('Exclusão de Categoria', `Categoria "${categoryToDelete.name}" foi excluída.`, user);
        toast({ title: "Categoria Excluída!", variant: "destructive" });
    }).catch(async(e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: categoryRef.path,
            operation: 'delete',
        }));
    });
  };

  const addSubcategory = async (categoryId: string, subcategoryName: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    if (category.subcategories.some(s => s.toLowerCase() === subcategoryName.toLowerCase())) {
      toast({ title: "Erro", description: "Essa subcategoria já existe.", variant: "destructive" });
      return;
    }
    const newSubcategories = [...category.subcategories, subcategoryName].sort();
    const categoryRef = doc(db, 'categories', categoryId);
    updateDoc(categoryRef, { subcategories: newSubcategories }).then(() => {
        logAction('Criação de Subcategoria', `Subcategoria "${subcategoryName}" foi adicionada à categoria "${category.name}".`, user);
        toast({ title: "Subcategoria Adicionada!" });
    }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: categoryRef.path,
            operation: 'update',
            requestResourceData: { subcategories: newSubcategories },
        }));
    });
  };

  const updateSubcategory = async (categoryId: string, oldSub: string, newSub: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    if (category.subcategories.some(s => s.toLowerCase() === newSub.toLowerCase() && s.toLowerCase() !== oldSub.toLowerCase())) {
        toast({ title: "Erro", description: "Essa subcategoria já existe.", variant: "destructive" });
        return;
    }
    
    const batch = writeBatch(db);
    const newSubs = category.subcategories.map(s => s.toLowerCase() === oldSub.toLowerCase() ? newSub : s).sort();
    batch.update(doc(db, 'categories', categoryId), { subcategories: newSubs });
    
    const productsSnapshot = await getDocs(collection(db, 'products'));
    productsSnapshot.forEach(productDoc => {
        const p = productDoc.data() as Product;
        if (p.category === category.name && p.subcategory?.toLowerCase() === oldSub.toLowerCase()) {
            batch.update(doc(db, 'products', productDoc.id), { subcategory: newSub });
        }
    });
    batch.commit().then(() => {
        logAction('Atualização de Subcategoria', `Subcategoria "${oldSub}" foi renomeada para "${newSub}" na categoria "${category.name}".`, user);
        toast({ title: "Subcategoria Renomeada!" });
    }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `categories/${categoryId}`,
            operation: 'update',
        }));
    });
  };

  const deleteSubcategory = async (categoryId: string, subcategoryName: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const productsInSubcategory = productsSnapshot.docs.some(d => {
        const p = d.data() as Product;
        return p.category === category.name && p.subcategory?.toLowerCase() === subcategoryName.toLowerCase();
    });

    if (productsInSubcategory) {
        toast({ title: "Erro", description: "Não é possível excluir subcategorias que contêm produtos.", variant: "destructive" });
        return;
    }
    const newSubcategories = category.subcategories.filter(s => s.toLowerCase() !== subcategoryName.toLowerCase());
    const categoryRef = doc(db, 'categories', categoryId);
    updateDoc(categoryRef, { subcategories: newSubcategories }).then(() => {
        logAction('Exclusão de Subcategoria', `Subcategoria "${subcategoryName}" foi excluída da categoria "${category.name}".`, user);
        toast({ title: "Subcategoria Excluída!", variant: "destructive" });
    }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: categoryRef.path,
            operation: 'update',
            requestResourceData: { subcategories: newSubcategories },
        }));
    });
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
    
    const batch = writeBatch(db);
    batch.update(doc(db, 'categories', category1.id), { order: order2 });
    batch.update(doc(db, 'categories', category2.id), { order: order1 });
    await batch.commit().then(() => {
        logAction('Reordenação de Categoria', `Categoria "${category1.name}" foi movida ${direction === 'up' ? 'para cima' : 'para baixo'}.`, user);
    }).catch(async(e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'categories',
            operation: 'update',
        }));
    });
  };

  const reorderSubcategories = async (categoryId: string, draggedSub: string, targetSub: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const subs = Array.from(category.subcategories);
    const draggedIndex = subs.indexOf(draggedSub);
    const targetIndex = subs.indexOf(targetSub);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = subs.splice(draggedIndex, 1);
    subs.splice(targetIndex, 0, removed);
    
    const categoryRef = doc(db, 'categories', categoryId);
    updateDoc(categoryRef, { subcategories: subs }).then(() => {
        logAction('Reordenação de Subcategoria', `Subcategorias da categoria "${category.name}" foram reordenadas.`, user);
    }).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: categoryRef.path,
            operation: 'update',
            requestResourceData: { subcategories: subs },
        }));
    });
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
    
    const batch = writeBatch(db);
    const productsSnapshot = await getDocs(collection(db, 'products'));
    productsSnapshot.forEach(productDoc => {
        const p = productDoc.data() as Product;
        if (p.category === sourceCategory.name && p.subcategory?.toLowerCase() === subName.toLowerCase()) {
            batch.update(doc(db, 'products', productDoc.id), { category: targetCategory.name });
        }
    });
    batch.update(doc(db, 'categories', sourceCategoryId), { subcategories: newSourceSubs });
    batch.update(doc(db, 'categories', targetCategoryId), { subcategories: newTargetSubs });
    
    batch.commit().then(() => {
        logAction('Movimentação de Subcategoria', `Subcategoria "${subName}" foi movida de "${sourceCategory.name}" para "${targetCategory.name}".`, user);
        toast({ title: 'Subcategoria Movida!', description: `"${subName}" agora faz parte de "${targetCategory.name}".`});
    }).catch(async(e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'categories',
            operation: 'update',
        }));
    });
  };

  const calculateCommission = (order: Order, allProducts: Product[]) => {
      if (!order.sellerId) return 0;

      if (order.isCommissionManual) {
        return order.commission || 0;
      }

      return order.items.reduce((totalCommission, item) => {
          const product = allProducts.find(p => p.id === item.id);
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

  const manageStockForOrder = async (order: Order | undefined, operation: 'add' | 'subtract', allProducts: Product[]): Promise<boolean> => {
    if (!order) return false;
    const batch = writeBatch(db);
    
    for (const orderItem of order.items) {
        const product = allProducts.find(p => p.id === orderItem.id);
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
    
    batch.commit().catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'products',
            operation: 'update',
        }));
        throw e; // Re-throw to indicate failure
    });

    return true; // Indicate success
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
    
    const orderRef = doc(db, 'orders', orderId);
    deleteDoc(orderRef).then(() => {
        logAction('Exclusão Permanente de Pedido', `Pedido #${orderId} foi excluído permanentemente.`, user);
    }).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: orderRef.path,
            operation: 'delete',
        }));
    });
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const oldStatus = orderToUpdate.status;
    const wasCanceledOrDeleted = oldStatus === 'Cancelado' || oldStatus === 'Excluído';
    const isNowCanceledOrDeleted = newStatus === 'Cancelado' || newStatus === 'Excluído';

    // Optimistic update for UI responsiveness
    if (wasCanceledOrDeleted && !isNowCanceledOrDeleted) {
        if (!await manageStockForOrder(orderToUpdate, 'subtract', products)) {
            return;
        }
    }
    
    const detailsToUpdate: Partial<Order> = { status: newStatus };

    if (newStatus === 'Entregue' && orderToUpdate.sellerId) {
      if (!orderToUpdate.isCommissionManual) {
        detailsToUpdate.commission = calculateCommission(orderToUpdate, products);
      }
    } else {
        if (!orderToUpdate.isCommissionManual) {
          detailsToUpdate.commission = 0;
        }
        detailsToUpdate.commissionPaid = false;
    }
    
    const orderRef = doc(db, 'orders', orderId);
    updateDoc(orderRef, detailsToUpdate).then(async () => {
        if (!wasCanceledOrDeleted && isNowCanceledOrDeleted) {
            await manageStockForOrder(orderToUpdate, 'add', products);
        }
        
        logAction('Atualização de Status de Pedido', `Status do pedido #${orderId} alterado de "${oldStatus}" para "${newStatus}".`, user);
        
        if (newStatus !== 'Excluído') {
          toast({ title: "Status do Pedido Atualizado!", description: `O pedido #${orderId} agora está como "${newStatus}".` });
        } else {
          logAction('Exclusão de Pedido', `Pedido #${orderId} movido para a lixeira.`, user);
          toast({ title: "Pedido movido para a Lixeira", description: `O pedido #${orderId} foi movido para a lixeira.` });
        }
    }).catch(async (e) => {
        // Revert optimistic stock update on failure
        if (wasCanceledOrDeleted && !isNowCanceledOrDeleted) {
            await manageStockForOrder(orderToUpdate, 'add', products);
        }
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: orderRef.path,
            operation: 'update',
        }));
    });
  };

  const recordInstallmentPayment = async (orderId: string, installmentNumber: number, payment: Payment) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const updatedInstallments = (order.installmentDetails || []).map((inst) => {
      if (inst.installmentNumber === installmentNumber) {
        const currentPaidAmount = Number(inst.paidAmount) || 0;
        const paymentAmount = Number(payment.amount) || 0;
        const newPaidAmount = currentPaidAmount + paymentAmount;
        // Check if paid amount is effectively equal to installment amount, handling floating point inaccuracies
        const isPaid = Math.abs(newPaidAmount - inst.amount) < 0.01;
        const newStatus = isPaid ? 'Pago' : 'Pendente';
        
        const existingPayments = (Array.isArray(inst.payments) ? inst.payments : []).filter(p => typeof p.amount === 'number' && p.amount > 0);

        return { 
          ...inst, 
          status: newStatus, 
          paidAmount: newPaidAmount, 
          payments: [...existingPayments, payment]
        };
      }
      return inst;
    });

    const orderRef = doc(db, 'orders', orderId);
    updateDoc(orderRef, { installmentDetails: updatedInstallments }).then(() => {
        logAction('Registro de Pagamento de Parcela', `Registrado pagamento de ${payment.amount} (${payment.method}) na parcela ${installmentNumber} do pedido #${orderId}.`, user);
        toast({ title: 'Pagamento Registrado!' });
    }).catch(async(e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: orderRef.path,
            operation: 'update',
            requestResourceData: { installmentDetails: updatedInstallments },
        }));
    });
  };

  const reversePayment = async (orderId: string, installmentNumber: number, paymentId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    let reversedPaymentAmount = 0;
    const updatedInstallments = (order.installmentDetails || []).map(inst => {
      if (inst.installmentNumber === installmentNumber) {
        const paymentToReverse = inst.payments.find(p => p.id === paymentId);
        if (!paymentToReverse) return inst;

        reversedPaymentAmount = paymentToReverse.amount;
        const newPayments = inst.payments.filter(p => p.id !== paymentId);
        const newPaidAmount = (inst.paidAmount || 0) - reversedPaymentAmount;
        const newStatus = newPaidAmount >= inst.amount ? 'Pago' : 'Pendente';
        
        return {
          ...inst,
          payments: newPayments,
          paidAmount: newPaidAmount,
          status: newStatus,
        };
      }
      return inst;
    });

    const orderRef = doc(db, 'orders', orderId);
    updateDoc(orderRef, { installmentDetails: updatedInstallments }).then(() => {
        logAction('Estorno de Pagamento', `Estornado pagamento de ${reversedPaymentAmount} da parcela ${installmentNumber} do pedido #${orderId}.`, user);
        toast({ title: 'Pagamento Estornado!', description: 'O valor foi retornado ao saldo devedor da parcela.' });
    }).catch(async(e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: orderRef.path,
            operation: 'update',
            requestResourceData: { installmentDetails: updatedInstallments },
        }));
    });
  };


  const updateInstallmentDueDate = async (orderId: string, installmentNumber: number, newDueDate: Date) => {
     const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const oldDueDate = order.installmentDetails?.find(i => i.installmentNumber === installmentNumber)?.dueDate;

    const updatedInstallments = (order.installmentDetails || []).map((inst) =>
      inst.installmentNumber === installmentNumber ? { ...inst, dueDate: newDueDate.toISOString() } : inst
    );
    const orderRef = doc(db, 'orders', orderId);
    updateDoc(orderRef, { installmentDetails: updatedInstallments }).then(() => {
        logAction('Atualização de Vencimento', `Vencimento da parcela ${installmentNumber} do pedido #${orderId} alterado de ${oldDueDate ? new Date(oldDueDate).toLocaleDateString() : 'N/A'} para ${newDueDate.toLocaleDateString()}.`, user);
        toast({ title: "Vencimento Atualizado!" });
    }).catch(async(e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: orderRef.path,
            operation: 'update',
            requestResourceData: { installmentDetails: updatedInstallments },
        }));
    });
  };

  const updateCustomer = async (updatedCustomer: CustomerInfo) => {
    const batch = writeBatch(db);
    orders.forEach(order => {
        if (order.customer.cpf === updatedCustomer.cpf) {
            const customerData = { ...order.customer, ...updatedCustomer };
            if (updatedCustomer.password === undefined || updatedCustomer.password === '') {
                delete customerData.password;
            }
            batch.update(doc(db, 'orders', order.id), { customer: customerData });
        }
    });
    batch.commit().then(() => {
        logAction('Atualização de Cliente', `Dados do cliente ${updatedCustomer.name} (CPF: ${updatedCustomer.cpf}) foram atualizados.`, user);
        toast({ title: "Cliente Atualizado!", description: `Os dados de ${updatedCustomer.name} foram salvos.` });
    }).catch(async(e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `orders`,
            operation: 'update',
        }));
    });
  };

  const updateOrderDetails = async (orderId: string, details: Partial<Order>) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    let detailsToUpdate: Partial<Order> = { ...details };

    if ('sellerId' in details && details.sellerId && details.sellerId !== order.sellerId) {
      const tempOrderForCommissionCalc = { ...order, ...detailsToUpdate };
      if (!tempOrderForCommissionCalc.isCommissionManual) {
        detailsToUpdate.commission = calculateCommission(tempOrderForCommissionCalc, products);
      }
    }

    // Remove undefined values before sending to Firestore
    Object.keys(detailsToUpdate).forEach(key => {
        const k = key as keyof typeof detailsToUpdate;
        if (detailsToUpdate[k] === undefined) {
            delete detailsToUpdate[k];
        }
    });
    
    const orderRef = doc(db, 'orders', orderId);
    updateDoc(orderRef, detailsToUpdate).then(() => {
      logAction('Atualização de Detalhes do Pedido', `Detalhes do pedido #${orderId} foram atualizados.`, user);
      toast({ title: "Pedido Atualizado!", description: `Os detalhes do pedido #${orderId} foram atualizados.` });
    }).catch(async (e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: orderRef.path,
          operation: 'update',
          requestResourceData: detailsToUpdate,
      }));
    });
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
    const batch = writeBatch(db);
    const paymentRef = doc(db, 'commissionPayments', paymentId);
    batch.set(paymentRef, payment);

    orderIds.forEach(orderId => {
        const orderRef = doc(db, 'orders', orderId);
        batch.update(orderRef, { commissionPaid: true });
    });

    try {
        await batch.commit();
        logAction('Pagamento de Comissão', `Comissão de ${sellerName} no valor de R$${amount.toFixed(2)} referente a ${period} foi paga.`, user);
        toast({ title: "Comissão Paga!", description: `O pagamento para ${sellerName} foi registrado.` });
        return paymentId;
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'commissionPayments',
            operation: 'create',
            requestResourceData: payment,
        }));
        return null;
    }
  };

  const reverseCommissionPayment = async (paymentId: string) => {
    const paymentToReverse = commissionPayments.find(p => p.id === paymentId);
    if (!paymentToReverse) {
      toast({ title: "Erro", description: "Pagamento não encontrado.", variant: "destructive" });
      return;
    }
    
    const batch = writeBatch(db);
    batch.delete(doc(db, 'commissionPayments', paymentId));

    paymentToReverse.orderIds.forEach(orderId => {
      batch.update(doc(db, 'orders', orderId), { commissionPaid: false });
    });

    batch.commit().then(() => {
        logAction('Estorno de Comissão', `O pagamento de comissão ID ${paymentId} foi estornado.`, user);
        toast({ title: "Pagamento Estornado!", description: "As comissões dos pedidos voltaram a ficar pendentes." });
    }).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `commissionPayments/${paymentId}`,
            operation: 'delete',
        }));
    });
  };

  const saveStockAudit = async (audit: StockAudit) => {
    const auditRef = doc(db, 'stockAudits', audit.id);
    setDoc(auditRef, audit).then(() => {
        logAction('Auditoria de Estoque', `Auditoria de estoque para ${audit.month}/${audit.year} foi salva.`, user);
        toast({ title: "Auditoria Salva!", description: "O relatório de auditoria foi salvo com sucesso." });
    }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: auditRef.path,
            operation: 'create',
            requestResourceData: audit,
        }));
    });
  };

  return (
    <AdminContext.Provider
      value={{
        orders, deleteOrder, permanentlyDeleteOrder, updateOrderStatus, recordInstallmentPayment, reversePayment, updateInstallmentDueDate, updateCustomer, updateOrderDetails,
        products, addProduct, updateProduct, deleteProduct,
        categories, addCategory, deleteCategory, updateCategoryName, addSubcategory, updateSubcategory, deleteSubcategory, moveCategory, reorderSubcategories, moveSubcategory,
        commissionPayments, payCommissions, reverseCommissionPayment,
        stockAudits,
        isLoading,
        restoreAdminData, resetOrders, resetAllAdminData,
        saveStockAudit,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
