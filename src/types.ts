export type Role = 'admin' | 'tenant';
export type PaymentStatus = 'pending' | 'paid';

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Tenant = {
  id: string;
  name: string;
  room_no: string;
  rent: number;
  phone: string | null;
  email: string;
  user_id: string | null;
  is_active: boolean;
};

export type Bill = {
  id: string;
  tenant_id: string;
  bill_month: string;
  previous_reading: number;
  current_reading: number;
  units_used: number;
  rate: number;
  well_bill: number;
  electricity_charge: number;
  rent: number;
  total_amount: number;
  payment_status: PaymentStatus;
  created_at: string;
  tenants?: Pick<Tenant, 'name' | 'room_no' | 'email'>;
};
