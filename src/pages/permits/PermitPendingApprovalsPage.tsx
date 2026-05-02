import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermits } from '@/contexts/PermitsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { canActOnPermit } from '@/lib/permitAuthority';
import PermitTable from './PermitTable';

export default function PermitPendingApprovalsPage() {
  const { currentUser } = useAuth();
  const { permits } = usePermits();
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const pending = useMemo(
    () => permits
      .filter(p => canActOnPermit(p, currentUser))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [permits, currentUser]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('الموافقات المعلقة - التصاريح', 'Pending Permit Approvals')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} {t('طلب بانتظار إجراء منك', 'request(s) awaiting your action')}
        </p>
      </div>
      <PermitTable permits={pending} emptyText={t('لا توجد تصاريح بانتظار موافقتك', 'No permits awaiting your approval')} />
    </div>
  );
}
