import { PermitRequest, PermitStatus, PermitSignAuthority, PermitType } from '@/types/permit';
import { User } from '@/types';

/**
 * Permit-system signing authority catalog (admin-customizable per user).
 * Each authority is an independent capability checkbox in the user editor.
 */
export const PERMIT_AUTHORITY_CATALOG: { value: PermitSignAuthority; ar: string; en: string; group: 'permit' | 'role' }[] = [
  { value: 'sign_mobile_permit',       ar: 'يوقع على تصاريح الجوال',       en: 'Signs Mobile Phone Permits',       group: 'permit' },
  { value: 'sign_laptop_permit',       ar: 'يوقع على تصاريح الكمبيوتر',    en: 'Signs Laptop Permits',             group: 'permit' },
  { value: 'sign_photography_permit',  ar: 'يوقع على تصاريح التصوير',      en: 'Signs Photography Permits',        group: 'permit' },
  { value: 'role_security_chief',      ar: 'دور: رئيس الأمن الصناعي',      en: 'Role: Industrial Safety Chief',    group: 'role'   },
  { value: 'role_ehss_manager',        ar: 'دور: مدير EHSS',                en: 'Role: EHSS Manager',               group: 'role'   },
  { value: 'role_it_manager',          ar: 'دور: مدير تقنية المعلومات',     en: 'Role: IT Manager',                 group: 'role'   },
];

/** Required authority to act on a given permit at a given stage */
export function requiredAuthority(type: PermitType, status: PermitStatus): PermitSignAuthority[] {
  // Stage 2/3 actor varies; the user must (a) have the type-permit authority AND (b) hold the role for the stage.
  const typeAuth: PermitSignAuthority =
    type === 'mobile_phone' ? 'sign_mobile_permit'
      : type === 'laptop' ? 'sign_laptop_permit'
        : 'sign_photography_permit';

  switch (status) {
    case 'pending_dept_manager':
      // Stage 1: department manager — handled by systemRole + canApproveDepartments (no permit-authority required)
      return [];
    case 'pending_it_review':
      return [typeAuth, 'role_it_manager'];
    case 'pending_security_chief':
      return [typeAuth, 'role_security_chief'];
    case 'pending_ehss_manager':
      return [typeAuth, 'role_ehss_manager'];
    default:
      return [];
  }
}

/** Can the user act on this permit at its current stage? */
export function canActOnPermit(p: PermitRequest, user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true; // admin override

  if (p.status === 'pending_dept_manager') {
    // Stage 1 routes to the department manager of the requester's department.
    const targetDept = p.applicant.departmentId;
    return (
      (user.systemRole === 'dept_manager' || user.systemRole === 'hr_manager') &&
      !!user.canApproveDepartments?.includes(targetDept)
    );
  }

  const required = requiredAuthority(p.permitType, p.status);
  if (required.length === 0) return false;
  const authorities = user.permitAuthorities || [];
  return required.every(r => authorities.includes(r));
}

/** Can the user view this permit (richer than canAct: also creator + read-only roles) */
export function canViewPermit(p: PermitRequest, user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (p.createdBy === user.id) return true;
  if (canActOnPermit(p, user)) return true;
  // Anyone holding the relevant signing authority can read the permit (history)
  const typeAuth: PermitSignAuthority =
    p.permitType === 'mobile_phone' ? 'sign_mobile_permit'
      : p.permitType === 'laptop' ? 'sign_laptop_permit'
        : 'sign_photography_permit';
  return !!user.permitAuthorities?.includes(typeAuth);
}

export function permitTypeLabel(t: PermitType, language: 'ar' | 'en'): string {
  const map: Record<PermitType, { ar: string; en: string }> = {
    mobile_phone: { ar: 'تصريح إدخال الجوال', en: 'Mobile Phone Permit' },
    laptop: { ar: 'تصريح إدخال الكمبيوتر المحمول', en: 'Laptop Permit' },
    photography: { ar: 'تصريح التصوير الفوتوغرافي', en: 'Photography Permit' },
  };
  return map[t][language];
}

export function permitStatusLabel(s: PermitStatus, language: 'ar' | 'en'): string {
  const map: Record<PermitStatus, { ar: string; en: string }> = {
    pending_dept_manager:   { ar: 'بانتظار موافقة مدير الإدارة',          en: 'Pending Dept. Manager' },
    pending_it_review:      { ar: 'بانتظار مراجعة تقنية المعلومات',         en: 'Pending IT Review' },
    pending_security_chief: { ar: 'بانتظار موافقة رئيس الأمن الصناعي',     en: 'Pending Security Chief' },
    pending_ehss_manager:   { ar: 'بانتظار توقيع مدير EHSS',                en: 'Pending EHSS Manager' },
    approved:               { ar: 'مُعتمد - صدر',                            en: 'Approved - Issued' },
    on_hold:                { ar: 'معلق',                                    en: 'On Hold' },
    rejected:               { ar: 'مرفوض',                                   en: 'Rejected' },
  };
  return map[s][language];
}
