import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { StatusBadge } from './DashboardPage';
import { useNavigate } from 'react-router-dom';

export default function MyRequestsPage() {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const { requests } = useRequests();
  const navigate = useNavigate();

  const myReqs = requests.filter(r => r.createdBy === currentUser?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{t('myRequests')}</h1>
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {myReqs.length === 0 ? (
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
                </tr>
              </thead>
              <tbody>
                {myReqs.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/request/${r.id}`)}>
                    <td className="px-4 py-3 font-mono text-primary font-medium">{r.requestNumber}</td>
                    <td className="px-4 py-3">{language === 'ar' ? r.nameAr : r.nameEn}</td>
                    <td className="px-4 py-3">{t(r.employeeType === 'direct' ? 'directEmployee' : 'contractorEmployee')}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} t={t} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</td>
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
