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

// Mobile phone permit
export interface MobilePermitDetails {
  deviceType: string;            // Make/Model
  deviceImei?: string;
  serialNumber?: string;
  reason: string;                // Justification
  requestedFrom: string;         // date
  requestedTo: string;           // date
}

// Laptop permit
export interface LaptopPermitDetails {
  laptopBrand: string;
  laptopModel: string;
  serialNumber: string;
  assetTag?: string;
  reason: string;
  requestedFrom: string;
  requestedTo: string;
  // IT review notes
  itReviewNotes?: string;
}

// Photography permit
export interface PhotographyPermitDetails {
  // Photographer info
  photographerName: string;
  photographerId: string;        // Iqama / National ID
  // Equipment
  equipmentDescription: string;
  // Requested dates / times
  fromDate: string;
  toDate: string;
  fromTime?: string;
  toTime?: string;
  // Locations & justification
  locations: string;             // areas to be photographed
  purpose: string;               // reason for photography
  // Adjacent military unit acknowledgment
  affectsMilitaryUnit: boolean;
  governorateApprovalRef?: string; // permit reference if affectsMilitaryUnit
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
}
