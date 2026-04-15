import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { initialDepartments } from '@/data/departments';
import { StatusBadge } from './DashboardPage';
import { useNavigate } from 'react-router-dom';
import { IDCardRequest, RequestStatus } from '@/types';

export default function PendingApprovalsPage() {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const { requests } = useRequests();
  const navigate = useNavigate();

  const pendingReqs = useMemo(() => {
    if (!currentUser) return [];
    const { systemRole, id, canApproveDepartments } = currentUser;

    return requests.filter(r => {
      // Department manager approval stage
      if (r.status === 'pending_dept_approval') {
        if (systemRole === 'hr_manager') {
          // HR manager approves all direct employees
          if (r.employeeType === 'direct') return true;
          // And contractors under HR department
          if (canApproveDepartments?.includes(r.departmentId)) return true;
        }
        if (systemRole === 'dept_manager' || systemRole === 'ehss_manager' || systemRole === 'security_chief') {
          // Contractor approval by dept manager
          if (r.employeeType === 'contractor' && canApproveDepartments?.includes(r.departmentId)) return true;
        }
        return false;
      }

      // Safety approval stage
      if (r.status === 'pending_safety_approval') {
        return systemRole === 'safety_orientation' || systemRole === 'ehss_manager';
      }

      // ID card review stage
      if (r.status === 'pending_id_review') {
        return systemRole === 'id_card_executor' || systemRole === 'security_chief' || currentUser.role === 'admin';
      }

      return false;
    });
  }, [requests, currentUser]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{t('pendingApprovals')}</h1>
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {pendingReqs.length === 0 ? (
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
                {pendingReqs.map(r => (
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
