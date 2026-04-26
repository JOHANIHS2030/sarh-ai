import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import StickerTable, { statusLabel } from './StickerTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StickerStatus, VehicleStickerRequest } from '@/types/vehicleSticker';
import { canApproveSticker } from './StickerPendingApprovalsPage';
import { Shield, Search } from 'lucide-react';

function canSeeSticker(s: VehicleStickerRequest, user: ReturnType<typeof useAuth>['currentUser']): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (s.createdBy === user.id) return true;
  // approved → only id card team / security chief / admin
  if (s.status === 'approved') {
    return user.systemRole === 'id_card_executor' || user.systemRole === 'security_chief';
  }
  return canApproveSticker(s, user);
}

export default function AllStickersPage() {
  const { currentUser } = useAuth();
  const { stickers } = useVehicleStickers();
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isAuthorized = currentUser?.role === 'admin' ||
    currentUser?.systemRole === 'id_card_executor' ||
    currentUser?.systemRole === 'security_chief';

  const visible = useMemo(() => stickers.filter(s => canSeeSticker(s, currentUser)), [stickers, currentUser]);

  const filtered = useMemo(() => {
    let list = visible;
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.requestNumber.toLowerCase().includes(q) ||
        s.driver.name.toLowerCase().includes(q) ||
        s.vehicle.plateNumber.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [visible, search, statusFilter]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-card p-8 rounded-2xl border border-border max-w-md">
          <Shield className="w-12 h-12 mx-auto text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">{t('غير مصرح', 'Not Authorized')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('هذه الصفحة متاحة لمدير النظام وقسم بطاقات الهوية فقط', 'This page is restricted to admins and the ID Card team')}
          </p>
        </div>
      </div>
    );
  }

  const statuses: StickerStatus[] = ['pending_dept_approval', 'pending_security_review', 'approved', 'on_hold', 'rejected'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('جميع طلبات الملصقات', 'All Sticker Requests')}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {t('من', 'of')} {visible.length}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('بحث...', 'Search...')} className="ps-9 w-60" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('كل الحالات', 'All statuses')}</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{statusLabel(s, language)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <StickerTable stickers={filtered} />
    </div>
  );
}
