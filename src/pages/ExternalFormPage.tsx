import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRequests } from '@/contexts/RequestContext';
import { initialDepartments } from '@/data/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Check, Shield, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EmployeeType } from '@/types';
import Barcode from 'react-barcode';
import loginBg from '@/assets/login-bg.jpg';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface AttachmentField {
  key: string;
  labelAr: string;
  labelEn: string;
  requiredFor: { direct: { saudi: boolean; nonSaudi: boolean }; contractor: { saudi: boolean; nonSaudi: boolean } };
}

const attachmentFields: AttachmentField[] = [
  { key: 'nationalId', labelAr: 'صورة الهوية الوطنية', labelEn: 'National ID Copy', requiredFor: { direct: { saudi: true, nonSaudi: false }, contractor: { saudi: true, nonSaudi: false } } },
  { key: 'passport', labelAr: 'صورة جواز السفر', labelEn: 'Passport Copy', requiredFor: { direct: { saudi: false, nonSaudi: true }, contractor: { saudi: false, nonSaudi: false } } },
  { key: 'iqama', labelAr: 'صورة الإقامة', labelEn: 'Iqama Copy', requiredFor: { direct: { saudi: false, nonSaudi: true }, contractor: { saudi: false, nonSaudi: true } } },
  { key: 'muqeem', labelAr: 'تقرير مقيم', labelEn: 'Muqeem Report', requiredFor: { direct: { saudi: false, nonSaudi: true }, contractor: { saudi: false, nonSaudi: true } } },
  { key: 'medical', labelAr: 'التقرير الطبي', labelEn: 'Medical Report', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: true, nonSaudi: true } } },
  { key: 'contract', labelAr: 'نسخة من العقد', labelEn: 'Contract Copy', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: true, nonSaudi: true } } },
  { key: 'purchaseOrder', labelAr: 'أمر الشراء', labelEn: 'Purchase Order', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: true, nonSaudi: true } } },
  { key: 'ajeer', labelAr: 'وثيقة أجير', labelEn: 'Ajeer Document', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: false, nonSaudi: true } } },
  { key: 'agreement', labelAr: 'اتفاقية المقاول', labelEn: 'Contractor Agreement', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: true, nonSaudi: true } } },
  { key: 'photo', labelAr: 'صورة فوتوغرافية حديثة', labelEn: 'Recent Photo', requiredFor: { direct: { saudi: true, nonSaudi: true }, contractor: { saudi: true, nonSaudi: true } } },
];

export default function ExternalFormPage() {
  const { addRequest, getNextRequestNumber } = useRequests();
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const requestNumber = useMemo(() => getNextRequestNumber(), []);
  const [employeeType, setEmployeeType] = useState<EmployeeType>('direct');
  const [isSaudi, setIsSaudi] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    nameEn: '', nameAr: '', nationality: '', employeeId: '', jobTitle: '',
    nationalIdNo: '', dateIssuePlace: '', birthDate: '', bloodType: '', companyNameTel: '', departmentId: '',
  });
  const [files, setFiles] = useState<Record<string, File | null>>({});

  const departments = useMemo(() => {
    const saved = localStorage.getItem('farabi_departments');
    return saved ? JSON.parse(saved) : initialDepartments;
  }, []);

  const requiredAttachments = useMemo(() => {
    const nat = isSaudi ? 'saudi' : 'nonSaudi';
    return attachmentFields.filter(a => a.requiredFor[employeeType][nat]);
  }, [employeeType, isSaudi]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.departmentId || !form.nameEn || !form.nameAr || !form.nationalIdNo) return;

    const attachments = Object.entries(files).filter(([, f]) => f).map(([key, file]) => ({
      id: key, name: file!.name, type: file!.type,
    }));

    addRequest({ ...form, employeeType, attachments, createdBy: 'external' });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="absolute inset-0"><img src={loginBg} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-primary/70" /></div>
        <div className="bg-card rounded-2xl shadow-elevated p-8 text-center relative z-10 max-w-md mx-4">
          <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t('تم تقديم الطلب بنجاح', 'Request Submitted Successfully')}</h2>
          <p className="text-muted-foreground mb-4">{t('رقم الطلب المرجعي', 'Reference Number')}: <strong className="font-mono">{requestNumber}</strong></p>
          <div className="bg-muted rounded-lg p-3 inline-block"><Barcode value={requestNumber} width={1.5} height={40} fontSize={12} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0"><img src={loginBg} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-primary/60" /></div>
      
      <div className="relative z-10 max-w-4xl mx-auto py-8 px-4">
        {/* Language toggle */}
        <button onClick={() => setLanguage(l => l === 'ar' ? 'en' : 'ar')}
          className="absolute top-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
          style={{ [language === 'ar' ? 'left' : 'right']: '1rem' }}>
          <Globe className="w-4 h-4" /><span className="text-sm">{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        <div className="bg-card rounded-2xl shadow-elevated overflow-hidden">
          <div className="gradient-primary px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground">{t('طلب إصدار بطاقة هوية', 'ID Card Request Form')}</h1>
                <p className="text-primary-foreground/70 text-sm">{t('شركة الفارابي ينبع للبتروكيماويات', 'Farabi Yanbu Petrochemicals')}</p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-primary-foreground/70 text-xs">{t('رقم الطلب', 'Request No.')}</p>
              <p className="text-primary-foreground font-mono font-bold">{requestNumber}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Employee Type & Nationality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground font-medium mb-2 block">{t('نوع الموظف', 'Employee Type')}</Label>
                <div className="flex gap-3">
                  {(['direct', 'contractor'] as EmployeeType[]).map(type => (
                    <button key={type} type="button" onClick={() => setEmployeeType(type)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        employeeType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                      {t(type === 'direct' ? 'موظف مباشر' : 'موظف مقاول', type === 'direct' ? 'Direct Employee' : 'Contractor')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground font-medium mb-2 block">{t('الجنسية', 'Nationality')}</Label>
                <div className="flex gap-3">
                  {[true, false].map(saudi => (
                    <button key={String(saudi)} type="button" onClick={() => setIsSaudi(saudi)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        isSaudi === saudi ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                      {t(saudi ? 'سعودي' : 'غير سعودي', saudi ? 'Saudi' : 'Non-Saudi')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="mb-1 block text-sm">{t('الاسم بالعربية', 'Name (Arabic)')}<span className="text-destructive">*</span></Label><Input value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} required className="h-11" /></div>
              <div><Label className="mb-1 block text-sm">{t('الاسم بالإنجليزية', 'Name (English)')}<span className="text-destructive">*</span></Label><Input value={form.nameEn} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))} required className="h-11" /></div>
              <div><Label className="mb-1 block text-sm">{t('الجنسية', 'Nationality')}</Label><Input value={form.nationality} onChange={e => setForm(p => ({ ...p, nationality: e.target.value }))} className="h-11" /></div>
              <div><Label className="mb-1 block text-sm">{t('الرقم الوظيفي', 'ID Number')}</Label><Input value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} className="h-11" /></div>
              <div><Label className="mb-1 block text-sm">{t('المسمى الوظيفي', 'Job Title')}</Label><Input value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))} className="h-11" /></div>
              <div><Label className="mb-1 block text-sm">{t('رقم الهوية / الإقامة / الجواز', 'National ID / Iqama / Passport No.')}<span className="text-destructive">*</span></Label><Input value={form.nationalIdNo} onChange={e => setForm(p => ({ ...p, nationalIdNo: e.target.value }))} required className="h-11" /></div>
              <div><Label className="mb-1 block text-sm">{t('تاريخ ومكان الإصدار', 'Date & Issue Place')}</Label><Input value={form.dateIssuePlace} onChange={e => setForm(p => ({ ...p, dateIssuePlace: e.target.value }))} className="h-11" /></div>
              <div><Label className="mb-1 block text-sm">{t('تاريخ الميلاد', 'Birth Date')}</Label><Input type="date" value={form.birthDate} onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))} className="h-11" /></div>
              <div>
                <Label className="mb-1 block text-sm">{t('فصيلة الدم', 'Blood Type')}</Label>
                <Select value={form.bloodType} onValueChange={v => setForm(p => ({ ...p, bloodType: v }))}><SelectTrigger className="h-11"><SelectValue placeholder="--" /></SelectTrigger><SelectContent>{bloodTypes.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="mb-1 block text-sm">{t('إسم الشركة وعنوانها', 'Company Name & Tel.')}</Label><Input value={form.companyNameTel} onChange={e => setForm(p => ({ ...p, companyNameTel: e.target.value }))} className="h-11" /></div>
            </div>

            <div>
              <Label className="mb-1 block text-sm">{t('القسم / الإدارة', 'Department')}<span className="text-destructive">*</span></Label>
              <Select value={form.departmentId} onValueChange={v => setForm(p => ({ ...p, departmentId: v }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder={t('اختر القسم', 'Select Department')} /></SelectTrigger>
                <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{language === 'ar' ? d.nameAr : d.nameEn}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">{t('المرفقات', 'Attachments')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {requiredAttachments.map(att => (
                  <div key={att.key} className={`border rounded-lg p-3 ${files[att.key] ? 'border-success bg-success/5' : 'border-border'}`}>
                    <Label className="text-sm mb-2 block">{language === 'ar' ? att.labelAr : att.labelEn}</Label>
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm text-muted-foreground w-fit">
                      <Upload className="w-4 h-4" />{t('رفع ملف', 'Upload File')}
                      <input type="file" className="hidden" onChange={e => setFiles(p => ({ ...p, [att.key]: e.target.files?.[0] || null }))} />
                    </label>
                    {files[att.key] && <span className="text-xs text-success flex items-center gap-1 mt-1"><Check className="w-3 h-3" />{files[att.key]!.name}</span>}
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-base">
              {t('تقديم الطلب', 'Submit Request')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
