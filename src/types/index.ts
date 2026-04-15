export type UserRole = 'admin' | 'user';

export type SystemRole = 
  | 'id_card_executor'      // منفذ بطاقات الهوية
  | 'security_chief'        // رئيس قسم الأمن
  | 'safety_orientation'    // مقدم توجيه السلامة
  | 'ehss_manager'          // مدير قسم البيئة والصحة والسلامة والأمن
  | 'hr_manager'            // مدير قسم الموارد البشرية والخدمات المشتركة
  | 'dept_manager'          // مدير قسم
  | 'requester';            // مقدم طلب

export type EmployeeType = 'direct' | 'contractor';

export type RequestStatus = 
  | 'pending_dept_approval'
  | 'pending_safety_approval'
  | 'pending_id_review'
  | 'approved'
  | 'on_hold'
  | 'rejected';

export interface User {
  id: string;
  nameAr: string;
  nameEn: string;
  username: string;
  password: string;
  role: UserRole;
  systemRole: SystemRole;
  jobTitleAr: string;
  jobTitleEn: string;
  email: string;
  responsibilityAr: string;
  responsibilityEn: string;
  departmentId?: string;
  canApproveDepartments?: string[];
}

export interface Department {
  id: string;
  nameAr: string;
  nameEn: string;
  approverIds: string[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  file?: File;
  url?: string;
}

export interface IDCardRequest {
  id: string;
  requestNumber: string;
  employeeType: EmployeeType;
  nameEn: string;
  nameAr: string;
  nationality: string;
  employeeId: string;
  jobTitle: string;
  nationalIdNo: string;
  dateIssuePlace: string;
  birthDate: string;
  bloodType: string;
  companyNameTel: string;
  departmentId: string;
  status: RequestStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  approvalHistory: ApprovalAction[];
  holdReason?: string;
  rejectReason?: string;
}

export interface ApprovalAction {
  id: string;
  userId: string;
  action: 'approve' | 'reject' | 'hold';
  reason?: string;
  timestamp: string;
  stage: RequestStatus;
}

export type Language = 'ar' | 'en';
