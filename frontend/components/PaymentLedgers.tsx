"use client";
import React, { useEffect, useRef, useState } from "react";
import { authFetch } from "../lib/api";
import { Edit, Trash, Save, X } from "lucide-react";

type Ledger = {
  id: number;
  category: string;
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

  // compute user-specific key and load deleted ids
  const computedUserKey = (() => {
    try {
      const u = typeof window !== "undefined" ? localStorage.getItem("user") : null;
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
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => Number(x))
          .filter((n) => !Number.isNaN(n));
      }
      return [];
    } catch {
      return [];
    }
  })();

  const [deletedIds, setDeletedIds] = useState<number[]>(initialDeletedIds);
  const [lastDeleted, setLastDeleted] = useState<{ id: number; name: string } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  function persistDeletedIds(next: number[]) {
    try {
      localStorage.setItem(computedUserKey, JSON.stringify(next));
    } catch (err) {
      console.error("Failed to persist deleted ids", err);
    }
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const data = await authFetch("/api/payment-ledgers");
        const rawItems: Ledger[] = Array.isArray(data) ? data : [];
        if (!mounted) return;
        setItems(rawItems.filter((it) => !deletedIds.includes(it.id)));
      } catch (err) {
        console.error("Failed to load payment ledgers", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    };
  }, [deletedIds]);

  function filtered(): Ledger[] {
    const q = search.trim().toLowerCase();
    const visible = items.filter((it) => !deletedIds.includes(it.id));
    if (!q) return visible;
    return visible.filter((it) => it.category.toLowerCase().includes(q));
  }

  async function createItem(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!createValue.trim()) return alert("Category is required");
    setSaving(true);
    try {
      const created = (await authFetch("/api/payment-ledgers", {
        method: "POST",
        body: JSON.stringify({ category: createValue.trim() }),
        headers: { "Content-Type": "application/json" },
      })) as Ledger;

      if (created?.id && deletedIds.includes(created.id)) {
        const next = deletedIds.filter((x) => x !== created.id);
        setDeletedIds(next);
        persistDeletedIds(next);
      }

      if (!deletedIds.includes(created?.id)) {
        setItems((s) => [created, ...s]);
      }

      setCreateValue("");
      setCreating(false);
    } catch (err) {
      alert("Create failed");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: Ledger) {
    setEditingId(item.id);
    setEditValue(item.category);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEdit(id: number) {
    if (!editValue.trim()) return alert("Category is required");
    setSaving(true);
    try {
      const updated = (await authFetch(`/api/payment-ledgers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ category: editValue.trim() }),
        headers: { "Content-Type": "application/json" },
      })) as Ledger;
      setItems((s) => s.map((it) => (it.id === id ? updated : it)));
      setEditingId(null);
    } catch (err) {
      alert("Update failed");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function softDelete(id: number, name: string) {
    if (deletedIds.includes(id)) return;
    const next = [...deletedIds, id];
    setDeletedIds(next);
    persistDeletedIds(next);
    setItems((s) => s.filter((it) => it.id !== id));
    setLastDeleted({ id, name });

    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => {
      setLastDeleted(null);
      undoTimerRef.current = null;
    }, 6000);
  }

  function undoDelete() {
    if (!lastDeleted) return;
    const id = lastDeleted.id;
    const next = deletedIds.filter((x) => x !== id);
    setDeletedIds(next);
    persistDeletedIds(next);

    (async () => {
      try {
        const single = (await authFetch(`/api/payment-ledgers/${id}`)) as Ledger;
        if (single && single.id) {
          setItems((s) => [single, ...s]);
        }
      } catch (err) {
        console.error("Failed to fetch ledger for undo", err);
      }
    })();

    setLastDeleted(null);
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Payment Ledger Categories
        </h3>

        {/* Search + Create */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              className="input rounded-full border px-4 py-2 pr-10 shadow-sm focus:outline-none focus:ring-2 placeholder:text-gray-400"
              style={{
                borderColor: color,
                // focusRingColor: color,
              }}
              placeholder="Search ledgers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
              />
            </svg>
          </div>

          {!creating ? (
            <button
              onClick={() => {
                setCreating(true);
                setTimeout(() => {
                  const el = document.getElementById("pl-create-category");
                  el?.focus();
                }, 50);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow-md border transition"
              style={{
                backgroundColor: color,
                borderColor: color,
              }}
            >
              Create
            </button>
          ) : (
            <button
              onClick={() => {
                setCreating(false);
                setCreateValue("");
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border transition"
              style={{
                borderColor: color,
                color,
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={(e) => createItem(e)} className="flex gap-3 mb-6">
          <input
            id="pl-create-category"
            className="input rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
            style={{
              border: `1px solid ${color}`,
              //   focusRingColor: color,
            }}
            placeholder="Category"
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            required
          />
          <button
            className="btn rounded-lg text-white px-4 py-2 shadow-md"
            style={{
              backgroundColor: color,
              borderColor: color,
            }}
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </form>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered().length === 0 && (
            <div className="text-sm text-gray-500">No ledgers.</div>
          )}

          {filtered().map((it) => (
            <div
              key={it.id}
              className="relative p-4 rounded-xl bg-white shadow-md hover:shadow-lg transition border"
              style={{ borderColor: color }}
            >
              {editingId === it.id ? (
                <div className="flex items-center gap-2">
                  <input
                    className="input rounded-md px-3 py-2 focus:outline-none focus:ring-2"
                    style={{
                      border: `1px solid ${color}`,
                      //   focusRingColor: color,
                    }}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-md border text-gray-700"
                      style={{ borderColor: "#ccc" }}
                      onClick={() => setEditingId(null)}
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white shadow"
                      style={{
                        backgroundColor: color,
                        borderColor: color,
                      }}
                      onClick={() => saveEdit(it.id)}
                      disabled={saving}
                    >
                      <Save size={14} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="font-semibold text-lg" style={{ color }}>
                      {it.category}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      title="Edit"
                      onClick={() => startEdit(it)}
                      className="flex items-center gap-1 px-3 py-2 rounded-md border-2 shadow-sm transition-transform hover:scale-105 hover:bg-yellow-50"
                      style={{ borderColor: "yellow", color: "yellow" }}
                    >
                      <Edit size={16} /> Edit
                    </button>

                    <button
                      title="Remove"
                      onClick={() => softDelete(it.id, it.category)}
                      className="flex items-center gap-1 px-3 py-2 rounded-md border-2 shadow-sm transition-transform hover:scale-105 hover:bg-red-50"
                      style={{ borderColor: "red", color: "red" }}
                    >
                      <Trash size={16} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {lastDeleted ? (
        <div className="fixed left-4 bottom-6 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-3 z-50">
          <div>Removed “{lastDeleted.name}”</div>
          <button
            onClick={undoDelete}
            className="px-2 py-1 rounded bg-white text-black ml-2"
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
