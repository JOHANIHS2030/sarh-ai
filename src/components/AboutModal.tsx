// About / project info modal — describes mission and developer.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, BookOpen } from 'lucide-react';

interface AboutModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const APP_VERSION = '1.0.0';

export default function AboutModal({ open, onOpenChange }: AboutModalProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {isAr ? 'حول النظام' : 'About the System'}
          </DialogTitle>
          <DialogDescription className="sr-only">About this system</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed">
          <p className="text-foreground">
            {isAr
              ? 'هذا النظام هو مبادرة مخصّصة من قسم الأمن الصناعي بشركة الفارابي ينبع للبتروكيماويات لتنظيم وإدارة طلبات إصدار بطاقات الهوية وملصقات المركبات والتصاريح الأمنية بشكل احترافي ومتكامل.'
              : 'This system is a dedicated initiative by the Industrial Security Department at Farabi Yanbu Petrochemicals to professionally organize and manage ID card requests, vehicle stickers, and security permits in a unified workflow.'}
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
            <Row label={isAr ? 'المطوّر' : 'Developer'} value="Hani Salem Al-Johani" />
            <Row label={isAr ? 'الرقم الوظيفي' : 'Employee ID'} value="10594" />
            <Row label={isAr ? 'الإدارة' : 'Department'} value={isAr ? 'قسم الأمن الصناعي — FYPC' : 'Industrial Security Dept. — FYPC'} />
            <Row label={isAr ? 'إصدار النظام' : 'Version'} value={APP_VERSION} />
            <Row label={isAr ? 'حقوق النشر' : 'Copyright'} value="© 2026" />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => { onOpenChange(false); navigate('/help'); }}
          >
            <BookOpen className="w-4 h-4" />
            {isAr ? 'فتح دليل المستخدم' : 'Open User Guide'}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{isAr ? 'إغلاق' : 'Close'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-end">{value}</span>
    </div>
  );
}
