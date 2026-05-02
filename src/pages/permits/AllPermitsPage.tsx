import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermits } from '@/contexts/PermitsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search } from 'lucide-react';
import { canViewPermit, permitStatusLabel } from '@/lib/permitAuthority';
import { PermitStatus } from '@/types/permit';
import PermitTable from './PermitTable';

export default function AllPermitsPage() {
  const { currentUser } = useAuth();
  const { permits } = usePermits();
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // visible to admin or anyone holding any permit signing authority
  const isAuthorized = currentUser?.role === 'admin' || (currentUser?.permitAuthorities?.length || 0) > 0;

  const visible = useMemo(
    () => permits.filter(p => canViewPermit(p, currentUser)),
    [permits, currentUser]
  );

  const filtered = useMemo(() => {
    let list = visible;
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter(p => p.permitType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.requestNumber.toLowerCase().includes(q) ||
          p.applicant.name.toLowerCase().includes(q) ||
          p.applicant.employeeId.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [visible, search, statusFilter, typeFilter]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-card p-8 rounded-2xl border border-border max-w-md">
          <Shield className="w-12 h-12 mx-auto text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">{t('غير مصرح', 'Not Authorized')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('هذه الصفحة متاحة للموقعين على التصاريح والمدير فقط', 'Restricted to permit signers and admins')}
          </p>
        </div>
      </div>
    );
  }

  const statuses: PermitStatus[] = [
    'pending_dept_manager', 'pending_it_review', 'pending_security_chief', 'pending_ehss_manager',
    'approved', 'on_hold', 'rejected',
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('جميع التصاريح', 'All Permits')}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {t('من', 'of')} {visible.length}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('بحث...', 'Search...')} className="ps-9 w-60" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('كل الأنواع', 'All types')}</SelectItem>
              <SelectItem value="mobile_phone">{t('الجوال', 'Mobile Phone')}</SelectItem>
              <SelectItem value="laptop">{t('الكمبيوتر المحمول', 'Laptop')}</SelectItem>
              <SelectItem value="photography">{t('التصوير', 'Photography')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('كل الحالات', 'All statuses')}</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{permitStatusLabel(s, language)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <PermitTable permits={filtered} />
    </div>
  );
}
