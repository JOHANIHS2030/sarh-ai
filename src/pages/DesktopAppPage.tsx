// Desktop (Windows) build download page.
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import desktopZip from '@/assets/SarhAI-windows-x64.zip.asset.json';

export default function DesktopAppPage() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(desktopZip.url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'SarhAI-windows-x64.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({
        title: ar ? 'تعذر التحميل، حاول مرة أخرى' : 'Download failed, please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = ar
    ? [
        'حمّل الملف المضغوط ثم فك الضغط عنه في مجلد على جهازك.',
        'افتح المجلد SarhAI-win32-x64 وشغّل الملف SarhAI.exe.',
        'انقر بزر الفأرة الأيمن على SarhAI.exe واختر "تثبيت على سطح المكتب" (إنشاء اختصار) لتشغيله بسرعة لاحقاً.',
        'يعمل البرنامج بدون إنترنت، وتُحفظ البيانات محلياً على نفس الجهاز.',
      ]
    : [
        'Download the ZIP file and extract it into a folder on your computer.',
        'Open the SarhAI-win32-x64 folder and run SarhAI.exe.',
        'Right-click SarhAI.exe and create a desktop shortcut to launch it quickly.',
        'The app runs offline; data is stored locally on that computer.',
      ];

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Monitor className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          {ar ? 'نسخة سطح المكتب' : 'Desktop Version'}
        </h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {ar
              ? 'نسخة قابلة للتثبيت على أجهزة Windows (64-bit) تعمل كتطبيق مستقل على سطح المكتب بنفس واجهة النظام.'
              : 'An installable Windows (64-bit) build that runs as a standalone desktop application with the same interface.'}
          </p>

          <Button onClick={handleDownload} disabled={loading} className="gradient-primary text-primary-foreground gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {ar ? 'تحميل نسخة Windows' : 'Download for Windows'}
          </Button>

          <div>
            <h2 className="font-semibold mb-2 text-foreground">
              {ar ? 'خطوات التثبيت' : 'Installation steps'}
            </h2>
            <ol className="list-decimal ms-5 space-y-2 text-sm text-muted-foreground">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
