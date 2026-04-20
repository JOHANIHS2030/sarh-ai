import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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
  nameAr: 'شركة الفارابي ينبع للبتروكيماويات',
  nameEn: 'Farabi Yanbu Petrochemicals',
  addressAr: 'ينبع الصناعية، المملكة العربية السعودية',
  addressEn: 'Yanbu Industrial City, Saudi Arabia',
  phone: '+966 14 000 0000',
  email: 'info@farabi.com',
  website: 'www.farabi.com',
};

interface CompanyContextType {
  settings: CompanySettings;
  updateSettings: (s: Partial<CompanySettings>) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('farabi_company_settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const updateSettings = useCallback((s: Partial<CompanySettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...s };
      localStorage.setItem('farabi_company_settings', JSON.stringify(next));
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
