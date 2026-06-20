import React, { createContext, useContext, useState, useCallback } from 'react';
import { readLocalJSON, writeLocalJSON } from '@/lib/browserStorage';

export interface CompanySettings {
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  email: string;
  website: string;
  logo?: string; // base64
  loginBackground?: string; // base64
}

const defaultSettings: CompanySettings = {
  nameAr: 'صرح الذكي',
  nameEn: 'Sarh AI',
  addressAr: 'المملكة العربية السعودية',
  addressEn: 'Saudi Arabia',
  phone: '+966 11 000 0000',
  email: 'info@sarh-ai.demo',
  website: 'www.sarh-ai.demo',
};

interface CompanyContextType {
  settings: CompanySettings;
  updateSettings: (s: Partial<CompanySettings>) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);
const COMPANY_SETTINGS_STORAGE_KEY = 'farabi_company_settings';

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(() => ({
    ...defaultSettings,
    ...readLocalJSON<Partial<CompanySettings>>(COMPANY_SETTINGS_STORAGE_KEY, {}),
  }));

  const updateSettings = useCallback((s: Partial<CompanySettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...s };
      writeLocalJSON(COMPANY_SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <CompanyContext.Provider value={{ settings, updateSettings }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
}
