// Admin-only expiry dashboard with stats, charts and quick lists.
import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRequests } from '@/contexts/RequestContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { usePermits } from '@/contexts/PermitsContext';
import { collectExpiryItems } from '@/lib/expiryAggregator';
import { expiryBadgeClasses, expiryLabel } from '@/lib/expiryStatus';
import { Shield, AlertCircle, AlertTriangle, CheckCircle2, IdCard, Car, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ExpiryDashboardPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { requests } = useRequests();
  const { stickers } = useVehicleStickers();
  const { permits } = usePermits();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const items = useMemo(
    () => collectExpiryItems({ requests, stickers, permits, language }),
    [requests, stickers, permits, language]
  );

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const expired = items.filter(i => i.info.status === 'expired');
  const expiring = items.filter(i => i.info.status === 'expiring');

  const breakdown = (kind: 'idcard' | 'sticker' | 'permit') => ({
    expired: expired.filter(i => i.kind === kind).length,
    expiring: expiring.filter(i => i.kind === kind).length,
  });

  const idStats = breakdown('idcard');
  const stStats = breakdown('sticker');
  const prStats = breakdown('permit');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          {isAr ? 'لوحة الصلاحية والتنبيهات' : 'Expiry & Alerts Dashboard'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAr
            ? 'نظرة شاملة لحالة جميع البطاقات والملصقات والتصاريح الصادرة'
            : 'Overview of all issued IDs, stickers, and permits — track validity at a glance.'}
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={isAr ? 'منتهية' : 'Expired'}
          count={expired.length}
          color="bg-red-500"
          icon={AlertCircle}
        />
        <StatCard
          title={isAr ? 'قريبة الانتهاء (30 يوم)' : 'Expiring (30 days)'}
          count={expiring.length}
          color="bg-orange-500"
          icon={AlertTriangle}
        />
        <StatCard
          title={isAr ? 'صادرة وصالحة' : 'Issued & Valid'}
          count={
            requests.filter(r => r.status === 'approved').length +
            stickers.filter(s => s.status === 'approved').length +
            permits.filter(p => p.status === 'approved').length -
            expired.length - expiring.length
          }
          color="bg-blue-500"
          icon={CheckCircle2}
        />
      </div>

      {/* Per-domain breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DomainCard title={isAr ? 'بطاقات الهوية' : 'ID Cards'} icon={IdCard} stats={idStats} isAr={isAr} />
        <DomainCard title={isAr ? 'ملصقات المركبات' : 'Vehicle Stickers'} icon={Car} stats={stStats} isAr={isAr} />
        <DomainCard title={isAr ? 'التصاريح' : 'Permits'} icon={ShieldCheck} stats={prStats} isAr={isAr} />
      </div>

      {/* Expired list */}
      <Section
        title={isAr ? 'العناصر المنتهية' : 'Expired Items'}
        items={expired}
        empty={isAr ? 'لا توجد عناصر منتهية' : 'No expired items'}
        accent="red"
        onClick={(href) => navigate(href)}
        language={language}
      />

      {/* Expiring list */}
      <Section
        title={isAr ? 'العناصر القريبة من الانتهاء' : 'Expiring Soon'}
        items={expiring}
        empty={isAr ? 'لا توجد عناصر قريبة من الانتهاء' : 'No items expiring soon'}
        accent="orange"
        onClick={(href) => navigate(href)}
        language={language}
      />
    </div>
  );
}

function StatCard({ title, count, color, icon: Icon }: { title: string; count: number; color: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{count}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function DomainCard({ title, icon: Icon, stats, isAr }: { title: string; icon: any; stats: { expired: number; expiring: number }; isAr: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-red-700 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {isAr ? 'منتهية' : 'Expired'}</span>
            <span className="font-bold">{stats.expired}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-orange-700 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {isAr ? 'قريبة الانتهاء' : 'Expiring'}</span>
            <span className="font-bold">{stats.expiring}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, items, empty, accent, onClick, language }: {
  title: string;
  items: ReturnType<typeof collectExpiryItems>;
  empty: string;
  accent: 'red' | 'orange';
  onClick: (href: string) => void;
  language: 'ar' | 'en';
}) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className={`px-5 py-3 border-b border-border ${accent === 'red' ? 'bg-red-50' : 'bg-orange-50'}`}>
        <h2 className="font-semibold text-foreground">{title} <span className="text-muted-foreground font-normal">({items.length})</span></h2>
      </div>
      {items.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">{empty}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-xs">
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{language === 'ar' ? 'رقم' : 'No.'}</th>
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{language === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</th>
                <th className="px-4 py-2 text-start font-medium text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={`${it.kind}-${it.id}`} onClick={() => onClick(it.link)} className="border-t border-border hover:bg-muted/30 cursor-pointer">
                  <td className="px-4 py-2 font-mono text-primary">{it.requestNumber}</td>
                  <td className="px-4 py-2">{it.subtitle}</td>
                  <td className="px-4 py-2">{it.title}</td>
                  <td className="px-4 py-2">{it.expiryDate}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${expiryBadgeClasses(it.info.status)}`}>{expiryLabel(it.info, language)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
