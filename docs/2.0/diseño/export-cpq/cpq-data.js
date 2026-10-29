(() => {
  const fmt = (n) => (n == null ? "—" : "$ " + Math.round(n).toLocaleString("es-CL").replace(/,/g, "."));
  const num = (n, d = 0) => Number(n).toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (x, d = 1) => num(x * 100, d) + " %";
  const uf = (n) => "UF " + num(n, 2);
  const parseNum = (v) => { if (typeof v === "number") return v; const n = parseFloat(String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")); return isNaN(n) ? 0 : n; };

  const DURACION = 24;
  const MODEL = { version: "v7", publicado: "12-10-2026", nuevo: "v8 · 27-10-2026", factor: 1.3, colacion: 75000, feriados: 0.021, modo: "Margen sobre venta", duracion: DURACION };
  const UF = { valor: 40215.37, fecha: "29-10-2026", ayer: "28-10-2026" };

  const DEFAULT_CATS = [
    { id: "uniformes", label: "Uniformes", tipo: "directo", activa: true },
    { id: "examenes", label: "Exámenes", tipo: "directo", activa: true },
    { id: "alimentacion", label: "Alimentación", tipo: "directo", activa: true },
    { id: "equipos", label: "Equipos", tipo: "indirecto", activa: true },
    { id: "transporte", label: "Transporte", tipo: "indirecto", activa: true },
    { id: "vehiculos", label: "Vehículos", tipo: "indirecto", activa: true },
    { id: "infraestructura", label: "Infraestructura", tipo: "indirecto", activa: true },
    { id: "sistemas", label: "Sistemas", tipo: "indirecto", activa: true },
  ];
  const FERIADOS = { id: "feriados", label: "Ajuste de feriados", tipo: "directo", activa: true, sistema: true };

  const RC_PLAZOS = [
    { value: "12", label: "12 meses" },
    { value: "anual", label: "Anual, renovable" },
    { value: "contrato", label: "Plazo del contrato" },
    { value: "n", label: "N meses" },
  ];
  const rcMeses = (p) => (p.plazo === "12" ? 12 : p.plazo === "n" ? p.plazoN || 1 : DURACION);
  const rcPlazoLabel = (p) => (p.plazo === "n" ? (p.plazoN || 1) + " meses" : (RC_PLAZOS.find((x) => x.value === p.plazo) || {}).label);

  const DEFAULT_FIN = {
    cf: { on: true, dias: 30, tasa: 0.01 },
    pg: { on: true, pct: 0.05, prima: 0.02, plazo: DURACION + 3 },
    rc: { on: true, uf: 5000, prima: 0.0035, plazo: "anual", plazoN: 18 },
  };
  const DEFAULT_MARGEN = { min: 0.1, alerta: 0.03 };
  const KEY = "opai-cpq-config-v1";
  function getConfig() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { s = {}; }
    const fin = {};
    Object.keys(DEFAULT_FIN).forEach((k) => (fin[k] = { ...DEFAULT_FIN[k], ...((s.fin || {})[k] || {}) }));
    return { fin, margen: { ...DEFAULT_MARGEN, ...(s.margen || {}) }, categorias: s.categorias && s.categorias.length ? s.categorias : DEFAULT_CATS };
  }
  function saveConfig(part) {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { s = {}; }
    try { localStorage.setItem(KEY, JSON.stringify({ ...s, ...part })); } catch (e) {}
  }
  const catLabel = (id, cats) => { if (id === "feriados") return FERIADOS.label; const c = (cats || getConfig().categorias).find((x) => x.id === id); return c ? c.label : "Sin categoría"; };
  const catTipo = (id, cats) => { const c = (cats || getConfig().categorias).find((x) => x.id === id); return c ? (c.tipo === "directo" ? "Directo" : "Indirecto") : ""; };

  const RATEOS = [
    { id: "unico", label: "Pago único", meses: 0, tip: "Se cobra una vez, aparte de la mensualidad." },
    { id: "n", label: "N meses", meses: null, tip: "Divide el costo en N cuotas mensuales." },
    { id: "contrato", label: "Plazo del contrato", meses: DURACION, tip: "Divide el costo en los " + DURACION + " meses del contrato." },
    { id: "mensual", label: "Mensual sin rateo", meses: 1, tip: "El precio ya es mensual: se cobra entero cada mes." },
  ];
  const LEGACY = { "6": 6, "12": 12 };
  const rfind = (id) => RATEOS.find((r) => r.id === id) || {};
  const rateoMeses = (id, n) => (id === "n" ? n || 1 : LEGACY[id] || rfind(id).meses);
  const rateoLabel = (id, n) => (id === "n" ? (n || "N") + " meses" : LEGACY[id] ? LEGACY[id] + " meses" : id === "contrato" ? "Plazo del contrato · " + DURACION + " meses" : rfind(id).label);
  const rateoShort = (id, n) => (id === "n" ? n + " meses" : LEGACY[id] ? LEGACY[id] + " meses" : id === "contrato" ? "Contrato · " + DURACION + " m" : id === "mensual" ? "Mensual" : rfind(id).label);
  const rateoTip = (id, n) => (id === "n" || LEGACY[id] ? "Divide el costo en " + (n || LEGACY[id]) + " cuotas mensuales." : rfind(id).tip);

  const CATALOGO = [
    { id: "uniforme", code: "UNI-001", name: "Uniforme y EPP", cat: "uniformes", unidad: "por persona", costo: 114000, rateo: "n", rateoN: 6 },
    { id: "uniforme-inv", code: "UNI-002", name: "Parka de invierno", cat: "uniformes", unidad: "por persona", costo: 46000, rateo: "n", rateoN: 12 },
    { id: "examen", code: "EXA-001", name: "Examen preocupacional", cat: "examenes", unidad: "por persona", costo: 48000, rateo: "contrato" },
    { id: "examen-psico", code: "EXA-002", name: "Evaluación psicológica", cat: "examenes", unidad: "por persona", costo: 32000, rateo: "contrato" },
    { id: "radio", code: "EQU-004", name: "Radio portátil", cat: "equipos", unidad: "por equipo", costo: 117600, rateo: "n", rateoN: 12 },
    { id: "starlink", code: "EQU-011", name: "Kit Starlink", cat: "equipos", unidad: "por equipo", costo: 690000, rateo: "n", rateoN: 12 },
    { id: "detector", code: "EQU-007", name: "Detector de metales", cat: "equipos", unidad: "por equipo", costo: 89000, rateo: "contrato" },
    { id: "caseta", code: "INF-002", name: "Habilitación de caseta", cat: "infraestructura", unidad: "por servicio", costo: 850000, rateo: "unico" },
    { id: "camioneta", code: "VEH-001", name: "Camioneta de ronda", cat: "vehiculos", unidad: "por mes", costo: 1150000, rateo: "mensual" },
    { id: "starlink-plan", code: "SIS-003", name: "Plan Starlink", cat: "sistemas", unidad: "por mes", costo: 54000, rateo: "mensual" },
  ];
  const cat = (id) => CATALOGO.find((c) => c.id === id);

  const FIN_META = {
    cf: { name: "Costo financiero", src: "Configuración del CPQ" },
    pg: { name: "Póliza de garantía · fiel cumplimiento", src: "Configuración del CPQ" },
    rc: { name: "Responsabilidad civil", src: "Configuración del CPQ" },
  };

  const sections = [
    { id: "pn", name: "Planta Norte", sub: "Instalación · Camino Lo Boza 8150, Pudahuel", lines: [
      { group: "Guardias" },
      { id: "l1", kind: "puesto", name: "Guardia 24/7", cargo: "Guardia de seguridad", patron: "4x4", horario: "08:00 → 20:00 · 20:00 → 08:00 +1", dias: "L M M J V S D", pos: 2, pp: 4, sueldo: 890000, origen: "Referencia del cargo", vig: "Guardia de seguridad · vigente desde 01-07-2026", col: 75000, colSrc: "Tenant · Modelo v7", fer: true, visible: true },
      { id: "l2", kind: "puesto", name: "Refuerzo fin de semana", cargo: "Guardia de seguridad", patron: "2x5", horario: "09:00 → 21:00", dias: "S D", pos: 1, pp: 1, sueldo: 520000, origen: "Escrito a mano", vig: "Escrito por Ana Rojas el 24-10-2026", col: 75000, colSrc: "Tenant · Modelo v7", fer: false, visible: true, disabled: true },
      { group: "Equipamiento" },
      { id: "l3", kind: "item", cat: "uniforme", qty: 8, qtyLabel: "8 personas", visible: true },
      { id: "l4", kind: "item", cat: "radio", qty: 2, qtyLabel: "2 equipos", visible: false },
    ] },
    { id: "bs", name: "Bodega Sur", sub: "Instalación · Av. Lo Espejo 1420, San Bernardo", lines: [
      { id: "l5", kind: "puesto", name: "Guardia nocturno", cargo: "Guardia de seguridad", patron: "4x4", horario: "20:00 → 08:00 +1", dias: "L M M J V S D", pos: 1, pp: 2, sueldo: 930000, origen: "Referencia del cargo", vig: "Guardia nocturno · vigente desde 01-07-2026", col: 82000, colSrc: "Instalación · Bodega Sur", fer: true, visible: true },
      { id: "l6", kind: "item", cat: "uniforme", qty: 2, qtyLabel: "2 personas", visible: true },
      { id: "l10", kind: "item", cat: "starlink", qty: 1, qtyLabel: "1 equipo", visible: true },
      { id: "l11", kind: "item", cat: "starlink-plan", qty: 1, qtyLabel: "1 plan", visible: true },
      { id: "l7", kind: "item", cat: "caseta", qty: 1, qtyLabel: "1", visible: true },
    ] },
    { id: "co", name: "Común", sub: "Sección común · se reparte entre las instalaciones", lines: [
      { id: "l8", kind: "puesto", name: "Supervisor de rondas", cargo: "Supervisor", patron: "5x2", horario: "08:00 → 18:00", dias: "L M M J V", pos: 1, pp: 1, sueldo: 1720000, origen: "Escrito a mano", vig: "Escrito por Ana Rojas el 22-10-2026 · referencia $ 1.650.000", col: 75000, colSrc: "Tenant · Modelo v7", fer: false, visible: true },
      { id: "l12", kind: "item", cat: "examen", qty: 11, qtyLabel: "11 personas", visible: false },
      { id: "l9", kind: "item", cat: "camioneta", qty: 1, qtyLabel: "1 · incluye combustible", visible: true },
    ] },
  ];

  function compute(margin, ctx) {
    const c0 = ctx || {};
    const cfg = getConfig();
    const sueldos = c0.sueldos || {}, rateos = c0.rateos || {}, prices = c0.prices || {};
    const fp = c0.fin || cfg.fin;
    const cats = c0.cats || cfg.categorias;
    let ops = 0, unicoC = 0, pos = 0, pers = 0, mo = 0, fer = 0;
    const byCat = {};
    const addCat = (id, it) => { (byCat[id] = byCat[id] || []).push(it); };
    const secs = sections.map((s) => {
      let sc = 0;
      const src = c0.empty ? [] : s.lines;
      const lines = src.map((l) => {
        if (l.group) return l;
        let c = 0, x = { ...l };
        if (l.kind === "puesto") {
          const su = sueldos[l.id] != null ? sueldos[l.id] : l.sueldo;
          const base = (su * MODEL.factor + l.col) * l.pos * l.pp;
          const f = l.fer ? base * MODEL.feriados : 0;
          c = base + f;
          x = { ...x, sueldoEf: su, manual: sueldos[l.id] != null, base, ferMonto: f };
          if (!l.disabled) { mo += base; fer += f; pos += l.pos; pers += l.pos * l.pp; if (f) addCat("feriados", { name: l.name, sec: s.name, monto: f }); }
        } else {
          const k = cat(l.cat);
          const unit = prices[l.id] != null ? prices[l.id] : k.costo;
          const ro = rateos[l.id];
          const rid = ro ? ro.id : k.rateo;
          const rn = ro ? ro.n : k.rateoN;
          const meses = rateoMeses(rid, rn);
          const unico = rid === "unico";
          const cuota = unico ? 0 : unit / meses;
          c = unico ? unit * l.qty : cuota * l.qty;
          x = { ...x, name: k.name, catId: k.cat, unidad: k.unidad, unit, unitOverridden: prices[l.id] != null && prices[l.id] !== k.costo, catCosto: k.costo,
            rateable: true, rateoId: rid, rateoN: rn, rateoDef: k.rateo, rateoDefN: k.rateoN, rateoOverridden: rid !== k.rateo || (rid === "n" && rn !== k.rateoN), meses, cuota, unico };
          if (!l.disabled) addCat(k.cat, { name: k.name, sec: s.name, monto: unico ? 0 : c, unico: unico ? c : 0 });
        }
        if (!l.disabled) { if (x.unico) unicoC += c; else sc += c; }
        return { ...x, costo: c };
      });
      ops += sc;
      return { ...s, lines, costo: sc };
    });
    const preVenta = ops / (1 - margin);
    const fin = [
      { id: "cf", p: fp.cf, monto: fp.cf.on ? ops * (fp.cf.dias / 30) * fp.cf.tasa : 0 },
      { id: "pg", p: fp.pg, monto: fp.pg.on ? (preVenta * DURACION * fp.pg.pct * fp.pg.prima * (fp.pg.plazo / 12)) / DURACION : 0 },
      { id: "rc", p: fp.rc, monto: fp.rc.on ? (fp.rc.uf * UF.valor * fp.rc.prima * (Math.min(rcMeses(fp.rc), DURACION) / 12)) / DURACION : 0 },
    ].map((f) => ({ ...f, on: !!f.p.on, ...FIN_META[f.id], def: cfg.fin[f.id] }));
    const finTotal = fin.reduce((a, f) => a + f.monto, 0);
    const costo = ops + finTotal;
    const venta = costo / (1 - margin);
    const k = ops ? costo / ops / (1 - margin) : 1 / (1 - margin);
    secs.forEach((s) => { s.venta = s.costo * k; s.lines.forEach((l) => { if (!l.group) l.venta = l.unico ? l.costo / (1 - margin) : l.costo * k; }); });
    const mkRow = (ci) => { const its = byCat[ci.id] || []; return { id: ci.id, label: ci.label, activa: ci.activa !== false, sistema: !!ci.sistema, total: its.reduce((a, i) => a + i.monto, 0), unico: its.reduce((a, i) => a + (i.unico || 0), 0), items: its }; };
    const groups = [["directo", "Directos"], ["indirecto", "Indirectos"]].map(([t, label]) => {
      const list = cats.filter((c) => c.tipo === t);
      if (t === "directo") list.push(FERIADOS);
      const rows = list.map(mkRow).filter((r) => r.activa || r.items.length);
      return { id: t, label, rows, total: rows.reduce((a, r) => a + r.total, 0) };
    });
    return { secs, ops, fin, finTotal, costo, venta, margin, k, unico: unicoC / (1 - margin), unicoCosto: unicoC, pos, pers, ventaUF: venta / UF.valor, manoObra: mo, feriados: fer, groups, empty: !!c0.empty };
  }

  function traceLine(l, r, showCost) {
    const H = (v) => (showCost ? v : "—");
    const instr = "costo × " + num(r.k * (1 - r.margin), 3) + " por instrumentos ÷ (1 − margen " + pct(r.margin) + ")";
    if (l.kind === "puesto") {
      return {
        title: "Costo mensual · " + l.name,
        formula: "(sueldo × factor empleador + colación) × posiciones × personas" + (l.fer ? " × (1 + feriados)" : ""),
        vars: [
          { k: "Sueldo bruto", v: H(fmt(l.sueldoEf)), src: l.manual ? "Línea · escrito a mano ahora" : (l.origen === "Escrito a mano" ? "Línea · " : "Referencia del cargo · ") + l.vig },
          { k: "Factor empleador", v: "× " + num(MODEL.factor, 2), src: "Tenant · Modelo v7 · cotizaciones, seguro y provisiones" },
          { k: "Colación y movilización", v: H(fmt(l.col)), src: l.colSrc },
          { k: "Posiciones × personas", v: l.pos + " × " + l.pp, src: "Línea · " + l.pp + " por posición, sugerido por " + l.patron + (l.patron === "4x4" ? " de 12 h" : "") },
          ...(l.fer ? [{ k: "Ajuste de feriados", v: "+ " + pct(MODEL.feriados), src: "Plataforma · feriados legales 2026" }] : []),
        ],
        result: [{ k: "Costo mensual", v: H(fmt(l.costo)) }, { k: "Venta mensual", v: fmt(l.venta), sub: instr }],
      };
    }
    const vars = [
      { k: "Costo unitario", v: H(fmt(l.unit)), src: l.unitOverridden ? "Cotización · sobrescrito (catálogo " + fmt(l.catCosto) + ")" : "Catálogo · " + catLabel(l.catId) + " · " + l.unidad },
      { k: "Cantidad", v: l.qtyLabel, src: l.unidad === "por persona" ? "Calculado · personas de la sección" : "Línea" },
    ];
    vars.push({ k: "Rateo", v: rateoLabel(l.rateoId, l.rateoN), src: l.rateoOverridden ? "Cotización · sobrescrito (catálogo: " + rateoLabel(l.rateoDef, l.rateoDefN) + ")" : "Catálogo · rateo por defecto" });
    return {
      title: (l.unico ? "Pago único · " : "Costo mensual · ") + l.name,
      formula: l.rateoId === "mensual" ? "precio mensual × cantidad" : l.unico ? "costo unitario × cantidad, se cobra una vez" : "costo unitario ÷ meses de rateo × cantidad",
      vars,
      result: l.unico
        ? [{ k: "Costo", v: H(fmt(l.costo)) }, { k: "Venta", v: fmt(l.venta) }]
        : [...(l.rateoId !== "mensual" ? [{ k: "Cuota mensual", v: H(fmt(l.cuota)), sub: "por " + (l.unidad || "unidad").replace("por ", "") }] : []), { k: "Costo mensual", v: H(fmt(l.costo)) }, { k: "Venta mensual", v: fmt(l.venta) }],
    };
  }

  function traceVenta(r, showCost) {
    const H = (v) => (showCost ? v : "—");
    return {
      title: "Venta mensual de la cotización",
      formula: "(costo operativo + instrumentos financieros activos) ÷ (1 − margen)",
      vars: [
        { k: "Costo operativo", v: H(fmt(r.ops)), src: "Suma de " + r.secs.length + " secciones" },
        ...r.fin.map((f) => ({ k: f.name, v: f.on ? H("+ " + fmt(f.monto)) : "Desactivado", src: f.on ? "Cotización · " + f.src : "No aplica en esta cotización" })),
        { k: "Margen", v: showCost ? pct(r.margin) : "—", src: "Cotización · mínimo " + pct(getConfig().margen.min, 0) + " en Configuración del CPQ" },
      ],
      result: [{ k: "Costo total", v: H(fmt(r.costo)) }, { k: "Venta mensual", v: fmt(r.venta) }],
    };
  }

  const tabs = [
    { id: "ini", label: "Inicio", icon: "home" }, { id: "ban", label: "Bandeja", icon: "inbox" },
    { id: "neg", label: "Negocios", icon: "briefcase" }, { id: "cot", label: "Cotizaciones", icon: "file" }, { id: "mas", label: "Más", icon: "menu" },
  ];
  const groups = [
    { items: [{ id: "ini", label: "Inicio", icon: "home" }, { id: "ban", label: "Bandeja", icon: "inbox", count: 5 }] },
    { title: "Comercial", items: [{ id: "sol", label: "Solicitudes", icon: "message" }, { id: "neg", label: "Negocios", icon: "briefcase", count: 13 }, { id: "cot", label: "Cotizaciones", icon: "file", count: 24 }] },
    { title: "Operaciones", items: [{ id: "ins", label: "Instalaciones", icon: "building" }, { id: "pau", label: "Pauta mensual", icon: "calendar" }] },
    { title: "Personas", items: [{ id: "per", label: "Personas", icon: "users" }] },
    { title: "Finanzas", items: [{ id: "fin", label: "Resumen", icon: "chart" }] },
    { items: [{ id: "cfg", label: "Configuración", icon: "grid" }] },
  ];

  const IVA = 0.19;
  const CONTACTOS = [
    { id: "gc", ini: "GC", name: "Gonzalo Cárdenas", cargo: "Jefe de mantención", mail: "gcardenas@logandina.cl", tel: "+56 9 8876 1290" },
    { id: "pm", ini: "PM", name: "Paula Méndez", cargo: "Jefa de compras", mail: "pmendez@logandina.cl", tel: "+56 9 7412 3368" },
    { id: "rv", ini: "RV", name: "Rodrigo Vera", cargo: "Gerente de operaciones", mail: "rvera@logandina.cl", tel: "+56 9 6120 4471" },
  ];
  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const DEFAULT_COND = { formaPago: "transferencia", dias: "30", duracion: "24", inicio: "01-12-2026", validez: "30", moneda: "UF", reajuste: "ipc", frecuencia: "anual", mesBase: "Diciembre", incremento: "", pIpc: "40", pImo: "60" };
  const quote = { code: "CPQ-2026-412", version: "v3", title: "Seguridad Planta Norte y Bodega Sur", cuenta: "Logística Andina SpA", negocio: "NEG-0137 · Renovación · Planta Quilicura", vence: "28-11-2026", owner: "Ana Rojas", enviada: "26-10-2026" };
  const condiciones = [
    { label: "Pago", value: "45 días desde la factura" },
    { label: "Reajuste", value: "Polinómico anual · IPC 40 % · IMO 60 %" },
    { label: "Duración", value: DURACION + " meses" },
    { label: "Inicio", value: "01-12-2026", numeric: true },
    { label: "Validez", value: "30 días · vence 28-11-2026" },
    { label: "Moneda de presentación", value: "CLP con equivalente en UF" },
  ];

  window.CPQ = { IVA, CONTACTOS, MESES, DEFAULT_COND, rateoTip, fmt, num, pct, uf, parseNum, MODEL, UF, DEFAULT_CATS, FERIADOS, catLabel, catTipo, RATEOS, rateoMeses, rateoLabel, rateoShort, RC_PLAZOS, rcMeses, rcPlazoLabel, CATALOGO, cat, DEFAULT_FIN, DEFAULT_MARGEN, getConfig, saveConfig, FIN_META, sections, compute, traceLine, traceVenta, tabs, groups, quote, condiciones, tenant: "Atlas Seguridad SpA", tenantInitials: "AS" };
})();
