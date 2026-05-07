// Aggregates expiring/expired IDs, stickers, and permits for admin notifications & dashboard.
import { IDCardRequest } from '@/types';
import { VehicleStickerRequest } from '@/types/vehicleSticker';
import { PermitRequest } from '@/types/permit';
import { computeExpiry, ExpiryInfo } from './expiryStatus';

export type ExpiryItemKind = 'idcard' | 'sticker' | 'permit';

export interface ExpiryItem {
  id: string;
  kind: ExpiryItemKind;
  requestNumber: string;
  title: string;          // person or device label
  subtitle?: string;      // type / dept
  expiryDate: string;
  info: ExpiryInfo;
  link: string;           // route to open details
}

export function collectExpiryItems(args: {
  requests: IDCardRequest[];
  stickers: VehicleStickerRequest[];
  permits: PermitRequest[];
  language: 'ar' | 'en';
}): ExpiryItem[] {
  const { requests, stickers, permits, language } = args;
  const items: ExpiryItem[] = [];

  requests.forEach(r => {
    const exp = r.issuance?.expiryDate;
    if (!exp || r.status !== 'approved') return;
    const info = computeExpiry(exp);
    if (info.status === 'unknown' || info.status === 'valid' && (info.daysRemaining ?? 999) > 30) return;
    items.push({
      id: r.id,
      kind: 'idcard',
      requestNumber: r.requestNumber,
      title: language === 'ar' ? r.nameAr : r.nameEn,
      subtitle: language === 'ar' ? 'بطاقة هوية' : 'ID Card',
      expiryDate: exp,
      info,
      link: `/request/${r.id}`,
    });
  });

  stickers.forEach(s => {
    const exp = s.securityIssuance?.expiryDate;
    if (!exp || s.status !== 'approved') return;
    const info = computeExpiry(exp);
    if (info.status === 'unknown' || (info.status === 'valid' && (info.daysRemaining ?? 999) > 30)) return;
    items.push({
      id: s.id,
      kind: 'sticker',
      requestNumber: s.requestNumber,
      title: s.driver.name,
      subtitle: language === 'ar' ? `ملصق مركبة — ${s.vehicle.plateNumber}` : `Vehicle Sticker — ${s.vehicle.plateNumber}`,
      expiryDate: exp,
      info,
      link: `/stickers/request/${s.id}`,
    });
  });

  permits.forEach(p => {
    const exp = p.validityExpiry;
    if (!exp || p.status !== 'approved') return;
    const info = computeExpiry(exp);
    if (info.status === 'unknown' || (info.status === 'valid' && (info.daysRemaining ?? 999) > 30)) return;
    const typeLabel: Record<string, { ar: string; en: string }> = {
      mobile_phone: { ar: 'تصريح جوال', en: 'Mobile Permit' },
      laptop: { ar: 'تصريح كمبيوتر محمول', en: 'Laptop Permit' },
      photography: { ar: 'تصريح تصوير', en: 'Photography Permit' },
    };
    items.push({
      id: p.id,
      kind: 'permit',
      requestNumber: p.requestNumber,
      title: p.applicant.name,
      subtitle: typeLabel[p.permitType][language],
      expiryDate: exp,
      info,
      link: `/permits/request/${p.id}`,
    });
  });

  // expired first, then expiring (soonest), then valid
  return items.sort((a, b) => {
    const order = { expired: 0, expiring: 1, valid: 2, unknown: 3 } as const;
    if (order[a.info.status] !== order[b.info.status]) return order[a.info.status] - order[b.info.status];
    return (a.info.daysRemaining ?? 0) - (b.info.daysRemaining ?? 0);
  });
}
