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
  archived?: boolean;
  driverInfo: DriverInfo | null;
  operatorInfo: OperatorInfo | null;
  [key: string]: any;
}