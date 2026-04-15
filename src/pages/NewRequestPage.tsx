import { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { initialDepartments } from '@/data/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { EmployeeType } from '@/types';
import Barcode from 'react-barcode';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface AttachmentField {
  key: string;
  labelKey: string;
  requiredFor: { direct: { saudi: boolean; nonSaudi: boolean }; contractor: { saudi: boolean; nonSaudi: boolean } };
}

const attachmentFields: AttachmentField[] = [
  { key: 'nationalId', labelKey: 'att_nationalId', requiredFor: { direct: { saudi: true, nonSaudi: false }, contractor: { saudi: true, nonSaudi: false } } },
  { key: 'passport', labelKey: 'att_passport', requiredFor: { direct: { saudi: false, nonSaudi: true }, contractor: { saudi: false, nonSaudi: false } } },
  { key: 'iqama', labelKey: 'att_iqama', requiredFor: { direct: { saudi: false, nonSaudi: true }, contractor: { saudi: false, nonSaudi: true } } },
  { key: 'muqeem', labelKey: 'att_muqeem', requiredFor: { direct: { saudi: false, nonSaudi: true }, contractor: { saudi: false, nonSaudi: true } } },
  { key: 'medical', labelKey: 'att_medical', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: true, nonSaudi: true } } },
  { key: 'contract', labelKey: 'att_contract', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: true, nonSaudi: true } } },
  { key: 'purchaseOrder', labelKey: 'att_purchaseOrder', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: true, nonSaudi: true } } },
  { key: 'ajeer', labelKey: 'att_ajeer', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: false, nonSaudi: true } } },
  { key: 'agreement', labelKey: 'att_agreement', requiredFor: { direct: { saudi: false, nonSaudi: false }, contractor: { saudi: true, nonSaudi: true } } },
  { key: 'photo', labelKey: 'att_photo', requiredFor: { direct: { saudi: true, nonSaudi: true }, contractor: { saudi: true, nonSaudi: true } } },
];

export default function NewRequestPage() {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const { addRequest, getNextRequestNumber } = useRequests();
  const navigate = useNavigate();

  const requestNumber = useMemo(() => getNextRequestNumber(), []);
  const [employeeType, setEmployeeType] = useState<EmployeeType>('direct');
  const [isSaudi, setIsSaudi] = useState(true);
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

  const handleFileChange = (key: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.departmentId || !form.nameEn || !form.nameAr || !form.nationalIdNo) {
      toast({ title: t('requiredField'), variant: 'destructive' });
      return;
    }

    const attachments = Object.entries(files)
      .filter(([, f]) => f)
      .map(([key, file]) => ({
        id: key,
        name: file!.name,
        type: file!.type,
      }));

    addRequest({
      ...form,
      employeeType,
      attachments,
      createdBy: currentUser?.id || '',
    });

    toast({ title: t('requestSubmitted') });
    navigate('/my-requests');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="gradient-primary px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">{t('newRequest')}</h1>
            <p className="text-primary-foreground/70 text-sm mt-0.5">{t('appSubtitle')}</p>
          </div>
          <div className="text-end">
            <p className="text-primary-foreground/70 text-xs">{t('requestNumber')}</p>
            <p className="text-primary-foreground font-mono font-bold text-lg">{requestNumber}</p>
            <div className="mt-1 bg-primary-foreground rounded p-1 inline-block">
              <Barcode value={requestNumber} width={1} height={30} fontSize={0} margin={2} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground font-medium mb-2 block">{t('employeeType')}</Label>
              <div className="flex gap-3">
                {(['direct', 'contractor'] as EmployeeType[]).map(type => (
                  <button key={type} type="button"
                    onClick={() => setEmployeeType(type)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      employeeType === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}>
                    {t(type === 'direct' ? 'directEmployee' : 'contractorEmployee')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-foreground font-medium mb-2 block">{t('nationality')}</Label>
              <div className="flex gap-3">
                {[true, false].map(saudi => (
                  <button key={String(saudi)} type="button"
                    onClick={() => setIsSaudi(saudi)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      isSaudi === saudi
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}>
                    {t(saudi ? 'saudi' : 'nonSaudi')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={`${t('nameAr')} / Name (Arabic)`} value={form.nameAr} onChange={v => setForm(p => ({ ...p, nameAr: v }))} required />
            <FormField label={`${t('nameEn')} / Name (English)`} value={form.nameEn} onChange={v => setForm(p => ({ ...p, nameEn: v }))} required />
            <FormField label={`${t('nationality')} / Nationality`} value={form.nationality} onChange={v => setForm(p => ({ ...p, nationality: v }))} required />
            <FormField label={`${t('idNumber')} / ID Number`} value={form.employeeId} onChange={v => setForm(p => ({ ...p, employeeId: v }))} required />
            <FormField label={`${t('jobTitle')} / Job Title`} value={form.jobTitle} onChange={v => setForm(p => ({ ...p, jobTitle: v }))} required />
            <FormField label={`${t('nationalIdNo')} / National ID No.`} value={form.nationalIdNo} onChange={v => setForm(p => ({ ...p, nationalIdNo: v }))} required />
            <FormField label={`${t('dateIssuePlace')} / Date & Issue Place`} value={form.dateIssuePlace} onChange={v => setForm(p => ({ ...p, dateIssuePlace: v }))} />
            <FormField label={`${t('birthDate')} / Birth Date`} value={form.birthDate} onChange={v => setForm(p => ({ ...p, birthDate: v }))} type="date" />
            <div>
              <Label className="text-foreground font-medium mb-2 block">{t('bloodType')} / Blood Type</Label>
              <Select value={form.bloodType} onValueChange={v => setForm(p => ({ ...p, bloodType: v }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="--" /></SelectTrigger>
                <SelectContent>{bloodTypes.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <FormField label={`${t('companyNameTel')} / Company Name & Tel.`} value={form.companyNameTel} onChange={v => setForm(p => ({ ...p, companyNameTel: v }))} />
          </div>

          {/* Department */}
          <div>
            <Label className="text-foreground font-medium mb-2 block">{t('department')} / Department</Label>
            <Select value={form.departmentId} onValueChange={v => setForm(p => ({ ...p, departmentId: v }))}>
              <SelectTrigger className="h-11"><SelectValue placeholder={t('selectDepartment')} /></SelectTrigger>
              <SelectContent>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{language === 'ar' ? d.nameAr : d.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Attachments */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('attachments')} / Attachments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {requiredAttachments.map(att => (
                <div key={att.key} className={`border rounded-lg p-3 transition-colors ${files[att.key] ? 'border-success bg-success/5' : 'border-border'}`}>
                  <Label className="text-sm font-medium text-foreground mb-2 block">{t(att.labelKey)}</Label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md bg-muted hover:bg-muted/80 transition-colors text-sm text-muted-foreground">
                      <Upload className="w-4 h-4" />
                      {t('uploadFile')}
                      <input type="file" className="hidden" onChange={e => handleFileChange(att.key, e.target.files?.[0] || null)} />
                    </label>
                    {files[att.key] && (
                      <span className="text-xs text-success flex items-center gap-1">
                        <Check className="w-3 h-3" /> {files[att.key]!.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" className="gradient-primary text-primary-foreground font-semibold px-8">
              {t('submit')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <Label className="text-foreground font-medium mb-2 block text-sm">{label}{required && <span className="text-destructive ms-1">*</span>}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} className="h-11 bg-muted/30" required={required} />
    </div>
  );
}
