import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { usePermits } from '@/contexts/PermitsContext';
import { initialDepartments } from '@/data/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Laptop, Camera, ShieldCheck, Paperclip, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  PermitType, PermitApplicantInfo, MobilePermitDetails, LaptopPermitDetails, PhotographyPermitDetails,
} from '@/types/permit';
import { Department } from '@/types';
import { readLocalJSON } from '@/lib/browserStorage';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyApplicant: PermitApplicantInfo = {
  name: '', employeeId: '', jobTitle: '', nationality: '', departmentId: '',
};
const emptyMobile: MobilePermitDetails = {
  requestDate: today(), deviceType: '', declarationAccepted: false,
};
const emptyLaptop: LaptopPermitDetails = {
  requestedFrom: '', requestedTo: '', idCardNumber: '',
  laptopBrand: '', laptopModel: '', serialNumber: '', farabiStickerNo: '',
};
const emptyPhoto: PhotographyPermitDetails = {
  cameraTypeAndNumber: '',
  photographyType: { video: false, photoDigital: false },
  locations: '',
  declarationAccepted: false,
  photographerName: '',
  photographerJobTitle: '',
  affectsMilitaryUnit: false,
};

export default function NewPermitPage() {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const { requests } = useRequests();
  const { addPermit } = usePermits();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const initialType = (searchParams.get('type') as PermitType) || 'mobile_phone';
  const [permitType, setPermitType] = useState<PermitType>(initialType);
  const [applicant, setApplicant] = useState<PermitApplicantInfo>(emptyApplicant);
  const [mobile, setMobile] = useState<MobilePermitDetails>(emptyMobile);
  const [laptop, setLaptop] = useState<LaptopPermitDetails>(emptyLaptop);
  const [photography, setPhotography] = useState<PhotographyPermitDetails>(emptyPhoto);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [linkedIdRequestId, setLinkedIdRequestId] = useState<string>('');

  // Sync state when ?type= changes (sub-menu navigation)
  useEffect(() => {
    const tp = searchParams.get('type') as PermitType | null;
    if (tp && tp !== permitType) setPermitType(tp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const departments: Department[] = useMemo(
    () => readLocalJSON<Department[]>('farabi_departments', initialDepartments),
    []
  );

  const approvedIdRequests = useMemo(
    () => requests.filter(r => r.status === 'approved'),
    [requests]
  );

  const handleLinkApplicant = (id: string) => {
    setLinkedIdRequestId(id);
    if (!id) return;
    const req = approvedIdRequests.find(r => r.id === id);
    if (!req) return;
    setApplicant(prev => ({
      ...prev,
      linkedIdRequestId: req.id,
      name: language === 'ar' ? req.nameAr : req.nameEn,
      employeeId: req.employeeId,
      jobTitle: req.jobTitle,
      nationality: req.nationality,
      departmentId: req.departmentId,
      companyName: req.companyNameTel,
    }));
    if (permitType === 'laptop') {
      setLaptop(p => ({ ...p, idCardNumber: req.nationalIdNo || req.employeeId }));
    }
    if (permitType === 'photography') {
      setPhotography(p => ({
        ...p,
        photographerName: language === 'ar' ? req.nameAr : req.nameEn,
        photographerJobTitle: req.jobTitle,
        photographerId: req.nationalIdNo || req.employeeId,
      }));
    }
  };

  const types: { value: PermitType; ar: string; en: string; icon: typeof Smartphone }[] = [
    { value: 'mobile_phone', ar: 'تصريح إدخال الجوال', en: 'Mobile Phone Permit', icon: Smartphone },
    { value: 'laptop', ar: 'تصريح إدخال وخروج الكمبيوتر المحمول', en: 'Laptop Entry/Exit Permit', icon: Laptop },
    { value: 'photography', ar: 'تصريح التصوير الفوتوغرافي', en: 'Photography Permit', icon: Camera },
  ];

  const validate = (): string | null => {
    if (!applicant.name || !applicant.employeeId || !applicant.departmentId) {
      return t('يرجى تعبئة بيانات مقدم الطلب', 'Please fill applicant info');
    }
    if (permitType === 'mobile_phone') {
      if (!mobile.requestDate || !mobile.deviceType) {
        return t('يرجى تعبئة بيانات تصريح الجوال', 'Please fill mobile permit details');
      }
      if (!mobile.declarationAccepted) {
        return t('يرجى الموافقة على الإقرار والتعهد', 'Please accept the declaration and undertaking');
      }
    }
    if (permitType === 'laptop') {
      if (!laptop.requestedFrom || !laptop.requestedTo || !laptop.idCardNumber
        || !laptop.laptopBrand || !laptop.serialNumber || !laptop.farabiStickerNo) {
        return t('يرجى تعبئة بيانات تصريح الكمبيوتر', 'Please fill laptop permit details');
      }
    }
    if (permitType === 'photography') {
      if (!photography.cameraTypeAndNumber || !photography.locations
        || !photography.photographerName || !photography.photographerJobTitle) {
        return t('يرجى تعبئة بيانات تصريح التصوير', 'Please fill photography permit details');
      }
      if (!photography.photographyType.video && !photography.photographyType.photoDigital) {
        return t('يرجى اختيار نوعية التصوير', 'Please select photography type');
      }
      if (!photography.declarationAccepted) {
        return t('يرجى الموافقة على الإقرار والتعهد', 'Please accept the declaration and undertaking');
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: err, variant: 'destructive' });
      return;
    }
    if (!currentUser) return;

    setSubmitting(true);
    try {
      const attachments = await Promise.all(
        Object.entries(files).filter(([, f]) => f).map(async ([key, file]) => ({
          id: key, name: file!.name, type: file!.type, data: await fileToBase64(file!),
        }))
      );

      const created = addPermit({
        permitType,
        applicant,
        mobile: permitType === 'mobile_phone' ? mobile : undefined,
        laptop: permitType === 'laptop' ? laptop : undefined,
        photography: permitType === 'photography' ? photography : undefined,
        attachments,
        createdBy: currentUser.id,
      });

      toast({ title: t('تم تقديم الطلب', 'Request submitted'), description: created.requestNumber });
      navigate(`/permits/request/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Declaration texts
  const mobileDeclAr = 'تمت مراجعة هذا الطلب بعد تعبئته بالمعلومات المطلوبة للحصول على موافقتكم لإدخال الجوال المطلوب للغرض المشار إليه في هذا التصريح وأن يتم استخدامه في منطقة المكاتب وغرفة التحكم الرئيسية فقط وحسب حاجة العمل.';
  const mobileDeclEn = 'I hereby refer to this application after it has been filled in with the required information to get your consent to be authorized as intended purpose of this application and will be used in offices, MCR and for the work purpose only.';

  const photoDeclAr = 'تمت مراجعة هذا الطلب بعد تعبئته بالمعلومات المطلوبة للحصول على موافقتكم لإجراء التصوير المطلوب للغرض المشار إليه في هذا التصريح. وبهذا أؤكد بأن عملية التصوير سوف تتم حسب الشروط المذكورة في هذا التصريح وسوف تتم إجراءاتها طبقاً للأنظمة والتعليمات المبلغة لنا بهذا الخصوص.';
  const photoDeclEn = 'I hereby refer to this application after it has been filled in with the required information to get your consent to be authorized as intended purpose of this application. I, the undersigned further confirm that the process of photography will be carried out in accordance with the conditions mentioned in this application knowing that the process of photography will be conducted in conformity with the rules and controls will be implemented in this regard.';

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('طلب تصريح جديد', 'New Permit Request')}</h1>
          <p className="text-sm text-muted-foreground">{t('شركة الفارابي ينبع للبتروكيماويات', 'Farabi Yanbu Petrochemicals')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Permit type */}
        <section className="bg-card rounded-xl border border-border p-5">
          <Label className="text-base font-semibold mb-3 block">
            {t('نوع التصريح', 'Permit Type')} <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {types.map(s => {
              const Icon = s.icon;
              const active = permitType === s.value;
              return (
                <button key={s.value} type="button" onClick={() => setPermitType(s.value)}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}>
                  <Icon className="w-6 h-6" />
                  <span className="font-medium text-start text-sm">{language === 'ar' ? s.ar : s.en}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Applicant */}
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">{t('بيانات مقدم الطلب', 'Applicant Information')}</h2>

          {approvedIdRequests.length > 0 && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Label className="mb-1 block text-sm">
                {t('اختيار من بطاقات الهوية المعتمدة (اختياري)', 'Select from approved ID cards (optional)')}
              </Label>
              <Select value={linkedIdRequestId} onValueChange={handleLinkApplicant}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t('اختر موظف لتعبئة بياناته تلقائياً', 'Select employee to auto-fill')} />
                </SelectTrigger>
                <SelectContent>
                  {approvedIdRequests.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {language === 'ar' ? r.nameAr : r.nameEn} — {r.employeeId} ({r.requestNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label className="text-sm">{t('اسم الموظف', 'Employee Name')} *</Label><Input value={applicant.name} onChange={e => setApplicant(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label className="text-sm">{t('الرقم الوظيفي', 'Employee ID')} *</Label><Input value={applicant.employeeId} onChange={e => setApplicant(p => ({ ...p, employeeId: e.target.value }))} /></div>
            <div><Label className="text-sm">{t('الوظيفة', 'Job Title')}</Label><Input value={applicant.jobTitle} onChange={e => setApplicant(p => ({ ...p, jobTitle: e.target.value }))} /></div>
            <div><Label className="text-sm">{t('الجنسية', 'Nationality')}</Label><Input value={applicant.nationality} onChange={e => setApplicant(p => ({ ...p, nationality: e.target.value }))} /></div>
            <div className="md:col-span-2">
              <Label className="text-sm">{t('الجهة / الإدارة', 'Department')} *</Label>
              <Select value={applicant.departmentId} onValueChange={v => setApplicant(p => ({ ...p, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('اختر القسم', 'Select')} /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{language === 'ar' ? d.nameAr : d.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-sm">{t('اسم الشركة', 'Company')}</Label><Input value={applicant.companyName || ''} onChange={e => setApplicant(p => ({ ...p, companyName: e.target.value }))} /></div>
            <div><Label className="text-sm">{t('رقم الهاتف', 'Phone')}</Label><Input value={applicant.phoneNumber || ''} onChange={e => setApplicant(p => ({ ...p, phoneNumber: e.target.value }))} /></div>
          </div>
        </section>

        {/* Mobile-specific fields */}
        {permitType === 'mobile_phone' && (
          <section className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Smartphone className="w-5 h-5 text-primary" />{t('بيانات تصريح إدخال الجوال', 'Mobile Permit Details')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label className="text-sm">{t('تاريخ الطلب', 'Request Date')} *</Label><Input type="date" value={mobile.requestDate} onChange={e => setMobile(p => ({ ...p, requestDate: e.target.value }))} /></div>
              <div><Label className="text-sm">{t('نوع الجوال المراد إدخاله', 'Mobile Type to Enter')} *</Label><Input value={mobile.deviceType} onChange={e => setMobile(p => ({ ...p, deviceType: e.target.value }))} /></div>
            </div>

            <div className="mt-4 p-4 border border-amber-200 bg-amber-50 rounded-lg">
              <p className="text-sm font-semibold text-amber-900 mb-1">{t('إقرار وتعهد', 'Declaration and Undertaking')}</p>
              <p className="text-xs text-amber-800 leading-relaxed mb-2" dir="rtl">{mobileDeclAr}</p>
              <p className="text-xs text-amber-800 leading-relaxed mb-3" dir="ltr">{mobileDeclEn}</p>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={mobile.declarationAccepted} onCheckedChange={v => setMobile(p => ({ ...p, declarationAccepted: !!v }))} />
                <span className="text-sm font-medium text-amber-900">{t('أقر بالموافقة على ما ورد أعلاه', 'I agree to the above declaration')} *</span>
              </label>
            </div>
          </section>
        )}

        {/* Laptop-specific fields */}
        {permitType === 'laptop' && (
          <section className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Laptop className="w-5 h-5 text-primary" />{t('بيانات تصريح إدخال وخروج الكمبيوتر المحمول', 'Laptop Entry/Exit Permit Details')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label className="text-sm">{t('التاريخ من', 'Date From')} *</Label><Input type="date" value={laptop.requestedFrom} onChange={e => setLaptop(p => ({ ...p, requestedFrom: e.target.value }))} /></div>
              <div><Label className="text-sm">{t('التاريخ إلى', 'Date To')} *</Label><Input type="date" value={laptop.requestedTo} onChange={e => setLaptop(p => ({ ...p, requestedTo: e.target.value }))} /></div>
              <div><Label className="text-sm">{t('رقم البطاقة', 'ID Card Number')} *</Label><Input value={laptop.idCardNumber} onChange={e => setLaptop(p => ({ ...p, idCardNumber: e.target.value }))} /></div>
              <div><Label className="text-sm">{t('نوع الجهاز المحمول', 'Laptop Type')} *</Label><Input value={laptop.laptopBrand} onChange={e => setLaptop(p => ({ ...p, laptopBrand: e.target.value }))} /></div>
              <div><Label className="text-sm">{t('الموديل', 'Model')}</Label><Input value={laptop.laptopModel} onChange={e => setLaptop(p => ({ ...p, laptopModel: e.target.value }))} /></div>
              <div><Label className="text-sm">{t('الرقم التسلسلي', 'Serial Number')} *</Label><Input value={laptop.serialNumber} onChange={e => setLaptop(p => ({ ...p, serialNumber: e.target.value }))} /></div>
              <div className="md:col-span-2"><Label className="text-sm">{t('رقم ملصق الفارابي', 'Farabi Sticker Number')} *</Label><Input value={laptop.farabiStickerNo} onChange={e => setLaptop(p => ({ ...p, farabiStickerNo: e.target.value }))} /></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 bg-muted/40 p-2 rounded">
              {t('سيتم توجيه الطلب إلى: مدير الإدارة ← قسم تقنية المعلومات ← رئيس قسم الأمن الصناعي.', 'Workflow: Department Manager → IT Department → Industrial Safety Chief.')}
            </p>
          </section>
        )}

        {/* Photography-specific fields */}
        {permitType === 'photography' && (
          <section className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Camera className="w-5 h-5 text-primary" />{t('بيانات تصريح التصوير', 'Photography Permit Details')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label className="text-sm">{t('نوع ورقم آلة التصوير', 'Camera Type & Number')} *</Label><Input value={photography.cameraTypeAndNumber} onChange={e => setPhotography(p => ({ ...p, cameraTypeAndNumber: e.target.value }))} /></div>

              <div className="md:col-span-2">
                <Label className="text-sm mb-2 block">{t('نوعية التصوير', 'Photography Type')} *</Label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={photography.photographyType.video}
                      onCheckedChange={v => setPhotography(p => ({ ...p, photographyType: { ...p.photographyType, video: !!v } }))}
                    />
                    <span className="text-sm">{t('فيديو', 'Video')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={photography.photographyType.photoDigital}
                      onCheckedChange={v => setPhotography(p => ({ ...p, photographyType: { ...p.photographyType, photoDigital: !!v } }))}
                    />
                    <span className="text-sm">{t('فوتوغرافي / رقمي', 'Photographic / Digital')}</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2"><Label className="text-sm">{t('المنطقة (الموقع/المباني) المطلوب تصويرها', 'Areas (Site/Buildings) to be Photographed')} *</Label><Textarea value={photography.locations} onChange={e => setPhotography(p => ({ ...p, locations: e.target.value }))} rows={2} /></div>
            </div>

            <div className="mt-4 p-4 border border-amber-200 bg-amber-50 rounded-lg">
              <p className="text-sm font-semibold text-amber-900 mb-1">{t('إقرار وتعهد', 'Declaration and Undertaking')}</p>
              <p className="text-xs text-amber-800 leading-relaxed mb-2" dir="rtl">{photoDeclAr}</p>
              <p className="text-xs text-amber-800 leading-relaxed mb-3" dir="ltr">{photoDeclEn}</p>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={photography.declarationAccepted} onCheckedChange={v => setPhotography(p => ({ ...p, declarationAccepted: !!v }))} />
                <span className="text-sm font-medium text-amber-900">{t('أقر بالموافقة على ما ورد أعلاه', 'I agree to the above declaration')} *</span>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label className="text-sm">{t('اسم المصور المخصص (الفارابي)', 'Designated Photographer Name (FYPC)')} *</Label><Input value={photography.photographerName} onChange={e => setPhotography(p => ({ ...p, photographerName: e.target.value }))} /></div>
              <div><Label className="text-sm">{t('الوظيفة', 'Job Title')} *</Label><Input value={photography.photographerJobTitle} onChange={e => setPhotography(p => ({ ...p, photographerJobTitle: e.target.value }))} /></div>
            </div>
          </section>
        )}

        {/* Attachments */}
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Paperclip className="w-5 h-5 text-primary" />{t('المرفقات', 'Attachments')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'iqama', ar: 'صورة بطاقة الهوية الوطنية / الإقامة', en: 'National ID / Iqama Copy' },
              { key: 'supportDoc', ar: 'مستند داعم (اختياري)', en: 'Supporting Document (optional)' },
            ].map(att => (
              <div key={att.key} className="border border-border rounded-lg p-3">
                <Label className="text-sm font-medium block mb-2">{language === 'ar' ? att.ar : att.en}</Label>
                <label className="flex items-center justify-center gap-2 cursor-pointer p-3 border-2 border-dashed border-border rounded-lg hover:border-primary text-sm text-muted-foreground">
                  <Upload className="w-4 h-4" />
                  {files[att.key] ? files[att.key]!.name : t('اختر ملف', 'Choose file')}
                  <input type="file" className="hidden" onChange={e => setFiles(p => ({ ...p, [att.key]: e.target.files?.[0] || null }))} />
                </label>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-3 justify-end sticky bottom-4 bg-card rounded-xl border border-border p-4 shadow-lg">
          <Button type="button" variant="outline" onClick={() => navigate('/permits/my')}>{t('إلغاء', 'Cancel')}</Button>
          <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground">
            {submitting ? t('جاري الإرسال...', 'Submitting...') : t('تقديم الطلب', 'Submit Request')}
          </Button>
        </div>
      </form>
    </div>
  );
}
