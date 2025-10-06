"use client";
import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/api";
import { useRouter } from "next/navigation";

type Item = {
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

function toCents(n: number) {
  return Math.round((isNaN(n) ? 0 : n) * 100);
}
function fromCents(cents: number) {
  return cents / 100;
}

export default function InvoiceForm({
  onCreated,
  initialInvoice, // <-- edit mode prop
}: {
  onCreated?: (inv: any) => void;
  initialInvoice?: any;
}) {
  const router = useRouter();

  // metadata
  const [settings, setSettings] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  // default tax values from settings
  const [defaultTax, setDefaultTax] = useState<number | undefined>(undefined);
  const [defaultTaxType, setDefaultTaxType] = useState<string>("GST");

  // form state
  const [type, setType] = useState<"INVOICE" | "QUOTE">(
    initialInvoice?.type || "QUOTE"
  );
  const [customerId, setCustomerId] = useState<number | undefined>(
    initialInvoice?.customerId
  );
  const [dueDate, setDueDate] = useState<string>(initialInvoice?.dueDate || "");
  const [date, setDate] = useState<string>(
    initialInvoice?.date || new Date().toISOString().slice(0, 10)
  );
  const [items, setItems] = useState<Item[]>(
    initialInvoice?.items?.map((it: any) => ({
      description: it.description,
      quantity: it.quantity,
      price: it.price,
      gstPercent: it.gstPercent,
      discount: it.discount,
      category: it.category,
      advance: it.advance,
      remark: it.remark,
      hsn: it.hsn,
    })) || [
      {
        description: "",
        quantity: 1,
        price: 0,
        gstPercent: undefined,
        discount: undefined,
        category: "",
        advance: undefined,
        remark: "",
        hsn: undefined,
      },
    ]
  );
  const [currency, setCurrency] = useState<string>(
    initialInvoice?.currency || "INR"
  );
  const [globalRemark, setGlobalRemark] = useState<string>(
    initialInvoice?.remark || ""
  );

  // right card
  const [advancePayment, setAdvancePayment] = useState<number>(
    initialInvoice?.advancePaid || 0
  );
  const [advanceMethod, setAdvanceMethod] = useState<string>("Cash");

  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState(
    initialInvoice?.customer?.name || ""
  );
  const [customerCompany, setCustomerCompany] = useState(
    initialInvoice?.customer?.company || ""
  );
  const [customerEmail, setCustomerEmail] = useState(
    initialInvoice?.customer?.email || ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    initialInvoice?.customer?.phone || ""
  );
  const [customerAddress, setCustomerAddress] = useState(
    initialInvoice?.customer?.address || ""
  );

  // load settings & customers
  useEffect(() => {
    (async () => {
      try {
        const s = await authFetch("/api/settings");
        setSettings(s || null);
        if (s) {
          if (s.currency) setCurrency(s.currency);
          if (s.taxPercent !== undefined && s.taxPercent !== null) {
            const t = Number(s.taxPercent);
            setDefaultTax(isNaN(t) ? undefined : t);
          }
          if (s.taxType) setDefaultTaxType(s.taxType);

          if (s.taxPercent !== undefined && s.taxPercent !== null) {
            const t = Number(s.taxPercent);
            setItems((prev) =>
              prev.map((it) => ({ ...it, gstPercent: it.gstPercent ?? t }))
            );
          }
        }
      } catch (err) {}

      try {
        const c = await authFetch("/api/customers");
        setCustomers(c || []);
      } catch (e) {}
    })();
  }, []);

  // item helpers
  function updateItem(idx: number, patch: Partial<Item>) {
    const copy = [...items];
    copy[idx] = { ...copy[idx], ...patch };
    setItems(copy);
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, price: 0, gstPercent: defaultTax },
    ]);
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const totals = useMemo(() => {
    let subtotalCents = 0;
    let discountCents = 0;
    let gstCents = 0;
    let advanceItemsCents = 0;

    for (const it of items) {
      const qty = Number(it.quantity || 0);
      const price = Number(it.price || 0);
      const discount = Number(it.discount || 0);
      const advance = Number(it.advance || 0);

      const lineBaseCents = toCents(qty * price);
      subtotalCents += lineBaseCents;

      const taxableCents = lineBaseCents - toCents(discount);
      if (it.gstPercent !== undefined && it.gstPercent !== null) {
        gstCents += Math.round((taxableCents * Number(it.gstPercent)) / 100);
      }

      discountCents += toCents(discount);
      advanceItemsCents += toCents(advance);
    }

    const globalAdvanceCents = toCents(Number(advancePayment || 0));
    const totalAdvanceCents = advanceItemsCents + globalAdvanceCents;
    const totalCents =
      subtotalCents - discountCents + gstCents - totalAdvanceCents;
    const final = totalCents < 0 ? 0 : totalCents;

    return {
      subtotal: fromCents(subtotalCents),
      discount: fromCents(discountCents),
      gst: fromCents(gstCents),
      advanceItems: fromCents(advanceItemsCents),
      advanceGlobal: fromCents(globalAdvanceCents),
      advanceTotal: fromCents(totalAdvanceCents),
      total: fromCents(final),
    };
  }, [items, advancePayment]);

  function lineTotal(it: Item) {
    const qty = Number(it.quantity || 0);
    const price = Number(it.price || 0);
    const base = qty * price;
    const gst = it.gstPercent ? (base * Number(it.gstPercent)) / 100 : 0;
    const disc = it.discount ? Number(it.discount) : 0;
    const adv = it.advance ? Number(it.advance) : 0;
    const t = base + gst - disc - adv;
    return t < 0 ? 0 : t;
  }

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);

    const payloadItems = items.map((it) => ({
      description: it.description,
      quantity: Number(it.quantity || 0),
      price: Number(it.price || 0),
      gstPercent:
        it.gstPercent !== undefined && it.gstPercent !== null
          ? Number(it.gstPercent)
          : undefined,
      discount:
        it.discount !== undefined && it.discount !== null
          ? Number(it.discount)
          : undefined,
      category: it.category || undefined,
      advance:
        it.advance !== undefined && it.advance !== null
          ? Number(it.advance)
          : undefined,
      remark: it.remark || undefined,
      hsn: it.hsn || undefined,
    }));

    const payload = {
      type,
      customerId: customerId || undefined,
      customerName,
      customerCompany,
      customerEmail,
      customerPhone,
      customerAddress,
      dueDate: dueDate || undefined,
      items: payloadItems,
      remark: globalRemark || undefined,
      currency,
      subtotal: totals.subtotal,
      totalGST: totals.gst,
      totalDiscount: totals.discount,
      advancePaid: totals.advanceTotal,
      total: totals.total,
    };

    try {
      let inv;
      if (initialInvoice?.id) {
        // <-- Edit mode uses PUT
        inv = await authFetch(`/api/invoices/${initialInvoice.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        });
      } else {
        inv = await authFetch("/api/invoices", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        });
      }

      if (onCreated) onCreated(inv);
    } catch (err: any) {
      alert("Failed to save: " + (err?.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  const placeholderNumber = useMemo(() => {
    const prefix = type === "QUOTE" ? "QTN" : "INV";
    const y = new Date().getFullYear();
    return `${prefix}-${y}-001`;
  }, [type]);

  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-lg font-semibold mb-3">
                  Your Business Details
                </h3>

                <div className="grid gap-2">
                  <input
                    className="input"
                    placeholder="Company name"
                    value={settings?.name ?? ""}
                    readOnly
                  />

                  <input
                    className="input"
                    placeholder="Contact (phone / email)"
                    value={settings?.contact ?? ""}
                    readOnly
                  />

                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Address"
                    value={settings?.address ?? ""}
                    readOnly
                  />

                  <input
                    className="input"
                    placeholder="GST Number"
                    value={settings?.gstNumber ?? ""}
                    readOnly
                  />
                  <input
                    className="input"
                    placeholder="PAN Number"
                    value={settings?.panNumber ?? ""}
                    readOnly
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="input"
                      placeholder="Currency"
                      value={settings?.currency ?? "INR"}
                      readOnly
                    />

                    <input
                      className="input"
                      type="text"
                      placeholder="Tax %"
                      value={settings?.taxPercent ?? ""}
                      readOnly
                    />
                  </div>

                  <input
                    className="input"
                    placeholder="Tax Type"
                    value={settings?.taxType ?? "GST"}
                    readOnly
                  />
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-3">Customer Details</h3>
                <div className="grid gap-2">
                  <select
                    className="input"
                    value={customerId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value) || undefined;
                      setCustomerId(id);

                      // auto-fill customer details
                      const selected = customers.find((c) => c.id === id);
                      if (selected) {
                        setCustomerName(selected.name || "");
                        setCustomerCompany(selected.company || "");
                        setCustomerEmail(selected.email || "");
                        setCustomerPhone(selected.phone || "");
                        setCustomerAddress(selected.address || "");
                      } else {
                        // clear if no selection
                        setCustomerName("");
                        setCustomerCompany("");
                        setCustomerEmail("");
                        setCustomerPhone("");
                        setCustomerAddress("");
                      }
                    }}
                  >
                    <option value="">Pick from customers</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.company || "—"}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    placeholder="Customer Name (if new)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Company (optional)"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-3">
                Quotation Information
              </h3>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="kv">Quotation Number</label>
                  <input className="input" value={placeholderNumber} readOnly />
                </div>
                <div>
                  <label className="kv">Quotation Date</label>
                  <input
                    className="input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="kv">Due Date</label>
                  <input
                    className="input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Line Items</h3>

              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-2 text-sm text-gray-600 font-medium border-b pb-2 mb-3">
                <div className="col-span-3">Description</div>
                <div className="col-span-1 text-center">Qty</div>
                <div className="col-span-1 text-right">Price</div>
                <div className="col-span-1 text-right">Discount</div>
                <div className="col-span-1 text-right">
                  Tax % ({defaultTaxType || "GST"})
                </div>
                <div className="col-span-1">Category</div>
                <div className="col-span-1">HSN</div>
                <div className="col-span-2">Remark</div>
                <div className="col-span-1 text-right">Total</div>
              </div>

              {/* Items */}
              <div className="space-y-4">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded-lg shadow-sm"
                  >
                    <input
                      className="input col-span-3"
                      placeholder="Item description..."
                      value={it.description}
                      onChange={(e) =>
                        updateItem(idx, { description: e.target.value })
                      }
                    />

                    <input
                      className="input col-span-1 text-center"
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(idx, {
                          quantity: Number(e.target.value || 1),
                        })
                      }
                    />

                    <input
                      className="input col-span-1 text-right"
                      type="number"
                      step="0.01"
                      value={it.price}
                      onChange={(e) =>
                        updateItem(idx, { price: Number(e.target.value || 0) })
                      }
                    />

                    <input
                      className="input col-span-1 text-right"
                      type="number"
                      step="0.01"
                      value={it.discount ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        updateItem(idx, {
                          discount:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />

                    <input
                      className="input col-span-1 text-right"
                      type="number"
                      step="0.01"
                      value={it.gstPercent ?? ""}
                      placeholder={
                        defaultTax !== undefined ? String(defaultTax) : "0"
                      }
                      onChange={(e) =>
                        updateItem(idx, {
                          gstPercent:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />

                    <input
                      className="input col-span-1"
                      placeholder="Category"
                      value={it.category ?? ""}
                      onChange={(e) =>
                        updateItem(idx, { category: e.target.value })
                      }
                    />

                    <input
                      className="input col-span-1"
                      placeholder="HSN"
                      value={it.hsn ?? ""}
                      onChange={(e) => updateItem(idx, { hsn: e.target.value })}
                    />

                    <input
                      className="input col-span-2"
                      placeholder="Item remark"
                      value={it.remark ?? ""}
                      onChange={(e) =>
                        updateItem(idx, { remark: e.target.value })
                      }
                    />

                    <div className="col-span-1 text-right flex flex-col justify-between">
                      <div className="font-semibold">
                        {currency} {lineTotal(it).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        className="mt-2 text-xs px-2 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => removeItem(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add button */}
                <div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="w-full py-2 rounded-md border-dashed border-2 border-red-200 text-red-600"
                  >
                    + Add New Item
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card sticky top-24">
              <h3 className="text-lg font-semibold mb-3">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between kv">
                  <div>Subtotal</div>
                  <div>
                    {currency} {totals.subtotal.toFixed(2)}
                  </div>
                </div>
                <div className="flex justify-between kv">
                  <div>{defaultTaxType || "Tax"}</div>
                  <div>
                    {currency} {totals.gst.toFixed(2)}
                  </div>
                </div>
                <div className="flex justify-between kv">
                  <div>Total Discount</div>
                  <div>
                    - {currency} {totals.discount.toFixed(2)}
                  </div>
                </div>
                <div className="flex justify-between kv">
                  <div>Advance from items</div>
                  <div>
                    - {currency} {totals.advanceItems.toFixed(2)}
                  </div>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-semibold text-lg">
                  <div>Total</div>
                  <div>
                    {currency} {totals.total.toFixed(2)}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="kv">Advance Payment ({currency})</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={advancePayment}
                    onChange={(e) =>
                      setAdvancePayment(Number(e.target.value || 0))
                    }
                  />
                </div>

                <div>
                  <label className="kv">Payment Method</label>
                  <select
                    className="input"
                    value={advanceMethod}
                    onChange={(e) => setAdvanceMethod(e.target.value)}
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank Transfer</option>
                    <option>Card</option>
                  </select>
                </div>
                {/* 
                <div className="mt-3">
                  <div className="kv">Balance</div>
                  <div className="text-xl font-bold">
                    {currency}{" "}
                    {(totals.total - (Number(advancePayment) || 0)).toFixed(2)}
                  </div>
                </div> */}
                <div className="mt-3">
                  <div className="kv">Balance</div>
                  <div className="text-xl font-bold">
                    {currency} {totals.total.toFixed(2)}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="submit"
                    className="btn w-full"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Quotation"}
                  </button>
                  <button
                    type="button"
                    className="w-full py-2 rounded-md border"
                    onClick={() => {
                      /* maybe reset */
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <h4 className="font-semibold">Actions</h4>
              <p className="kv text-sm mb-3">
                After saving you can preview, convert to invoice or print from
                the Professional Invoice Maker.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-md border w-full"
                  onClick={() => {
                    /* quick draft */
                  }}
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => submit()}
                >
                  Quick Save
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold mb-2">Notes & Terms</h4>
          <textarea
            className="input"
            rows={3}
            value={globalRemark}
            onChange={(e) => setGlobalRemark(e.target.value)}
            placeholder="Any notes or terms for this quotation..."
          />
        </div>
      </form>
    </>
  );
}
