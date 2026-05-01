import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { useExternalUsers } from '@/contexts/ExternalUsersContext';
import { initialDepartments } from '@/data/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Check, Shield, Globe, LogOut, Lock, Car, User, Building } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StickerType, DriverInfo, VehicleInfo, ContractorInfo } from '@/types/vehicleSticker';
import Barcode from 'react-barcode';
import defaultBg from '@/assets/login-bg.jpg';

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

export default function ExternalVehicleStickerPage() {
  const { settings } = useCompany();
  const { addSticker } = useVehicleStickers();
  const { currentExternalUser, externalLogin, externalLogout } = useExternalUsers();
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const bg = settings.loginBackground || defaultBg;

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Default to contractor_vehicle for external users (most relevant)
  const [stickerType, setStickerType] = useState<StickerType>('contractor_vehicle');
  const [driver, setDriver] = useState<DriverInfo>(emptyDriver);
  const [vehicle, setVehicle] = useState<VehicleInfo>(emptyVehicle);
  const [contractor, setContractor] = useState<ContractorInfo>({
    ...emptyContractor,
    contractorName: currentExternalUser?.companyName || '',
    contractorRepresentative: currentExternalUser?.representativeName || '',
    phoneNumber: currentExternalUser?.mobile || currentExternalUser?.phone || '',
  });
  const [departmentId, setDepartmentId] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedNumber, setSubmittedNumber] = useState('');

  const allDepartments = useMemo(() => {
    const saved = localStorage.getItem('farabi_departments');
    return saved ? JSON.parse(saved) : initialDepartments;
  }, []);

  const departments = useMemo(() => {
    if (!currentExternalUser) return [];
    return allDepartments.filter((d: any) => currentExternalUser.allowedDepartmentIds.includes(d.id));
  }, [allDepartments, currentExternalUser]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const ok = externalLogin(loginForm.username, loginForm.password);
    if (!ok) setLoginError(t('اسم المستخدم أو كلمة المرور غير صحيحة', 'Invalid credentials'));
  };

  // Login screen
  if (!currentExternalUser) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="absolute inset-0">
          <img src={bg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary/70" />
        </div>
        <button onClick={() => setLanguage(l => l === 'ar' ? 'en' : 'ar')}
          className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground hover:bg-primary-foreground/20 transition-colors">
          <Globe className="w-4 h-4" /><span className="text-sm">{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="bg-card rounded-2xl shadow-elevated overflow-hidden">
            <div className="gradient-primary px-6 py-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-xl bg-accent flex items-center justify-center mb-3">
                <Lock className="w-7 h-7 text-accent-foreground" />
              </div>
              <h1 className="text-lg font-bold text-primary-foreground">{t('دخول مندوبي الشركات', 'Contractor Login')}</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">
                {t('طلب ملصق مركبة', 'Vehicle Sticker Request')}
              </p>
            </div>
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div>
                <Label className="mb-1 block text-sm">{t('اسم المستخدم', 'Username')}</Label>
                <Input value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} required className="h-11" autoFocus />
              </div>
              <div>
                <Label className="mb-1 block text-sm">{t('كلمة المرور', 'Password')}</Label>
                <Input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required className="h-11" />
              </div>
              {loginError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  {loginError}
                </div>
              )}
              <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
                {t('دخول', 'Sign In')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isContractor = stickerType === 'contractor_vehicle';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver.name || !driver.licenseNumber || !vehicle.vehicleType || !vehicle.plateNumber || !departmentId) {
      toast({ title: t('يرجى تعبئة الحقول المطلوبة', 'Please fill required fields'), variant: 'destructive' });
      return;
    }
    if (!currentExternalUser.allowedDepartmentIds.includes(departmentId)) {
      toast({ title: t('غير مصرح بهذا القسم', 'Department not allowed'), variant: 'destructive' });
      return;
    }
    if (!files['iqama'] || !files['driverLicense'] || !files['vehicleRegistration'] || !files['periodicInspection']) {
      toast({ title: t('يرجى رفع جميع المرفقات المطلوبة', 'Please upload all required attachments'), variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const attachments = await Promise.all(
        Object.entries(files).filter(([, f]) => f).map(async ([key, file]) => ({
          id: key, name: file!.name, type: file!.type, data: await fileToBase64(file!),
        }))
      );

      const created = addSticker({
        stickerType,
        driver,
        vehicle,
        contractor: isContractor ? contractor : undefined,
        departmentId,
        attachments,
        createdBy: `external:${currentExternalUser.companyName} - ${currentExternalUser.representativeName}`,
      });

      setSubmittedNumber(created.requestNumber);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="absolute inset-0"><img src={bg} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-primary/70" /></div>
        <div className="bg-card rounded-2xl shadow-elevated p-8 text-center relative z-10 max-w-md mx-4">
          <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t('تم تقديم طلب الملصق بنجاح', 'Sticker Request Submitted')}</h2>
          <p className="text-muted-foreground mb-4">{t('رقم الطلب', 'Reference')}: <strong className="font-mono">{submittedNumber}</strong></p>
          <div className="bg-muted rounded-lg p-3 inline-block"><Barcode value={submittedNumber} width={1.5} height={40} fontSize={12} /></div>
          <div className="mt-4">
            <Button onClick={() => { setSubmitted(false); setDriver(emptyDriver); setVehicle(emptyVehicle); setFiles({}); }} variant="outline" className="me-2">
              {t('طلب جديد', 'New Request')}
            </Button>
            <Button onClick={externalLogout} variant="destructive">{t('خروج', 'Sign Out')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0"><img src={bg} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-primary/60" /></div>

      <div className="relative z-10 max-w-4xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setLanguage(l => l === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground hover:bg-primary-foreground/20 transition-colors">
            <Globe className="w-4 h-4" /><span className="text-sm">{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
          <button onClick={externalLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/80 backdrop-blur-sm text-white hover:bg-destructive transition-colors text-sm font-medium">
            <LogOut className="w-4 h-4" />
            <span>{t('تسجيل الخروج', 'Sign Out')}</span>
          </button>
        </div>

        <div className="bg-card rounded-2xl shadow-elevated overflow-hidden">
          <div className="gradient-primary px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Car className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground">{t('طلب ملصق مركبة', 'Vehicle Sticker Request')}</h1>
                <p className="text-primary-foreground/80 text-sm">{currentExternalUser.companyName} — {currentExternalUser.representativeName}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Sticker type */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">{t('نوع الملصق', 'Sticker Type')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: 'contractor_vehicle' as StickerType, ar: 'مركبة مقاول', en: 'Contractor Vehicle', icon: Building },
                  { v: 'employee' as StickerType, ar: 'موظف', en: 'Employee', icon: User },
                ]).map(({ v, ar, en, icon: Icon }) => (
                  <button key={v} type="button" onClick={() => setStickerType(v)}
                    className={`p-3 rounded-lg border-2 flex items-center gap-2 ${stickerType === v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{language === 'ar' ? ar : en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Driver */}
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><User className="w-4 h-4" />{t('بيانات السائق', 'Driver')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">{t('الاسم', 'Name')} *</Label><Input value={driver.name} onChange={e => setDriver(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label className="text-xs">{t('الرقم الوظيفي', 'Employee ID')}</Label><Input value={driver.employeeId} onChange={e => setDriver(p => ({ ...p, employeeId: e.target.value }))} /></div>
                <div><Label className="text-xs">{t('الجنسية', 'Nationality')}</Label><Input value={driver.nationality} onChange={e => setDriver(p => ({ ...p, nationality: e.target.value }))} /></div>
                <div><Label className="text-xs">{t('رقم رخصة القيادة', 'License No.')} *</Label><Input value={driver.licenseNumber} onChange={e => setDriver(p => ({ ...p, licenseNumber: e.target.value }))} /></div>
                <div><Label className="text-xs">{t('مكان الإصدار', 'Issue Place')}</Label><Input value={driver.licenseIssuePlace} onChange={e => setDriver(p => ({ ...p, licenseIssuePlace: e.target.value }))} /></div>
                <div><Label className="text-xs">{t('تاريخ الإصدار', 'Issue Date')}</Label><Input type="date" value={driver.licenseIssueDate} onChange={e => setDriver(p => ({ ...p, licenseIssueDate: e.target.value }))} /></div>
                <div><Label className="text-xs">{t('تاريخ الإنتهاء', 'Expiry')}</Label><Input type="date" value={driver.licenseExpiryDate} onChange={e => setDriver(p => ({ ...p, licenseExpiryDate: e.target.value }))} /></div>
              </div>
            </div>

            {/* Vehicle */}
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Car className="w-4 h-4" />{t('بيانات المركبة', 'Vehicle')}</h3>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">{t('نوع السيارة', 'Type/Model')} *</Label><Input value={vehicle.vehicleType} onChange={e => setVehicle(p => ({ ...p, vehicleType: e.target.value }))} /></div>
                <div><Label className="text-xs">{t('رقم اللوحة', 'Plate')} *</Label><Input value={vehicle.plateNumber} onChange={e => setVehicle(p => ({ ...p, plateNumber: e.target.value }))} /></div>
                <div><Label className="text-xs">{t('اللون', 'Color')}</Label><Input value={vehicle.color} onChange={e => setVehicle(p => ({ ...p, color: e.target.value }))} /></div>
              </div>
            </div>

            {/* Contractor */}
            {isContractor && (
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Building className="w-4 h-4" />{t('بيانات المقاول', 'Contractor')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">{t('رقم العقد', 'Contract No.')}</Label><Input value={contractor.contractNumber} onChange={e => setContractor(p => ({ ...p, contractNumber: e.target.value }))} /></div>
                  <div><Label className="text-xs">{t('مدة العقد', 'Duration')}</Label><Input value={contractor.contractDuration} onChange={e => setContractor(p => ({ ...p, contractDuration: e.target.value }))} /></div>
                  <div><Label className="text-xs">{t('من', 'Start')}</Label><Input type="date" value={contractor.contractStartDate} onChange={e => setContractor(p => ({ ...p, contractStartDate: e.target.value }))} /></div>
                  <div><Label className="text-xs">{t('إلى', 'End')}</Label><Input type="date" value={contractor.contractEndDate} onChange={e => setContractor(p => ({ ...p, contractEndDate: e.target.value }))} /></div>
                  <div><Label className="text-xs">{t('اسم الشركة', 'Company')}</Label><Input value={contractor.contractorName} onChange={e => setContractor(p => ({ ...p, contractorName: e.target.value }))} /></div>
                  <div><Label className="text-xs">{t('المسؤول', 'Responsible')}</Label><Input value={contractor.responsibleName} onChange={e => setContractor(p => ({ ...p, responsibleName: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {/* Department */}
            <div>
              <Label className="text-sm">{t('الإدارة المعنية', 'Approving Department')} *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder={t('اختر القسم', 'Select')} /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{language === 'ar' ? d.nameAr : d.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Attachments */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">{t('المرفقات', 'Attachments')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'iqama', ar: 'صورة بطاقة الهوية الوطنية / الإقامة *', en: 'National ID / Iqama *' },
                  { key: 'driverLicense', ar: 'رخصة السياقة *', en: 'Driver License *' },
                  { key: 'vehicleRegistration', ar: 'رخصة السير *', en: 'Vehicle Registration *' },
                  { key: 'periodicInspection', ar: 'الفحص الدوري *', en: 'Periodic Inspection *' },
                  { key: 'authorizationLetter', ar: 'تفويض المرور (إن وجد)', en: 'Traffic Authorization (if any)' },
                ].map(att => (
                  <div key={att.key} className={`border rounded p-2 ${files[att.key] ? 'border-success bg-success/5' : 'border-border'}`}>
                    <p className="text-xs mb-1">{language === 'ar' ? att.ar : att.en}</p>
                    <label className="flex items-center gap-1 cursor-pointer text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 w-fit">
                      <Upload className="w-3 h-3" />{t('رفع', 'Upload')}
                      <input type="file" className="hidden" onChange={e => setFiles(p => ({ ...p, [att.key]: e.target.files?.[0] || null }))} />
                    </label>
                    {files[att.key] && <span className="text-[10px] text-success block truncate mt-1">{files[att.key]!.name}</span>}
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-12 gradient-primary text-primary-foreground font-semibold">
              {submitting ? t('جاري الإرسال...', 'Submitting...') : t('تقديم الطلب', 'Submit Request')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
