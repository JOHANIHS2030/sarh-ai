import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import StickerTable from './StickerTable';
import { VehicleStickerRequest } from '@/types/vehicleSticker';

/**
 * Routing rules (2 stages):
 * Stage 1 (pending_dept_approval):
 *  - employee → HR Manager
 *  - company_vehicle → Department Manager of selected dept
 *  - contractor_vehicle → Department Manager of selected dept
 * Stage 2 (pending_security_review):
 *  - id_card_executor / security_chief
 */
export function canApproveSticker(s: VehicleStickerRequest, user: ReturnType<typeof useAuth>['currentUser']): boolean {
  if (!user) return false;
  const { systemRole, canApproveDepartments, role } = user;
  if (s.status === 'pending_dept_approval') {
    if (s.stickerType === 'employee') {
      return systemRole === 'hr_manager' || role === 'admin';
    }
    // company / contractor vehicle → dept manager (or HR manager fallback) of the selected department
    if (
      (systemRole === 'dept_manager' || systemRole === 'hr_manager' || systemRole === 'ehss_manager' || systemRole === 'security_chief') &&
      canApproveDepartments?.includes(s.departmentId)
    ) return true;
    return role === 'admin';
  }
  if (s.status === 'pending_security_review') {
    return systemRole === 'id_card_executor' || systemRole === 'security_chief' || role === 'admin';
  }
  return false;
}

export default function StickerPendingApprovalsPage() {
  const { currentUser } = useAuth();
  const { stickers } = useVehicleStickers();
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const pending = useMemo(
    () =>
      stickers
        .filter(s => canApproveSticker(s, currentUser))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [stickers, currentUser]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('الموافقات المعلقة - الملصقات', 'Pending Sticker Approvals')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} {t('طلب بانتظار إجراء منك', 'request(s) awaiting your action')}
        </p>
      </div>
      <StickerTable stickers={pending} emptyText={t('لا توجد طلبات بانتظار موافقتك', 'No requests awaiting your approval')} />
    </div>
  );
}
