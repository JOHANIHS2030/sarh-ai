import { Attachment } from '@/types';

// Three permit types
export type PermitType = 'mobile_phone' | 'laptop' | 'photography';

// Approval stages — same shape used for all three types but the actors differ
export type PermitStatus =
  | 'pending_dept_manager'      // stage 1: department manager of the requester
  | 'pending_it_review'         // stage 2 (laptop only): IT review
  | 'pending_security_chief'    // stage 2/3: Industrial Safety Chief
  | 'pending_ehss_manager'      // stage 3/4: EHSS Manager (final signature)
  | 'approved'
  | 'on_hold'
  | 'rejected';

// Permit-signing authorities — checkbox-based, fully customizable per user
export type PermitSignAuthority =
  | 'sign_mobile_permit'        // ability to sign mobile phone permits
  | 'sign_laptop_permit'        // ability to sign laptop permits
  | 'sign_photography_permit'   // ability to sign photography permits
  | 'role_security_chief'       // acts as Industrial Safety Chief
  | 'role_ehss_manager'         // acts as EHSS Manager
  | 'role_it_manager';          // acts as IT Manager (laptop permits)

export interface PermitApplicantInfo {
  // Optional link to an approved ID card request (for direct employees)
  linkedIdRequestId?: string;
  name: string;
  employeeId: string;
  jobTitle: string;
  nationality: string;
  departmentId: string;          // applicant's department (drives stage-1 routing)
  companyName?: string;          // for contractors / external users
  phoneNumber?: string;
  email?: string;
}

// ==== Per-permit type specifics ====

// Mobile phone permit (filled by employee or admin assistant)
export interface MobilePermitDetails {
  requestDate: string;           // تاريخ الطلب
  deviceType: string;            // نوع الجوال المراد إدخاله
  declarationAccepted: boolean;  // إقرار وتعهد
  // Optional/extra
  deviceImei?: string;
  serialNumber?: string;
  reason?: string;
  requestedFrom?: string;
  requestedTo?: string;
}

// Laptop permit (filled by admin assistant)
export interface LaptopPermitDetails {
  requestedFrom: string;         // التاريخ من
  requestedTo: string;           // التاريخ إلى
  idCardNumber: string;          // رقم البطاقة
  laptopBrand: string;           // نوع الجهاز المحمول
  laptopModel: string;           // الموديل
  serialNumber: string;          // الرقم التسلسلي
  farabiStickerNo: string;       // رقم ملصق الفارابي
  // IT review notes (optional - filled at IT stage)
  itReviewNotes?: string;
  // Optional
  assetTag?: string;
  reason?: string;
}

// Photography type (multi-select)
export interface PhotographyTypeFlags {
  video: boolean;
  photoDigital: boolean;         // فوتوغرافي / رقمي
}

// Photography permit (filled by admin assistant)
export interface PhotographyPermitDetails {
  cameraTypeAndNumber: string;   // نوع ورقم آلة التصوير
  photographyType: PhotographyTypeFlags; // نوعية التصوير (فيديو / فوتوغرافي/رقمي)
  locations: string;             // المنطقة (الموقع/المباني) المطلوب تصويرها
  declarationAccepted: boolean;  // إقرار وتعهد
  photographerName: string;      // اسم المصور المخصص (الفارابي)
  photographerJobTitle: string;  // الوظيفة
  // Extras (kept for backward compatibility)
  photographerId?: string;
  equipmentDescription?: string;
  fromDate?: string;
  toDate?: string;
  fromTime?: string;
  toTime?: string;
  purpose?: string;
  affectsMilitaryUnit?: boolean;
  governorateApprovalRef?: string;
}

// Approval / signature snapshot at each stage
export interface PermitStageApproval {
  stage: PermitStatus;
  approverUserId: string;
  approverName: string;
  approverJobTitle: string;
  approverDepartment?: string;
  signature?: string;            // base64
  approvedAt: string;
  notes?: string;
}

export interface PermitApprovalAction {
  id: string;
  userId: string;
  action: 'approve' | 'reject' | 'hold';
  reason?: string;
  timestamp: string;
  stage: PermitStatus;
}

export interface PermitRequest {
  id: string;
  requestNumber: string;          // PRM-YYYY-XXXXX
  permitType: PermitType;
  applicant: PermitApplicantInfo;
  // exactly one of these is filled per permitType
  mobile?: MobilePermitDetails;
  laptop?: LaptopPermitDetails;
  photography?: PhotographyPermitDetails;
  status: PermitStatus;
  createdBy: string;              // user id or external:CompanyName - Rep
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  approvalHistory: PermitApprovalAction[];
  // signature snapshots collected during the workflow
  stageApprovals: PermitStageApproval[];
  holdReason?: string;
  rejectReason?: string;
  // Validity / expiry — entered manually at final approval (issuance).
  // Used for status colors (blue/orange/red) and admin notifications.
  validityFrom?: string;     // ISO date
  validityExpiry?: string;   // ISO date
  issuedAt?: string;         // ISO timestamp when permit reached "approved" with expiry set
}
