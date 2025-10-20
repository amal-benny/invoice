"use client";
import React, { useEffect, useRef, useState } from "react";
import { authFetch } from "../lib/api";
import { Edit, Trash, Save, X } from "lucide-react";

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

  // user-specific deleted keys
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
      if (Array.isArray(parsed)) return parsed.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
      return [];
    } catch {
      return [];
    }
  })();

  const [deletedIds, setDeletedIds] = useState<number[]>(initialDeletedIds);
  const [lastDeleted, setLastDeleted] = useState<{ id: number; name: string } | null>(null);

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

  async function createItem(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!createValue.trim()) return alert("Category is required");
    setSaving(true);
    try {
      const created = await authFetch("/api/payment-ledgers", {
        method: "POST",
        body: JSON.stringify({ category: createValue.trim() }),
        headers: { "Content-Type": "application/json" },
      }) as Ledger;

      if (created?.id) setItems((s) => [{ ...created, deleted: false }, ...s]);
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
    if (item.deleted) return;
    setEditingId(item.id);
    setEditValue(item.category);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEdit(id: number) {
    if (!editValue.trim()) return alert("Category is required");
    setSaving(true);
    try {
      const updated = await authFetch(`/api/payment-ledgers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ category: editValue.trim() }),
        headers: { "Content-Type": "application/json" },
      }) as Ledger;

      setItems((s) => s.map((it) => (it.id === id ? { ...updated, deleted: it.deleted } : it)));
      setEditingId(null);
    } catch (err) {
      alert("Update failed");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function softDelete(id: number) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, deleted: true } : it
      )
    );
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

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Payment Ledger Categories</h3>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              className="w-full input rounded-full border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 placeholder:text-gray-400"
              style={{ borderColor: color }}
              placeholder="Search ledgers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!creating ? (
            <button
              onClick={() => { setCreating(true); setTimeout(() => document.getElementById("pl-create-category")?.focus(), 50); }}
              className="px-4 py-2 rounded-lg text-white font-medium shadow-md border transition"
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
            className="px-4 py-2 rounded-lg text-white shadow-md"
            style={{ backgroundColor: color, borderColor: color }}
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered().length === 0 && <div className="text-sm text-gray-500">No ledgers.</div>}

          {filtered().map((it) => (
            <div
              key={it.id}
              className={`p-4 rounded-xl shadow-md hover:shadow-lg transition border`}
              style={{
                borderColor: color,
                backgroundColor: it.deleted ? "#FEE2E2" : "white",
                opacity: it.deleted ? 0.7 : 1,
                textDecoration: it.deleted ? "line-through" : "none",
              }}
            >
              {editingId === it.id ? (
                <div className="flex gap-2">
                  <input
                    className="input rounded-md px-3 py-2 focus:outline-none focus:ring-2"
                    style={{ border: `1px solid ${color}` }}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    disabled={it.deleted}
                  />
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-2 rounded-md border text-gray-700" style={{ borderColor: "#ccc" }} onClick={() => setEditingId(null)}>
                      <X size={14} /> Cancel
                    </button>
                    <button type="button" className="px-3 py-2 rounded-md text-white shadow" style={{ backgroundColor: color, borderColor: color }} onClick={() => saveEdit(it.id)} disabled={saving || it.deleted}>
                      <Save size={14} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-center">
                    <div className="font-semibold text-lg" style={{ color }}>{it.category}</div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    {!it.deleted && (
                      <button title="Edit" onClick={() => startEdit(it)} className="flex items-center gap-1 px-3 py-2 rounded-md border-2 shadow-sm transition-transform hover:scale-105 hover:bg-green-50" style={{ borderColor: "green", color: "green" }}>
                        <Edit size={16} /> Edit
                      </button>
                    )}
                    <button title="Delete" onClick={() => softDelete(it.id)} className="flex items-center gap-1 px-3 py-2 rounded-md border-2 shadow-sm transition-transform hover:scale-105 hover:bg-red-50" style={{ borderColor: "red", color: "red" }}>
                      <Trash size={16} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lastDeleted && (
        <div className="fixed left-4 bottom-6 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-3 z-50">
          <div>Removed “{lastDeleted.name}”</div>
          <button onClick={undoDelete} className="px-2 py-1 rounded bg-white text-black ml-2">Undo</button>
        </div>
      )}
    </div>
  );
}
