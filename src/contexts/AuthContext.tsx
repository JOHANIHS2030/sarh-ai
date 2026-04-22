import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '@/types';
import { initialUsers } from '@/data/users';
import { readLocalJSON, readLocalString, removeLocalValue, writeLocalJSON, writeLocalString } from '@/lib/browserStorage';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  getUserById: (id: string) => User | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USERS_STORAGE_KEY = 'farabi_users';
const CURRENT_USER_STORAGE_KEY = 'farabi_current_user_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => readLocalJSON<User[]>(USERS_STORAGE_KEY, initialUsers));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUserId = readLocalString(CURRENT_USER_STORAGE_KEY);
    if (!savedUserId) return null;
    const initialList = readLocalJSON<User[]>(USERS_STORAGE_KEY, initialUsers);
    return initialList.find(user => user.id === savedUserId) ?? null;
  });

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    writeLocalJSON(USERS_STORAGE_KEY, newUsers);
  };

  useEffect(() => {
    if (!currentUser) {
      removeLocalValue(CURRENT_USER_STORAGE_KEY);
      return;
    }

    const refreshedCurrentUser = users.find(user => user.id === currentUser.id) ?? null;
    if (!refreshedCurrentUser) {
      setCurrentUser(null);
      removeLocalValue(CURRENT_USER_STORAGE_KEY);
      return;
    }

    if (refreshedCurrentUser !== currentUser) {
      setCurrentUser(refreshedCurrentUser);
    }

    writeLocalString(CURRENT_USER_STORAGE_KEY, refreshedCurrentUser.id);
  }, [users, currentUser]);

  const login = useCallback((username: string, password: string): boolean => {
    const user = users.find(u => u.username.toUpperCase() === username.toUpperCase() && u.password === password);
    if (user) {
      setCurrentUser(user);
      writeLocalString(CURRENT_USER_STORAGE_KEY, user.id);
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    removeLocalValue(CURRENT_USER_STORAGE_KEY);
  }, []);

  const addUser = useCallback((user: User) => {
    const newUsers = [...users, user];
    saveUsers(newUsers);
  }, [users]);

  const updateUser = useCallback((user: User) => {
    const newUsers = users.map(u => u.id === user.id ? user : u);
    saveUsers(newUsers);
  }, [users]);

  const deleteUser = useCallback((id: string) => {
    const newUsers = users.filter(u => u.id !== id);
    saveUsers(newUsers);
  }, [users]);

  const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, addUser, updateUser, deleteUser, getUserById }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
