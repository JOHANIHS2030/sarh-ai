import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermits } from '@/contexts/PermitsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, Smartphone, Laptop, Camera, ShieldCheck, Check, X, Pause, Paperclip, Download, Shield, History, User as UserIcon, Trash2,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { canActOnPermit, canViewPermit, permitStatusLabel, permitTypeLabel } from '@/lib/permitAuthority';
import { Department } from '@/types';
import { initialDepartments } from '@/data/departments';
import { readLocalJSON } from '@/lib/browserStorage';
import { PermitStageApproval } from '@/types/permit';
import { generatePermitPDF } from '@/lib/permitPdfGenerator';

const typeIcons = { mobile_phone: Smartphone, laptop: Laptop, photography: Camera };

export default function PermitDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { currentUser, getUserById } = useAuth();
  const { getPermitById, approvePermit, rejectPermit, holdPermit, deletePermit } = usePermits();
  const { settings: companySettings } = useCompany();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const permit = id ? getPermitById(id) : undefined;
  const departments: Department[] = useMemo(
    () => readLocalJSON<Department[]>('farabi_departments', initialDepartments),
    []
  );

  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | 'hold' | null>(null);
  const [reason, setReason] = useState('');

  if (!permit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t('الطلب غير موجود', 'Request not found')}</p>
        <Button variant="link" onClick={() => navigate('/permits/my')}>{t('العودة', 'Back')}</Button>
      </div>
    );
  }

  if (!canViewPermit(permit, currentUser)) {
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

  const Icon = typeIcons[permit.permitType];
  const canAct = canActOnPermit(permit, currentUser);
  const deptName = (id: string) => {
    const d = departments.find(x => x.id === id);
    return d ? (language === 'ar' ? d.nameAr : d.nameEn) : id;
  };

  const handleAction = () => {
    if (!actionDialog || !currentUser) return;
    if ((actionDialog === 'reject' || actionDialog === 'hold') && !reason.trim()) {
      toast({ title: t('يرجى إدخال السبب', 'Please enter a reason'), variant: 'destructive' });
      return;
    }

    if (actionDialog === 'approve') {
      const approval: PermitStageApproval = {
        stage: permit.status,
        approverUserId: currentUser.id,
        approverName: language === 'ar' ? currentUser.nameAr : currentUser.nameEn,
        approverJobTitle: language === 'ar' ? currentUser.jobTitleAr : currentUser.jobTitleEn,
        approverDepartment: currentUser.canApproveDepartments?.[0] ? deptName(currentUser.canApproveDepartments[0]) : undefined,
        signature: currentUser.signature,
        approvedAt: new Date().toISOString(),
      };
      approvePermit(permit.id, currentUser.id, approval, reason.trim() || undefined);
      toast({ title: t('تمت الموافقة على الطلب', 'Request approved') });
    } else if (actionDialog === 'reject') {
      rejectPermit(permit.id, currentUser.id, reason);
      toast({ title: t('تم رفض الطلب', 'Request rejected') });
    } else if (actionDialog === 'hold') {
      holdPermit(permit.id, currentUser.id, reason);
      toast({ title: t('تم تعليق الطلب', 'Request put on hold') });
    }
    setActionDialog(null);
    setReason('');
  };

  const handlePrint = async () => {
    const dept = departments.find(d => d.id === permit.applicant.departmentId);
    const creator = permit.createdBy.startsWith('external:') ? undefined : getUserById(permit.createdBy);
    try {
      await generatePermitPDF({
        permit,
        department: dept,
        creator,
        approverUsers: permit.stageApprovals.map(sa => getUserById(sa.approverUserId)).filter(Boolean) as any,
        company: companySettings,
        language,
        statusLabel: permitStatusLabel(permit.status, language),
      });
    } catch (e) {
      toast({ title: t('فشل توليد ملف PDF', 'Failed to generate PDF'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
          <ArrowLeft className="w-4 h-4" />{t('رجوع', 'Back')}
        </button>
        <div className="flex items-center gap-2">
          {permit.status === 'approved' && (
            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />{t('طباعة النموذج النهائي', 'Print Final Form')}
            </Button>
          )}
          {(currentUser?.role === 'admin' || permit.createdBy === currentUser?.id) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="w-4 h-4" />{t('حذف الطلب', 'Delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('تأكيد الحذف', 'Confirm Delete')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('هل تريد حذف هذا الطلب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.', 'Permanently delete this request? This cannot be undone.')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('إلغاء', 'Cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (!currentUser) return;
                      deletePermit(permit.id, currentUser.id);
                      toast({ title: t('تم حذف الطلب', 'Request deleted') });
                      navigate('/permits/my');
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('حذف', 'Delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            permit.status === 'approved' ? 'bg-success/15 text-success' :
            permit.status === 'rejected' ? 'bg-destructive/15 text-destructive' :
            permit.status === 'on_hold' ? 'bg-muted text-muted-foreground' : 'bg-warning/15 text-warning'
          }`}>
            {permitStatusLabel(permit.status, language)}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="gradient-primary px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
              <Icon className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary-foreground">{permitTypeLabel(permit.permitType, language)}</h1>
              <p className="text-primary-foreground/80 text-sm">{permit.applicant.name}</p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-primary-foreground/70 text-xs">{t('رقم الطلب', 'Request No.')}</p>
            <p className="text-primary-foreground font-mono font-bold text-lg">{permit.requestNumber}</p>
          </div>
        </div>
      </div>

      {/* Applicant */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3"><UserIcon className="w-5 h-5 text-primary" /><h2 className="font-semibold">{t('بيانات مقدم الطلب', 'Applicant')}</h2></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Field label={t('الاسم', 'Name')} value={permit.applicant.name} />
            <Field label={t('الرقم الوظيفي', 'Employee ID')} value={permit.applicant.employeeId} mono />
            <Field label={t('المسمى الوظيفي', 'Job Title')} value={permit.applicant.jobTitle} />
            <Field label={t('الجنسية', 'Nationality')} value={permit.applicant.nationality} />
            <Field label={t('الإدارة', 'Department')} value={deptName(permit.applicant.departmentId)} />
            {permit.applicant.companyName && <Field label={t('الشركة', 'Company')} value={permit.applicant.companyName} />}
            {permit.applicant.phoneNumber && <Field label={t('الهاتف', 'Phone')} value={permit.applicant.phoneNumber} mono />}
          </div>
        </CardContent>
      </Card>

      {/* Permit-type-specific details */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3"><Icon className="w-5 h-5 text-primary" /><h2 className="font-semibold">{t('بيانات التصريح', 'Permit Details')}</h2></div>
          {permit.mobile && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label={t('تاريخ الطلب', 'Request Date')} value={permit.mobile.requestDate} />
              <Field label={t('نوع الجوال', 'Mobile Type')} value={permit.mobile.deviceType} />
              <Field label={t('الإقرار', 'Declaration')} value={permit.mobile.declarationAccepted ? t('مقبول', 'Accepted') : t('غير مقبول', 'Not Accepted')} />
            </div>
          )}
          {permit.laptop && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label={t('من تاريخ', 'From')} value={permit.laptop.requestedFrom} />
              <Field label={t('إلى تاريخ', 'To')} value={permit.laptop.requestedTo} />
              <Field label={t('رقم البطاقة', 'ID Card No.')} value={permit.laptop.idCardNumber} mono />
              <Field label={t('نوع الجهاز', 'Laptop Type')} value={permit.laptop.laptopBrand} />
              <Field label={t('الموديل', 'Model')} value={permit.laptop.laptopModel} />
              <Field label={t('الرقم التسلسلي', 'Serial')} value={permit.laptop.serialNumber} mono />
              <Field label={t('رقم ملصق الفارابي', 'Farabi Sticker No.')} value={permit.laptop.farabiStickerNo} mono />
              {permit.laptop.itReviewNotes && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-xs text-muted-foreground">{t('ملاحظات تقنية المعلومات', 'IT Notes')}</p>
                  <p className="text-foreground whitespace-pre-wrap">{permit.laptop.itReviewNotes}</p>
                </div>
              )}
            </div>
          )}
          {permit.photography && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label={t('نوع ورقم آلة التصوير', 'Camera Type & No.')} value={permit.photography.cameraTypeAndNumber} />
              <Field
                label={t('نوعية التصوير', 'Photography Type')}
                value={[
                  permit.photography.photographyType?.video ? t('فيديو', 'Video') : null,
                  permit.photography.photographyType?.photoDigital ? t('فوتوغرافي/رقمي', 'Photo/Digital') : null,
                ].filter(Boolean).join(' + ') || '—'}
              />
              <Field label={t('المصور المخصص', 'Designated Photographer')} value={permit.photography.photographerName} />
              <Field label={t('الوظيفة', 'Job Title')} value={permit.photography.photographerJobTitle} />
              <Field label={t('الإقرار', 'Declaration')} value={permit.photography.declarationAccepted ? t('مقبول', 'Accepted') : t('غير مقبول', 'Not Accepted')} />
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs text-muted-foreground">{t('المنطقة المطلوب تصويرها', 'Locations to Photograph')}</p>
                <p className="text-foreground whitespace-pre-wrap">{permit.photography.locations}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage approvals */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-5 h-5 text-primary" /><h2 className="font-semibold">{t('مراحل الموافقة والتواقيع', 'Approval Stages & Signatures')}</h2></div>
          {permit.stageApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('لم يتم اعتماد أي مرحلة بعد', 'No stages approved yet')}</p>
          ) : (
            <div className="space-y-3">
              {permit.stageApprovals.map((sa, i) => {
                const u = getUserById(sa.approverUserId);
                return (
                  <div key={i} className="border border-border rounded-lg p-3 bg-success/5">
                    <p className="text-xs text-success font-semibold">{permitStatusLabel(sa.stage, language)}</p>
                    <p className="text-sm font-medium">{sa.approverName} — {sa.approverJobTitle}</p>
                    {sa.approverDepartment && <p className="text-xs text-muted-foreground">{sa.approverDepartment}</p>}
                    <p className="text-[10px] text-muted-foreground">{new Date(sa.approvedAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-GB')}</p>
                    {(u?.signature || sa.signature) && (
                      <img src={u?.signature || sa.signature} alt="sig" className="h-12 mt-2 bg-white border border-border rounded p-1" />
                    )}
                    {sa.notes && <p className="text-xs text-muted-foreground mt-1 italic">{sa.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      {permit.attachments.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3"><Paperclip className="w-5 h-5 text-primary" /><h2 className="font-semibold">{t('المرفقات', 'Attachments')}</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {permit.attachments.map(a => (
                <a key={a.id} href={a.data} download={a.name} className="flex items-center justify-between gap-2 p-3 border border-border rounded-lg hover:bg-muted/30">
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

      {/* History */}
      {permit.approvalHistory.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3"><History className="w-5 h-5 text-primary" /><h2 className="font-semibold">{t('سجل الإجراءات', 'Action History')}</h2></div>
            <ul className="space-y-2">
              {permit.approvalHistory.map(h => {
                const u = getUserById(h.userId);
                return (
                  <li key={h.id} className="flex items-start gap-3 text-sm">
                    <span className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${h.action === 'approve' ? 'bg-success' : h.action === 'reject' ? 'bg-destructive' : 'bg-warning'}`} />
                    <div className="flex-1">
                      <p>
                        <strong>{u ? (language === 'ar' ? u.nameAr : u.nameEn) : h.userId}</strong>{' — '}
                        {h.action === 'approve' ? t('وافق', 'Approved') : h.action === 'reject' ? t('رفض', 'Rejected') : t('علّق', 'Held')}{' '}
                        <span className="text-xs text-muted-foreground">({permitStatusLabel(h.stage, language)})</span>
                      </p>
                      {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                      <p className="text-[10px] text-muted-foreground">{new Date(h.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-GB')}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action bar */}
      {canAct && (
        <div className="sticky bottom-4 bg-card rounded-xl border border-border p-4 shadow-lg flex gap-3 justify-end flex-wrap">
          <Button onClick={() => setActionDialog('approve')} className="bg-success text-success-foreground hover:bg-success/90 gap-2">
            <Check className="w-4 h-4" />{t('موافقة', 'Approve')}
          </Button>
          <Button onClick={() => setActionDialog('hold')} variant="outline" className="gap-2">
            <Pause className="w-4 h-4" />{t('تعليق', 'Hold')}
          </Button>
          <Button onClick={() => setActionDialog('reject')} variant="destructive" className="gap-2">
            <X className="w-4 h-4" />{t('رفض', 'Reject')}
          </Button>
        </div>
      )}

      <Dialog open={actionDialog !== null} onOpenChange={() => { setActionDialog(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'approve' && t('تأكيد الموافقة', 'Confirm Approval')}
              {actionDialog === 'reject' && t('رفض الطلب', 'Reject Request')}
              {actionDialog === 'hold' && t('تعليق الطلب', 'Hold Request')}
            </DialogTitle>
          </DialogHeader>
          {(actionDialog === 'reject' || actionDialog === 'hold' || actionDialog === 'approve') && (
            <div>
              <Label className="mb-1 block text-sm">
                {actionDialog === 'approve'
                  ? t('ملاحظات (اختياري)', 'Notes (optional)')
                  : <>{t('السبب', 'Reason')} <span className="text-destructive">*</span></>}
              </Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} />
            </div>
          )}
          {actionDialog === 'approve' && (
            <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
              {t('سيتم تسجيل اسمك وتوقيعك في هذه المرحلة وإرسال الطلب إلى المرحلة التالية.', 'Your name and signature will be recorded and the request moves to the next stage.')}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setReason(''); }}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={handleAction} className="gradient-primary text-primary-foreground">{t('تأكيد', 'Confirm')}</Button>
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
