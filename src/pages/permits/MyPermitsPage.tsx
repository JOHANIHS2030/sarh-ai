import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermits } from '@/contexts/PermitsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import PermitTable from './PermitTable';

export default function MyPermitsPage() {
  const { currentUser } = useAuth();
  const { permits } = usePermits();
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const mine = useMemo(
    () => permits.filter(p => p.createdBy === currentUser?.id).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [permits, currentUser]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('تصاريحي', 'My Permits')}</h1>
        <p className="text-sm text-muted-foreground">{mine.length} {t('طلب', 'request(s)')}</p>
      </div>
      <PermitTable permits={mine} emptyText={t('لم تقم بتقديم أي تصريح بعد', 'You have no permit requests yet')} />
    </div>
  );
}
