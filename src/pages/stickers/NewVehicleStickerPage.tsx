import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { initialDepartments } from '@/data/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Check, Car, User, Building, ShieldCheck, Paperclip } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StickerType, DriverInfo, VehicleInfo, ContractorInfo } from '@/types/vehicleSticker';
import { Department } from '@/types';
import { readLocalJSON } from '@/lib/browserStorage';

interface AttachmentDef {
  key: string;
  labelAr: string;
  labelEn: string;
  required: boolean;
  optionalNote?: { ar: string; en: string };
}

const employeeAttachments: AttachmentDef[] = [
  { key: 'iqama', labelAr: 'صورة بطاقة الإقامة', labelEn: 'Iqama Copy', required: true },
  { key: 'driverLicense', labelAr: 'صورة رخصة السياقة', labelEn: 'Driver License', required: true },
  { key: 'vehicleRegistration', labelAr: 'صورة رخصة السير', labelEn: 'Vehicle Registration', required: true },
  {
    key: 'authorizationLetter',
    labelAr: 'التفويض الرسمي من المرور',
    labelEn: 'Official Authorization (Traffic)',
    required: false,
    optionalNote: {
      ar: 'يُرفق فقط إذا كانت المركبة بإسم أحد أفراد العائلة أو شخص آخر',
      en: 'Required only if the vehicle is registered under a family member or another person',
    },
  },
];

const contractorAttachments: AttachmentDef[] = [
  { key: 'iqama', labelAr: 'صورة بطاقة الإقامة', labelEn: 'Iqama Copy', required: true },
  { key: 'driverLicense', labelAr: 'صورة رخصة السياقة', labelEn: 'Driver License', required: true },
  { key: 'vehicleRegistration', labelAr: 'صورة رخصة السير', labelEn: 'Vehicle Registration', required: true },
  {
    key: 'authorizationLetter',
    labelAr: 'التفويض الرسمي من المرور',
    labelEn: 'Official Authorization (Traffic)',
    required: false,
    optionalNote: {
      ar: 'يُرفق فقط إذا كانت المركبة بإسم الشركة المقاولة',
      en: 'Required only if the vehicle is registered under the contractor company',
    },
  },
  { key: 'periodicInspection', labelAr: 'نسخة من الفحص الفني الدوري', labelEn: 'Periodic Vehicle Inspection', required: true },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const emptyDriver: DriverInfo = {
  name: '', employeeId: '', nationality: '', licenseNumber: '',
  licenseIssuePlace: '', licenseIssueDate: '', licenseExpiryDate: '',
};
const emptyVehicle: VehicleInfo = { vehicleType: '', plateNumber: '', color: '' };
const emptyContractor: ContractorInfo = {
  contractNumber: '', contractDuration: '', contractStartDate: '', contractEndDate: '',
  contractorName: '', contractorRepresentative: '', responsibleName: '', phoneNumber: '',
};

export default function NewVehicleStickerPage() {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const { requests } = useRequests();
  const { addSticker } = useVehicleStickers();
  const navigate = useNavigate();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const [stickerType, setStickerType] = useState<StickerType>('employee');
  const [driver, setDriver] = useState<DriverInfo>(emptyDriver);
  const [vehicle, setVehicle] = useState<VehicleInfo>(emptyVehicle);
  const [contractor, setContractor] = useState<ContractorInfo>(emptyContractor);
  const [departmentId, setDepartmentId] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [linkedIdRequestId, setLinkedIdRequestId] = useState<string>('');

  const departments: Department[] = useMemo(
    () => readLocalJSON<Department[]>('farabi_departments', initialDepartments),
    []
  );

  // Approved ID card requests for driver auto-fill (employees only)
  const approvedIdRequests = useMemo(
    () => requests.filter(r => r.status === 'approved' && r.employeeType === 'direct'),
    [requests]
  );

  const handleLinkDriver = (id: string) => {
    setLinkedIdRequestId(id);
    if (!id) return;
    const req = approvedIdRequests.find(r => r.id === id);
    if (!req) return;
    setDriver({
      linkedIdRequestId: req.id,
      name: language === 'ar' ? req.nameAr : req.nameEn,
      employeeId: req.employeeId,
      nationality: req.nationality,
      licenseNumber: '',
      licenseIssuePlace: '',
      licenseIssueDate: '',
      licenseExpiryDate: '',
    });
  };

  const isContractor = stickerType === 'contractor_vehicle';
  const attachmentSpec = isContractor ? contractorAttachments : employeeAttachments;

  const handleFile = (key: string, file: File | null) => {
    setFiles(p => ({ ...p, [key]: file }));
  };

  const validate = (): string | null => {
    if (!driver.name || !driver.licenseNumber) return t('يرجى تعبئة بيانات السائق', 'Please fill driver info');
    if (!vehicle.vehicleType || !vehicle.plateNumber) return t('يرجى تعبئة بيانات السيارة', 'Please fill vehicle info');
    if (isContractor && (!contractor.contractorName || !contractor.contractNumber)) {
      return t('يرجى تعبئة بيانات المقاول', 'Please fill contractor info');
    }
    if (!departmentId) return t('يرجى اختيار الإدارة المعنية', 'Please select the relevant department');
    for (const att of attachmentSpec.filter(a => a.required)) {
      if (!files[att.key]) {
        return t(
          `المرفق المطلوب: ${att.labelAr}`,
          `Required attachment: ${att.labelEn}`
        );
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
        Object.entries(files)
          .filter(([, f]) => f)
          .map(async ([key, file]) => ({
            id: key,
            name: file!.name,
            type: file!.type,
            data: await fileToBase64(file!),
          }))
      );

      const created = addSticker({
        stickerType,
        driver,
        vehicle,
        contractor: isContractor ? contractor : undefined,
        departmentId,
        attachments,
        createdBy: currentUser.id,
      });

      toast({ title: t('تم تقديم الطلب', 'Request submitted'), description: created.requestNumber });
      navigate(`/stickers/request/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const stickerTypes: { value: StickerType; ar: string; en: string; icon: typeof User }[] = [
    { value: 'employee', ar: 'موظف الفارابي', en: 'Farabi Employee', icon: User },
    { value: 'company_vehicle', ar: 'سيارة الشركة', en: 'Company Vehicle', icon: Car },
    { value: 'contractor_vehicle', ar: 'مركبة مقاول', en: 'Contractor Vehicle', icon: Building },
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
          <Car className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('طلب ملصق مركبة جديد', 'New Vehicle Sticker Request')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('شركة الفارابي ينبع للبتروكيماويات', 'Farabi Yanbu Petrochemicals')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Sticker type */}
        <section className="bg-card rounded-xl border border-border p-5">
          <Label className="text-base font-semibold mb-3 block">
            {t('نوع الملصق', 'Sticker Type')} <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stickerTypes.map(s => {
              const Icon = s.icon;
              const active = stickerType === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStickerType(s.value)}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-medium">{language === 'ar' ? s.ar : s.en}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Driver info */}
        <section className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('بيانات السائق', 'Driver Information')}</h2>
          </div>

          {stickerType !== 'contractor_vehicle' && approvedIdRequests.length > 0 && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Label className="mb-1 block text-sm">
                {t('اختيار من بطاقات الهوية المعتمدة (اختياري)', 'Select from Approved ID Cards (optional)')}
              </Label>
              <Select value={linkedIdRequestId} onValueChange={handleLinkDriver}>
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
            <div>
              <Label className="text-sm">{t('الاسم', 'Name')} <span className="text-destructive">*</span></Label>
              <Input value={driver.name} onChange={e => setDriver(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">{t('الرقم الوظيفي', 'Employee ID')}</Label>
              <Input value={driver.employeeId} onChange={e => setDriver(p => ({ ...p, employeeId: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">{t('الجنسية', 'Nationality')}</Label>
              <Input value={driver.nationality} onChange={e => setDriver(p => ({ ...p, nationality: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">{t('رقم رخصة القيادة', 'License Number')} <span className="text-destructive">*</span></Label>
              <Input value={driver.licenseNumber} onChange={e => setDriver(p => ({ ...p, licenseNumber: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">{t('مكان الإصدار', 'Issue Place')}</Label>
              <Input value={driver.licenseIssuePlace} onChange={e => setDriver(p => ({ ...p, licenseIssuePlace: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">{t('تاريخ الإصدار', 'Issue Date')}</Label>
              <Input type="date" value={driver.licenseIssueDate} onChange={e => setDriver(p => ({ ...p, licenseIssueDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">{t('تاريخ الإنتهاء', 'Expiry Date')}</Label>
              <Input type="date" value={driver.licenseExpiryDate} onChange={e => setDriver(p => ({ ...p, licenseExpiryDate: e.target.value }))} />
            </div>
          </div>
        </section>

        {/* Vehicle info */}
        <section className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('بيانات المركبة', 'Vehicle Information')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm">{t('نوع السيارة', 'Vehicle Type / Model')} <span className="text-destructive">*</span></Label>
              <Input value={vehicle.vehicleType} onChange={e => setVehicle(p => ({ ...p, vehicleType: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">{t('رقم اللوحة', 'Plate Number')} <span className="text-destructive">*</span></Label>
              <Input value={vehicle.plateNumber} onChange={e => setVehicle(p => ({ ...p, plateNumber: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">{t('اللون', 'Color')}</Label>
              <Input value={vehicle.color} onChange={e => setVehicle(p => ({ ...p, color: e.target.value }))} />
            </div>
          </div>
        </section>

        {/* Contractor info (only when contractor_vehicle) */}
        {isContractor && (
          <section className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('بيانات المقاول', 'Contractor Information')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">{t('رقم العقد', 'Contract Number')} <span className="text-destructive">*</span></Label>
                <Input value={contractor.contractNumber} onChange={e => setContractor(p => ({ ...p, contractNumber: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{t('مدة العقد', 'Contract Duration')}</Label>
                <Input value={contractor.contractDuration} onChange={e => setContractor(p => ({ ...p, contractDuration: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{t('ابتداءاً من', 'Start Date')}</Label>
                <Input type="date" value={contractor.contractStartDate} onChange={e => setContractor(p => ({ ...p, contractStartDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{t('تاريخ الإنتهاء', 'End Date')}</Label>
                <Input type="date" value={contractor.contractEndDate} onChange={e => setContractor(p => ({ ...p, contractEndDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{t('اسم المقاول (الشركة)', 'Contractor Company Name')} <span className="text-destructive">*</span></Label>
                <Input value={contractor.contractorName} onChange={e => setContractor(p => ({ ...p, contractorName: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{t('مندوب المقاول', 'Contractor Representative')}</Label>
                <Input value={contractor.contractorRepresentative} onChange={e => setContractor(p => ({ ...p, contractorRepresentative: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{t('اسم المسؤول', 'Responsible Name')}</Label>
                <Input value={contractor.responsibleName} onChange={e => setContractor(p => ({ ...p, responsibleName: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{t('رقم الهاتف', 'Phone Number')}</Label>
                <Input value={contractor.phoneNumber} onChange={e => setContractor(p => ({ ...p, phoneNumber: e.target.value }))} />
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">{t('توقيع المسؤول', 'Responsible Signature')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {contractor.responsibleSignature && (
                      <img src={contractor.responsibleSignature} alt="sig" className="h-12 bg-muted/30 rounded border border-border p-1" />
                    )}
                    <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm">
                      <Upload className="w-4 h-4" />
                      {t('رفع', 'Upload')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const data = await fileToBase64(f);
                          setContractor(p => ({ ...p, responsibleSignature: data }));
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">{t('الختم', 'Stamp')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {contractor.stamp && (
                      <img src={contractor.stamp} alt="stamp" className="h-12 bg-muted/30 rounded border border-border p-1" />
                    )}
                    <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm">
                      <Upload className="w-4 h-4" />
                      {t('رفع', 'Upload')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const data = await fileToBase64(f);
                          setContractor(p => ({ ...p, stamp: data }));
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Department routing */}
        <section className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('الإدارة المعنية للموافقة', 'Approving Department')}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {stickerType === 'employee'
              ? t(
                  'سيتم توجيه الطلب لمدير الموارد البشرية للموافقة',
                  'Request will be routed to HR Manager for approval'
                )
              : stickerType === 'company_vehicle'
                ? t(
                    'سيتم توجيه الطلب لمدير الإدارة المعنية للموافقة',
                    'Request will be routed to the relevant Department Manager'
                  )
                : t(
                    'سيتم توجيه الطلب لمدير القسم الذي يعمل معه المقاول',
                    'Request will be routed to the Department Manager working with the contractor'
                  )}
          </p>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger>
              <SelectValue placeholder={t('اختر القسم', 'Select Department')} />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {language === 'ar' ? d.nameAr : d.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* Attachments */}
        <section className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Paperclip className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('المرفقات المطلوبة', 'Required Attachments')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attachmentSpec.map(att => (
              <div
                key={att.key}
                className={`border rounded-lg p-3 ${files[att.key] ? 'border-success bg-success/5' : 'border-border'}`}
              >
                <Label className="text-sm mb-1 block">
                  {language === 'ar' ? att.labelAr : att.labelEn}
                  {att.required && <span className="text-destructive ms-1">*</span>}
                </Label>
                {att.optionalNote && (
                  <p className="text-[11px] text-muted-foreground mb-2">
                    {language === 'ar' ? att.optionalNote.ar : att.optionalNote.en}
                  </p>
                )}
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm text-muted-foreground w-fit">
                  <Upload className="w-4 h-4" />
                  {t('رفع ملف', 'Upload File')}
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => handleFile(att.key, e.target.files?.[0] || null)}
                  />
                </label>
                {files[att.key] && (
                  <span className="text-xs text-success flex items-center gap-1 mt-1">
                    <Check className="w-3 h-3" />
                    {files[att.key]!.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/stickers/my')}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground min-w-[160px]">
            {submitting ? t('جاري الإرسال...', 'Submitting...') : t('تقديم الطلب', 'Submit Request')}
          </Button>
        </div>
      </form>
    </div>
  );
}
