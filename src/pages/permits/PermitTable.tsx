import { useNavigate } from 'react-router-dom';
import { PermitRequest } from '@/types/permit';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, Smartphone, Laptop, Camera } from 'lucide-react';
import { permitStatusLabel, permitTypeLabel } from '@/lib/permitAuthority';

const typeIcons = {
  mobile_phone: Smartphone,
  laptop: Laptop,
  photography: Camera,
};

const statusStyles: Record<string, string> = {
  pending_dept_manager: 'bg-warning/15 text-warning',
  pending_it_review: 'bg-blue-500/15 text-blue-600',
  pending_security_chief: 'bg-purple-500/15 text-purple-600',
  pending_ehss_manager: 'bg-amber-500/15 text-amber-600',
  approved: 'bg-success/15 text-success',
  on_hold: 'bg-muted text-muted-foreground',
  rejected: 'bg-destructive/15 text-destructive',
};

export default function PermitTable({ permits, emptyText }: { permits: PermitRequest[]; emptyText?: string }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  if (permits.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Smartphone className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-muted-foreground">{emptyText || t('لا توجد تصاريح', 'No permits')}</p>
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
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('نوع التصريح', 'Permit Type')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('مقدم الطلب', 'Applicant')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('الرقم الوظيفي', 'Employee ID')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('الحالة', 'Status')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('التاريخ', 'Date')}</th>
              <th className="px-3 py-3 text-start font-medium text-muted-foreground">{t('إجراء', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {permits.map(p => {
              const Icon = typeIcons[p.permitType];
              return (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-3 font-mono text-xs font-bold text-primary">{p.requestNumber}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs">{permitTypeLabel(p.permitType, language)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">{p.applicant.name}</td>
                  <td className="px-3 py-3 font-mono text-xs">{p.applicant.employeeId}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${statusStyles[p.status] || ''}`}>
                      {permitStatusLabel(p.status, language)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => navigate(`/permits/request/${p.id}`)}
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
