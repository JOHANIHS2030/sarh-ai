import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { useCompany } from '@/contexts/CompanyContext';
import { initialDepartments } from '@/data/departments';
import { StatusBadge } from './DashboardPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft, Printer, CheckCircle, XCircle, PauseCircle, Download, Eye, Trash2, FileDown, IdCard, Save } from 'lucide-react';
import Barcode from 'react-barcode';
import { RequestStatus, IssuanceDetails } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { generateRequestPDF } from '@/lib/pdfGenerator';

export default function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { currentUser, getUserById } = useAuth();
  const { getRequestById, updateRequestStatus, deleteRequest, setIssuance } = useRequests();
  const { settings: company } = useCompany();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState<'hold' | 'reject' | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; data: string; type: string } | null>(null);
  const [showIssuance, setShowIssuance] = useState(false);
  const [issuanceForm, setIssuanceForm] = useState<IssuanceDetails>({
    cardNumber: '',
    serial: '',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    fingerprintTaken: false,
    instructionsGiven: false,
    dataEntered: false,
    issuedById: '',
    issuedByName: '',
    issuedAt: '',
  });

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

  const canDelete = currentUser?.role === 'admin';

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

  const handleDelete = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الطلب؟' : 'Are you sure you want to delete this request?')) {
      deleteRequest(request.id, currentUser!.id);
      toast({ title: language === 'ar' ? 'تم حذف الطلب' : 'Request deleted' });
      navigate('/all-requests');
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;

    const fieldRows = [
      [language === 'ar' ? 'نوع الموظف' : 'Employee Type', t(request.employeeType === 'direct' ? 'directEmployee' : 'contractorEmployee')],
      [language === 'ar' ? 'القسم' : 'Department', language === 'ar' ? dept?.nameAr : dept?.nameEn],
      [language === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)', request.nameAr],
      [language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)', request.nameEn],
      [language === 'ar' ? 'الجنسية' : 'Nationality', request.nationality],
      [language === 'ar' ? 'الرقم الوظيفي' : 'ID Number', request.employeeId],
      [language === 'ar' ? 'المسمى الوظيفي' : 'Job Title', request.jobTitle],
      [language === 'ar' ? 'رقم الهوية' : 'National ID No.', request.nationalIdNo],
      [language === 'ar' ? 'تاريخ ومكان الإصدار' : 'Date & Issue Place', request.dateIssuePlace],
      [language === 'ar' ? 'تاريخ الميلاد' : 'Birth Date', request.birthDate],
      [language === 'ar' ? 'فصيلة الدم' : 'Blood Type', request.bloodType],
      [language === 'ar' ? 'إسم الشركة' : 'Company Name', request.companyNameTel],
    ];

    const dir = language === 'ar' ? 'rtl' : 'ltr';
    w.document.write(`<html dir="${dir}"><head><title>${request.requestNumber}</title>
    <style>
      @page { size: A4; margin: 15mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif; font-size: 11px; color: #1a1a1a; padding: 10px; }
      .header { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 2px solid #1a365d; margin-bottom: 10px; }
      .header h1 { font-size: 16px; color: #1a365d; }
      .header .ref { text-align: ${language === 'ar' ? 'left' : 'right'}; }
      .header .ref p { font-size: 10px; color: #666; }
      .header .ref strong { font-size: 13px; font-family: monospace; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      td, th { border: 1px solid #ccc; padding: 5px 8px; text-align: start; font-size: 11px; }
      th { background: #f0f4f8; color: #1a365d; font-weight: 600; width: 35%; }
      .section-title { font-size: 12px; font-weight: 700; color: #1a365d; margin: 10px 0 5px; }
      .signatures { display: flex; justify-content: space-between; margin-top: 15px; }
      .sig-box { text-align: center; width: 30%; }
      .sig-line { border-top: 1px solid #333; margin-top: 30px; padding-top: 3px; font-size: 10px; }
      .status-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 10px; font-weight: 600; background: #d4edda; color: #155724; }
    </style></head><body>
    <div class="header">
      <div>
        <h1>${language === 'ar' ? 'نموذج طلب إصدار بطاقة هوية' : 'ID Card Request Form'}</h1>
        <p style="font-size:10px;color:#666">${language === 'ar' ? 'شركة الفارابي ينبع للبتروكيماويات' : 'Farabi Yanbu Petrochemicals'}</p>
      </div>
      <div class="ref">
        <p>${language === 'ar' ? 'رقم الطلب' : 'Request No.'}</p>
        <strong>${request.requestNumber}</strong>
        <p style="margin-top:3px;font-size:9px">${language === 'ar' ? 'التاريخ' : 'Date'}: ${new Date(request.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
      </div>
    </div>
    <table>${fieldRows.map(([l, v]) => `<tr><th>${l}</th><td>${v || '—'}</td></tr>`).join('')}</table>
    <p class="section-title">${language === 'ar' ? 'المرفقات المقدمة' : 'Submitted Attachments'}</p>
    <table><tr>${request.attachments.map(a => `<td style="text-align:center;font-size:10px">✓ ${a.name}</td>`).join('')}</tr></table>
    <p class="section-title">${language === 'ar' ? 'التواقيع' : 'Signatures'}</p>
    <div class="signatures">
      <div class="sig-box"><div class="sig-line">${language === 'ar' ? 'مدير القسم' : 'Dept. Manager'}</div></div>
      <div class="sig-box"><div class="sig-line">${language === 'ar' ? 'فريق السلامة' : 'Safety Team'}</div></div>
      <div class="sig-box"><div class="sig-line">${language === 'ar' ? 'قسم بطاقات الهوية' : 'ID Card Section'}</div></div>
    </div>
    <div style="text-align:center;margin-top:10px"><span class="status-badge">${t(request.status)}</span></div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const handleViewAttachment = (att: { name: string; data?: string; type: string }) => {
    if (att.data) {
      setPreviewAttachment({ name: att.name, data: att.data, type: att.type });
    }
  };

  const handleDownloadAttachment = (att: { name: string; data?: string }) => {
    if (att.data) {
      const link = document.createElement('a');
      link.href = att.data;
      link.download = att.name;
      link.click();
    }
  };

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><BackIcon className="w-5 h-5" /></Button>
        <h1 className="text-2xl font-bold text-foreground">{t('requestDetails')}</h1>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
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

        <div ref={printRef} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('employeeType')} value={t(request.employeeType === 'direct' ? 'directEmployee' : 'contractorEmployee')} />
            <Field label={t('department')} value={language === 'ar' ? dept?.nameAr : dept?.nameEn} />
            <Field label={t('nameAr')} value={request.nameAr} />
            <Field label={t('nameEn')} value={request.nameEn} />
            <Field label={t('nationality')} value={request.nationality} />
            <Field label={t('idNumber')} value={request.employeeId} />
            <Field label={t('jobTitle')} value={request.jobTitle} />
            <Field label={t('nationalIdNo')} value={request.nationalIdNo} />
            <Field label={t('dateIssuePlace')} value={request.dateIssuePlace} />
            <Field label={t('birthDate')} value={request.birthDate} />
            <Field label={t('bloodType')} value={request.bloodType} />
            <Field label={t('companyNameTel')} value={request.companyNameTel} />
            <Field label={t('createdBy')} value={creator ? (language === 'ar' ? creator.nameAr : creator.nameEn) : (request.createdBy === 'external' ? (language === 'ar' ? 'نموذج خارجي' : 'External Form') : '')} />
            <Field label={t('createdAt')} value={new Date(request.createdAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')} />
          </div>

          {/* Attachments with view/download */}
          {request.attachments.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-foreground mb-3">{t('attachments')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {request.attachments.map(a => (
                  <div key={a.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-sm text-foreground flex-1 truncate">{a.name}</span>
                    {a.data && (
                      <div className="flex gap-1">
                        <button onClick={() => handleViewAttachment(a)} className="text-primary hover:text-primary/80 p-1" title={language === 'ar' ? 'عرض' : 'View'}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownloadAttachment(a)} className="text-primary hover:text-primary/80 p-1" title={language === 'ar' ? 'تحميل' : 'Download'}>
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {!a.data && <span className="text-xs text-muted-foreground">{language === 'ar' ? 'غير متوفر' : 'N/A'}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

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
      <div className="flex flex-wrap gap-3">
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
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            const approvers = request.approvalHistory
              .filter(h => h.action === 'approve')
              .map(h => ({ stage: h.stage, user: getUserById(h.userId), date: h.timestamp }));
            generateRequestPDF({ request, department: dept, creator, approvers, company, language, statusLabel: t(request.status) });
          }}
        >
          <FileDown className="w-4 h-4" /> {language === 'ar' ? 'تحميل PDF مع المرفقات' : 'Download PDF with Attachments'}
        </Button>
        {canDelete && (
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 gap-2" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" /> {language === 'ar' ? 'حذف الطلب' : 'Delete Request'}
          </Button>
        )}
      </div>

      {/* Reason dialog */}
      {showReasonInput && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
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

      {/* Attachment preview dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewAttachment?.type.startsWith('image/') ? (
              <img src={previewAttachment.data} alt={previewAttachment.name} className="w-full rounded-lg" />
            ) : previewAttachment?.type === 'application/pdf' ? (
              <iframe src={previewAttachment.data} className="w-full h-[65vh] rounded-lg" />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>{language === 'ar' ? 'لا يمكن عرض هذا الملف. يرجى تحميله.' : 'Cannot preview this file. Please download it.'}</p>
                <Button onClick={() => handleDownloadAttachment(previewAttachment!)} className="mt-4 gap-2">
                  <Download className="w-4 h-4" /> {language === 'ar' ? 'تحميل' : 'Download'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
