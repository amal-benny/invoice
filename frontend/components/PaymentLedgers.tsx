"use client";
import React, { useEffect, useRef, useState } from "react";
import { authFetch } from "../lib/api";
import { Edit, Trash, Save, X } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type Ledger = {
  id: number;
  category: string;
  deleted?: boolean;
  createdAt?: string;
  createdById?: number;
};

export default function PaymentLedgers() {
  const [items, setItems] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const color = "rgb(128, 41, 73)";
  const undoTimerRef = useRef<number | null>(null);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // user-specific deleted keys
  const computedUserKey = (() => {
    try {
      const u =
        typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const parsed: { id?: number } | null = u ? JSON.parse(u) : null;
      return parsed?.id ? `pl_deleted_${parsed.id}` : "pl_deleted_global";
    } catch {
      return "pl_deleted_global";
    }
  })();

  const initialDeletedIds = (() => {
    try {
      const raw = localStorage.getItem(computedUserKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed))
        return parsed.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
      return [];
    } catch {
      return [];
    }
  })();

  const [deletedIds, setDeletedIds] = useState<number[]>(initialDeletedIds);
  const [lastDeleted, setLastDeleted] = useState<{
    id: number;
    name: string;
  } | null>(null);

  function persistDeletedIds(next: number[]) {
    try {
      localStorage.setItem(computedUserKey, JSON.stringify(next));
    } catch (err) {
      console.error("Failed to persist deleted ids", err);
    }
  }

  // load items
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const data = await authFetch("/api/payment-ledgers");
        const rawItems: Ledger[] = Array.isArray(data) ? data : [];
        if (!mounted) return;
        const updatedItems = rawItems.map((item) => ({
          ...item,
          deleted: deletedIds.includes(item.id),
        }));
        setItems(updatedItems);
      } catch (err) {
        console.error("Failed to load ledgers", err);
        toast.error("Failed to load ledgers: " + String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    };
  }, [deletedIds]);

  function filtered() {
    const q = search.trim().toLowerCase();
    let visible = items;
    if (q) visible = visible.filter((it) => it.category.toLowerCase().includes(q));
    return visible;
  }

  // pagination logic
  const totalItems = filtered().length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedItems = filtered().slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    // keep current page valid if filtered results shrink
    const tp = Math.max(1, Math.ceil(filtered().length / itemsPerPage));
    if (currentPage > tp) setCurrentPage(tp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, items]);

  async function createItem(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!createValue.trim()) return toast.error("Category is required");
    setSaving(true);
    try {
      const created = (await authFetch("/api/payment-ledgers", {
        method: "POST",
        body: JSON.stringify({ category: createValue.trim() }),
        headers: { "Content-Type": "application/json" },
      })) as Ledger;

      if (created?.id) setItems((s) => [{ ...created, deleted: false }, ...s]);
      setCreateValue("");
      setCreating(false);
      toast.success("Category created");
    } catch (err) {
      toast.error("Create failed: " + String(err));
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: Ledger) {
    if (item.deleted) return;
    setEditingId(item.id);
    setEditValue(item.category);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEdit(id: number) {
    if (!editValue.trim()) return toast.error("Category is required");
    setSaving(true);
    try {
      const updated = (await authFetch(`/api/payment-ledgers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ category: editValue.trim() }),
        headers: { "Content-Type": "application/json" },
      })) as Ledger;

      setItems((s) => s.map((it) => (it.id === id ? { ...updated, deleted: it.deleted } : it)));
      setEditingId(null);
      toast.success("Category updated");
    } catch (err) {
      toast.error("Update failed: " + String(err));
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function softDelete(id: number) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, deleted: true } : it)));
    const nextDeleted = Array.from(new Set([...deletedIds, id]));
    setDeletedIds(nextDeleted);
    persistDeletedIds(nextDeleted);
    setLastDeleted({ id, name: items.find((it) => it.id === id)?.category || "" });

    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => {
      setLastDeleted(null);
      undoTimerRef.current = null;
    }, 6000);
  }

  function undoDelete() {
    setLastDeleted(null);
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  // small helper to render pagination buttons with brand color
  function PaginationButton({ pageNum }: { pageNum: number }) {
    const isActive = currentPage === pageNum;
    return (
      <button
        key={pageNum}
        onClick={() => setCurrentPage(pageNum)}
        className={`px-3 py-1 rounded-md text-sm font-medium border transition focus:outline-none`}
        style={{
          backgroundColor: isActive ? color : "white",
          color: isActive ? "white" : color,
          borderColor: color,
          boxShadow: isActive ? "0 2px 6px rgba(128,41,73,0.18)" : undefined,
        }}
        aria-current={isActive ? "page" : undefined}
      >
        {pageNum}
      </button>
    );
  }

  return (
    <div className="card mt-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Ledger Categories</h3>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              className="w-full input rounded-full border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 placeholder:text-gray-400"
              style={{ borderColor: color }}
              placeholder="Search ledgers..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {!creating ? (
            <button
              onClick={() => {
                setCreating(true);
                setTimeout(() => document.getElementById("pl-create-category")?.focus(), 50);
              }}
              className="px-4 py-2 rounded-lg text-white font-medium shadow-md border transition transform hover:-translate-y-0.5"
              style={{ backgroundColor: color, borderColor: color }}
            >
              Create
            </button>
          ) : (
            <button
              onClick={() => { setCreating(false); setCreateValue(""); }}
              className="px-3 py-2 rounded-lg bg-white border transition"
              style={{ borderColor: color, color }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {creating && (
        <form onSubmit={createItem} className="flex gap-3 mb-6">
          <input
            id="pl-create-category"
            className="input rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
            style={{ border: `1px solid ${color}` }}
            placeholder="Category"
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            required
          />
          <button
            className="px-4 py-2 rounded-lg text-white shadow-md transition transform hover:-translate-y-0.5"
            style={{ backgroundColor: color, borderColor: color }}
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500 py-8 text-center">Loading...</div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <strong>
                {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                {"–"}
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </strong>{" "}
              of <strong>{totalItems}</strong>
            </div>
            <div className="hidden sm:block text-xs text-gray-500 italic">Tip: use search to quickly filter categories</div>
          </div>

          <div
            className="overflow-x-auto shadow-md rounded-lg"
            style={{ border: `1px solid rgba(0,0,0,0.06)` }}
          >
            <table className="min-w-full">
              <thead>
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider sticky top-0"
                    style={{ backgroundColor: color }}
                  >
                    ID
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider sticky top-0"
                    style={{ backgroundColor: color }}
                  >
                    Category
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider sticky top-0"
                    style={{ backgroundColor: color }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500">
                      No ledgers found.
                    </td>
                  </tr>
                )}

                {paginatedItems.map((it, idx) => (
                  <tr
                    key={it.id}
                    className={`transition-transform transform hover:scale-[1.002]`}
                    style={{
                      backgroundColor: it.deleted ? "#fff5f6" : idx % 2 === 0 ? "white" : "#fafafa",
                      opacity: it.deleted ? 0.85 : 1,
                      textDecoration: it.deleted ? "line-through" : "none",
                    }}
                  >
                    <td className="px-6 py-4 text-sm text-gray-700 w-24">{it.id}</td>

                    <td className="px-6 py-4 text-sm font-medium" style={{ color }}>
                      {editingId === it.id ? (
                        <input
                          className="border rounded px-2 py-1 w-full"
                          style={{ borderColor: color }}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                        />
                      ) : (
                        <div>{it.category}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {it.deleted ? "Marked deleted (only you)" : ""}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {editingId === it.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-3 py-1 border rounded text-gray-700 bg-white hover:bg-gray-50"
                            title="Cancel"
                          >
                            <X size={14} /> Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(it.id)}
                            className="flex items-center gap-1 px-3 py-1 rounded text-white shadow-md"
                            style={{ backgroundColor: color, borderColor: color }}
                            disabled={saving || it.deleted}
                            title="Save"
                          >
                            <Save size={14} /> Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {!it.deleted && (
                            <button
                              title="Edit"
                              onClick={() => startEdit(it)}
                              className="flex items-center gap-1 px-3 py-1 rounded border text-green-700 bg-white hover:bg-green-50"
                              style={{ borderColor: "rgba(16,185,129,0.15)" }}
                            >
                              <Edit size={14} /> Edit
                            </button>
                          )}
                          <button
                            title="Delete"
                            onClick={() => softDelete(it.id)}
                            className="flex items-center gap-1 px-3 py-1 rounded border text-red-700 bg-white hover:bg-red-50"
                            style={{ borderColor: "rgba(239,68,68,0.12)" }}
                          >
                            <Trash size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <PaginationButton key={pageNum} pageNum={pageNum} />
              ))}
            </div>
          </div>
        </>
      )}

      {lastDeleted && (
        <div className="fixed left-4 bottom-6 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-3 z-50">
          <div>Removed “{lastDeleted.name}”</div>
          <button onClick={undoDelete} className="px-2 py-1 rounded bg-white text-black ml-2">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
