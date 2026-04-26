import { Attachment } from '@/types';

export type StickerType = 'employee' | 'company_vehicle' | 'contractor_vehicle';

export type StickerStatus =
  | 'pending_dept_approval'
  | 'pending_security_review'
  | 'approved'
  | 'on_hold'
  | 'rejected';

export interface DriverInfo {
  // Optional link to an approved ID card request (for direct employees)
  linkedIdRequestId?: string;
  name: string;
  employeeId: string;
  nationality: string;
  licenseNumber: string;
  licenseIssuePlace: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
}

export interface VehicleInfo {
  vehicleType: string; // make/model
  plateNumber: string;
  color: string;
}

export interface ContractorInfo {
  contractNumber: string;
  contractDuration: string;
  contractStartDate: string;
  contractEndDate: string;
  contractorName: string;
  contractorRepresentative: string;
  responsibleName: string;
  responsibleSignature?: string; // base64
  phoneNumber: string;
  stamp?: string; // base64
}

// Department approval (auto-filled when an approver acts)
export interface StickerDepartmentApproval {
  approverUserId: string;
  approverName: string;
  approverDepartment: string;
  approverJobTitle: string;
  signature?: string;
  approvedAt: string;
}

// Security (Industrial Safety) issuance details
export interface StickerSecurityIssuance {
  reviewerUserId: string;
  reviewerName: string;
  reviewerEmployeeId: string;
  permitNumber: string;
  issueDate: string;
  expiryDate: string;
  signature?: string;
  issuedAt: string;
}

export interface StickerApprovalAction {
  id: string;
  userId: string;
  action: 'approve' | 'reject' | 'hold';
  reason?: string;
  timestamp: string;
  stage: StickerStatus;
}

export interface VehicleStickerRequest {
  id: string;
  requestNumber: string;
  stickerType: StickerType;
  driver: DriverInfo;
  vehicle: VehicleInfo;
  contractor?: ContractorInfo; // only when stickerType === 'contractor_vehicle'
  departmentId: string; // dept that the request belongs to (for routing approvals)
  status: StickerStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  approvalHistory: StickerApprovalAction[];
  departmentApproval?: StickerDepartmentApproval;
  securityIssuance?: StickerSecurityIssuance;
  holdReason?: string;
  rejectReason?: string;
}
