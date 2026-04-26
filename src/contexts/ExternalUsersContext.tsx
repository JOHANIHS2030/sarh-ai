import React, { createContext, useCallback, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ExternalUser } from '@/types/externalUser';
import { readLocalJSON, writeLocalJSON } from '@/lib/browserStorage';

const STORAGE_KEY = 'farabi_external_users';
const SESSION_KEY = 'farabi_external_session';

interface ExternalUsersContextType {
  externalUsers: ExternalUser[];
  currentExternalUser: ExternalUser | null;
  addExternalUser: (data: Omit<ExternalUser, 'id' | 'createdAt'>) => void;
  updateExternalUser: (user: ExternalUser) => void;
  deleteExternalUser: (id: string) => void;
  externalLogin: (username: string, password: string) => boolean;
  externalLogout: () => void;
}

const ExternalUsersContext = createContext<ExternalUsersContextType | undefined>(undefined);

export function ExternalUsersProvider({ children }: { children: React.ReactNode }) {
  const [externalUsers, setExternalUsers] = useState<ExternalUser[]>(() =>
    readLocalJSON<ExternalUser[]>(STORAGE_KEY, [])
  );
  const [currentExternalUser, setCurrentExternalUser] = useState<ExternalUser | null>(() => {
    const id = readLocalJSON<string | null>(SESSION_KEY, null);
    if (!id) return null;
    const list = readLocalJSON<ExternalUser[]>(STORAGE_KEY, []);
    return list.find(u => u.id === id) ?? null;
  });

  const persist = (list: ExternalUser[]) => {
    setExternalUsers(list);
    writeLocalJSON(STORAGE_KEY, list);
  };

  const addExternalUser = useCallback((data: Omit<ExternalUser, 'id' | 'createdAt'>) => {
    const newUser: ExternalUser = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
    persist([...externalUsers, newUser]);
  }, [externalUsers]);

  const updateExternalUser = useCallback((user: ExternalUser) => {
    persist(externalUsers.map(u => (u.id === user.id ? user : u)));
  }, [externalUsers]);

  const deleteExternalUser = useCallback((id: string) => {
    persist(externalUsers.filter(u => u.id !== id));
  }, [externalUsers]);

  const externalLogin = useCallback((username: string, password: string): boolean => {
    const user = externalUsers.find(
      u => u.username.toUpperCase() === username.toUpperCase() && u.password === password && u.active
    );
    if (user) {
      setCurrentExternalUser(user);
      writeLocalJSON(SESSION_KEY, user.id);
      return true;
    }
    return false;
  }, [externalUsers]);

  const externalLogout = useCallback(() => {
    setCurrentExternalUser(null);
    writeLocalJSON(SESSION_KEY, null);
  }, []);

  return (
    <ExternalUsersContext.Provider
      value={{
        externalUsers,
        currentExternalUser,
        addExternalUser,
        updateExternalUser,
        deleteExternalUser,
        externalLogin,
        externalLogout,
      }}
    >
      {children}
    </ExternalUsersContext.Provider>
  );
}

export function useExternalUsers() {
  const ctx = useContext(ExternalUsersContext);
  if (!ctx) throw new Error('useExternalUsers must be used within ExternalUsersProvider');
  return ctx;
}
