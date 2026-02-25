export interface DriverInfo {
  licenseNumber: string;
  tinId: string;
  houseNumber?: string;
  blockNumber?: string;
  lotNumber?: string;
  street?: string;
  barangay?: string;
  city?: string;
  [key: string]: any;
}

export interface OperatorInfo {
  licenseNumber: string;
  tinId: string;
  numberOfJeepneys: number;
  plateNumbers: string[];
  houseNumber?: string;
  blockNumber?: string;
  lotNumber?: string;
  street?: string;
  barangay?: string;
  city?: string;
  [key: string]: any;
}

export interface CertificateData {
  memberId: string;
  fullName: string;
  role: string;
  registrationDate: string;
  certificateUrl: string;
  createdAt: string;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  role: 'Driver' | 'Operator';
  email: string;
  phoneNumber: string;
  birthdate: string;
  age: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  lastActivityAt?: string;
  lastTransactionAt?: string;
  // Archiving fields
  archived?: boolean;
  archivedAt?: string | null;
  archiveReason?: string | null;
  previousStatus?: string | null;
  // Restoration fields
  restoredAt?: string | null;
  restoredBy?: string | null;
  reactivationFee?: number | null;
  reactivationReceiptNumber?: string | null;
  driverInfo: DriverInfo | null;
  operatorInfo: OperatorInfo | null;
  certificate?: CertificateData;
  certificateGenerated?: boolean;
  certificateGeneratedAt?: string;
  [key: string]: any;
}

export interface ArchivedMember extends Member {
  archivedAt: string;
  archiveReason: string;
}

export interface ReactivationTransaction {
  id: string;
  memberId: string;
  type: 'Reactivation Fee';
  amount: number;
  receiptNumber: string;
  date: string;
  processedBy: string;
  processedByName?: string;
  createdAt: string;
}