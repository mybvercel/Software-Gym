"use client";

import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, Check, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const T = {
  navy: "#0D1B2A", green: "#22C55E", greenDim: "rgba(34,197,94,0.10)",
  greenBorder: "rgba(34,197,94,0.28)", card: "#FFFFFF", bg: "#F1F5F9",
  border: "#E2E8F0", text: "#0F172A", muted: "#64748B", light: "#94A3B8",
  red: "#EF4444", redDim: "rgba(239,68,68,0.10)", orange: "#F97316",
  font: "'Space Grotesk', system-ui, sans-serif",
};

/* ── Column detection engine ──────────────────────────────── */

const FIELD_PATTERNS: Record<string, RegExp> = {
  full_name: /nombre|name|alumno|apellido|full.?name|cliente|socio/i,
  dni:       /dni|documento|cedula|nro\.?\s*doc|id\b|legajo/i,
  phone:     /tel[eé]?fono?|phone|cel[ular]*|whatsapp|contacto/i,
};

function detectColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
    for (const h of headers) {
      if (!used.has(h) && pattern.test(h.trim())) {
        mapping[field] = h;
        used.add(h);
        break;
      }
    }
  }
  return mapping;
}

interface ParsedRow { [key: string]: string }

interface Props {
  gymSlug: string;
  onClose: () => void;
  onImported: () => void;
}

type Step = "upload" | "map" | "preview" | "importing" | "done";

export default function CSVImportModal({ gymSlug, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step,       setStep]       = useState<Step>("upload");
  const [headers,    setHeaders]    = useState<string[]>([]);
  const [rows,       setRows]       = useState<ParsedRow[]>([]);
  const [mapping,    setMapping]    = useState<Record<string, string>>({});
  const [result,     setResult]     = useState<{ created: string[]; skipped: string[]; errors: string[] } | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const [fileName,   setFileName]   = useState("");
  const [importErr,  setImportErr]  = useState<string | null>(null);

  /* ── File parsing ── */
  const parseFile = (file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = e => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: "" });
        const hdrs = json.length ? Object.keys(json[0]) : [];
        finalizeParse(hdrs, json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV
      Papa.parse<ParsedRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: r => finalizeParse(r.meta.fields ?? [], r.data),
      });
    }
  };

  const finalizeParse = (hdrs: string[], data: ParsedRow[]) => {
    setHeaders(hdrs);
    setRows(data);
    const auto = detectColumns(hdrs);
    setMapping(auto);
    setStep("map");
  };

  /* ── Import ── */
  const runImport = async () => {
    setStep("importing");
    setImportErr(null);

    const nameCol  = mapping.full_name;
    const dniCol   = mapping.dni;
    const phoneCol = mapping.phone;

    if (!nameCol || !dniCol) {
      setImportErr("Asigná al menos las columnas Nombre y DNI.");
      setStep("preview");
      return;
    }

    const payload = rows
      .map(r => ({
        full_name: r[nameCol]?.trim(),
        dni:       r[dniCol]?.replace(/\D/g, "").trim(),
        phone:     phoneCol ? r[phoneCol]?.trim() : undefined,
      }))
      .filter(r => r.full_name && r.dni && r.dni.length >= 7);

    if (payload.length === 0) {
      setImportErr("No se encontraron filas válidas (nombre + DNI con al menos 7 dígitos).");
      setStep("preview");
      return;
    }

    const res  = await fetch(`/api/gym/${gymSlug}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) { setImportErr(json.error ?? "Error al importar."); setStep("preview"); return; }

    setResult(json);
    setStep("done");
  };

  /* ── Drag & drop ── */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const previewRows = rows.slice(0, 5);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      }}
    >
      <div style={{
        width: "100%", maxWidth: "580px",
        background: T.card, borderRadius: "20px",
        border: `1px solid ${T.border}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        maxHeight: "90vh", overflowY: "auto",
      }}>

        {/* Header */}
        <div style={{
          background: T.navy, padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileSpreadsheet size={20} color={T.green} />
            <div>
              <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: "16px", color: "#fff", margin: 0 }}>
                Importar desde planilla
              </p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", margin: 0 }}>
                CSV o Excel (.xlsx) · detección automática de columnas
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "24px" }}>

          {/* ── STEP 1: Upload ── */}
          {step === "upload" && (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? T.green : T.border}`,
                  borderRadius: "14px", padding: "48px 24px",
                  textAlign: "center", cursor: "pointer",
                  background: dragOver ? T.greenDim : T.bg,
                  transition: "all 0.15s",
                }}
              >
                <Upload size={32} color={dragOver ? T.green : T.light} style={{ marginBottom: "12px" }} />
                <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "15px", color: T.text, margin: "0 0 6px" }}>
                  Arrastrá tu archivo o hacé click aquí
                </p>
                <p style={{ fontSize: "13px", color: T.muted, margin: 0 }}>
                  Soporta .csv y .xlsx
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
                />
              </div>

              {/* Example format */}
              <div style={{ marginTop: "20px", padding: "14px", background: T.bg, borderRadius: "10px", border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: "12px", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>
                  Formato esperado (ejemplo)
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      {["Alumno", "DNI", "Teléfono"].map(h => (
                        <th key={h} style={{ padding: "6px 10px", background: T.border, color: T.muted, fontWeight: 600, textAlign: "left", borderRadius: "4px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 10px", color: T.text }}>Benjamin Vidal</td>
                      <td style={{ padding: "6px 10px", color: T.text }}>47303026</td>
                      <td style={{ padding: "6px 10px", color: T.muted }}>3516789012</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px 10px", color: T.text }}>María González</td>
                      <td style={{ padding: "6px 10px", color: T.text }}>35122456</td>
                      <td style={{ padding: "6px 10px", color: T.muted }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STEP 2: Column mapping ── */}
          {step === "map" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={16} color={T.green} />
                <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: T.text, margin: 0 }}>
                  {fileName} — {rows.length} filas detectadas
                </p>
              </div>

              <div style={{ padding: "14px", background: T.greenDim, borderRadius: "10px", border: `1px solid ${T.greenBorder}` }}>
                <p style={{ fontSize: "13px", color: T.green, fontWeight: 600, margin: 0 }}>
                  Detección automática completada. Verificá que las columnas sean correctas.
                </p>
              </div>

              {[
                { field: "full_name", label: "Nombre completo *", required: true },
                { field: "dni",       label: "DNI *",             required: true },
                { field: "phone",     label: "Teléfono (opcional)", required: false },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px", fontFamily: T.font }}>
                    {label}
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={mapping[field] ?? ""}
                      onChange={e => setMapping(p => ({ ...p, [field]: e.target.value }))}
                      style={{
                        width: "100%", height: "44px", padding: "0 36px 0 14px",
                        border: `1.5px solid ${mapping[field] ? T.green : T.border}`,
                        borderRadius: "10px", background: T.bg, fontFamily: T.font,
                        fontSize: "14px", color: T.text, appearance: "none", outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">— Sin asignar —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <ChevronDown size={16} color={T.light} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button onClick={() => setStep("upload")} style={{ flex: 1, height: "44px", borderRadius: "10px", background: T.bg, border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: T.font, fontWeight: 600, fontSize: "14px", color: T.muted }}>
                  Volver
                </button>
                <button
                  onClick={() => setStep("preview")}
                  disabled={!mapping.full_name || !mapping.dni}
                  style={{ flex: 2, height: "44px", borderRadius: "10px", background: T.green, border: "none", cursor: !mapping.full_name || !mapping.dni ? "not-allowed" : "pointer", fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: "#fff", opacity: !mapping.full_name || !mapping.dni ? 0.5 : 1 }}
                >
                  Ver vista previa →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Preview ── */}
          {(step === "preview" || step === "importing") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontFamily: T.font, fontWeight: 700, fontSize: "15px", color: T.text, margin: 0 }}>
                Vista previa — primeros {previewRows.length} de {rows.length} alumnos
              </p>

              <div style={{ overflowX: "auto", borderRadius: "10px", border: `1px solid ${T.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: T.bg }}>
                      {["Nombre", "DNI", "Teléfono"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", color: T.muted, fontWeight: 700, textAlign: "left", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "10px 14px", color: T.text, fontWeight: 600 }}>{r[mapping.full_name] || "—"}</td>
                        <td style={{ padding: "10px 14px", color: T.text }}>{r[mapping.dni]?.replace(/\D/g, "") || "—"}</td>
                        <td style={{ padding: "10px 14px", color: T.muted }}>{mapping.phone ? r[mapping.phone] || "—" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rows.length > 5 && (
                <p style={{ fontSize: "12px", color: T.muted, textAlign: "center", margin: 0 }}>
                  ... y {rows.length - 5} más
                </p>
              )}

              {importErr && (
                <div style={{ padding: "12px 14px", borderRadius: "10px", background: T.redDim, border: "1px solid rgba(239,68,68,0.25)", display: "flex", gap: "8px" }}>
                  <AlertTriangle size={15} color={T.red} style={{ flexShrink: 0, marginTop: "1px" }} />
                  <p style={{ fontSize: "13px", color: T.red, margin: 0 }}>{importErr}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setStep("map")} disabled={step === "importing"} style={{ flex: 1, height: "44px", borderRadius: "10px", background: T.bg, border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: T.font, fontWeight: 600, fontSize: "14px", color: T.muted }}>
                  Volver
                </button>
                <button
                  onClick={runImport}
                  disabled={step === "importing"}
                  style={{ flex: 2, height: "44px", borderRadius: "10px", background: T.green, border: "none", cursor: step === "importing" ? "default" : "pointer", fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: step === "importing" ? 0.7 : 1 }}
                >
                  {step === "importing"
                    ? <><Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Importando...</>
                    : `Importar ${rows.length} alumnos`}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === "done" && result && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%",
                background: T.greenDim, border: `2px solid ${T.green}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <Check size={28} color={T.green} strokeWidth={2.5} />
              </div>

              <p style={{ fontFamily: T.font, fontWeight: 800, fontSize: "20px", color: T.text, margin: "0 0 8px" }}>
                Importación completada
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "20px 0", flexWrap: "wrap" }}>
                <Chip color={T.green}   bg={T.greenDim}                  label={`${result.created.length} creados`} />
                <Chip color={T.orange}  bg="rgba(249,115,22,0.10)"       label={`${result.skipped.length} ya existían`} />
                {result.errors.length > 0 && <Chip color={T.red} bg={T.redDim} label={`${result.errors.length} con error`} />}
              </div>

              <button
                onClick={() => { onImported(); onClose(); }}
                style={{ height: "44px", padding: "0 32px", borderRadius: "10px", background: T.green, border: "none", cursor: "pointer", fontFamily: T.font, fontWeight: 700, fontSize: "14px", color: "#fff" }}
              >
                Ver alumnos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ color, bg, label }: { color: string; bg: string; label: string }) {
  return (
    <span style={{ padding: "6px 14px", borderRadius: "999px", background: bg, color, fontWeight: 700, fontSize: "13px", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      {label}
    </span>
  );
}
