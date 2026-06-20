import React, { createContext, useContext, useState, useCallback } from 'react';
import { Language } from '@/types';

interface Translations {
  [key: string]: { ar: string; en: string };
}

const translations: Translations = {
  appTitle: { ar: 'صرح الذكي — نظام التصاريح الأمنية', en: 'Sarh AI — Smart Security Permits System' },
  appSubtitle: { ar: 'نظام ذكي لإدارة بطاقات الهوية وملصقات المركبات والتصاريح', en: 'AI-powered ID, Vehicle & Permit Management' },
  login: { ar: 'تسجيل الدخول', en: 'Login' },
  username: { ar: 'اسم المستخدم', en: 'Username' },
  password: { ar: 'كلمة المرور', en: 'Password' },
  loginBtn: { ar: 'دخول', en: 'Sign In' },
  loginError: { ar: 'اسم المستخدم أو كلمة المرور غير صحيحة', en: 'Invalid username or password' },
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  newRequest: { ar: 'طلب جديد', en: 'New Request' },
  myRequests: { ar: 'طلباتي', en: 'My Requests' },
  pendingApprovals: { ar: 'الموافقات المعلقة', en: 'Pending Approvals' },
  allRequests: { ar: 'جميع الطلبات', en: 'All Requests' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  users: { ar: 'المستخدمون', en: 'Users' },
  departments: { ar: 'الأقسام', en: 'Departments' },
  logout: { ar: 'تسجيل الخروج', en: 'Logout' },
  welcome: { ar: 'مرحباً', en: 'Welcome' },
  requestNumber: { ar: 'رقم الطلب', en: 'Request No.' },
  employeeType: { ar: 'نوع الموظف', en: 'Employee Type' },
  directEmployee: { ar: 'موظف مباشر', en: 'Direct Employee' },
  contractorEmployee: { ar: 'موظف مقاول', en: 'Contractor Employee' },
  name: { ar: 'الاسم', en: 'Name' },
  nameAr: { ar: 'الاسم بالعربية', en: 'Name (Arabic)' },
  nameEn: { ar: 'الاسم بالإنجليزية', en: 'Name (English)' },
  nationality: { ar: 'الجنسية', en: 'Nationality' },
  idNumber: { ar: 'الرقم الوظيفي', en: 'ID Number' },
  jobTitle: { ar: 'المسمى الوظيفي', en: 'Job Title' },
  nationalIdNo: { ar: 'رقم الهوية الوطنية / الإقامة / جواز السفر', en: 'National ID / Iqama / Passport No.' },
  dateIssuePlace: { ar: 'تاريخ ومكان الإصدار', en: 'Date & Issue Place' },
  birthDate: { ar: 'تاريخ الميلاد', en: 'Birth Date' },
  bloodType: { ar: 'فصيلة الدم', en: 'Blood Type' },
  companyNameTel: { ar: 'إسم الشركة وعنوانها', en: 'Company Name & Tel.' },
  department: { ar: 'القسم / الإدارة', en: 'Department' },
  attachments: { ar: 'المرفقات', en: 'Attachments' },
  submit: { ar: 'تقديم الطلب', en: 'Submit Request' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  approve: { ar: 'موافقة', en: 'Approve' },
  reject: { ar: 'رفض', en: 'Reject' },
  hold: { ar: 'تعليق', en: 'Hold' },
  reason: { ar: 'السبب', en: 'Reason' },
  status: { ar: 'الحالة', en: 'Status' },
  createdAt: { ar: 'تاريخ الإنشاء', en: 'Created At' },
  actions: { ar: 'الإجراءات', en: 'Actions' },
  view: { ar: 'عرض', en: 'View' },
  print: { ar: 'طباعة', en: 'Print' },
  pending_dept_approval: { ar: 'بانتظار موافقة المدير', en: 'Pending Dept. Approval' },
  pending_safety_approval: { ar: 'بانتظار موافقة السلامة', en: 'Pending Safety Approval' },
  pending_id_review: { ar: 'بانتظار مراجعة بطاقات الهوية', en: 'Pending ID Review' },
  approved: { ar: 'مقبول', en: 'Approved' },
  on_hold: { ar: 'معلق', en: 'On Hold' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  totalRequests: { ar: 'إجمالي الطلبات', en: 'Total Requests' },
  pendingRequests: { ar: 'طلبات معلقة', en: 'Pending' },
  approvedRequests: { ar: 'طلبات مقبولة', en: 'Approved' },
  rejectedRequests: { ar: 'طلبات مرفوضة', en: 'Rejected' },
  holdRequests: { ar: 'طلبات موقوفة', en: 'On Hold' },
  requestDetails: { ar: 'تفاصيل الطلب', en: 'Request Details' },
  approvalHistory: { ar: 'سجل الموافقات', en: 'Approval History' },
  holdReasonLabel: { ar: 'سبب التعليق', en: 'Hold Reason' },
  rejectReasonLabel: { ar: 'سبب الرفض', en: 'Rejection Reason' },
  enterReason: { ar: 'يرجى إدخال السبب', en: 'Please enter a reason' },
  requestSubmitted: { ar: 'تم تقديم الطلب بنجاح', en: 'Request submitted successfully' },
  requestApproved: { ar: 'تمت الموافقة على الطلب', en: 'Request approved' },
  requestRejected: { ar: 'تم رفض الطلب', en: 'Request rejected' },
  requestOnHold: { ar: 'تم تعليق الطلب', en: 'Request put on hold' },
  noRequests: { ar: 'لا توجد طلبات', en: 'No requests' },
  // Attachments
  att_ajeer: { ar: 'وثيقة أجير', en: 'Ajeer Document' },
  att_muqeem: { ar: 'تقرير مقيم', en: 'Muqeem Report' },
  att_contract: { ar: 'نسخة من العقد', en: 'Contract Copy' },
  att_agreement: { ar: 'اتفاقية المقاول', en: 'Contractor Agreement' },
  att_medical: { ar: 'التقرير الطبي', en: 'Medical Report' },
  att_nationalId: { ar: 'صورة الهوية الوطنية', en: 'National ID Copy' },
  att_passport: { ar: 'صورة جواز السفر', en: 'Passport Copy' },
  att_iqama: { ar: 'صورة بطاقة الهوية الوطنية / الإقامة', en: 'National ID / Iqama Copy' },
  att_photo: { ar: 'صورة فوتوغرافية حديثة', en: 'Recent Photo' },
  att_purchaseOrder: { ar: 'أمر الشراء', en: 'Purchase Order' },
  // User mgmt
  addUser: { ar: 'إضافة مستخدم', en: 'Add User' },
  editUser: { ar: 'تعديل مستخدم', en: 'Edit User' },
  deleteUser: { ar: 'حذف مستخدم', en: 'Delete User' },
  save: { ar: 'حفظ', en: 'Save' },
  role: { ar: 'الدور', en: 'Role' },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  admin: { ar: 'مدير النظام', en: 'System Admin' },
  user: { ar: 'مستخدم', en: 'User' },
  externalForm: { ar: 'نموذج خارجي', en: 'External Form' },
  submitExternal: { ar: 'تقديم طلب خارجي', en: 'Submit External Request' },
  searchPlaceholder: { ar: 'بحث...', en: 'Search...' },
  filterByStatus: { ar: 'تصفية حسب الحالة', en: 'Filter by Status' },
  all: { ar: 'الكل', en: 'All' },
  back: { ar: 'رجوع', en: 'Back' },
  confirmAction: { ar: 'تأكيد الإجراء', en: 'Confirm Action' },
  saudi: { ar: 'سعودي', en: 'Saudi' },
  nonSaudi: { ar: 'غير سعودي', en: 'Non-Saudi' },
  selectDepartment: { ar: 'اختر القسم', en: 'Select Department' },
  requiredField: { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
  uploadFile: { ar: 'رفع ملف', en: 'Upload File' },
  createdBy: { ar: 'مقدم الطلب', en: 'Created By' },
  workflow: { ar: 'سير العمل', en: 'Workflow' },
  auditLog: { ar: 'سجل العمليات', en: 'Audit Log' },
  deleteRequest: { ar: 'حذف الطلب', en: 'Delete Request' },
};

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('ar');

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[language] || key;
  }, [language]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, dir }}>
      <div dir={dir}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
