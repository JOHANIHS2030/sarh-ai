import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Car, User, Building, ShieldCheck, Check, X, Pause, Paperclip, Download, Shield, History } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { canApproveSticker } from './StickerPendingApprovalsPage';
import { statusLabel, stickerTypeLabel } from './StickerTable';
import { Department } from '@/types';
import { initialDepartments } from '@/data/departments';
import { readLocalJSON } from '@/lib/browserStorage';
import { StickerSecurityIssuance, StickerDepartmentApproval } from '@/types/vehicleSticker';
import { generateStickerPDF } from '@/lib/stickerPdfGenerator';
import { useCompany } from '@/contexts/CompanyContext';

export default function VehicleStickerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { currentUser, getUserById } = useAuth();
  const { getStickerById, updateStickerStatus, setSecurityIssuance } = useVehicleStickers();
  const { settings: companySettings } = useCompany();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const sticker = id ? getStickerById(id) : undefined;
  const departments: Department[] = useMemo(
    () => readLocalJSON<Department[]>('farabi_departments', initialDepartments),
    []
  );

  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | 'hold' | null>(null);
  const [reason, setReason] = useState('');
  const [issueDialog, setIssueDialog] = useState(false);
  const [issuance, setIssuance] = useState<Partial<StickerSecurityIssuance>>({});

  if (!sticker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t('الطلب غير موجود', 'Request not found')}</p>
        <Button variant="link" onClick={() => navigate('/stickers/my')}>
          {t('العودة', 'Back')}
        </Button>
      </div>
    );
  }

  // Authorization to view
  const canView = currentUser?.role === 'admin' ||
    sticker.createdBy === currentUser?.id ||
    canApproveSticker(sticker, currentUser) ||
    (sticker.status === 'approved' && (currentUser?.systemRole === 'id_card_executor' || currentUser?.systemRole === 'security_chief'));

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-card p-8 rounded-2xl border border-border max-w-md">
          <Shield className="w-12 h-12 mx-auto text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">{t('غير مصرح', 'Not Authorized')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('ليست لديك صلاحية لعرض هذا الطلب', 'You do not have permission to view this request')}
          </p>
        </div>
      </div>
    );
  }

  const canAct = canApproveSticker(sticker, currentUser);
  const isSecurityStage = sticker.status === 'pending_security_review';
  const canIssue = isSecurityStage && (currentUser?.systemRole === 'id_card_executor' || currentUser?.systemRole === 'security_chief' || currentUser?.role === 'admin');

  const deptName = (id: string) => {
    const d = departments.find(x => x.id === id);
    if (!d) return id;
    return language === 'ar' ? d.nameAr : d.nameEn;
  };

  const handleAction = () => {
    if (!actionDialog || !currentUser) return;
    if ((actionDialog === 'reject' || actionDialog === 'hold') && !reason.trim()) {
      toast({ title: t('يرجى إدخال السبب', 'Please enter a reason'), variant: 'destructive' });
      return;
    }

    if (actionDialog === 'approve') {
      // Department approval → snapshot approver info
      const isStage1 = sticker.status === 'pending_dept_approval';
      let nextStatus: typeof sticker.status = sticker.status;
      let deptApproval: StickerDepartmentApproval | undefined;

      if (isStage1) {
        nextStatus = 'pending_security_review';
        deptApproval = {
          approverUserId: currentUser.id,
          approverName: language === 'ar' ? currentUser.nameAr : currentUser.nameEn,
          approverDepartment: currentUser.canApproveDepartments?.[0]
            ? deptName(currentUser.canApproveDepartments[0])
            : (language === 'ar' ? currentUser.responsibilityAr : currentUser.responsibilityEn) || '',
          approverJobTitle: language === 'ar' ? currentUser.jobTitleAr : currentUser.jobTitleEn,
          signature: currentUser.signature,
          approvedAt: new Date().toISOString(),
        };
      } else if (sticker.status === 'pending_security_review') {
        // Security stage approval through this dialog → trigger issuance dialog instead
        setActionDialog(null);
        setIssueDialog(true);
        return;
      }
      updateStickerStatus(sticker.id, nextStatus, currentUser.id, undefined, deptApproval);
      toast({ title: t('تمت الموافقة على الطلب', 'Request approved') });
    } else if (actionDialog === 'reject') {
      updateStickerStatus(sticker.id, 'rejected', currentUser.id, reason);
      toast({ title: t('تم رفض الطلب', 'Request rejected') });
    } else if (actionDialog === 'hold') {
      updateStickerStatus(sticker.id, 'on_hold', currentUser.id, reason);
      toast({ title: t('تم تعليق الطلب', 'Request put on hold') });
    }
    setActionDialog(null);
    setReason('');
  };

  const handleIssue = () => {
    if (!currentUser) return;
    if (!issuance.permitNumber || !issuance.issueDate || !issuance.expiryDate) {
      toast({ title: t('يرجى تعبئة جميع الحقول', 'Please fill all fields'), variant: 'destructive' });
      return;
    }
    const full: StickerSecurityIssuance = {
      reviewerUserId: currentUser.id,
      reviewerName: language === 'ar' ? currentUser.nameAr : currentUser.nameEn,
      reviewerEmployeeId: currentUser.username,
      permitNumber: issuance.permitNumber!,
      issueDate: issuance.issueDate!,
      expiryDate: issuance.expiryDate!,
      signature: currentUser.signature,
      issuedAt: new Date().toISOString(),
    };
    setSecurityIssuance(sticker.id, full);
    setIssueDialog(false);
    setIssuance({});
    toast({ title: t('تم إصدار الملصق بنجاح', 'Sticker issued successfully') });
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
          <ArrowLeft className="w-4 h-4" />
          {t('رجوع', 'Back')}
        </button>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
          sticker.status === 'approved' ? 'bg-success/15 text-success' :
          sticker.status === 'rejected' ? 'bg-destructive/15 text-destructive' :
          sticker.status === 'on_hold' ? 'bg-muted text-muted-foreground' :
          'bg-warning/15 text-warning'
        }`}>
          {statusLabel(sticker.status, language)}
        </span>
      </div>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="gradient-primary px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
              <Car className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary-foreground">{t('طلب ملصق مركبة', 'Vehicle Sticker Request')}</h1>
              <p className="text-primary-foreground/80 text-sm">{stickerTypeLabel(sticker.stickerType, language)}</p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-primary-foreground/70 text-xs">{t('رقم الطلب', 'Request No.')}</p>
            <p className="text-primary-foreground font-mono font-bold text-lg">{sticker.requestNumber}</p>
          </div>
        </div>
      </div>

      {/* Driver */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{t('بيانات السائق', 'Driver Information')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Field label={t('الاسم', 'Name')} value={sticker.driver.name} />
            <Field label={t('الرقم الوظيفي', 'Employee ID')} value={sticker.driver.employeeId} />
            <Field label={t('الجنسية', 'Nationality')} value={sticker.driver.nationality} />
            <Field label={t('رقم الرخصة', 'License Number')} value={sticker.driver.licenseNumber} />
            <Field label={t('مكان الإصدار', 'Issue Place')} value={sticker.driver.licenseIssuePlace} />
            <Field label={t('تاريخ الإصدار', 'Issue Date')} value={sticker.driver.licenseIssueDate} />
            <Field label={t('تاريخ الإنتهاء', 'Expiry Date')} value={sticker.driver.licenseExpiryDate} />
          </div>
        </CardContent>
      </Card>

      {/* Vehicle */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Car className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{t('بيانات المركبة', 'Vehicle Information')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Field label={t('نوع السيارة', 'Type/Model')} value={sticker.vehicle.vehicleType} />
            <Field label={t('رقم اللوحة', 'Plate Number')} value={sticker.vehicle.plateNumber} mono />
            <Field label={t('اللون', 'Color')} value={sticker.vehicle.color} />
          </div>
        </CardContent>
      </Card>

      {/* Contractor */}
      {sticker.contractor && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t('بيانات المقاول', 'Contractor Information')}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label={t('رقم العقد', 'Contract No.')} value={sticker.contractor.contractNumber} mono />
              <Field label={t('مدة العقد', 'Duration')} value={sticker.contractor.contractDuration} />
              <Field label={t('من', 'Start')} value={sticker.contractor.contractStartDate} />
              <Field label={t('إلى', 'End')} value={sticker.contractor.contractEndDate} />
              <Field label={t('اسم المقاول', 'Contractor')} value={sticker.contractor.contractorName} />
              <Field label={t('المندوب', 'Representative')} value={sticker.contractor.contractorRepresentative} />
              <Field label={t('المسؤول', 'Responsible')} value={sticker.contractor.responsibleName} />
              <Field label={t('الهاتف', 'Phone')} value={sticker.contractor.phoneNumber} mono />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {sticker.contractor.responsibleSignature && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('توقيع المسؤول', 'Signature')}</p>
                  <img src={sticker.contractor.responsibleSignature} alt="sig" className="h-16 bg-muted/30 border border-border rounded p-1" />
                </div>
              )}
              {sticker.contractor.stamp && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('الختم', 'Stamp')}</p>
                  <img src={sticker.contractor.stamp} alt="stamp" className="h-16 bg-muted/30 border border-border rounded p-1" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department approval */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{t('موافقة الإدارة المعنية', 'Department Approval')}</h2>
          </div>
          {sticker.departmentApproval ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label={t('الاسم', 'Name')} value={sticker.departmentApproval.approverName} />
              <Field label={t('الإدارة', 'Department')} value={sticker.departmentApproval.approverDepartment} />
              <Field label={t('الوظيفة', 'Job Title')} value={sticker.departmentApproval.approverJobTitle} />
              <Field label={t('تاريخ الموافقة', 'Approved At')} value={new Date(sticker.departmentApproval.approvedAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-GB')} />
              {sticker.departmentApproval.signature && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('التوقيع', 'Signature')}</p>
                  <img src={sticker.departmentApproval.signature} alt="sig" className="h-16 bg-muted/30 border border-border rounded p-1" />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('بانتظار موافقة', 'Awaiting approval from')}: <strong>{deptName(sticker.departmentId)}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Security issuance */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{t('إصدار الأمن الصناعي', 'Industrial Safety Issuance')}</h2>
          </div>
          {sticker.securityIssuance ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label={t('الاسم', 'Name')} value={sticker.securityIssuance.reviewerName} />
              <Field label={t('الرقم الوظيفي', 'Employee ID')} value={sticker.securityIssuance.reviewerEmployeeId} mono />
              <Field label={t('رقم التصريح', 'Permit No.')} value={sticker.securityIssuance.permitNumber} mono />
              <Field label={t('تاريخ الإصدار', 'Issue Date')} value={sticker.securityIssuance.issueDate} />
              <Field label={t('تاريخ الإنتهاء', 'Expiry Date')} value={sticker.securityIssuance.expiryDate} />
              {sticker.securityIssuance.signature && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('التوقيع', 'Signature')}</p>
                  <img src={sticker.securityIssuance.signature} alt="sig" className="h-16 bg-muted/30 border border-border rounded p-1" />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {sticker.status === 'pending_security_review'
                ? t('بانتظار إصدار قسم الأمن الصناعي', 'Awaiting Industrial Safety issuance')
                : t('لم يصل بعد إلى مرحلة الإصدار', 'Has not reached issuance stage yet')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      {sticker.attachments.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t('المرفقات', 'Attachments')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sticker.attachments.map(a => (
                <a
                  key={a.id}
                  href={a.data}
                  download={a.name}
                  className="flex items-center justify-between gap-2 p-3 border border-border rounded-lg hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{a.name}</span>
                  </div>
                  <Download className="w-4 h-4 text-primary flex-shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval history */}
      {sticker.approvalHistory.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t('سجل الإجراءات', 'Action History')}</h2>
            </div>
            <ul className="space-y-2">
              {sticker.approvalHistory.map(h => {
                const u = getUserById(h.userId);
                return (
                  <li key={h.id} className="flex items-start gap-3 text-sm">
                    <span className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                      h.action === 'approve' ? 'bg-success' : h.action === 'reject' ? 'bg-destructive' : 'bg-warning'
                    }`} />
                    <div className="flex-1">
                      <p>
                        <strong>{u ? (language === 'ar' ? u.nameAr : u.nameEn) : h.userId}</strong>
                        {' — '}
                        {h.action === 'approve' ? t('وافق', 'Approved') : h.action === 'reject' ? t('رفض', 'Rejected') : t('علّق', 'Held')}
                      </p>
                      {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(h.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action bar */}
      {(canAct || canIssue) && (
        <div className="sticky bottom-4 bg-card rounded-xl border border-border p-4 shadow-lg flex gap-3 justify-end flex-wrap">
          {canIssue ? (
            <Button onClick={() => setIssueDialog(true)} className="gradient-primary text-primary-foreground gap-2">
              <Shield className="w-4 h-4" />
              {t('إصدار التصريح', 'Issue Permit')}
            </Button>
          ) : (
            <Button onClick={() => setActionDialog('approve')} className="bg-success text-success-foreground hover:bg-success/90 gap-2">
              <Check className="w-4 h-4" />
              {t('موافقة', 'Approve')}
            </Button>
          )}
          <Button onClick={() => setActionDialog('hold')} variant="outline" className="gap-2">
            <Pause className="w-4 h-4" />
            {t('تعليق', 'Hold')}
          </Button>
          <Button onClick={() => setActionDialog('reject')} variant="destructive" className="gap-2">
            <X className="w-4 h-4" />
            {t('رفض', 'Reject')}
          </Button>
        </div>
      )}

      {/* Action dialog */}
      <Dialog open={actionDialog !== null} onOpenChange={() => { setActionDialog(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'approve' && t('تأكيد الموافقة', 'Confirm Approval')}
              {actionDialog === 'reject' && t('رفض الطلب', 'Reject Request')}
              {actionDialog === 'hold' && t('تعليق الطلب', 'Hold Request')}
            </DialogTitle>
          </DialogHeader>
          {(actionDialog === 'reject' || actionDialog === 'hold') && (
            <div>
              <Label className="mb-1 block text-sm">{t('السبب', 'Reason')} <span className="text-destructive">*</span></Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} />
            </div>
          )}
          {actionDialog === 'approve' && (
            <p className="text-sm text-muted-foreground">
              {t('سيتم تسجيل اسمك وتوقيعك في هذا الطلب وإرساله إلى المرحلة التالية.', 'Your name and signature will be recorded and the request will move to the next stage.')}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setReason(''); }}>
              {t('إلغاء', 'Cancel')}
            </Button>
            <Button onClick={handleAction} className="gradient-primary text-primary-foreground">
              {t('تأكيد', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue dialog */}
      <Dialog open={issueDialog} onOpenChange={setIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('إصدار تصريح الملصق', 'Issue Sticker Permit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">{t('رقم التصريح', 'Permit Number')} <span className="text-destructive">*</span></Label>
              <Input value={issuance.permitNumber || ''} onChange={e => setIssuance(p => ({ ...p, permitNumber: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">{t('تاريخ الإصدار', 'Issue Date')} <span className="text-destructive">*</span></Label>
                <Input type="date" value={issuance.issueDate || ''} onChange={e => setIssuance(p => ({ ...p, issueDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{t('تاريخ الإنتهاء', 'Expiry Date')} <span className="text-destructive">*</span></Label>
                <Input type="date" value={issuance.expiryDate || ''} onChange={e => setIssuance(p => ({ ...p, expiryDate: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
              {t(
                'سيتم تسجيل اسمك وتوقيعك تلقائياً من ملف المستخدم.',
                'Your name and signature will be recorded automatically from your user profile.'
              )}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialog(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={handleIssue} className="gradient-primary text-primary-foreground">
              {t('إصدار', 'Issue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-foreground ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}
