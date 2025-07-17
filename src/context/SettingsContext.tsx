'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

const saveDataToLocalStorage = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Failed to save ${key} to localStorage`, error);
    }
};

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
    updateSettings: (newSettings: StoreSettings) => void;
    isLoading: boolean;
    restoreSettings: (settings: StoreSettings) => void;
    resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<StoreSettings>(initialSettings);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsLoading(false);
            return;
        }
        try {
            const storedSettings = localStorage.getItem('settings');
            if (storedSettings) {
                setSettings(JSON.parse(storedSettings));
            } else {
                saveDataToLocalStorage('settings', initialSettings);
            }
        } catch (error) {
            console.error("Failed to load settings from localStorage", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoading) return;
        saveDataToLocalStorage('settings', settings);
    }, [settings, isLoading]);
    
    useEffect(() => {
      if (typeof window === 'undefined') return;
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'settings') {
            try {
                if (event.newValue) {
                    setSettings(JSON.parse(event.newValue));
                } else {
                    setSettings(initialSettings);
                }
            } catch (error) {
                console.error("Failed to parse settings from localStorage on change", error);
            }
        }
      };
  
      window.addEventListener('storage', handleStorageChange);
  
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }, []);

    const updateSettings = (newSettings: StoreSettings) => {
        setSettings(newSettings);
        toast({
            title: "Configurações Salvas!",
            description: "As informações da loja foram atualizadas com sucesso.",
        });
    };
    
    const restoreSettings = (settingsToRestore: StoreSettings) => {
        setSettings(settingsToRestore);
    };

    const resetSettings = () => {
        setSettings(initialSettings);
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
