// Bilingual user guide — in-app page with sections and printable/downloadable PDF.
import { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Download, Printer, ChevronRight, Languages } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';

interface Section { id: string; titleAr: string; titleEn: string; bodyAr: string[]; bodyEn: string[]; }

const SECTIONS: Section[] = [
  {
    id: 'overview',
    titleAr: 'نظرة عامة على النظام',
    titleEn: 'System Overview',
    bodyAr: [
      'هذا النظام مخصص لإدارة طلبات قسم الأمن الصناعي ويشمل: إصدار بطاقات الهوية، إصدار ملصقات المركبات، وإصدار التصاريح الأمنية (إدخال الجوال / الكمبيوتر المحمول / التصوير).',
      'يمكن الوصول للنظام عن طريق تسجيل الدخول باسم المستخدم وكلمة المرور، كما يوجد رابط للنماذج الخارجية للمندوبين الذين لا يملكون حساب.',
    ],
    bodyEn: [
      'This system manages all requests handled by the Industrial Security Department: ID cards, vehicle stickers, and security permits (mobile phone, laptop, photography).',
      'Access requires a username and password. External representatives without an account can submit through the public External Form.',
    ],
  },
  {
    id: 'login',
    titleAr: 'تسجيل الدخول وتغيير اللغة',
    titleEn: 'Login & Language',
    bodyAr: [
      'افتح صفحة تسجيل الدخول، أدخل اسم المستخدم وكلمة المرور ثم اضغط "دخول".',
      'لتبديل اللغة بين العربية والإنجليزية اضغط زر اللغة الموجود أعلى الصفحة أو في أسفل القائمة الجانبية.',
    ],
    bodyEn: [
      'On the login screen, enter your username and password, then press "Sign In".',
      'To switch between Arabic and English, use the language button at the top of the page or at the bottom of the sidebar.',
    ],
  },
  {
    id: 'idcard',
    titleAr: 'إصدار بطاقة الهوية',
    titleEn: 'Issuing an ID Card',
    bodyAr: [
      'من القائمة الجانبية اختر: نظام قسم بطاقات الهوية ← طلب جديد.',
      'اختر نوع الموظف (مباشر / مقاول)، عبّئ بيانات الموظف بالكامل، وأرفق المستندات المطلوبة (نسخة الهوية الوطنية/الإقامة، صورة فوتوغرافية، عقد، إلخ).',
      'يمر الطلب بمراحل الاعتماد التالية: مدير القسم ← فريق السلامة (للمقاولين) ← قسم بطاقات الهوية ← الإصدار النهائي.',
      'بعد الموافقة النهائية يمكن طباعة النموذج النهائي بتواقيع جميع المعتمدين.',
    ],
    bodyEn: [
      'From the sidebar, choose: ID Card Section System → New Request.',
      'Select employee type (Direct / Contractor), fill all required fields, and upload supporting documents (National ID / Iqama copy, recent photo, contract, etc.).',
      'Approval pipeline: Department Manager → Safety Team (contractors) → ID Card Section → Final issuance.',
      'After final approval, you can print the final form including all approval signatures.',
    ],
  },
  {
    id: 'sticker',
    titleAr: 'إصدار ملصق المركبة',
    titleEn: 'Issuing a Vehicle Sticker',
    bodyAr: [
      'من القائمة الجانبية اختر: نظام ملصقات المركبات ← طلب ملصق جديد.',
      'حدد نوع الملصق (موظف / مركبة شركة / مركبة مقاول)، عبّئ بيانات السائق والمركبة، وللمقاولين أضف بيانات العقد وتوقيع المسؤول والختم.',
      'يمر الطلب باعتماد الإدارة المعنية ثم إصدار قسم الأمن الصناعي مع رقم التصريح وتاريخ الانتهاء.',
      'يمكن طباعة النموذج النهائي بعد الموافقة بتواقيع المعتمدين.',
    ],
    bodyEn: [
      'From the sidebar, choose: Vehicle Stickers System → New Sticker Request.',
      'Select sticker type (Employee / Company Vehicle / Contractor Vehicle), fill driver and vehicle info; for contractors include contract details and authorized signature/stamp.',
      'Workflow: Department approval → Industrial Security issuance with permit number and expiry date.',
      'After approval, you can print the final form with all signatures.',
    ],
  },
  {
    id: 'permits',
    titleAr: 'إصدار التصاريح الأمنية',
    titleEn: 'Security Permits',
    bodyAr: [
      'هناك ثلاثة أنواع من التصاريح: إدخال الجوال، الكمبيوتر المحمول، والتصوير.',
      'يتم اختيار نوع التصريح من القائمة الفرعية لنظام التصاريح، ثم تعبئة البيانات المطلوبة وقبول الإقرار والتعهد.',
      'تختلف مراحل الاعتماد حسب نوع التصريح: الجوال (مدير القسم ← رئيس الأمن ← مدير EHSS)، الكمبيوتر (مدير القسم ← مراجعة IT ← رئيس الأمن)، التصوير (مدير القسم ← رئيس الأمن).',
      'عند الموافقة النهائية يدخل المعتمد تاريخ بداية ونهاية الصلاحية يدوياً.',
    ],
    bodyEn: [
      'Three permit types: Mobile Phone, Laptop, and Photography.',
      'Choose the permit type from the Permits submenu, fill the form, and accept the declaration & undertaking.',
      'Approval pipelines vary: Mobile (Dept → Security Chief → EHSS), Laptop (Dept → IT review → Security Chief), Photography (Dept → Security Chief).',
      'On final approval, the approver enters validity start and expiry dates manually.',
    ],
  },
  {
    id: 'reports',
    titleAr: 'السجلات والتقارير (للمدير)',
    titleEn: 'Reports & Records (Admin)',
    bodyAr: [
      'يحتوي النظام على لوحة صلاحية تعرض العناصر المنتهية والقريبة من الانتهاء بالألوان: أزرق (صالح)، برتقالي (≤ 30 يوم)، أحمر (منتهي).',
      'يمكن للمدير الوصول إلى تقارير دورية شهرية أو سنوية وتصديرها بصيغتي PDF و Excel.',
      'تُتاح أيضاً سجلات تفصيلية لكل نوع طلب (الكل / الصادرة / المعلقة / المرفوضة).',
    ],
    bodyEn: [
      'The Expiry Dashboard shows expired and expiring items color-coded: Blue (Valid), Orange (≤30 days), Red (Expired).',
      'Admins can generate Periodic Reports (Monthly / Annual) and export them as PDF or Excel.',
      'Detailed logs are also available per request type (All / Issued / Pending / Rejected).',
    ],
  },
  {
    id: 'notifications',
    titleAr: 'الإشعارات',
    titleEn: 'Notifications',
    bodyAr: [
      'يظهر جرس الإشعارات في أعلى الصفحة الطلبات التي تتطلب موافقتك.',
      'بالنسبة لمدير النظام يضاف تبويب "الصلاحية" الذي يعرض البطاقات والملصقات والتصاريح المنتهية أو القريبة من الانتهاء.',
    ],
    bodyEn: [
      'The notifications bell at the top shows requests awaiting your approval.',
      'For admins, an additional "Expiry" tab lists expired or near-expiry IDs, stickers, and permits.',
    ],
  },
];

export default function UserGuidePage() {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const isAr = language === 'ar';
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      // Render each section to canvas, paginate
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210, pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      if (imgH <= pageH) {
        pdf.addImage(dataUrl, 'JPEG', 0, 0, imgW, imgH);
      } else {
        const slicePx = (pageH * canvas.width) / pageW;
        let y = 0;
        while (y < canvas.height) {
          const h = Math.min(slicePx, canvas.height - y);
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = h;
          slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
          if (y > 0) pdf.addPage();
          pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, (h * pageW) / canvas.width);
          y += h;
        }
      }
      pdf.save(`user-guide-${language}.pdf`);
    } catch {
      toast({ title: isAr ? 'فشل التصدير' : 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header / actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            {isAr ? 'دليل المستخدم' : 'User Guide'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAr
              ? 'دليل شامل لاستخدام نظام قسم الأمن الصناعي بكافة وظائفه — متوفر بالعربية والإنجليزية.'
              : 'Comprehensive guide to using the Industrial Security Department system — available in Arabic and English.'}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> {isAr ? 'طباعة' : 'Print'}
          </Button>
          <Button className="gap-2" onClick={handleDownloadPDF} disabled={exporting}>
            <Download className="w-4 h-4" /> {exporting ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تحميل PDF' : 'Download PDF')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5 print:block">
        {/* TOC */}
        <Card className="md:sticky md:top-20 h-fit print:hidden">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Languages className="w-3 h-3" />
              {isAr ? 'المحتويات' : 'Contents'}
            </p>
            <nav className="space-y-1">
              {SECTIONS.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-1 text-sm px-2 py-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground"
                >
                  <ChevronRight className="w-3 h-3" />
                  {isAr ? s.titleAr : s.titleEn}
                </a>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Body */}
        <div ref={printRef} className="bg-card rounded-xl border border-border p-6 space-y-8 print:border-0 print:shadow-none print:p-0">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-bold text-foreground">
              {isAr ? 'دليل استخدام النظام' : 'System User Guide'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr
                ? 'قسم الأمن الصناعي — شركة الفارابي ينبع للبتروكيماويات'
                : 'Industrial Security Department — Farabi Yanbu Petrochemicals'}
            </p>
          </div>

          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className="space-y-3">
              <h3 className="text-lg font-bold text-primary">
                {i + 1}. {isAr ? s.titleAr : s.titleEn}
              </h3>
              <div className="space-y-2 text-sm leading-relaxed text-foreground">
                {(isAr ? s.bodyAr : s.bodyEn).map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </section>
          ))}

          <div className="border-t border-border pt-4 text-xs text-muted-foreground text-center">
            {isAr
              ? 'تم تطوير هذا النظام بواسطة هاني سالم الجهني — قسم الأمن الصناعي © 2026'
              : 'Developed by Hani Salem Al-Johani — Industrial Security Dept. © 2026'}
          </div>
        </div>
      </div>
    </div>
  );
}
