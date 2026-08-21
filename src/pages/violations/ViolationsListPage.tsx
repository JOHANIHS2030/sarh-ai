import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useViolations } from '@/contexts/ViolationsContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Gavel, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function ViolationsListPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { violations, updatePaymentStatus, deleteViolation } = useViolations();
  const [query, setQuery] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return violations;
    return violations.filter(v =>
      [v.violationNumber, v.contractorName, v.contractorCompany, v.employeeId, v.documentNumber]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [violations, query]);

  const totals = useMemo(() => {
    const total = violations.reduce((s, v) => s + v.fineAmount, 0);
    const unpaid = violations.filter(v => v.paymentStatus === 'unpaid').reduce((s, v) => s + v.fineAmount, 0);
    return { total, unpaid, count: violations.length };
  }, [violations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gavel className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{isAr ? 'المخالفات والغرامات' : 'Violations & Fines'}</h1>
            <p className="text-sm text-muted-foreground">
              {isAr ? 'المقاولون فقط — بطاقات الهوية وتصاريح المركبات' : 'Contractors only — ID cards & vehicle permits'}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate('/violations/new')}>
          <Plus className="w-4 h-4 me-2" />
          {isAr ? 'مخالفة جديدة' : 'New violation'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{isAr ? 'عدد المخالفات' : 'Violations'}</p>
          <p className="text-2xl font-bold">{totals.count}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي الغرامات' : 'Total fines'}</p>
          <p className="text-2xl font-bold">{totals.total} {isAr ? 'ريال' : 'SAR'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{isAr ? 'غير مسددة' : 'Unpaid'}</p>
          <p className="text-2xl font-bold text-destructive">{totals.unpaid} {isAr ? 'ريال' : 'SAR'}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute top-3 start-3 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder={isAr ? 'بحث...' : 'Search...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="p-2 text-start">{isAr ? 'الرقم' : 'No.'}</th>
                  <th className="p-2 text-start">{isAr ? 'المخالف' : 'Violator'}</th>
                  <th className="p-2 text-start">{isAr ? 'الشركة' : 'Company'}</th>
                  <th className="p-2 text-start">{isAr ? 'المستند' : 'Document'}</th>
                  <th className="p-2 text-start">{isAr ? 'المخالفة' : 'Violation'}</th>
                  <th className="p-2 text-start">{isAr ? 'الغرامة' : 'Fine'}</th>
                  <th className="p-2 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-2 text-start"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(v => (
                  <tr key={v.id} className="border-b hover:bg-muted/40">
                    <td className="p-2 font-mono text-xs">{v.violationNumber}</td>
                    <td className="p-2">{v.contractorName}</td>
                    <td className="p-2">{v.contractorCompany}</td>
                    <td className="p-2">
                      {v.assetType === 'id_card' ? (isAr ? 'بطاقة هوية' : 'ID Card') : (isAr ? 'تصريح مركبة' : 'Vehicle Permit')}
                      <span className="block text-xs text-muted-foreground font-mono">{v.documentNumber}</span>
                    </td>
                    <td className="p-2">
                      {v.violationType === 'lost'
                        ? `${isAr ? 'فقدان' : 'Lost'} (${isAr ? 'المرة' : 'time'} ${v.offenseNumber})`
                        : `${isAr ? 'عدم إعادة' : 'Not returned'} (${v.weeksOverdue} ${isAr ? 'أسبوع' : 'wk'})`}
                      {v.referredToSecurity && (
                        <Badge variant="destructive" className="ms-2">
                          {isAr ? 'إحالة أمنية' : 'Referred'}
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 font-semibold">{v.fineAmount} {isAr ? 'ريال' : 'SAR'}</td>
                    <td className="p-2">
                      <Badge variant={v.paymentStatus === 'paid' ? 'default' : v.paymentStatus === 'waived' ? 'secondary' : 'destructive'}>
                        {v.paymentStatus === 'paid'
                          ? (isAr ? 'مسددة' : 'Paid')
                          : v.paymentStatus === 'waived'
                            ? (isAr ? 'ملغاة' : 'Waived')
                            : (isAr ? 'غير مسددة' : 'Unpaid')}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {v.paymentStatus === 'unpaid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updatePaymentStatus(v.id, 'paid', currentUser?.id || '')}
                          >
                            <CheckCircle2 className="w-4 h-4 me-1" />
                            {isAr ? 'تسديد' : 'Mark paid'}
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="icon" variant="ghost" onClick={() => deleteViolation(v.id, currentUser?.id || '')}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      {isAr ? 'لا توجد مخالفات مسجلة' : 'No violations recorded'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
