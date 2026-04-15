import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRequests } from '@/contexts/RequestContext';
import { StatusBadge } from './DashboardPage';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function AllRequestsPage() {
  const { t, language } = useLanguage();
  const { requests } = useRequests();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = requests
    .filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return r.requestNumber.toLowerCase().includes(s) || r.nameAr.includes(s) || r.nameEn.toLowerCase().includes(s) || r.nationalIdNo.includes(s);
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{t('allRequests')}</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ [language === 'ar' ? 'right' : 'left']: '0.75rem' }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder')} className="h-10 ps-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {['pending_dept_approval', 'pending_safety_approval', 'pending_id_review', 'approved', 'on_hold', 'rejected'].map(s => (
              <SelectItem key={s} value={s}>{t(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">{t('noRequests')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('requestNumber')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('name')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('employeeType')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('status')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('createdAt')}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-primary font-medium">{r.requestNumber}</td>
                    <td className="px-4 py-3">{language === 'ar' ? r.nameAr : r.nameEn}</td>
                    <td className="px-4 py-3">{t(r.employeeType === 'direct' ? 'directEmployee' : 'contractorEmployee')}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} t={t} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/request/${r.id}`)} className="text-primary hover:underline text-sm font-medium">{t('view')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
