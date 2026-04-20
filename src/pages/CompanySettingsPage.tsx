import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function CompanySettingsPage() {
  const { language } = useLanguage();
  const { settings, updateSettings } = useCompany();
  const isAr = language === 'ar';

  const handleImage = async (key: 'logo' | 'loginBackground', file: File | null) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: isAr ? 'حجم الملف يجب أن يكون أقل من 3 ميجا' : 'File size must be less than 3MB', variant: 'destructive' });
      return;
    }
    const data = await fileToBase64(file);
    updateSettings({ [key]: data });
    toast({ title: isAr ? 'تم الحفظ' : 'Saved' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{isAr ? 'إعدادات الشركة' : 'Company Settings'}</h1>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">{isAr ? 'بيانات الشركة' : 'Company Information'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>{isAr ? 'الاسم بالعربية' : 'Name (Arabic)'}</Label><Input value={settings.nameAr} onChange={e => updateSettings({ nameAr: e.target.value })} /></div>
          <div><Label>{isAr ? 'الاسم بالإنجليزية' : 'Name (English)'}</Label><Input value={settings.nameEn} onChange={e => updateSettings({ nameEn: e.target.value })} /></div>
          <div><Label>{isAr ? 'العنوان بالعربية' : 'Address (Arabic)'}</Label><Input value={settings.addressAr} onChange={e => updateSettings({ addressAr: e.target.value })} /></div>
          <div><Label>{isAr ? 'العنوان بالإنجليزية' : 'Address (English)'}</Label><Input value={settings.addressEn} onChange={e => updateSettings({ addressEn: e.target.value })} /></div>
          <div><Label>{isAr ? 'الهاتف' : 'Phone'}</Label><Input value={settings.phone} onChange={e => updateSettings({ phone: e.target.value })} /></div>
          <div><Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label><Input value={settings.email} onChange={e => updateSettings({ email: e.target.value })} /></div>
          <div><Label>{isAr ? 'الموقع الإلكتروني' : 'Website'}</Label><Input value={settings.website} onChange={e => updateSettings({ website: e.target.value })} /></div>
        </div>
        <Button onClick={() => toast({ title: isAr ? 'تم حفظ الإعدادات' : 'Settings saved' })} className="gradient-primary text-primary-foreground">
          {isAr ? 'حفظ البيانات' : 'Save'}
        </Button>
      </div>

      {/* Logo */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><ImageIcon className="w-5 h-5" /> {isAr ? 'شعار الشركة' : 'Company Logo'}</h2>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
            {settings.logo ? (
              <img src={settings.logo} alt="logo" className="w-full h-full object-contain p-2" />
            ) : (
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition">
              <Upload className="w-4 h-4" /> {isAr ? 'رفع الشعار' : 'Upload Logo'}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleImage('logo', e.target.files?.[0] || null)} />
            </label>
            {settings.logo && (
              <Button variant="outline" size="sm" onClick={() => updateSettings({ logo: undefined })} className="border-destructive text-destructive">
                <Trash2 className="w-4 h-4 me-1" /> {isAr ? 'حذف' : 'Remove'}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">{isAr ? 'PNG / JPG ، أقل من 3 ميجا' : 'PNG/JPG, under 3MB'}</p>
          </div>
        </div>
      </div>

      {/* Login background */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><ImageIcon className="w-5 h-5" /> {isAr ? 'خلفية صفحة تسجيل الدخول' : 'Login Page Background'}</h2>
        <div className="flex items-start gap-6">
          <div className="w-64 h-36 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
            {settings.loginBackground ? (
              <img src={settings.loginBackground} alt="bg" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">{isAr ? 'الخلفية الافتراضية' : 'Default background'}</span>
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition">
              <Upload className="w-4 h-4" /> {isAr ? 'رفع خلفية' : 'Upload Background'}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleImage('loginBackground', e.target.files?.[0] || null)} />
            </label>
            {settings.loginBackground && (
              <Button variant="outline" size="sm" onClick={() => updateSettings({ loginBackground: undefined })} className="border-destructive text-destructive">
                <Trash2 className="w-4 h-4 me-1" /> {isAr ? 'إعادة الافتراضي' : 'Reset to default'}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">{isAr ? 'يفضل أن تكون صورة عالية الدقة (1920×1080)' : 'High-resolution image preferred (1920×1080)'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
