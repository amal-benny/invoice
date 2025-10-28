
  export type MethodType = "Cash" | "Bank Transfer" | "UPI" | "Card" | "Other";
  export type WindowMethod = "CASH" | "BANK" | "UPI" | "CARD";
declare global {
  interface Window {
    updateDashboardIncome?: (method: WindowMethod, amount: number) => void;
    updateInvoiceRefresh?: (invoiceId?: number | string) => Promise<void>;
    updateDashboardRefresh?: (
      method?: MethodType | string,
      amount?: number
    ) => Promise<void>;

    resetDashboardBalances?: () => Promise<void>;
  }
}

export {};