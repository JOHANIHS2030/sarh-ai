export type UserRole = 'admin' | 'user';

export type SystemRole = 
  | 'id_card_executor'
  | 'security_chief'
  | 'safety_orientation'
  | 'ehss_manager'
  | 'hr_manager'
  | 'dept_manager'
  | 'requester';

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
  signature?: string; // base64 signature image
  // Permit-system signing authorities (checkbox-based, customizable per user)
  permitAuthorities?: import('./permit').PermitSignAuthority[];
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
  data?: string; // base64 data
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
  issuance?: IssuanceDetails;
}

export interface IssuanceDetails {
  cardNumber: string;
  serial: string;
  issueDate: string;
  expiryDate: string;
  fingerprintTaken: boolean;
  instructionsGiven: boolean;
  dataEntered: boolean;
  issuedById: string;
  issuedByName: string;
  issuedAt: string;
}

export interface ApprovalAction {
  id: string;
  userId: string;
  action: 'approve' | 'reject' | 'hold';
  reason?: string;
  timestamp: string;
  stage: RequestStatus;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  details: string;
  requestId?: string;
  timestamp: string;
}

export type Language = 'ar' | 'en';
