// Admin-only periodic (monthly/annual) reports — exportable PDF + Excel
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRequests } from '@/contexts/RequestContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { usePermits } from '@/contexts/PermitsContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarRange, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { exportReportToExcel, exportReportToPDF, ReportColumn } from '@/lib/exportReports';
import { toast } from '@/hooks/use-toast';

type Period = 'monthly' | 'annual';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface SummaryRow {
  domain: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  expired: number;
}

export default function PeriodicReportsPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { settings } = useCompany();
  const { requests } = useRequests();
  const { stickers } = useVehicleStickers();
  const { permits } = usePermits();
  const isAr = language === 'ar';

  const today = new Date();
  const [period, setPeriod] = useState<Period>('monthly');
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth());

  const yearOptions = useMemo(() => {
    const y = today.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, [today]);

  const inRange = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    if (d.getFullYear() !== year) return false;
    if (period === 'monthly' && d.getMonth() !== month) return false;
    return true;
  };

  const filteredIds = useMemo(() => requests.filter(r => inRange(r.createdAt)), [requests, year, month, period]);
  const filteredStk = useMemo(() => stickers.filter(s => inRange(s.createdAt)), [stickers, year, month, period]);
  const filteredPrm = useMemo(() => permits.filter(p => inRange(p.createdAt)), [permits, year, month, period]);

  const summary: SummaryRow[] = useMemo(() => {
    const isExpired = (iso?: string | null) => {
      if (!iso) return false;
      const d = new Date(iso);
      return !isNaN(d.getTime()) && d < new Date();
    };
    const mk = (label: string, list: any[], expiryGetter?: (x: any) => string | undefined): SummaryRow => ({
      domain: label,
      total: list.length,
      approved: list.filter(x => x.status === 'approved').length,
      pending: list.filter(x => String(x.status).startsWith('pending') || x.status === 'on_hold').length,
      rejected: list.filter(x => x.status === 'rejected').length,
      expired: expiryGetter ? list.filter(x => x.status === 'approved' && isExpired(expiryGetter(x))).length : 0,
    });
    return [
      mk(isAr ? 'بطاقات الهوية' : 'ID Cards', filteredIds, (x: any) => x.issuance?.expiryDate),
      mk(isAr ? 'ملصقات المركبات' : 'Vehicle Stickers', filteredStk, (x: any) => x.securityIssuance?.expiryDate),
      mk(isAr ? 'تصاريح إدخال الجوال' : 'Mobile Permits', filteredPrm.filter(p => p.permitType === 'mobile_phone'), (x: any) => x.validityExpiry),
      mk(isAr ? 'تصاريح الكمبيوتر المحمول' : 'Laptop Permits', filteredPrm.filter(p => p.permitType === 'laptop'), (x: any) => x.validityExpiry),
      mk(isAr ? 'تصاريح التصوير' : 'Photography Permits', filteredPrm.filter(p => p.permitType === 'photography'), (x: any) => x.validityExpiry),
    ];
  }, [filteredIds, filteredStk, filteredPrm, isAr]);

  const totals: SummaryRow = summary.reduce(
    (acc, r) => ({ domain: 'TOTAL', total: acc.total + r.total, approved: acc.approved + r.approved, pending: acc.pending + r.pending, rejected: acc.rejected + r.rejected, expired: acc.expired + r.expired }),
    { domain: 'TOTAL', total: 0, approved: 0, pending: 0, rejected: 0, expired: 0 }
  );

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const periodLabel = period === 'monthly'
    ? `${(isAr ? MONTHS_AR : MONTHS_EN)[month]} ${year}`
    : `${year}`;

  const fileBase = `report-${period}-${year}${period === 'monthly' ? `-${String(month + 1).padStart(2, '0')}` : ''}`;

  const exportColumns: ReportColumn<SummaryRow>[] = [
    { key: 'domain',   header: isAr ? 'النوع' : 'Category',     accessor: r => r.domain },
    { key: 'total',    header: isAr ? 'إجمالي' : 'Total',        accessor: r => r.total },
    { key: 'approved', header: isAr ? 'مُصدرة' : 'Issued',       accessor: r => r.approved },
    { key: 'pending',  header: isAr ? 'معلقة' : 'Pending/Hold',  accessor: r => r.pending },
    { key: 'rejected', header: isAr ? 'مرفوضة' : 'Rejected',     accessor: r => r.rejected },
    { key: 'expired',  header: isAr ? 'منتهية' : 'Expired',      accessor: r => r.expired },
  ];

  const handlePDF = async () => {
    try {
      await exportReportToPDF<SummaryRow>({
        title: `${isAr ? 'تقرير' : 'Report'} — ${periodLabel}`,
        subtitle: isAr ? 'تقرير ملخص دوري' : 'Periodic Summary Report',
        columns: exportColumns,
        rows: [...summary, totals],
        fileName: `${fileBase}.pdf`,
        language,
        companyName: isAr ? settings.nameAr : settings.nameEn,
        companyLogo: settings.logo,
      });
    } catch {
      toast({ title: isAr ? 'فشل التصدير' : 'Export failed', variant: 'destructive' });
    }
  };

  const handleExcel = () => {
    try {
      exportReportToExcel<SummaryRow>({
        title: `Report ${periodLabel}`,
        columns: exportColumns,
        rows: [...summary, totals],
        fileName: `${fileBase}.xlsx`,
      });
    } catch {
      toast({ title: isAr ? 'فشل التصدير' : 'Export failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarRange className="w-6 h-6 text-primary" />
          {isAr ? 'التقارير الدورية (شهرية / سنوية)' : 'Periodic Reports (Monthly / Annual)'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAr ? 'ملخصات دورية قابلة للتصدير لكل أنواع الطلبات.' : 'Exportable summary reports across all request types.'}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <Label>{isAr ? 'الفترة' : 'Period'}</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{isAr ? 'شهري' : 'Monthly'}</SelectItem>
                <SelectItem value="annual">{isAr ? 'سنوي' : 'Annual'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isAr ? 'السنة' : 'Year'}</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {period === 'monthly' && (
            <div>
              <Label>{isAr ? 'الشهر' : 'Month'}</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(isAr ? MONTHS_AR : MONTHS_EN).map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2 sm:col-span-1">
            <Button onClick={handlePDF} variant="outline" className="gap-2">
              <FileText className="w-4 h-4" /> PDF
            </Button>
            <Button onClick={handleExcel} variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {isAr ? 'الملخص' : 'Summary'} — {periodLabel}
          </h2>
          <Download className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{isAr ? 'النوع' : 'Category'}</th>
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{isAr ? 'إجمالي' : 'Total'}</th>
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{isAr ? 'مُصدرة' : 'Issued'}</th>
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{isAr ? 'معلقة' : 'Pending/Hold'}</th>
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{isAr ? 'مرفوضة' : 'Rejected'}</th>
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{isAr ? 'منتهية' : 'Expired'}</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{r.domain}</td>
                  <td className="px-4 py-2">{r.total}</td>
                  <td className="px-4 py-2 text-success">{r.approved}</td>
                  <td className="px-4 py-2 text-warning">{r.pending}</td>
                  <td className="px-4 py-2 text-destructive">{r.rejected}</td>
                  <td className="px-4 py-2 text-red-700">{r.expired}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-bold">
                <td className="px-4 py-2">{isAr ? 'الإجمالي' : 'TOTAL'}</td>
                <td className="px-4 py-2">{totals.total}</td>
                <td className="px-4 py-2">{totals.approved}</td>
                <td className="px-4 py-2">{totals.pending}</td>
                <td className="px-4 py-2">{totals.rejected}</td>
                <td className="px-4 py-2">{totals.expired}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
