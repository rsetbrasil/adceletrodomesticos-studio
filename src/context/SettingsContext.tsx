

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';

export type StoreSettings = {
    storeName: string;
    storeCity: string;
    pixKey: string;
};

const initialSettings: StoreSettings = {
    storeName: 'ADC MOVEIS E ELETRO',
    storeCity: 'SAO PAULO',
    pixKey: 'fb43228c-4740-4c16-a217-21706a782496', // Example key
};

interface SettingsContextType {
    settings: StoreSettings;
    updateSettings: (newSettings: StoreSettings) => Promise<void>;
    isLoading: boolean;
    restoreSettings: (settings: StoreSettings) => Promise<void>;
    resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<StoreSettings>(initialSettings);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { logAction } = useAudit();
    const { user } = useAuth();


    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const settingsRef = doc(db, 'config', 'storeSettings');
                const docSnap = await getDoc(settingsRef);

                if (docSnap.exists()) {
                    setSettings(docSnap.data() as StoreSettings);
                } else {
                    // Seed the database if settings don't exist
                    await setDoc(settingsRef, initialSettings);
                    setSettings(initialSettings);
                }
            } catch (error) {
                console.error("Failed to load settings from Firestore:", error);
                setSettings(initialSettings);
                toast({ title: "Erro de Conexão", description: "Não foi possível carregar as configurações da loja.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [toast]);

    const updateSettings = async (newSettings: StoreSettings) => {
        try {
            const settingsRef = doc(db, 'config', 'storeSettings');
            await setDoc(settingsRef, newSettings);
            setSettings(newSettings);
            logAction('Atualização de Configurações', `Configurações da loja foram alteradas.`, user);
            toast({
                title: "Configurações Salvas!",
                description: "As informações da loja foram atualizadas com sucesso.",
            });
        } catch (error) {
            console.error("Error updating settings in Firestore:", error);
            toast({ title: "Erro", description: "Não foi possível salvar as configurações.", variant: "destructive" });
        }
    };
    
    const restoreSettings = async (settingsToRestore: StoreSettings) => {
        await updateSettings(settingsToRestore);
        logAction('Restauração de Configurações', `Configurações da loja foram restauradas de um backup.`, user);
    };

    const resetSettings = async () => {
        await updateSettings(initialSettings);
        logAction('Reset de Configurações', `Configurações da loja foram restauradas para o padrão.`, user);
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isLoading, restoreSettings, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
