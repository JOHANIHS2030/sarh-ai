// Validity / expiry status helpers used across reports & notifications
// Colors:
//   blue   = valid (more than threshold days remaining)
//   orange = expiring soon (within threshold days)
//   red    = expired

export type ExpiryStatus = 'valid' | 'expiring' | 'expired' | 'unknown';

// Default: items become "expiring" when 30 days or less remain
export const EXPIRY_WARNING_DAYS = 30;

export interface ExpiryInfo {
  status: ExpiryStatus;
  daysRemaining: number | null; // negative if expired, null if no date
  daysOverdue: number | null;   // positive number when expired
  expiryDate: string | null;
}

export function computeExpiry(expiryDateStr?: string | null, warningDays = EXPIRY_WARNING_DAYS): ExpiryInfo {
  if (!expiryDateStr) {
    return { status: 'unknown', daysRemaining: null, daysOverdue: null, expiryDate: null };
  }
  const exp = new Date(expiryDateStr);
  if (isNaN(exp.getTime())) {
    return { status: 'unknown', daysRemaining: null, daysOverdue: null, expiryDate: expiryDateStr };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDay = new Date(exp);
  expDay.setHours(0, 0, 0, 0);
  const ms = expDay.getTime() - today.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return { status: 'expired', daysRemaining: days, daysOverdue: Math.abs(days), expiryDate: expiryDateStr };
  }
  if (days <= warningDays) {
    return { status: 'expiring', daysRemaining: days, daysOverdue: null, expiryDate: expiryDateStr };
  }
  return { status: 'valid', daysRemaining: days, daysOverdue: null, expiryDate: expiryDateStr };
}

export function expiryBadgeClasses(status: ExpiryStatus): string {
  switch (status) {
    case 'valid':    return 'bg-blue-100 text-blue-800 border border-blue-300';
    case 'expiring': return 'bg-orange-100 text-orange-800 border border-orange-300';
    case 'expired':  return 'bg-red-100 text-red-800 border border-red-300';
    default:         return 'bg-gray-100 text-gray-700 border border-gray-300';
  }
}

export function expiryLabel(info: ExpiryInfo, lang: 'ar' | 'en'): string {
  const isAr = lang === 'ar';
  switch (info.status) {
    case 'valid':
      return isAr
        ? `صالح — ${info.daysRemaining} يوم متبقٍ`
        : `Valid — ${info.daysRemaining} day(s) left`;
    case 'expiring':
      return isAr
        ? `قارب على الانتهاء — ${info.daysRemaining} يوم متبقٍ`
        : `Expiring soon — ${info.daysRemaining} day(s) left`;
    case 'expired':
      return isAr
        ? `منتهي — مضى ${info.daysOverdue} يوم`
        : `Expired — ${info.daysOverdue} day(s) overdue`;
    default:
      return isAr ? 'بدون تاريخ انتهاء' : 'No expiry date';
  }
}
