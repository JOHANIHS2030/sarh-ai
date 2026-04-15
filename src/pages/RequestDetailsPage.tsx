import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { initialDepartments } from '@/data/departments';
import { StatusBadge } from './DashboardPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft, Printer, CheckCircle, XCircle, PauseCircle } from 'lucide-react';
import Barcode from 'react-barcode';
import { RequestStatus } from '@/types';

export default function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { currentUser, getUserById } = useAuth();
  const { getRequestById, updateRequestStatus } = useRequests();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState<'hold' | 'reject' | null>(null);

  const request = getRequestById(id || '');
  const departments = useMemo(() => {
    const saved = localStorage.getItem('farabi_departments');
    return saved ? JSON.parse(saved) : initialDepartments;
  }, []);

  if (!request) {
    return <div className="text-center py-12 text-muted-foreground">{t('noRequests')}</div>;
  }

  const dept = departments.find((d: any) => d.id === request.departmentId);
  const creator = getUserById(request.createdBy);

  const canApprove = (() => {
    if (!currentUser) return false;
    const { systemRole, canApproveDepartments } = currentUser;
    if (request.status === 'pending_dept_approval') {
      if (systemRole === 'hr_manager' && request.employeeType === 'direct') return true;
      if ((systemRole === 'dept_manager' || systemRole === 'hr_manager' || systemRole === 'ehss_manager' || systemRole === 'security_chief') 
          && request.employeeType === 'contractor' && canApproveDepartments?.includes(request.departmentId)) return true;
    }
    if (request.status === 'pending_safety_approval') {
      return systemRole === 'safety_orientation' || systemRole === 'ehss_manager';
    }
    if (request.status === 'pending_id_review') {
      return systemRole === 'id_card_executor' || systemRole === 'security_chief' || currentUser.role === 'admin';
    }
    return false;
  })();

  const getNextStatus = (): RequestStatus => {
    if (request.status === 'pending_dept_approval') return 'pending_safety_approval';
    if (request.status === 'pending_safety_approval') return 'pending_id_review';
    return 'approved';
  };

  const handleApprove = () => {
    updateRequestStatus(request.id, getNextStatus(), currentUser!.id);
    toast({ title: t('requestApproved') });
    navigate('/pending-approvals');
  };

  const handleAction = (action: 'hold' | 'reject') => {
    if (!reason.trim()) {
      toast({ title: t('enterReason'), variant: 'destructive' });
      return;
    }
    const status: RequestStatus = action === 'hold' ? 'on_hold' : 'rejected';
    updateRequestStatus(request.id, status, currentUser!.id, reason);
    toast({ title: action === 'hold' ? t('requestOnHold') : t('requestRejected') });
    setShowReasonInput(null);
    setReason('');
    navigate('/pending-approvals');
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head><title>${request.requestNumber}</title>
      <style>body{font-family:'IBM Plex Sans Arabic',sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;} td,th{border:1px solid #ccc;padding:8px;text-align:start;} h1,h2{color:#1a365d;}</style>
      </head><body>${content.innerHTML}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><BackIcon className="w-5 h-5" /></Button>
        <h1 className="text-2xl font-bold text-foreground">{t('requestDetails')}</h1>
      </div>

      <div ref={printRef} className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="gradient-primary px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary-foreground">{t('requestNumber')}: {request.requestNumber}</h2>
            <p className="text-primary-foreground/70 text-sm">{t('appSubtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={request.status} t={t} />
            <div className="bg-primary-foreground rounded p-1">
              <Barcode value={request.requestNumber} width={1} height={30} fontSize={0} margin={2} />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('employeeType')} value={t(request.employeeType === 'direct' ? 'directEmployee' : 'contractorEmployee')} />
            <Field label={t('department')} value={language === 'ar' ? dept?.nameAr : dept?.nameEn} />
            <Field label={`${t('nameAr')}`} value={request.nameAr} />
            <Field label={`${t('nameEn')}`} value={request.nameEn} />
            <Field label={t('nationality')} value={request.nationality} />
            <Field label={t('idNumber')} value={request.employeeId} />
            <Field label={t('jobTitle')} value={request.jobTitle} />
            <Field label={t('nationalIdNo')} value={request.nationalIdNo} />
            <Field label={t('dateIssuePlace')} value={request.dateIssuePlace} />
            <Field label={t('birthDate')} value={request.birthDate} />
            <Field label={t('bloodType')} value={request.bloodType} />
            <Field label={t('companyNameTel')} value={request.companyNameTel} />
            <Field label={t('createdBy')} value={creator ? (language === 'ar' ? creator.nameAr : creator.nameEn) : ''} />
            <Field label={t('createdAt')} value={new Date(request.createdAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')} />
          </div>

          {/* Attachments */}
          {request.attachments.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-foreground mb-2">{t('attachments')}</h3>
              <div className="flex flex-wrap gap-2">
                {request.attachments.map(a => (
                  <span key={a.id} className="bg-muted px-3 py-1.5 rounded-md text-sm text-muted-foreground">{a.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Hold/Reject reason */}
          {request.holdReason && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm font-medium text-warning">{t('holdReasonLabel')}: {request.holdReason}</p>
            </div>
          )}
          {request.rejectReason && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm font-medium text-destructive">{t('rejectReasonLabel')}: {request.rejectReason}</p>
            </div>
          )}

          {/* Approval history */}
          {request.approvalHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-foreground mb-3">{t('approvalHistory')}</h3>
              <div className="space-y-2">
                {request.approvalHistory.map(h => {
                  const actionUser = getUserById(h.userId);
                  return (
                    <div key={h.id} className="flex items-center gap-3 text-sm p-3 bg-muted/30 rounded-lg">
                      <span className={`w-2 h-2 rounded-full ${h.action === 'approve' ? 'bg-success' : h.action === 'reject' ? 'bg-destructive' : 'bg-warning'}`} />
                      <span className="font-medium text-foreground">{actionUser ? (language === 'ar' ? actionUser.nameAr : actionUser.nameEn) : ''}</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-muted-foreground">{t(h.action === 'approve' ? 'approve' : h.action === 'reject' ? 'reject' : 'hold')}</span>
                      {h.reason && <span className="text-muted-foreground">({h.reason})</span>}
                      <span className="text-muted-foreground ms-auto text-xs">{new Date(h.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="no-print flex flex-wrap gap-3">
        {canApprove && (
          <>
            <Button onClick={handleApprove} className="bg-success text-success-foreground hover:bg-success/90 gap-2">
              <CheckCircle className="w-4 h-4" /> {t('approve')}
            </Button>
            <Button variant="outline" className="border-warning text-warning hover:bg-warning/10 gap-2" onClick={() => setShowReasonInput('hold')}>
              <PauseCircle className="w-4 h-4" /> {t('hold')}
            </Button>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 gap-2" onClick={() => setShowReasonInput('reject')}>
              <XCircle className="w-4 h-4" /> {t('reject')}
            </Button>
          </>
        )}
        {request.status === 'approved' && (
          <Button onClick={handlePrint} className="gradient-primary text-primary-foreground gap-2">
            <Printer className="w-4 h-4" /> {t('print')}
          </Button>
        )}
      </div>

      {/* Reason dialog */}
      {showReasonInput && (
        <div className="no-print bg-card rounded-xl shadow-card border border-border/50 p-6">
          <h3 className="font-semibold text-foreground mb-3">
            {showReasonInput === 'hold' ? t('holdReasonLabel') : t('rejectReasonLabel')}
          </h3>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={t('enterReason')} className="mb-4" rows={3} />
          <div className="flex gap-3">
            <Button onClick={() => handleAction(showReasonInput)}
              className={showReasonInput === 'hold' ? 'bg-warning text-warning-foreground' : 'bg-destructive text-destructive-foreground'}>
              {t('confirmAction')}
            </Button>
            <Button variant="outline" onClick={() => { setShowReasonInput(null); setReason(''); }}>{t('cancel')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-sm text-foreground font-medium bg-muted/30 px-3 py-2 rounded-md">{value || '—'}</p>
    </div>
  );
}
