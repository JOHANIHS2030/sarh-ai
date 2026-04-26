import { useNavigate } from 'react-router-dom';
import { VehicleStickerRequest, StickerStatus, StickerType } from '@/types/vehicleSticker';
import { useLanguage } from '@/contexts/LanguageContext';
import { Department } from '@/types';
import { initialDepartments } from '@/data/departments';
import { readLocalJSON } from '@/lib/browserStorage';
import { useMemo } from 'react';
import { Eye, Car, User, Building } from 'lucide-react';

interface Props {
  stickers: VehicleStickerRequest[];
  emptyText?: string;
}

const statusStyles: Record<StickerStatus, string> = {
  pending_dept_approval: 'bg-warning/15 text-warning',
  pending_security_review: 'bg-blue-500/15 text-blue-600',
  approved: 'bg-success/15 text-success',
  on_hold: 'bg-muted text-muted-foreground',
  rejected: 'bg-destructive/15 text-destructive',
};

const typeIcons: Record<StickerType, typeof Car> = {
  employee: User,
  company_vehicle: Car,
  contractor_vehicle: Building,
};

export function statusLabel(s: StickerStatus, language: 'ar' | 'en'): string {
  const map: Record<StickerStatus, { ar: string; en: string }> = {
    pending_dept_approval: { ar: 'بانتظار موافقة الإدارة', en: 'Pending Dept. Approval' },
    pending_security_review: { ar: 'بانتظار الأمن الصناعي', en: 'Pending Security Review' },
    approved: { ar: 'مُعتمد - تم الإصدار', en: 'Approved - Issued' },
    on_hold: { ar: 'معلق', en: 'On Hold' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
  };
  return map[s][language];
}

export function stickerTypeLabel(t: StickerType, language: 'ar' | 'en'): string {
  const map: Record<StickerType, { ar: string; en: string }> = {
    employee: { ar: 'موظف الفارابي', en: 'Farabi Employee' },
    company_vehicle: { ar: 'سيارة الشركة', en: 'Company Vehicle' },
    contractor_vehicle: { ar: 'مركبة مقاول', en: 'Contractor Vehicle' },
  };
  return map[t][language];
}

export default function StickerTable({ stickers, emptyText }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const departments: Department[] = useMemo(
    () => readLocalJSON<Department[]>('farabi_departments', initialDepartments),
    []
  );
  const deptName = (id: string) => {
    const d = departments.find(x => x.id === id);
    if (!d) return id;
    return language === 'ar' ? d.nameAr : d.nameEn;
  };

  if (stickers.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Car className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-muted-foreground">{emptyText || t('لا توجد طلبات', 'No requests')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('رقم الطلب', 'Request No.')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('النوع', 'Type')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('السائق', 'Driver')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('اللوحة', 'Plate')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('الإدارة', 'Department')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('الحالة', 'Status')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('التاريخ', 'Date')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('إجراء', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {stickers.map(s => {
              const Icon = typeIcons[s.stickerType];
              return (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-3 font-mono text-xs font-bold text-primary">{s.requestNumber}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs">{stickerTypeLabel(s.stickerType, language)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">{s.driver.name}</td>
                  <td className="px-3 py-3 font-mono text-xs">{s.vehicle.plateNumber}</td>
                  <td className="px-3 py-3 text-xs">{deptName(s.departmentId)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${statusStyles[s.status]}`}>
                      {statusLabel(s.status, language)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => navigate(`/stickers/request/${s.id}`)}
                      className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs"
                    >
                      <Eye className="w-4 h-4" />
                      {t('عرض', 'View')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
