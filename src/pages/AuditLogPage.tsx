import { useLanguage } from '@/contexts/LanguageContext';
import { useRequests } from '@/contexts/RequestContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Search, Activity } from 'lucide-react';
import { useState } from 'react';

export default function AuditLogPage() {
  const { t, language } = useLanguage();
  const { auditLog } = useRequests();
  const { getUserById } = useAuth();
  const [search, setSearch] = useState('');

  const actionLabels: Record<string, { ar: string; en: string }> = {
    create_request: { ar: 'إنشاء طلب', en: 'Create Request' },
    approve_request: { ar: 'موافقة على طلب', en: 'Approve Request' },
    reject_request: { ar: 'رفض طلب', en: 'Reject Request' },
    hold_request: { ar: 'تعليق طلب', en: 'Hold Request' },
    delete_request: { ar: 'حذف طلب', en: 'Delete Request' },
    login: { ar: 'تسجيل دخول', en: 'Login' },
    logout: { ar: 'تسجيل خروج', en: 'Logout' },
  };

  const filtered = auditLog.filter(entry => {
    if (!search) return true;
    const s = search.toLowerCase();
    const user = getUserById(entry.userId);
    return entry.details.toLowerCase().includes(s) ||
      entry.action.toLowerCase().includes(s) ||
      user?.nameEn.toLowerCase().includes(s) ||
      user?.nameAr.includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'ar' ? 'سجل العمليات' : 'Audit Log'}
        </h1>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ [language === 'ar' ? 'right' : 'left']: '0.75rem' }} />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder')} className="h-10 ps-10" />
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {language === 'ar' ? 'لا توجد عمليات مسجلة' : 'No audit entries'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{language === 'ar' ? 'العملية' : 'Action'}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{language === 'ar' ? 'التفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const user = getUserById(entry.userId);
                  const label = actionLabels[entry.action];
                  return (
                    <tr key={entry.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(entry.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {user ? (language === 'ar' ? user.nameAr : user.nameEn) : entry.userId}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          entry.action.includes('approve') ? 'bg-success/15 text-success' :
                          entry.action.includes('reject') ? 'bg-destructive/15 text-destructive' :
                          entry.action.includes('hold') ? 'bg-warning/15 text-warning' :
                          entry.action.includes('delete') ? 'bg-destructive/15 text-destructive' :
                          'bg-primary/15 text-primary'
                        }`}>
                          {label ? (language === 'ar' ? label.ar : label.en) : entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{entry.details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
