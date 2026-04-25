import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { StatusBadge } from './DashboardPage';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ShieldAlert } from 'lucide-react';
import { IDCardRequest } from '@/types';

export default function AllRequestsPage() {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const { requests } = useRequests();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Derived role flags
  const isAdmin = currentUser?.role === 'admin';
  const isIdCardTeam =
    currentUser?.systemRole === 'id_card_executor' ||
    currentUser?.systemRole === 'security_chief';
  const isSafety =
    currentUser?.systemRole === 'safety_orientation' ||
    currentUser?.systemRole === 'ehss_manager';
  const isDeptApprover =
    currentUser?.systemRole === 'dept_manager' ||
    currentUser?.systemRole === 'hr_manager';

  // Page-level guard: only admin or ID-card team can open this page at all.
  const canViewPage = isAdmin || isIdCardTeam;

  // Per-record visibility: a user may see a request only if at least one is true:
  //  - they created it
  //  - they are part of the ID card / security team or admin (full visibility)
  //  - they are a current-stage approver (dept manager / safety) AND it is NOT yet approved
  // Approved requests are confidential and only visible to ID-card team & admin.
  const canSeeRequest = (r: IDCardRequest): boolean => {
    if (!currentUser) return false;
    if (r.createdBy === currentUser.id) return true;
    if (isAdmin || isIdCardTeam) return true;

    // Approved / final-stage requests are confidential to non ID-card staff.
    if (r.status === 'approved') return false;

    if (isSafety && r.status === 'pending_safety_approval') return true;

    if (isDeptApprover && r.status === 'pending_dept_approval') {
      const depts = currentUser.canApproveDepartments ?? [];
      if (depts.includes(r.departmentId)) return true;
    }

    return false;
  };

  const filtered = useMemo(() => {
    return requests
      .filter(canSeeRequest)
      .filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          return (
            r.requestNumber.toLowerCase().includes(s) ||
            r.nameAr.includes(s) ||
            r.nameEn.toLowerCase().includes(s) ||
            r.nationalIdNo.includes(s)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, currentUser, search, statusFilter]);

  if (!canViewPage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'ar' ? 'غير مصرح' : 'Not authorized'}
        </h1>
        <p className="text-muted-foreground max-w-md">
          {language === 'ar'
            ? 'هذه الصفحة مخصصة لقسم بطاقات الهوية ومسؤول النظام فقط. الطلبات الموافق عليها سرية ولا تُعرض لباقي المستخدمين.'
            : 'This page is restricted to the ID Card team and system admin. Approved requests are confidential.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{t('allRequests')}</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ [language === 'ar' ? 'right' : 'left']: '0.75rem' }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder')} className="h-10 ps-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {['pending_dept_approval', 'pending_safety_approval', 'pending_id_review', 'approved', 'on_hold', 'rejected'].map(s => (
              <SelectItem key={s} value={s}>{t(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">{t('noRequests')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('requestNumber')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('name')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('employeeType')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('status')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('createdAt')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-primary font-medium">{r.requestNumber}</td>
                    <td className="px-4 py-3">{language === 'ar' ? r.nameAr : r.nameEn}</td>
                    <td className="px-4 py-3">{t(r.employeeType === 'direct' ? 'directEmployee' : 'contractorEmployee')}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} t={t} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/request/${r.id}`)} className="text-primary hover:underline text-sm font-medium">{t('view')}</button>
                    </td>
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
