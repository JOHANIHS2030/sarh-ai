import { Department } from '@/types';

export const initialDepartments: Department[] = [
  { id: 'dept1', nameAr: 'الإدارة التنفيذية', nameEn: 'Executive Management', approverIds: ['u7'] },
  { id: 'dept2', nameAr: 'قسم البيئة والصحة والسلامة والأمن', nameEn: 'EHSS Department', approverIds: ['u7', 'u6', 'u3'] },
  { id: 'dept3', nameAr: 'قسم الموارد البشرية والخدمات المشتركة', nameEn: 'HR & Shared Services', approverIds: ['u7'] },
  { id: 'dept4', nameAr: 'قسم المشاريع الكبرى', nameEn: 'Major Projects Department', approverIds: ['u7', 'u8'] },
  { id: 'dept5', nameAr: 'قسم الصيانة', nameEn: 'Maintenance Department', approverIds: ['u7', 'u9'] },
  { id: 'dept6', nameAr: 'قسم التشغيل', nameEn: 'Operation Department', approverIds: ['u7'] },
  { id: 'dept7', nameAr: 'قسم تخطيط الأعمال', nameEn: 'Business Planning Department', approverIds: ['u7'] },
  { id: 'dept8', nameAr: 'قسم الجودة الشاملة', nameEn: 'Total Quality Management', approverIds: ['u7', 'u11'] },
  { id: 'dept9', nameAr: 'قسم الموثوقية والمشاريع', nameEn: 'Reliability & Projects', approverIds: ['u7', 'u10'] },
  { id: 'dept10', nameAr: 'قسم الخدمات الفنية', nameEn: 'Technical Service Department', approverIds: ['u7'] },
];
