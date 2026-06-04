"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Payment, Profile } from "@/lib/types";

interface Props { gymSlug: string; }

export default function PaymentsPanel({ gymSlug }: Props) {
  const supabase = createClient();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ member_id: "", amount: "", period_from: "", period_to: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [gymId, setGymId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("gym_id").eq("id", user.id).single();
    if (!profile) return;
    setGymId(profile.gym_id);

    const [{ data: pays }, { data: mems }] = await Promise.all([
      supabase.from("payments").select("*, member:profiles!payments_member_id_fkey(full_name, dni)").eq("gym_id", profile.gym_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("*").eq("gym_id", profile.gym_id).eq("role", "member").eq("is_active", true).order("full_name"),
    ]);
    setPayments((pays as any) ?? []);
    setMembers((mems as Profile[]) ?? []);
    setIsLoading(false);
  };

  const registerPayment = async () => {
    if (!newPayment.member_id || !newPayment.amount || !gymId) return;
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("payments").insert({
      gym_id: gymId,
      member_id: newPayment.member_id,
      amount: parseFloat(newPayment.amount),
      currency: "ARS",
      status: "approved",
      payment_method: "efectivo",
      period_from: newPayment.period_from || null,
      period_to: newPayment.period_to || null,
      paid_at: new Date().toISOString(),
    }).select("*, member:profiles!payments_member_id_fkey(full_name, dni)").single();

    if (data) {
      setPayments((prev) => [data as any, ...prev]);
      setShowNewPayment(false);
      setNewPayment({ member_id: "", amount: "", period_from: "", period_to: "" });
    }
    setIsSaving(false);
  };

  const updateStatus = async (paymentId: string, status: "approved" | "rejected") => {
    await supabase.from("payments").update({ status, paid_at: status === "approved" ? new Date().toISOString() : null }).eq("id", paymentId);
    setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, status } : p));
  };

  const filtered = payments.filter((p) => filter === "all" || p.status === filter);

  const totalCollected = payments.filter((p) => p.status === "approved").reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Pagos y Cobros</h1>
        <button onClick={() => setShowNewPayment(true)} className="btn btn-primary" id="new-payment-btn">
          + Registrar Pago
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total cobrado", value: `$${totalCollected.toLocaleString("es-AR")}`, color: "var(--color-success)" },
          { label: "Pendiente de cobro", value: `$${totalPending.toLocaleString("es-AR")}`, color: "var(--color-warning)" },
          { label: "Total transacciones", value: payments.length, color: "var(--color-accent)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="text-2xl font-bold mb-1" style={{ color: s.color, fontFamily: "var(--font-display)" }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            id={`payment-filter-${f}`}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: filter === f ? "var(--color-primary)" : "var(--bg-glass-light)",
              color: filter === f ? "#000" : "var(--text-secondary)",
              border: `1px solid ${filter === f ? "transparent" : "var(--border-subtle)"}`,
            }}
          >
            {f === "all" ? "Todos" : f === "pending" ? "Pendientes" : "Aprobados"}
          </button>
        ))}
      </div>

      {/* Payments list */}
      {isLoading ? (
        <div className="text-center py-12"><span className="loading-spinner mx-auto" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl flex items-center gap-4"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>
                  {(p.member as any)?.full_name ?? "Alumno desconocido"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {p.period_from ? `${p.period_from} – ${p.period_to ?? "?"}` : new Date(p.created_at).toLocaleDateString("es-AR")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  ${p.amount.toLocaleString("es-AR")} ARS
                </div>
                <span className={`badge text-xs ${p.status === "approved" ? "badge-success" : p.status === "pending" ? "badge-warning" : "badge-danger"}`}>
                  {p.status === "approved" ? "Cobrado" : p.status === "pending" ? "Pendiente" : "Rechazado"}
                </span>
              </div>
              {p.status === "pending" && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => updateStatus(p.id, "approved")} className="btn btn-secondary btn-sm" id={`approve-payment-${p.id}`}>✓</button>
                  <button onClick={() => updateStatus(p.id, "rejected")} className="btn btn-danger btn-sm" id={`reject-payment-${p.id}`}>✕</button>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center rounded-2xl" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
              <div className="text-4xl mb-3">💳</div>
              <p style={{ color: "var(--text-secondary)" }}>No hay pagos en esta categoría.</p>
            </div>
          )}
        </div>
      )}

      {/* New payment modal */}
      {showNewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 animate-fade-in-up" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Registrar Pago</h2>
              <button onClick={() => setShowNewPayment(false)} className="btn btn-ghost btn-sm" id="close-payment-modal">✕</button>
            </div>
            <div>
              <label className="form-label">Alumno *</label>
              <select className="form-select" value={newPayment.member_id} onChange={(e) => setNewPayment((p) => ({ ...p, member_id: e.target.value }))} id="new-payment-member">
                <option value="">Seleccioná un alumno</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Monto (ARS) *</label>
              <input type="number" min="0" step="100" className="form-input" placeholder="Ej: 15000" value={newPayment.amount} onChange={(e) => setNewPayment((p) => ({ ...p, amount: e.target.value }))} id="new-payment-amount" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Período desde</label>
                <input type="date" className="form-input" value={newPayment.period_from} onChange={(e) => setNewPayment((p) => ({ ...p, period_from: e.target.value }))} id="payment-period-from" />
              </div>
              <div>
                <label className="form-label">Período hasta</label>
                <input type="date" className="form-input" value={newPayment.period_to} onChange={(e) => setNewPayment((p) => ({ ...p, period_to: e.target.value }))} id="payment-period-to" />
              </div>
            </div>
            <button onClick={registerPayment} disabled={isSaving || !newPayment.member_id || !newPayment.amount} className="btn btn-primary btn-full" id="save-payment-btn">
              {isSaving ? <><span className="loading-spinner" /> Guardando...</> : "✓ Registrar Pago"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
