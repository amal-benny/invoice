// src/types/ui.ts
export type TabKey =
  | "dashboard"
  | "invoice"
  | "customers"
  | "settings"
  | "reports"
  | "register"
  | "setpassword"
  | "payments"
  | "invoiceview";


  export type InvoiceItem = {
  description: string;
  hsn?: string;
  quantity: number;
  price: number;
  gstPercent?: number;
  discount?: number;
  category?: string;
  advance?: number;
  remark?: string;
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
};

export type Company = {
  name?: string;
  address?: string;
  contact?: string;
  phone?:string;
  stateName?:string;
  stateCode?:string;
  defaultNote?: string;
  [key: string]: string | undefined;
};

export type InvoicePayload = {
  id: number;
  invoiceNumber?: string;
  date: string;
  dueDate?: string;
  type: "QUOTE" | "INVOICE";
  currency: string;
  subtotal: number;
  totalGST: number;
  totalDiscount: number;
  advancePaid: number;
  total: number;
  note: string;
  items: InvoiceItem[];
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
};

export type Invoice = {
  id: number;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  type?: "QUOTE" | "INVOICE";
  currency?: string;
  subtotal?: number;
  totalGST?: number;
  totalDiscount?: number;
  advancePaid?: number;
  total?: number;
  note?: string;
  items?: InvoiceItem[];
  customer?: Customer;
  company?: Company;
  status?: string;
};
