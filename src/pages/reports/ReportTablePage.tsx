import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, FileText, Search, ArrowLeft } from 'lucide-react';
import { ReportColumn, exportReportToExcel, exportReportToPDF } from '@/lib/exportReports';
import { ExpiryInfo, expiryBadgeClasses, expiryLabel } from '@/lib/expiryStatus';

export interface ReportRowMeta {
  // optional expiry info for status-coloring & sorting
  expiry?: ExpiryInfo;
  // optional click target
  href?: string;
}

interface Props<T extends { id: string }> {
  title: string;
  subtitle?: string;
  rows: T[];
  columns: ReportColumn<T>[];
  fileBaseName: string;
  rowMeta?: (row: T) => ReportRowMeta | undefined;
  // Optional renderer for the "expiry" column when available
  showExpiryColumn?: boolean;
  searchAccessor?: (row: T) => string;
  emptyMessage?: string;
}

export default function ReportTablePage<T extends { id: string }>({
  title,
  subtitle,
  rows,
  columns,
  fileBaseName,
  rowMeta,
  showExpiryColumn,
  searchAccessor,
  emptyMessage,
}: Props<T>) {
  const { language } = useLanguage();
  const { settings } = useCompany();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const isAr = language === 'ar';

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      if (searchAccessor) return searchAccessor(r).toLowerCase().includes(q);
      return columns.some(c => String(c.accessor(r) ?? '').toLowerCase().includes(q));
    });
  }, [rows, query, columns, searchAccessor]);

  const stamp = new Date().toISOString().slice(0, 10);

  // Build the column list passed to exporters — includes status text if available
  const exportColumns: ReportColumn<T>[] = showExpiryColumn
    ? [
        ...columns,
        {
          key: '__status',
          header: isAr ? 'حالة الصلاحية' : 'Validity Status',
          accessor: (r: T) => {
            const m = rowMeta?.(r);
            return m?.expiry ? expiryLabel(m.expiry, language) : '—';
          },
        },
      ]
    : columns;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            exportReportToExcel({
              title: title.slice(0, 28),
              columns: exportColumns,
              rows: filtered,
              fileName: `${fileBaseName}-${stamp}.xlsx`,
            })
          }
        >
          <FileSpreadsheet className="w-4 h-4" />
          {isAr ? 'تصدير Excel' : 'Export Excel'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            exportReportToPDF({
              title,
              subtitle,
              columns: exportColumns,
              rows: filtered,
              fileName: `${fileBaseName}-${stamp}.pdf`,
              language,
              companyName: isAr ? settings.nameAr : settings.nameEn,
              companyLogo: settings.logo,
            })
          }
        >
          <FileText className="w-4 h-4" />
          {isAr ? 'تصدير PDF' : 'Export PDF'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? 'right-3' : 'left-3'}`} />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في السجل...' : 'Search records...'}
              className={isAr ? 'pr-10' : 'pl-10'}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {emptyMessage || (isAr ? 'لا توجد سجلات' : 'No records')}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {columns.map(c => (
                      <th key={c.key} className="text-start px-3 py-2 font-semibold text-muted-foreground text-xs">
                        {c.header}
                      </th>
                    ))}
                    {showExpiryColumn && (
                      <th className="text-start px-3 py-2 font-semibold text-muted-foreground text-xs">
                        {isAr ? 'حالة الصلاحية' : 'Validity'}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const meta = rowMeta?.(r);
                    return (
                      <tr
                        key={r.id}
                        className={`border-t border-border ${meta?.href ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                        onClick={() => meta?.href && navigate(meta.href)}
                      >
                        {columns.map(c => (
                          <td key={c.key} className="px-3 py-2 text-foreground">{String(c.accessor(r) ?? '—')}</td>
                        ))}
                        {showExpiryColumn && (
                          <td className="px-3 py-2">
                            {meta?.expiry ? (
                              <Badge className={`${expiryBadgeClasses(meta.expiry.status)} font-medium border`}>
                                {expiryLabel(meta.expiry, language)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {isAr ? 'إجمالي السجلات' : 'Total records'}: {filtered.length}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
