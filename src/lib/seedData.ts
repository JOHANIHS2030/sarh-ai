// Dummy demo data for Sarh AI — generic showcase content for the hackathon demo.
import { IDCardRequest } from '@/types';
import { VehicleStickerRequest } from '@/types/vehicleSticker';
import { PermitRequest } from '@/types/permit';
import { ExternalUser } from '@/types/externalUser';

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();
const daysAhead = (n: number) => new Date(now + n * 86400000).toISOString();
const dateOnly = (iso: string) => iso.slice(0, 10);

export const seedRequests: IDCardRequest[] = [
  {
    id: 'r1', requestNumber: 'IDC-2026-00001', employeeType: 'direct',
    nameEn: 'Khaled Al-Harbi', nameAr: 'خالد الحربي', nationality: 'Saudi',
    employeeId: '20011', jobTitle: 'Operations Engineer', nationalIdNo: '1029384756',
    dateIssuePlace: 'Riyadh', birthDate: '1990-04-10', bloodType: 'O+',
    companyNameTel: 'Demo Co — 0500000000', departmentId: 'dept4',
    status: 'approved', createdBy: 'u-hr', createdAt: daysAgo(45), updatedAt: daysAgo(40),
    attachments: [], approvalHistory: [],
    issuance: {
      cardNumber: 'C-1001', serial: 'SR-2026-001', issueDate: dateOnly(daysAgo(40)),
      expiryDate: dateOnly(daysAhead(320)), fingerprintTaken: true, instructionsGiven: true,
      dataEntered: true, issuedById: 'u-clerk', issuedByName: 'ID Card Clerk',
      issuedAt: daysAgo(40),
    },
  },
  {
    id: 'r2', requestNumber: 'IDC-2026-00002', employeeType: 'contractor',
    nameEn: 'Rajesh Kumar', nameAr: 'راجيش كومار', nationality: 'Indian',
    employeeId: '30221', jobTitle: 'Maintenance Technician', nationalIdNo: '2398476120',
    dateIssuePlace: 'Jeddah', birthDate: '1988-09-22', bloodType: 'A+',
    companyNameTel: 'Maintech Ltd — 0512345678', departmentId: 'dept5',
    status: 'pending_id_review', createdBy: 'u-hr',
    createdAt: daysAgo(7), updatedAt: daysAgo(2),
    attachments: [], approvalHistory: [],
  },
  {
    id: 'r3', requestNumber: 'IDC-2026-00003', employeeType: 'direct',
    nameEn: 'Sara Al-Qahtani', nameAr: 'سارة القحطاني', nationality: 'Saudi',
    employeeId: '20055', jobTitle: 'IT Specialist', nationalIdNo: '1078459203',
    dateIssuePlace: 'Dammam', birthDate: '1993-12-01', bloodType: 'B+',
    companyNameTel: 'Demo Co — 0533334444', departmentId: 'dept6',
    status: 'approved', createdBy: 'u-hr', createdAt: daysAgo(310), updatedAt: daysAgo(305),
    attachments: [], approvalHistory: [],
    issuance: {
      cardNumber: 'C-1002', serial: 'SR-2025-088', issueDate: dateOnly(daysAgo(305)),
      expiryDate: dateOnly(daysAhead(20)), // expiring soon
      fingerprintTaken: true, instructionsGiven: true, dataEntered: true,
      issuedById: 'u-clerk', issuedByName: 'ID Card Clerk', issuedAt: daysAgo(305),
    },
  },
  {
    id: 'r4', requestNumber: 'IDC-2026-00004', employeeType: 'direct',
    nameEn: 'Ahmed Al-Mutairi', nameAr: 'أحمد المطيري', nationality: 'Saudi',
    employeeId: '20088', jobTitle: 'Safety Officer', nationalIdNo: '1011223344',
    dateIssuePlace: 'Riyadh', birthDate: '1985-06-15', bloodType: 'AB+',
    companyNameTel: 'Demo Co — 0566667777', departmentId: 'dept2',
    status: 'on_hold', createdBy: 'u-hr', createdAt: daysAgo(15), updatedAt: daysAgo(10),
    attachments: [], approvalHistory: [], holdReason: 'بانتظار صورة شخصية واضحة',
  },
];

export const seedStickers: VehicleStickerRequest[] = [
  {
    id: 's1', requestNumber: 'VS-2026-00001', stickerType: 'employee',
    driver: {
      name: 'Khaled Al-Harbi', employeeId: '20011', nationality: 'Saudi',
      licenseNumber: '1029384756', licenseIssuePlace: 'Riyadh',
      licenseIssueDate: '2020-03-15', licenseExpiryDate: '2030-03-15',
    },
    vehicle: { vehicleType: 'Toyota Camry 2022', plateNumber: 'ABC 1234', color: 'White' },
    departmentId: 'dept4', status: 'approved', createdBy: 'u-hr',
    createdAt: daysAgo(60), updatedAt: daysAgo(58),
    attachments: [], approvalHistory: [],
    securityIssuance: {
      reviewerUserId: 'u-security', reviewerName: 'Security Chief', reviewerEmployeeId: 'SEC-01',
      permitNumber: 'P-2026-001', issueDate: dateOnly(daysAgo(58)),
      expiryDate: dateOnly(daysAhead(180)), issuedAt: daysAgo(58),
    },
  },
  {
    id: 's2', requestNumber: 'VS-2026-00002', stickerType: 'contractor_vehicle',
    driver: {
      name: 'Rajesh Kumar', employeeId: '30221', nationality: 'Indian',
      licenseNumber: '2398476120', licenseIssuePlace: 'Jeddah',
      licenseIssueDate: '2022-01-10', licenseExpiryDate: '2027-01-10',
    },
    vehicle: { vehicleType: 'Isuzu D-Max 2021', plateNumber: 'XYZ 5678', color: 'Silver' },
    contractor: {
      contractNumber: 'CN-2026-09', contractDuration: '12 months',
      contractStartDate: '2026-01-01', contractEndDate: '2026-12-31',
      contractorName: 'Maintech Ltd', contractorRepresentative: 'Ali Hassan',
      responsibleName: 'Ali Hassan', phoneNumber: '0512345678',
    },
    departmentId: 'dept5', status: 'pending_security_review', createdBy: 'u-hr',
    createdAt: daysAgo(5), updatedAt: daysAgo(3),
    attachments: [], approvalHistory: [],
  },
  {
    id: 's3', requestNumber: 'VS-2026-00003', stickerType: 'company_vehicle',
    driver: {
      name: 'Operations Pool', employeeId: '-', nationality: 'Saudi',
      licenseNumber: '-', licenseIssuePlace: '-',
      licenseIssueDate: '-', licenseExpiryDate: '-',
    },
    vehicle: { vehicleType: 'Hyundai H1 2020', plateNumber: 'OPS 0001', color: 'White' },
    departmentId: 'dept4', status: 'approved', createdBy: 'u-hr',
    createdAt: daysAgo(350), updatedAt: daysAgo(348),
    attachments: [], approvalHistory: [],
    securityIssuance: {
      reviewerUserId: 'u-security', reviewerName: 'Security Chief', reviewerEmployeeId: 'SEC-01',
      permitNumber: 'P-2025-088', issueDate: dateOnly(daysAgo(348)),
      expiryDate: dateOnly(daysAgo(5)), // expired
      issuedAt: daysAgo(348),
    },
  },
];

export const seedPermits: PermitRequest[] = [
  {
    id: 'p1', requestNumber: 'PRM-2026-00001', permitType: 'mobile_phone',
    applicant: {
      name: 'Sara Al-Qahtani', employeeId: '20055', jobTitle: 'IT Specialist',
      nationality: 'Saudi', departmentId: 'dept6', phoneNumber: '0533334444',
    },
    mobile: {
      requestDate: dateOnly(daysAgo(40)), deviceType: 'iPhone 15 Pro',
      declarationAccepted: true, reason: 'Site inspection photos',
    },
    status: 'approved', createdBy: 'u-it', createdAt: daysAgo(40), updatedAt: daysAgo(35),
    attachments: [], approvalHistory: [], stageApprovals: [],
    validityFrom: dateOnly(daysAgo(35)), validityExpiry: dateOnly(daysAhead(95)),
    issuedAt: daysAgo(35),
  },
  {
    id: 'p2', requestNumber: 'PRM-2026-00002', permitType: 'laptop',
    applicant: {
      name: 'Ahmed Al-Mutairi', employeeId: '20088', jobTitle: 'Safety Officer',
      nationality: 'Saudi', departmentId: 'dept2',
    },
    laptop: {
      requestedFrom: dateOnly(daysAgo(10)), requestedTo: dateOnly(daysAhead(80)),
      idCardNumber: 'C-1003', laptopBrand: 'Dell', laptopModel: 'Latitude 7440',
      serialNumber: 'SN-DL-998877', farabiStickerNo: 'AST-2026-014',
    },
    status: 'pending_it_review', createdBy: 'u-admin',
    createdAt: daysAgo(3), updatedAt: daysAgo(2),
    attachments: [], approvalHistory: [], stageApprovals: [],
  },
  {
    id: 'p3', requestNumber: 'PRM-2026-00003', permitType: 'photography',
    applicant: {
      name: 'Rajesh Kumar', employeeId: '30221', jobTitle: 'Maintenance Technician',
      nationality: 'Indian', departmentId: 'dept5', companyName: 'Maintech Ltd',
    },
    photography: {
      cameraTypeAndNumber: 'Canon EOS R6 — SN 998', photographyType: { video: true, photoDigital: true },
      locations: 'Production area — Tank 3', declarationAccepted: true,
      photographerName: 'Authorized Site Photographer', photographerJobTitle: 'Senior Photographer',
    },
    status: 'approved', createdBy: 'u-maint',
    createdAt: daysAgo(20), updatedAt: daysAgo(18),
    attachments: [], approvalHistory: [], stageApprovals: [],
    validityFrom: dateOnly(daysAgo(18)), validityExpiry: dateOnly(daysAhead(12)),
    issuedAt: daysAgo(18),
  },
];

export const seedExternalUsers: ExternalUser[] = [
  {
    id: 'ext1', username: 'MAINTECH', password: 'demo123',
    representativeName: 'Ali Hassan', mobile: '0512345678', phone: '0114567890',
    email: 'ali@maintech.demo', companyName: 'Maintech Ltd',
    allowedDepartmentIds: ['dept5','dept4'], allowedPermitTypes: ['mobile_phone','laptop','photography'],
    active: true, createdAt: daysAgo(120),
  },
];
