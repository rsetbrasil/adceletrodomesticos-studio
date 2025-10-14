
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { AuditLog, User, UserRole } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';

interface AuditContextType {
  auditLogs: AuditLog[];
  logAction: (action: string, details: string, user: User | null) => void;
  fetchLogs: () => void;
  isLoading: boolean;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider = ({ children }: { children: ReactNode }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
      setIsLoading(true);
      try {
        const logsCollection = collection(db, 'auditLogs');
        const q = query(logsCollection, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedLogs = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id })) as AuditLog[];
        setAuditLogs(fetchedLogs);
      } catch (error) {
        console.error("Error fetching audit logs from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
  }, []);
  
  useEffect(() => {
    // Initial fetch
    fetchLogs();
  }, [fetchLogs]);


  const logAction = useCallback(async (action: string, details: string, user: User | null) => {
    if (!user) return;

    const logId = `log-${Date.now()}`;
    const newLog: AuditLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      details
    };

    try {
      await setDoc(doc(db, 'auditLogs', logId), newLog);
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (error) {
      console.error("Error writing audit log to Firestore:", error);
    }
  }, []);

  return (
    <AuditContext.Provider value={{ auditLogs, logAction, fetchLogs, isLoading }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
