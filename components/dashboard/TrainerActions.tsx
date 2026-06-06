"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Cake, UserMinus, CreditCard, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { arDateOnly, arDaysAgoStartISO, arFormat } from "@/lib/datetime";

const T = {
  green: "#22C55E", greenDim: "rgba(34,197,94,0.10)", greenBorder: "rgba(34,197,94,0.28)",
  card: "#FFFFFF", bg: "#F1F5F9", border: "#E2E8F0", text: "#0F172A",
  muted: "#64748B", light: "#94A3B8", orange: "#F97316", orangeDim: "rgba(249,115,22,0.10)",
  red: "#EF4444", redDim: "rgba(239,68,68,0.10)", blue: "#3B82F6", blueDim: "rgba(59,130,246,0.10)",
  font: "'Space Grotesk', system-ui, sans-serif",
};

interface ActionItem {
  member_id: string;
  name: string;
  detail: string;
  message: string;
}

export default function TrainerActions({ gymId }: { gymId: string | null }) {
  const supabase = createClient();
  const [open, setOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [birthdays, setBirthdays] = useState<ActionItem[]>([]);
  const [inactive, setInactive] = useState<ActionItem[]>([]);
  const [dues, setDues] = useState<ActionItem[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { if (gymId) load(); }, [gymId]);

  const load = async () => {
    setIsLoading(true);
    const [{ data: members }, { data: att }, { data: pays }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, birth_date").eq("gym_id", gymId!).eq("role", "member").eq("is_active", true),
      supabase.from("attendance").select("member_id, checked_in_at").eq("gym_id", gymId!).gte("checked_in_at", arDaysAgoStartISO(60)),
      supabase.from("payments").select("member_id, period_to, status").eq("gym_id", gymId!).order("period_to", { ascending: false }),
    ]);

    const ms = members ?? [];
    const firstName = (n: string) => n.split(" ")[0];

    // Last attendance per member
    const lastAtt = new Map<string, string>();
    for (const a of (att ?? [])) {
      const cur = lastAtt.get(a.member_id);
      if (!cur || a.checked_in_at > cur) lastAtt.set(a.member_id, a.checked_in_at);
    }

    // Latest payment per member
    const lastPay = new Map<string, { period_to?: string; status: string }>();
    for (const p of (pays ?? [])) {
      if (!lastPay.has(p.member_id)) lastPay.set(p.member_id, p);
    }

    const todayMD = arDateOnly().slice(5); // MM-DD

    // ── Birthdays (today) ──
    const bd: ActionItem[] = [];
    for (const m of ms) {
      if (!m.birth_date) continue;
      if (m.birth_date.slice(5) === todayMD) {
        bd.push({
          member_id: m.id, name: m.full_name, detail: "Cumple años hoy",
          message: `¡Feliz cumpleaños, ${firstName(m.full_name)}! Que tengas un gran día. Cualquier cosa que necesites para tu entrenamiento, estoy a disposición.`,
        });
      }
    }

    // ── Inactive (no attendance for 10+ days) ──
    const now = Date.now();
    const inact: { item: ActionItem; days: number }[] = [];
    for (const m of ms) {
      const last = lastAtt.get(m.id);
      const days = last ? Math.floor((now - new Date(last).getTime()) / 86400000) : 999;
      if (days >= 10) {
        const detail = days >= 999 ? "Nunca registró asistencia" : `${days} días sin entrenar`;
        inact.push({
          days,
          item: {
            member_id: m.id, name: m.full_name, detail,
            message: `Hola ${firstName(m.full_name)}, vi que hace ${days >= 999 ? "un tiempo" : `${days} días`} que no venís a entrenar. Si necesitás reorganizar tus días o ajustar la rutina, lo vemos juntos. Te espero.`,
          },
        });
      }
    }
    inact.sort((a, b) => b.days - a.days);

    // ── Cuotas por vencer (≤5 días) o vencidas ──
    const du: { item: ActionItem; daysLeft: number }[] = [];
    for (const m of ms) {
      const p = lastPay.get(m.id);
      if (!p?.period_to || p.status !== "approved") continue;
      const daysLeft = Math.ceil((new Date(p.period_to).getTime() - now) / 86400000);
      if (daysLeft <= 5) {
        const detail = daysLeft < 0 ? `Vencida hace ${Math.abs(daysLeft)} días` : daysLeft === 0 ? "Vence hoy" : `Vence en ${daysLeft} días`;
        du.push({
          daysLeft,
          item: {
            member_id: m.id, name: m.full_name, detail,
            message: `Hola ${firstName(m.full_name)}, te recuerdo que tu cuota ${daysLeft < 0 ? "venció" : "vence"} el ${arFormat(p.period_to, { day: "numeric", month: "long" })}. Avisame si querés coordinar el pago. ¡Gracias!`,
          },
        });
      }
    }
    du.sort((a, b) => a.daysLeft - b.daysLeft);

    setBirthdays(bd);
    setInactive(inact.map(x => x.item));
    setDues(du.map(x => x.item));
    setIsLoading(false);
  };

  const copyMsg = (id: string, msg: string) => {
    navigator.clipboard?.writeText(msg);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const totalActions = birthdays.length + inactive.length + dues.length;

  if (isLoading || totalActions === 0) return null; // hide when nothing to do

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "16px", overflow: "hidden", marginBottom: "20px" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "none", border: "none", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: T.font, fontWeight: 800, fontSize: "17px", color: T.text }}>Acciones de hoy</span>
          <span style={{ background: T.green, color: "#fff", fontFamily: T.font, fontWeight: 800, fontSize: "12px", borderRadius: "999px", padding: "2px 9px" }}>{totalActions}</span>
        </div>
        {open ? <ChevronUp size={18} color={T.light} /> : <ChevronDown size={18} color={T.light} />}
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <Section title="Cumpleaños" icon={<Cake size={15} color={T.blue} />} color={T.blue} bg={T.blueDim} items={birthdays} copied={copied} onCopy={copyMsg} />
          <Section title="Sin venir hace tiempo" icon={<UserMinus size={15} color={T.orange} />} color={T.orange} bg={T.orangeDim} items={inactive} copied={copied} onCopy={copyMsg} />
          <Section title="Cuotas" icon={<CreditCard size={15} color={T.red} />} color={T.red} bg={T.redDim} items={dues} copied={copied} onCopy={copyMsg} />
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, color, bg, items, copied, onCopy }: {
  title: string; icon: React.ReactNode; color: string; bg: string;
  items: ActionItem[]; copied: string | null; onCopy: (id: string, m: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
        <span style={{ width: "26px", height: "26px", borderRadius: "8px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
        <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: T.text }}>{title}</span>
        <span style={{ fontSize: "13px", color: T.muted }}>({items.length})</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map(it => {
          const id = title + it.member_id;
          return (
            <div key={id} style={{ background: T.bg, borderRadius: "12px", padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                <div>
                  <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "15px", color: T.text, margin: 0 }}>{it.name}</p>
                  <p style={{ fontSize: "13px", color, fontWeight: 600, margin: "1px 0 0" }}>{it.detail}</p>
                </div>
                <button onClick={() => onCopy(id, it.message)} style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0, padding: "8px 12px", borderRadius: "9px", background: copied === id ? T.greenDim : T.card, border: `1px solid ${copied === id ? T.greenBorder : T.border}`, cursor: "pointer", color: copied === id ? T.green : T.muted, fontFamily: T.font, fontWeight: 700, fontSize: "13px" }}>
                  {copied === id ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
              <p style={{ fontSize: "13.5px", color: T.muted, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{it.message}"</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
