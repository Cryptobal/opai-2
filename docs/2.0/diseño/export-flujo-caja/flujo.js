// Datos ficticios y cálculo del flujo de caja (Atlas Seguridad SpA). Montos en CLP.
(function () {
  const K = 1000;
  const fmt = (n) => (n == null ? "—" : (n < 0 ? "$ −" : "$ ") + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."));
  const LAYER = { R: "Real", C: "Comprometido", P: "Plan", RC: "Real + compr.", RP: "Real + plan" };
  const UMBRAL = 15000 * K;
  const INICIAL = 58000 * K;
  const TODAY = 3;
  const weeks = [
    ["S41", "05-10", "11-10"], ["S42", "12-10", "18-10"], ["S43", "19-10", "25-10"], ["S44", "26-10", "01-11"],
    ["S45", "02-11", "08-11"], ["S46", "09-11", "15-11"], ["S47", "16-11", "22-11"], ["S48", "23-11", "29-11"],
    ["S49", "30-11", "06-12"], ["S50", "07-12", "13-12"], ["S51", "14-12", "20-12"], ["S52", "21-12", "27-12"],
  ].map(([id, a, b], i) => ({ id, i, from: a, to: b, range: a + " – " + b, today: i === TODAY, sealed: i < 2, pending: i === 2, past: i < TODAY }));
  const c = (pairs) => { const a = Array(12).fill(null); for (const [i, l, v] of pairs) a[i] = [l, v * K]; return a; };
  const sections = [
    { id: "ing", label: "Ingresos", sign: 1, rows: [
      { id: "qui", label: "Planta Quilicura", vinculo: "Instalación · Planta Quilicura", arrastre: true, cells: c([[0, "R", 24800], [6, "C", 25950], [9, "P", 26100]]) },
      { id: "lam", label: "Bodega Lampa", vinculo: "Instalación · Bodega Lampa", arrastre: true, cells: c([[1, "R", 14600], [6, "C", 14600], [10, "P", 14900]]) },
      { id: "apo", label: "Torre Apoquindo", vinculo: "Instalación · Torre Apoquindo", arrastre: true, cells: c([[2, "R", 18950], [4, "C", 18950], [8, "P", 19200]]) },
      { id: "otc", label: "Otros clientes", vinculo: "Cuenta 4101 · Ventas servicios", arrastre: true, cells: c([[0, "R", 10500], [1, "R", 2550], [2, "R", 4800], [3, "RC", 3600], [4, "C", 5100], [5, "P", 3200], [6, "P", 4400], [7, "P", 3900], [8, "P", 4000], [9, "P", 3600], [10, "P", 2400], [11, "P", 6200]]) },
      { id: "oin", label: "Otros ingresos", vinculo: "Cuenta 4290 · Otros ingresos", arrastre: false, cells: c([[0, "R", 450], [2, "R", 1200], [3, "R", 300], [6, "P", 800], [10, "P", 800]]) },
    ] },
    { id: "egr", label: "Egresos", sign: -1, rows: [
      { id: "rem", label: "Remuneraciones", vinculo: "Cuenta 6101 · Día de pago 5", arrastre: false, cells: c([[0, "R", 38400], [4, "C", 38900], [8, "P", 39200]]) },
      { id: "imp", label: "Imposiciones", vinculo: "Cuenta 6105 · Día de pago 10", arrastre: false, cells: c([[0, "R", 8900], [5, "C", 9050], [9, "P", 9100]]) },
      { id: "ant", label: "Anticipos", vinculo: "Cuenta 6102 · Día de pago 15", arrastre: false, cells: c([[1, "R", 9600], [5, "C", 9600], [10, "P", 9600]]) },
      { id: "bon", label: "Gratificaciones y bonos", vinculo: "Cuenta 6110", arrastre: false, cells: c([[10, "P", 46500]]) },
      { id: "iva", label: "IVA", vinculo: "Cuenta 2140 · Día 12", arrastre: false, cells: c([[1, "R", 6750], [5, "C", 7120], [9, "P", 6900]]) },
      { id: "pro", label: "Proveedores", vinculo: "Cuenta 2110 · Proveedores", arrastre: true, cells: c([[0, "R", 2100], [1, "R", 3400], [2, "R", 1800], [3, "R", 2600], [4, "C", 2300], [5, "P", 3200], [6, "P", 2800], [7, "P", 2500], [8, "P", 3000], [9, "P", 2700], [10, "P", 2400], [11, "P", 1800]]) },
      { id: "arr", label: "Arriendo y servicios", vinculo: "Cuenta 6201", arrastre: true, cells: c([[0, "R", 2250], [4, "C", 2250], [8, "P", 2250]]) },
      { id: "adm", label: "Administración", vinculo: "Centro de costo · Administración / Oficina central", cc: true, arrastre: true, cells: c([[0, "R", 900], [4, "C", 900], [8, "P", 900]]) },
      { id: "cre", label: "Crédito bancario", vinculo: "Banco de Chile · Crédito 0412", arrastre: false, cells: c([[2, "R", 4200], [6, "C", 4200], [10, "C", 4200]]) },
    ] },
  ];
  const allRows = () => sections.flatMap((s) => s.rows.map((r) => ({ ...r, sec: s.id, sign: s.sign })));
  const tone = (v) => (v < 0 ? "danger" : v < UMBRAL ? "warning" : null);
  const toneLabel = (v) => (v < 0 ? "Bajo 0" : v < UMBRAL ? "Bajo el umbral" : "Sobre el umbral");

  function compute(shift) {
    // shift: { rowId, weeks:[i...], by:n } mueve celdas no facturadas
    const rows = allRows().map((r) => {
      const cells = r.cells.slice();
      if (shift && shift.rowId === r.id) {
        const moved = Array(12).fill(0);
        for (const i of shift.weeks) if (cells[i] && cells[i][0] === "P") { moved[Math.min(11, i + shift.by)] += cells[i][1]; cells[i] = null; }
        moved.forEach((v, i) => { if (v) cells[i] = ["P", (cells[i] ? cells[i][1] : 0) + v]; });
      }
      return { ...r, cells };
    });
    const ing = Array(12).fill(0), egr = Array(12).fill(0), realWk = Array(12).fill(0);
    for (const r of rows) r.cells.forEach((x, i) => { if (!x) return; (r.sign > 0 ? ing : egr)[i] += x[1]; });
    const ini = [], fin = [];
    let s = INICIAL;
    for (let i = 0; i < 12; i++) { ini.push(s); s += ing[i] - egr[i]; fin.push(s); }
    return { rows, ing, egr, ini, fin, neto: ing.map((v, i) => v - egr[i]) };
  }
  const base = compute();
  const banco = base.ini[TODAY] + 300 * K + 1900 * K - 2600 * K;
  const minIdx = base.fin.reduce((m, v, i) => (i >= TODAY && v < base.fin[m] ? i : m), TODAY);

  // Grilla: devuelve filas listas para pintar con estilos por estado.
  function grid(o) {
    o = o || {};
    const k = o.shift ? compute(o.shift) : base;
    const has = (list, r, i) => (list || []).some(([a, b]) => a === r && b === i);
    const cellBase = (w) => (w.today ? "var(--ds-fill)" : "transparent");
    const mk = (r, x, w) => {
      const sel = has(o.sel, r.id, w.i), sav = has(o.saving, r.id, w.i), rev = has(o.reverted, r.id, w.i), tr = has(o.trace, r.id, w.i);
      let v = x ? x[1] : null, l = x ? LAYER[x[0]] : "";
      if (o.noBank && w.i <= TODAY && x && x[0][0] === "R") { v = null; l = "Sin banco"; }
      const muted = w.sealed;
      return {
        key: r.id + w.i, t: v == null ? "—" : fmt(v), l: sav ? "Guardando…" : rev ? "Revertido" : l,
        bg: rev ? "var(--ds-danger-muted)" : sel || tr ? "var(--ds-accent-muted)" : cellBase(w),
        fg: rev ? "var(--ds-danger-fg)" : v == null || muted ? "var(--ds-fg-muted)" : "var(--ds-fg)",
        lc: rev ? "var(--ds-danger-fg)" : sav ? "var(--ds-accent)" : "var(--ds-fg-subtle)",
        ring: sel || tr ? "inset 0 0 0 2px var(--ds-accent)" : "none",
      };
    };
    const secs = sections.map((s) => ({
      id: s.id, label: s.label,
      total: weeks.map((w) => ({ key: s.id + w.i, t: fmt(s.sign > 0 ? k.ing[w.i] : k.egr[w.i]), bg: cellBase(w) })),
      rows: k.rows.filter((r) => r.sec === s.id).map((r) => ({ id: r.id, label: r.label, sub: r.vinculo, cells: weeks.map((w) => mk(r, r.cells[w.i], w)) })),
    }));
    const sal = (arr, strong) => weeks.map((w) => {
      const v = arr[w.i], t = strong ? tone(v) : null;
      return { key: w.i, t: fmt(v), bg: t ? "var(--ds-" + t + "-muted)" : cellBase(w), fg: t ? "var(--ds-" + t + "-fg)" : w.sealed ? "var(--ds-fg-muted)" : "var(--ds-fg)", l: strong ? (w.sealed ? "Sellado" : w.pending ? "Por cerrar" : w.past ? "Real" : w.today ? "Banco + pendiente" : t ? toneLabel(v) : "Proyectado") : "" };
    });
    return {
      weeks: weeks.map((w) => ({ ...w, bg: w.today ? "var(--ds-fill)" : "var(--ds-surface)" })),
      secs, saldoIni: sal(k.ini), saldoNeto: sal(k.neto), saldoFin: sal(k.fin, true),
    };
  }

  function weekSummary(i, k) {
    k = k || base;
    const w = weeks[i], v = k.fin[i], t = tone(v);
    return { ...w, label: w.id + " · " + w.range, ing: fmt(k.ing[i]), egr: fmt(k.egr[i]), fin: fmt(v), tone: t || "neutral", toneLabel: t ? toneLabel(v) : w.today ? "Hoy" : "Sobre el umbral" };
  }
  function weekDetail(i) {
    return sections.map((s) => ({
      id: s.id, label: s.label, total: fmt(s.sign > 0 ? base.ing[i] : base.egr[i]),
      rows: base.rows.filter((r) => r.sec === s.id && r.cells[i]).map((r) => ({ id: r.id, title: r.label, subtitle: LAYER[r.cells[i][0]], amount: fmt(r.cells[i][1]) })),
    }));
  }

  window.Flujo = {
    fmt, LAYER, UMBRAL, TODAY, weeks, sections, base, compute, grid, weekSummary, weekDetail, tone, toneLabel,
    banco, minIdx, min: base.fin[minIdx],
    tabs: [{ id: "ini", label: "Inicio", icon: "home" }, { id: "pau", label: "Pauta", icon: "calendar" }, { id: "flujo", label: "Flujo", icon: "chart" }, { id: "per", label: "Personas", icon: "users" }, { id: "mas", label: "Más", icon: "more" }],
    tabletTabs: [{ id: "ini", label: "Inicio", icon: "home" }, { id: "per", label: "Personas", icon: "users" }, { id: "pau", label: "Pauta", icon: "calendar" }, { id: "flujo", label: "Flujo", icon: "chart" }, { id: "fac", label: "Facturas", icon: "wallet" }, { id: "cfg", label: "Ajustes", icon: "grid" }],
    groups: [
      { items: [{ id: "ini", label: "Inicio", icon: "home" }, { id: "ban", label: "Bandeja", icon: "inbox" }] },
      { title: "Operaciones", items: [{ id: "ins", label: "Instalaciones", icon: "building" }, { id: "pau", label: "Pauta mensual", icon: "calendar" }] },
      { title: "Personas", items: [{ id: "per", label: "Personas", icon: "users" }] },
      { title: "Finanzas", items: [{ id: "flujo", label: "Flujo de caja", icon: "chart" }, { id: "fac", label: "Facturación", icon: "wallet" }, { id: "bco", label: "Bancos", icon: "landmark" }] },
      { title: "Configuración", items: [{ id: "cfg", label: "Módulos", icon: "grid" }] },
    ],
  };
})();
