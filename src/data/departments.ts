import { Department } from '@/types';

// Generic departments — generic system, not tied to any specific company
export const initialDepartments: Department[] = [
  { id: 'dept1', nameAr: 'الإدارة التنفيذية', nameEn: 'Executive Management', approverIds: ['u-admin'] },
  { id: 'dept2', nameAr: 'الأمن والسلامة والبيئة', nameEn: 'Safety, Security & Environment', approverIds: ['u-admin', 'u-ehss', 'u-security'] },
  { id: 'dept3', nameAr: 'الموارد البشرية', nameEn: 'Human Resources', approverIds: ['u-hr'] },
  { id: 'dept4', nameAr: 'العمليات', nameEn: 'Operations', approverIds: ['u-ops'] },
  { id: 'dept5', nameAr: 'الصيانة', nameEn: 'Maintenance', approverIds: ['u-maint'] },
  { id: 'dept6', nameAr: 'تقنية المعلومات', nameEn: 'Information Technology', approverIds: ['u-it'] },
  { id: 'dept7', nameAr: 'المشاريع', nameEn: 'Projects', approverIds: ['u-projects'] },
];
