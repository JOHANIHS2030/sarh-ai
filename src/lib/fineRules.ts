// Sarh AI — صرح الذكي. Fine calculation rules (contractors only).
import { ViolationType } from '@/types/violation';

export const LOST_FIRST_FINE = 500;
export const LOST_SECOND_FINE = 1000;
export const NOT_RETURNED_WEEKLY_FINE = 100;
export const NOT_RETURNED_MAX_FINE = 500;

export interface FineOutcome {
  fineAmount: number;
  banned: boolean;
  referredToSecurity: boolean;
  ruleAr: string;
  ruleEn: string;
}

export function weeksBetween(fromISO: string, toISO?: string): number {
  if (!fromISO) return 0;
  const from = new Date(fromISO).getTime();
  const to = toISO ? new Date(toISO).getTime() : Date.now();
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return 0;
  return Math.floor((to - from) / (7 * 24 * 60 * 60 * 1000));
}

export function calculateFine(
  violationType: ViolationType,
  opts: { offenseNumber?: number; weeksOverdue?: number }
): FineOutcome {
  if (violationType === 'lost') {
    const n = Math.max(1, opts.offenseNumber || 1);
    if (n === 1) {
      return {
        fineAmount: LOST_FIRST_FINE,
        banned: false,
        referredToSecurity: false,
        ruleAr: 'فقدان للمرة الأولى — غرامة 500 ريال',
        ruleEn: 'First loss — SAR 500 fine',
      };
    }
    if (n === 2) {
      return {
        fineAmount: LOST_SECOND_FINE,
        banned: false,
        referredToSecurity: false,
        ruleAr: 'فقدان للمرة الثانية — غرامة 1000 ريال (مضاعفة)',
        ruleEn: 'Second loss — SAR 1000 fine (doubled)',
      };
    }
    return {
      fineAmount: 0,
      banned: true,
      referredToSecurity: true,
      ruleAr: 'فقدان للمرة الثالثة — يُحرم من إصدار بطاقة أو تصريح مركبة ويُحال للجهة الأمنية',
      ruleEn: 'Third loss — barred from issuance and referred to the security authority',
    };
  }

  const weeks = Math.max(0, opts.weeksOverdue || 0);
  const amount = Math.min(weeks * NOT_RETURNED_WEEKLY_FINE, NOT_RETURNED_MAX_FINE);
  return {
    fineAmount: amount,
    banned: false,
    referredToSecurity: false,
    ruleAr: `عدم إعادة مستند منتهي — 100 ريال عن كل أسبوع (${weeks} أسبوع) بحد أقصى 500 ريال`,
    ruleEn: `Expired document not returned — SAR 100 per week (${weeks} weeks), capped at SAR 500`,
  };
}
