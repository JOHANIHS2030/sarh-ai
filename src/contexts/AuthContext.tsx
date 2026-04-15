import React, { createContext, useContext, useState, useCallback } from 'react';
import { User } from '@/types';
import { initialUsers } from '@/data/users';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('farabi_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('farabi_users', JSON.stringify(newUsers));
  };

  const login = useCallback((username: string, password: string): boolean => {
    const user = users.find(u => u.username.toUpperCase() === username.toUpperCase() && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => setCurrentUser(null), []);

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
