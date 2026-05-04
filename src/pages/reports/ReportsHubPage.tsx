import { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRequests } from '@/contexts/RequestContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { usePermits } from '@/contexts/PermitsContext';
import ReportTablePage from './ReportTablePage';
import { ReportColumn } from '@/lib/exportReports';
import { computeExpiry } from '@/lib/expiryStatus';
import { Shield } from 'lucide-react';

type Domain = 'idcards' | 'stickers' | 'mobile' | 'laptop' | 'photography';
type Bucket = 'all' | 'issued' | 'pending' | 'rejected';

const TITLES: Record<Domain, { ar: string; en: string }> = {
  idcards:     { ar: 'بطاقات الهوية', en: 'ID Cards' },
  stickers:    { ar: 'ملصقات المركبات', en: 'Vehicle Stickers' },
  mobile:      { ar: 'تصاريح إدخال الجوال', en: 'Mobile Phone Permits' },
  laptop:      { ar: 'تصاريح الكمبيوتر المحمول', en: 'Laptop Permits' },
  photography: { ar: 'تصاريح التصوير الفوتوغرافي', en: 'Photography Permits' },
};

const BUCKETS: Record<Bucket, { ar: string; en: string }> = {
  all:      { ar: 'جميع الطلبات', en: 'All Requests' },
  issued:   { ar: 'الصادرة', en: 'Issued' },
  pending:  { ar: 'المعلقة', en: 'On Hold' },
  rejected: { ar: 'المرفوضة', en: 'Rejected' },
};

export default function ReportsHubPage() {
  const { domain, bucket } = useParams<{ domain: Domain; bucket: Bucket }>();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const isAr = language === 'ar';
  const { requests } = useRequests();
  const { stickers } = useVehicleStickers();
  const { permits } = usePermits();

  const validDomain = domain && TITLES[domain] ? domain : null;
  const validBucket = bucket && BUCKETS[bucket] ? bucket : null;

  // Compute filtered slices for all domains unconditionally (Hook rules)
  const idcardsFiltered = useMemo(() => {
    if (!validBucket) return [];
    switch (validBucket) {
      case 'issued':   return requests.filter(r => r.status === 'approved');
      case 'pending':  return requests.filter(r => r.status === 'on_hold');
      case 'rejected': return requests.filter(r => r.status === 'rejected');
      default:         return requests;
    }
  }, [requests, validBucket]);

  const stickersFiltered = useMemo(() => {
    if (!validBucket) return [];
    switch (validBucket) {
      case 'issued':   return stickers.filter(s => s.status === 'approved');
      case 'pending':  return stickers.filter(s => s.status === 'on_hold');
      case 'rejected': return stickers.filter(s => s.status === 'rejected');
      default:         return stickers;
    }
  }, [stickers, validBucket]);

  const permitTypeForDomain = validDomain === 'mobile' ? 'mobile_phone'
    : validDomain === 'laptop' ? 'laptop'
    : validDomain === 'photography' ? 'photography' : null;

  const permitsFiltered = useMemo(() => {
    if (!validBucket || !permitTypeForDomain) return [];
    const base = permits.filter(p => p.permitType === permitTypeForDomain);
    switch (validBucket) {
      case 'issued':   return base.filter(p => p.status === 'approved');
      case 'pending':  return base.filter(p => p.status === 'on_hold');
      case 'rejected': return base.filter(p => p.status === 'rejected');
      default:         return base;
    }
  }, [permits, validBucket, permitTypeForDomain]);

  // Admin-only
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-card p-8 rounded-2xl border border-border max-w-md">
          <Shield className="w-12 h-12 mx-auto text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">{isAr ? 'غير مصرح' : 'Not Authorized'}</h2>
          <p className="text-muted-foreground text-sm">
            {isAr ? 'هذه السجلات متاحة لمدير النظام فقط' : 'These reports are admin-only'}
          </p>
        </div>
      </div>
    );
  }

  if (!validDomain || !validBucket) return <Navigate to="/" replace />;

  const title = `${BUCKETS[validBucket][language]} — ${TITLES[validDomain][language]}`;
  const fileBase = `${validDomain}-${validBucket}`;
  const showExpiryCol = validBucket === 'issued' || validBucket === 'all';

  if (validDomain === 'idcards') {
    const cols: ReportColumn<typeof requests[number]>[] = [
      { key: 'no',     header: isAr ? 'رقم الطلب' : 'Request No.', accessor: r => r.requestNumber },
      { key: 'name',   header: isAr ? 'الاسم' : 'Name',            accessor: r => isAr ? r.nameAr : r.nameEn },
      { key: 'emp',    header: isAr ? 'الرقم الوظيفي' : 'Emp. ID', accessor: r => r.employeeId || '—' },
      { key: 'nat',    header: isAr ? 'الجنسية' : 'Nationality',   accessor: r => r.nationality },
      { key: 'job',    header: isAr ? 'الوظيفة' : 'Job',           accessor: r => r.jobTitle },
      { key: 'card',   header: isAr ? 'رقم البطاقة' : 'Card No.',  accessor: r => r.issuance?.cardNumber || '—' },
      { key: 'issued', header: isAr ? 'تاريخ الإصدار' : 'Issue',   accessor: r => r.issuance?.issueDate || '—' },
      { key: 'exp',    header: isAr ? 'تاريخ الانتهاء' : 'Expiry', accessor: r => r.issuance?.expiryDate || '—' },
      { key: 'date',   header: isAr ? 'تاريخ التقديم' : 'Submitted', accessor: r => new Date(r.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB') },
    ];
    return (
      <ReportTablePage
        title={title}
        rows={idcardsFiltered}
        columns={cols}
        fileBaseName={fileBase}
        showExpiryColumn={showExpiryCol}
        rowMeta={r => ({
          href: `/request/${r.id}`,
          expiry: r.issuance?.expiryDate ? computeExpiry(r.issuance.expiryDate) : undefined,
        })}
      />
    );
  }

  if (validDomain === 'stickers') {
    const cols: ReportColumn<typeof stickers[number]>[] = [
      { key: 'no',     header: isAr ? 'رقم الطلب' : 'Request No.',  accessor: s => s.requestNumber },
      { key: 'driver', header: isAr ? 'اسم السائق' : 'Driver',       accessor: s => s.driver.name },
      { key: 'emp',    header: isAr ? 'الرقم الوظيفي' : 'Emp. ID',   accessor: s => s.driver.employeeId || '—' },
      { key: 'plate',  header: isAr ? 'رقم اللوحة' : 'Plate',        accessor: s => s.vehicle.plateNumber },
      { key: 'veh',    header: isAr ? 'المركبة' : 'Vehicle',         accessor: s => s.vehicle.vehicleType },
      { key: 'permit', header: isAr ? 'رقم التصريح' : 'Permit No.',  accessor: s => s.securityIssuance?.permitNumber || '—' },
      { key: 'issued', header: isAr ? 'تاريخ الإصدار' : 'Issue',     accessor: s => s.securityIssuance?.issueDate || '—' },
      { key: 'exp',    header: isAr ? 'تاريخ الانتهاء' : 'Expiry',   accessor: s => s.securityIssuance?.expiryDate || '—' },
      { key: 'date',   header: isAr ? 'تاريخ التقديم' : 'Submitted', accessor: s => new Date(s.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB') },
    ];
    return (
      <ReportTablePage
        title={title}
        rows={stickersFiltered}
        columns={cols}
        fileBaseName={fileBase}
        showExpiryColumn={showExpiryCol}
        rowMeta={s => ({
          href: `/stickers/request/${s.id}`,
          expiry: s.securityIssuance?.expiryDate ? computeExpiry(s.securityIssuance.expiryDate) : undefined,
        })}
      />
    );
  }

  // Permit domain
  const cols: ReportColumn<typeof permits[number]>[] = [
    { key: 'no',    header: isAr ? 'رقم الطلب' : 'Request No.',  accessor: p => p.requestNumber },
    { key: 'name',  header: isAr ? 'الاسم' : 'Name',              accessor: p => p.applicant.name },
    { key: 'emp',   header: isAr ? 'الرقم الوظيفي' : 'Emp. ID',   accessor: p => p.applicant.employeeId },
    { key: 'job',   header: isAr ? 'الوظيفة' : 'Job',             accessor: p => p.applicant.jobTitle },
    { key: 'from',  header: isAr ? 'من' : 'From',                 accessor: p => p.validityFrom || '—' },
    { key: 'exp',   header: isAr ? 'تاريخ الانتهاء' : 'Expiry',   accessor: p => p.validityExpiry || '—' },
    { key: 'date',  header: isAr ? 'تاريخ التقديم' : 'Submitted', accessor: p => new Date(p.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB') },
  ];
  return (
    <ReportTablePage
      title={title}
      rows={permitsFiltered}
      columns={cols}
      fileBaseName={fileBase}
      showExpiryColumn={showExpiryCol}
      rowMeta={p => ({
        href: `/permits/request/${p.id}`,
        expiry: p.validityExpiry ? computeExpiry(p.validityExpiry) : undefined,
      })}
    />
  );
}
