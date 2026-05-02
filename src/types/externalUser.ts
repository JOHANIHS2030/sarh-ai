export interface ExternalUser {
  id: string;
  username: string;
  password: string;
  representativeName: string;
  mobile: string;
  phone: string;
  email: string;
  companyName: string;
  allowedDepartmentIds: string[];
  // Permit types this external user is allowed to submit (vehicle sticker is always allowed)
  allowedPermitTypes?: import('./permit').PermitType[];
  active: boolean;
  createdAt: string;
}
