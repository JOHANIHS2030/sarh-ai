import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRequests } from '@/contexts/RequestContext';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, CheckCircle, XCircle, Clock, PauseCircle } from 'lucide-react';
import { IDCardRequest } from '@/types';

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { requests } = useRequests();
  const { currentUser } = useAuth();

  // Confidentiality: same rule as AllRequestsPage / RequestDetailsPage.
  // Approved requests are visible only to ID-card team & admin.
  const visibleRequests = useMemo<IDCardRequest[]>(() => {
    if (!currentUser) return [];
    const sr = currentUser.systemRole;
    const isAdmin = currentUser.role === 'admin';
    const isIdCardTeam = sr === 'id_card_executor' || sr === 'security_chief';
    const isSafety = sr === 'safety_orientation' || sr === 'ehss_manager';
    const isDeptApprover = sr === 'dept_manager' || sr === 'hr_manager';
    const depts = currentUser.canApproveDepartments ?? [];

    return requests.filter(r => {
      if (r.createdBy === currentUser.id) return true;
      if (isAdmin || isIdCardTeam) return true;
      if (r.status === 'approved') return false;
      if (isSafety && r.status === 'pending_safety_approval') return true;
      if (isDeptApprover && r.status === 'pending_dept_approval' && depts.includes(r.departmentId)) return true;
      return false;
    });
  }, [requests, currentUser]);

  const stats = [
    { label: t('totalRequests'), value: visibleRequests.length, icon: FileText, color: 'bg-primary text-primary-foreground' },
    { label: t('pendingRequests'), value: visibleRequests.filter(r => r.status.startsWith('pending')).length, icon: Clock, color: 'bg-warning text-warning-foreground' },
    { label: t('approvedRequests'), value: visibleRequests.filter(r => r.status === 'approved').length, icon: CheckCircle, color: 'bg-success text-success-foreground' },
    { label: t('holdRequests'), value: visibleRequests.filter(r => r.status === 'on_hold').length, icon: PauseCircle, color: 'bg-info text-info-foreground' },
    { label: t('rejectedRequests'), value: visibleRequests.filter(r => r.status === 'rejected').length, icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
  ];

  const recentRequests = [...visibleRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('welcome')}، {language === 'ar' ? currentUser?.nameAr : currentUser?.nameEn}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('dashboard')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card rounded-xl shadow-card p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-lg ${s.color} flex items-center justify-center`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{language === 'ar' ? 'آخر الطلبات' : 'Recent Requests'}</h2>
        </div>
        {recentRequests.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">{t('noRequests')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('requestNumber')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('name')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('employeeType')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('department')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('status')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/request/${r.id}`}>
                    <td className="px-4 py-3 font-mono text-primary font-medium">{r.requestNumber}</td>
                    <td className="px-4 py-3">{language === 'ar' ? r.nameAr : r.nameEn}</td>
                    <td className="px-4 py-3">{t(r.employeeType === 'direct' ? 'directEmployee' : 'contractorEmployee')}</td>
                    <td className="px-4 py-3">{r.departmentId}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} t={t} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const styles: Record<string, string> = {
    pending_dept_approval: 'bg-warning/15 text-warning border-warning/30',
    pending_safety_approval: 'bg-info/15 text-info border-info/30',
    pending_id_review: 'bg-primary/15 text-primary border-primary/30',
    approved: 'bg-success/15 text-success border-success/30',
    on_hold: 'bg-warning/15 text-warning border-warning/30',
    rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || ''}`}>
      {t(status)}
    </span>
  );
}
