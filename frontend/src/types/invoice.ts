export type InvoiceItem = {
  description: string;
  quantity: number;
  price: number;
  gstPercent?: number | null;
  discount?: number | null;
  category?: string | null;
  advance?: number | null;
  remark?: string | null;
  hsn?: string | null;
};

export type Payment = {
  id?: number;
  amount: number;
  date?: string;
  method?: string;
  note?: string;
};

export type Customer = {
  id?: number;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  panNumber?: string;
  gstNumber?: string;
  stateName?: string;
  stateCode?: string;
  [key: string]: unknown;
};

export type Invoice = {
  id: number;
  invoiceNumber?: string;
  type?: "QUOTE" | "INVOICE" | string;
  date?: string | null;
  dueDate?: string | null;
  items?: InvoiceItem[];
  customer?: Customer;
  payments?: Payment[];
  subtotal?: number;
  totalGST?: number;
  totalDiscount?: number;
  advancePaid?: number;
  total?: number;
  currency?: string;
  status?: string;
   remark?: string;
    note?: string;   
  [key: string]: unknown;
};


export type Settings = {
  name?: string;
  email?:string
  address?: string;
  contact?: string;
  gstNumber?: string;
  panNumber?: string;
  currency?: string;
  stateName?: string;
  stateCode?: string;
  taxPercent?: string | number;
  taxType?: string;
  logoPath?: string;
  logoPreview?: string | null;
};

export type User = {
  id?: number;
  fullName?: string;
  email?: string;
  role?: string;
  tempPassword?: boolean;
};


export type Stats = {
  totalInvoices?: number;
  totalCustomers?: number;
  totalRevenue?: number;
  [key: string]: number | undefined;
};

export type TabKey =
  | "dashboard"
  | "invoice"
  | "customers"
  | "settings"
  | "reports"
  | "register"
  | "payments"
  | "invoiceview"
  | "setpassword";


 export type Invoicepay = {
  id: number;
  subtotal?:number;
  totalDiscount?:number;
  totalGST?:number;
  invoiceNumber?: string;
  currency?: string;
  total?: number;
  advancePaid?: number;
  status?: "PENDING" | "PARTIAL" | "PAID";
};