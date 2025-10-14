
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { RolePermissions } from '@/lib/types';
import { initialPermissions } from '@/lib/permissions';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAudit } from './AuditContext';

interface PermissionsContextType {
    permissions: RolePermissions | null;
    updatePermissions: (newPermissions: RolePermissions) => Promise<void>;
    isLoading: boolean;
    resetPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
    const [permissions, setPermissions] = useState<RolePermissions | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { logAction } = useAudit();
    
    useEffect(() => {
        const fetchPermissions = async () => {
            setIsLoading(true);
            try {
                const permissionsRef = doc(db, 'config', 'rolePermissions');
                const docSnap = await getDoc(permissionsRef);

                if (docSnap.exists()) {
                    setPermissions(docSnap.data() as RolePermissions);
                } else {
                    await setDoc(permissionsRef, initialPermissions);
                    setPermissions(initialPermissions);
                }
            } catch (error) {
                console.error("Failed to load permissions from Firestore:", error);
                setPermissions(initialPermissions); // Fallback to initial hardcoded permissions
                toast({ title: "Erro de Conexão", description: "Não foi possível carregar as permissões de acesso.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPermissions();
    }, [toast]);

    const updatePermissions = useCallback(async (newPermissions: RolePermissions) => {
        try {
            const permissionsRef = doc(db, 'config', 'rolePermissions');
            await setDoc(permissionsRef, newPermissions);
            setPermissions(newPermissions);
            logAction('Atualização de Permissões', 'As permissões de acesso dos perfis foram alteradas.');
            toast({
                title: "Permissões Salvas!",
                description: "As regras de acesso foram atualizadas com sucesso.",
            });
        } catch (error) {
            console.error("Error updating permissions in Firestore:", error);
            toast({ title: "Erro", description: "Não foi possível salvar as permissões.", variant: "destructive" });
        }
    }, [toast, logAction]);

    const resetPermissions = useCallback(async () => {
        await updatePermissions(initialPermissions);
    }, [updatePermissions]);

    return (
        <PermissionsContext.Provider value={{ permissions, updatePermissions, isLoading, resetPermissions }}>
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
};
