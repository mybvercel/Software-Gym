"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Clock, CalendarDays, Users, TrendingUp, UserPlus, DollarSign, Activity, CreditCard } from "lucide-react";
import { arHour, arWeekday, arDaysAgoStartISO, arDateOnly } from "@/lib/datetime";

const T = {
  navy: "#0D1B2A", green: "#22C55E", greenDim: "rgba(34,197,94,0.10)",
  greenBorder: "rgba(34,197,94,0.28)", card: "#FFFFFF", bg: "#F1F5F9",
  border: "#E2E8F0", text: "#0F172A", muted: "#64748B", light: "#94A3B8",
  red: "#EF4444",
  font: "'Space Grotesk', system-ui, sans-serif",
};

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

type Period = "week" | "month" | "all";

export default function TrainerStats({ gymId }: { gymId: string | null }) {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>("month");
  const [rows, setRows] = useState<string[]>([]); // checked_in_at timestamps
  const [isLoading, setIsLoading] = useState(true);

  // Business data (loaded once, independent of the attendance period)
  const [biz, setBiz] = useState<{
    total: number; active: number; newThisMonth: number; trained30: number;
    revenue: number; duesOk: number; duesExpired: number;
  } | null>(null);

  useEffect(() => { if (gymId) load(); }, [gymId, period]);
  useEffect(() => { if (gymId) loadBiz(); }, [gymId]);

  const loadBiz = async () => {
    const monthStartISO = `${arDateOnly().slice(0, 7)}-01T03:00:00.000Z`;
    const [{ data: members }, { data: pays }, { data: att30 }] = await Promise.all([
      supabase.from("profiles").select("id, is_active, created_at").eq("gym_id", gymId!).eq("role", "member"),
      supabase.from("payments").select("member_id, amount, status, paid_at, period_to").eq("gym_id", gymId!).order("period_to", { ascending: false }),
      supabase.from("attendance").select("member_id").eq("gym_id", gymId!).gte("checked_in_at", arDaysAgoStartISO(30)),
    ]);
    const ms = members ?? [];
    const active = ms.filter(m => m.is_active).length;
    const newThisMonth = ms.filter(m => m.created_at >= monthStartISO).length;
    const trained30 = new Set((att30 ?? []).map((a: any) => a.member_id)).size;

    const revenue = (pays ?? [])
      .filter((p: any) => p.status === "approved" && p.paid_at && p.paid_at >= monthStartISO)
      .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

    // latest payment per member → cuota al día / vencida
    const lastPay = new Map<string, any>();
    for (const p of (pays ?? [])) if (!lastPay.has(p.member_id)) lastPay.set(p.member_id, p);
    const today = arDateOnly();
    let duesOk = 0, duesExpired = 0;
    for (const m of ms) {
      if (!m.is_active) continue;
      const p = lastPay.get(m.id);
      if (p?.status === "approved" && p.period_to) {
        if (p.period_to >= today) duesOk++; else duesExpired++;
      }
    }

    setBiz({ total: ms.length, active, newThisMonth, trained30, revenue, duesOk, duesExpired });
  };

  const load = async () => {
    setIsLoading(true);
    let q = supabase.from("attendance").select("checked_in_at").eq("gym_id", gymId!);
    if (period === "week") q = q.gte("checked_in_at", arDaysAgoStartISO(7));
    else if (period === "month") q = q.gte("checked_in_at", arDaysAgoStartISO(30));
    const { data } = await q;
    setRows((data ?? []).map((r: any) => r.checked_in_at));
    setIsLoading(false);
  };

  /* ── Aggregations (Córdoba time) ── */
  const byHour = new Map<number, number>();
  const byDay = new Map<number, number>();
  for (const ts of rows) {
    const d = new Date(ts);
    const h = arHour(d);
    const wd = arWeekday(d); // 1=Lun … 7=Dom
    byHour.set(h, (byHour.get(h) ?? 0) + 1);
    byDay.set(wd, (byDay.get(wd) ?? 0) + 1);
  }

  // Hour range: from earliest to latest hour with activity (fallback 6–22)
  const activeHours = [...byHour.keys()];
  const minH = activeHours.length ? Math.min(...activeHours) : 6;
  const maxH = activeHours.length ? Math.max(...activeHours) : 22;
  const hourData = [];
  for (let h = minH; h <= maxH; h++) {
    hourData.push({ label: `${String(h).padStart(2, "0")}h`, count: byHour.get(h) ?? 0, hour: h });
  }

  const dayData = DAY_NAMES.map((label, i) => ({ label, count: byDay.get(i + 1) ?? 0, day: i + 1 }));

  // Insights
  const total = rows.length;
  const peakHour = hourData.reduce((a, b) => (b.count > a.count ? b : a), { count: -1, hour: -1, label: "" });
  const peakDay = dayData.reduce((a, b) => (b.count > a.count ? b : a), { count: -1, day: 0, label: "" });

  const periodLabel = period === "week" ? "última semana" : period === "month" ? "último mes" : "histórico";

  const fmtMoney = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;

  return (
    <div style={{ fontFamily: T.font }}>
      <h2 style={{ fontFamily: T.font, fontWeight: 800, fontSize: "22px", color: T.text, margin: "0 0 16px" }}>
        Estadísticas
      </h2>

      {/* ── Resumen del negocio ── */}
      {biz && (
        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>
            Resumen del negocio
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
            <BizCard icon={<Users size={16} />} value={`${biz.active}`} label={`alumnos activos (${biz.total} en total)`} />
            <BizCard icon={<UserPlus size={16} />} value={`${biz.newThisMonth}`} label="altas este mes" color={T.green} />
            <BizCard icon={<DollarSign size={16} />} value={fmtMoney(biz.revenue)} label="ingresos del mes" color={T.green} />
            <BizCard icon={<Activity size={16} />} value={`${biz.active > 0 ? Math.round((biz.trained30 / biz.active) * 100) : 0}%`} label="entrenó últimos 30 días" />
            <BizCard icon={<CreditCard size={16} />} value={`${biz.duesOk}`} label="cuotas al día" color={T.green} />
            <BizCard icon={<CreditCard size={16} />} value={`${biz.duesExpired}`} label="cuotas vencidas" color={biz.duesExpired > 0 ? T.red : T.light} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ fontFamily: T.font, fontWeight: 800, fontSize: "18px", color: T.text, margin: 0 }}>
          Asistencia
        </h3>
        <div style={{ display: "flex", gap: "6px" }}>
          {([["week", "Semana"], ["month", "Mes"], ["all", "Todo"]] as [Period, string][]).map(([p, l]) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "7px 14px", borderRadius: "999px", cursor: "pointer",
              border: `1.5px solid ${period === p ? T.green : T.border}`,
              background: period === p ? T.greenDim : T.card,
              color: period === p ? T.green : T.muted,
              fontFamily: T.font, fontWeight: 700, fontSize: "13px",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div className="gymos-spinner-lg" style={{ borderTopColor: T.green, borderColor: T.border }} />
        </div>
      ) : total === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", background: T.card, border: `1px solid ${T.border}`, borderRadius: "16px" }}>
          <Users size={32} color={T.light} strokeWidth={1.5} style={{ marginBottom: "12px" }} />
          <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "16px", color: T.text, margin: "0 0 6px" }}>
            Sin datos en este período
          </p>
          <p style={{ fontSize: "14px", color: T.muted, margin: 0 }}>
            Cuando los alumnos empiecen a entrenar, vas a ver acá los horarios y días con más asistencia.
          </p>
        </div>
      ) : (
        <>
          {/* Insight cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
            <Insight icon={<Users size={16} />} value={String(total)} label={`asistencias · ${periodLabel}`} />
            <Insight icon={<Clock size={16} />} value={peakHour.hour >= 0 ? `${String(peakHour.hour).padStart(2, "0")}h` : "—"} label="hora pico" />
            <Insight icon={<CalendarDays size={16} />} value={peakDay.day ? DAY_NAMES[peakDay.day - 1] : "—"} label="día pico" />
          </div>

          {/* By hour */}
          <ChartCard title="Asistencia por hora" subtitle="A qué hora vienen más">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={hourData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: T.muted, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fill: T.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(34,197,94,0.06)" }} contentStyle={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: "10px", fontSize: "12px", color: T.text }} formatter={(v) => [`${v}`, "Asistencias"]} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {hourData.map((d, i) => (
                    <Cell key={i} fill={d.hour === peakHour.hour ? T.green : "rgba(34,197,94,0.45)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* By day */}
          <ChartCard title="Asistencia por día" subtitle="Qué días vienen más">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={dayData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: T.muted, fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: T.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(34,197,94,0.06)" }} contentStyle={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: "10px", fontSize: "12px", color: T.text }} formatter={(v) => [`${v}`, "Asistencias"]} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {dayData.map((d, i) => (
                    <Cell key={i} fill={d.day === peakDay.day ? T.green : "rgba(34,197,94,0.45)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Conclusion */}
          <div style={{ background: T.greenDim, border: `1px solid ${T.greenBorder}`, borderRadius: "14px", padding: "14px 16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <TrendingUp size={18} color={T.green} style={{ flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "14px", color: T.text, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
              {peakDay.day > 0 && peakHour.hour >= 0
                ? `El momento de mayor asistencia es el ${DAY_LONG[peakDay.day - 1]} alrededor de las ${String(peakHour.hour).padStart(2, "0")}:00 hs. Tenelo en cuenta para reforzar la atención.`
                : "Todavía hay pocos datos para sacar conclusiones."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function BizCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color?: string }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "14px", padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ width: "30px", height: "30px", borderRadius: "9px", background: T.greenDim, display: "flex", alignItems: "center", justifyContent: "center", color: color ?? T.green }}>{icon}</span>
      </div>
      <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: "22px", color: color ?? T.text, margin: "0 0 2px", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: "12px", color: T.muted, margin: 0, lineHeight: 1.3 }}>{label}</p>
    </div>
  );
}

function Insight({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "14px", padding: "14px 12px", textAlign: "center" }}>
      <div style={{ color: T.green, display: "flex", justifyContent: "center", marginBottom: "6px" }}>{icon}</div>
      <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: "20px", color: T.text, margin: "0 0 2px" }}>{value}</p>
      <p style={{ fontSize: "11px", color: T.muted, margin: 0, lineHeight: 1.3 }}>{label}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
      <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: "16px", color: T.text, margin: "0 0 2px" }}>{title}</p>
      <p style={{ fontSize: "13px", color: T.muted, margin: "0 0 12px" }}>{subtitle}</p>
      {children}
    </div>
  );
}
