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
  active: boolean;
  createdAt: string;
}
