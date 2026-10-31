// Asistencia DT · datos compartidos, navegación, configuración de pantallas y piezas propuestas para el DS.
(function () {
  const A = (window.ADT = window.ADT || {});
  const h = (...a) => window.React.createElement(...a);
  const NS = () => window.OPAI20DesignSystem_44e4d7 || {};
  A.h = h; A.NS = NS;

  A.tabs = [
    { id: "ini", label: "Inicio", icon: "home" },
    { id: "per", label: "Personas", icon: "users" },
    { id: "asi", label: "Asistencia", icon: "clock" },
    { id: "pau", label: "Pauta", icon: "calendar" },
    { id: "mas", label: "Más", icon: "more" },
  ];
  A.groups = [
    { items: [{ id: "ini", label: "Inicio", icon: "home" }, { id: "ban", label: "Bandeja", icon: "inbox" }] },
    { title: "Asistencia", items: [
      { id: "rep", label: "Reportes DT", icon: "file" },
      { id: "cor", label: "Correcciones", icon: "clock" },
      { id: "con", label: "Contingencia e incidentes", icon: "alert" },
      { id: "man", label: "Accesos de mandante", icon: "briefcase" },
      { id: "aud", label: "Auditoría fiscalizador", icon: "eye" },
      { id: "res", label: "Respaldos", icon: "download" },
      { id: "cer", label: "Certificación", icon: "clipboard" },
    ] },
    { title: "Personas", items: [{ id: "per", label: "Personas", icon: "users" }] },
  ];

  A.base = function (p, id, title) {
    const device = p.device || "desktop";
    const estado = p.estado || "datos";
    const vista = p.vista || "";
    const o = {
      device, theme: p.theme || "light", estado, vista,
      isPhone: device === "phone", notPhone: device !== "phone", isTablet: device === "tablet", isDesktop: device === "desktop",
      isDatos: estado === "datos", isVacio: estado === "vacio", isCargando: estado === "cargando", isError: estado === "error", isSinPermiso: estado === "sinpermiso",
      isB: p.variante === "B", isA: p.variante !== "B",
      tabs: A.tabs, groups: A.groups, active: device === "desktop" ? id : "asi",
      shellTitle: device === "phone" ? "" : title,
      noop: () => {},
      skel: [1, 2, 3, 4, 5, 6],
    };
    o["v_" + (vista || "main")] = true;
    return o;
  };

  A.badge = (tone, label) => { const B = NS().Badge; return B ? h(B, { tone }, label) : label; };
  A.mono = (t) => h("span", { className: "t-mono" }, t);
  A.btn = (label, extra) => { const B = NS().Button; return B ? h(B, { variant: "secondary", ...(extra || {}) }, label) : null; };
  A.prim = (label, extra) => { const B = NS().Button; return B ? h(B, { ...(extra || {}) }, label) : null; };

  A.siglas = [
    ["A.I.", "Ausencia injustificada"], ["A.J.", "Ausencia justificada"], ["AT", "Atraso"], ["C.T.", "Cambio de turno"],
    ["D.E.J.", "Distribución excepcional de jornada"], ["H.E.", "Horas extraordinarias"], ["J.O.", "Jornada ordinaria"],
    ["L.M.", "Licencia médica"], ["P.G.R", "Permiso con goce de remuneraciones"], ["PREN.", "Prenatal"],
    ["P.S.G.R.", "Permiso sin goce de remuneraciones"], ["POSTN", "Postnatal"], ["S.A", "Salida anticipada"], ["VAC.", "Vacaciones"],
  ];

  // ---------- Piezas propuestas para el DS (nuevas) ----------
  // CuentaRegresiva: plazo de oposición de 48 h. Texto siempre junto al color.
  A.CuentaRegresiva = function ({ horas = 0, minutos = 0, estado = "pendiente" }) {
    const map = { pendiente: ["warning", "Vence en " + horas + " h " + String(minutos).padStart(2, "0") + " min"], aceptada: ["success", "Aceptada"], objetada: ["danger", "Objetada"], vencida: ["neutral", "Vencida · se tiene por aceptada"] };
    const m = map[estado] || map.pendiente;
    const pct = estado === "pendiente" ? Math.max(0, Math.min(1, (horas * 60 + minutos) / (48 * 60))) : 0;
    return h("span", { style: { display: "inline-flex", flexDirection: "column", gap: 6, minWidth: 0 } },
      h("span", { className: "badge b-" + m[0] }, m[1]),
      estado === "pendiente" ? h("span", { "aria-hidden": "true", style: { display: "block", width: 120, height: 4, borderRadius: 999, background: "var(--ds-fill)", overflow: "hidden" } },
        h("span", { style: { display: "block", height: "100%", width: pct * 100 + "%", background: "var(--ds-warning)" } })) : null);
  };
  // Hash: SHA-256 en mono, cortado al centro, con botón copiar de 44.
  A.Hash = function ({ valor = "", corto = true, copiar = true }) {
    const txt = corto && valor.length > 20 ? valor.slice(0, 10) + "…" + valor.slice(-8) : valor;
    return h("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0, maxWidth: "100%" } },
      h("span", { className: "t-mono", style: { fontSize: 13, lineHeight: "20px", color: "var(--ds-fg-muted)", wordBreak: "break-all" }, title: valor }, txt),
      copiar ? h("button", { type: "button", className: "icon-btn", "aria-label": "Copiar hash", style: { flex: "none" } }, h("span", { className: "ic sm i-clipboard" })) : null);
  };
  // CabeceraOficial: cabecera obligatoria de los reportes DT.
  A.CabeceraOficial = function ({ razon = "Atlas Seguridad SpA", rut = "76.543.210-K", trabajador = "Camila Herrera Soto", rutTrab = "12.345.678-9", lugar = "Planta Quilicura · Av. Lo Echevers 550, Quilicura", periodo, cols = 3 }) {
    const items = [["Razón social", razon], ["RUT empleador", rut, true], ["Trabajador", trabajador], ["RUT trabajador", rutTrab, true], ["Lugar de prestación", lugar]];
    if (periodo) items.push(["Período", periodo]);
    return h("div", { style: { display: "grid", gridTemplateColumns: "repeat(" + cols + ",minmax(0,1fr))", gap: "12px 24px", padding: 16, borderRadius: "var(--radius-md)", background: "var(--ds-bg)", border: "1px solid var(--ds-border)" } },
      items.map((it) => h("div", { key: it[0], style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 } },
        h("span", { className: "t-caption" }, it[0]),
        h("span", { className: it[2] ? "t-mono" : "t-body-sm", style: { fontWeight: it[2] ? 400 : 500, fontSize: it[2] ? 13 : undefined } }, it[1]))));
  };
  // LeyendaSiglas: siglas oficiales DT con su significado.
  A.LeyendaSiglas = function ({ solo }) {
    const list = solo ? A.siglas.filter((s) => solo.includes(s[0])) : A.siglas;
    return h("dl", { style: { margin: 0, display: "flex", flexWrap: "wrap", gap: "6px 16px" } },
      list.map((s) => h("div", { key: s[0], style: { display: "flex", gap: 6, alignItems: "baseline" } },
        h("dt", { className: "t-mono", style: { fontSize: 12, fontWeight: 500 } }, s[0]),
        h("dd", { className: "t-caption", style: { margin: 0 } }, s[1]))));
  };
  // Propuesta: marca de variante B.
  A.Propuesta = function ({ children = "Propuesta, a confirmar por Carlos" }) {
    return h("span", { className: "badge b-accent nodot" }, children);
  };
  // Sigla en celda de reporte.
  A.sigla = (s) => h("span", { className: "t-mono", style: { fontSize: 12, fontWeight: 500, padding: "1px 6px", borderRadius: "var(--radius-sm)", background: "var(--ds-fill)" } }, s);

  // ---------- Configuración de pantallas (índice y lienzos) ----------
  const S = [
    { label: "Vacío", estado: "vacio" }, { label: "Cargando", estado: "cargando" },
    { label: "Error", estado: "error" }, { label: "Sin permiso", estado: "sinpermiso" },
  ];
  const ph = ["phone"], pd = ["phone", "desktop"];
  A.screens = [
    { n: "01", file: "01 Reportes DT", title: "Reportes DT", roles: "owner, admin, RRHH · supervisor (sus instalaciones)", rows: [
      { label: "Datos · reporte de asistencia seleccionado", estado: "datos" },
      { label: "Vista previa en teléfono", estado: "datos", vista: "preview", devices: ph }, ...S] },
    { n: "02", file: "02 Reporte de asistencia", title: "Reporte de asistencia (detalle)", roles: "owner, admin, RRHH · supervisor · mandante (sus instalaciones) · fiscalizador", rows: [
      { label: "Datos", estado: "datos" }, ...S] },
    { n: "03", file: "03 Verificar por hash", title: "Verificar marcación por hash", roles: "Pública (cualquiera con el comprobante) · ERP", rows: [
      { label: "Marca encontrada · pública", estado: "datos" },
      { label: "No encontrada · pública", estado: "datos", vista: "nofound" },
      { label: "Dentro del ERP", estado: "datos", vista: "erp" },
      { label: "Vacío (sin hash)", estado: "vacio" }, { label: "Cargando", estado: "cargando" }, { label: "Error", estado: "error" },
      { label: "Sin permiso (ERP)", estado: "sinpermiso", vista: "erp" }] },
    { n: "04", file: "04 Correcciones y oposicion", title: "Correcciones y oposición", roles: "owner, admin, RRHH · supervisor (propone) · trabajador (acepta u objeta)", rows: [
      { label: "Datos · lista de correcciones", estado: "datos" },
      { label: "Sheet «Corregir marca»", estado: "datos", vista: "sheet" },
      { label: "Vista del trabajador · Portal Trabajador", estado: "datos", vista: "trabajador", devices: ph },
      { label: "Trabajador · objetar con comentario", estado: "datos", vista: "objetar", devices: ph }, ...S] },
    { n: "05", file: "05 Contingencia e incidentes", title: "Contingencia e incidentes técnicos", roles: "owner, admin, RRHH", rows: [
      { label: "Marcas de contingencia", estado: "datos" },
      { label: "Incidentes técnicos", estado: "datos", vista: "incidentes" },
      { label: "Sheet «Registrar marca de contingencia»", estado: "datos", vista: "sheet" }, ...S] },
    { n: "06", file: "06 Portal de fiscalizacion", title: "Portal de fiscalización", roles: "Fiscalizador DT (@dt.gob.cl) · solo lectura · ruta propia", rows: [
      { label: "Ingreso con correo @dt.gob.cl", estado: "datos", vista: "ingreso" },
      { label: "Empresa consultada · reportes", estado: "datos" },
      { label: "Registros por trabajador · sin restricción de rango", estado: "datos", vista: "registros" }, ...S,
      { label: "Variante B · ingreso con clave temporal", estado: "datos", vista: "ingreso", variante: "B" }] },
    { n: "07", file: "07 Auditoria fiscalizador", title: "Auditoría de accesos del fiscalizador", roles: "owner, admin · Inspector DT (solo lectura)", rows: [
      { label: "Datos", estado: "datos" }, ...S,
      { label: "Variante B · detección de red DT por IP", estado: "datos", variante: "B" }] },
    { n: "08", file: "08 Accesos de mandante", title: "Accesos de mandante", roles: "owner, admin, RRHH", rows: [
      { label: "Datos", estado: "datos" },
      { label: "Sheet «Dar acceso»", estado: "datos", vista: "sheet" }, ...S,
      { label: "Variante B · acceso de la EST", estado: "datos", variante: "B" }] },
    { n: "09", file: "09 Respaldos y retencion", title: "Respaldos y retención", roles: "owner, admin", rows: [
      { label: "Datos · cadena OK", estado: "datos" },
      { label: "Verificación de la cadena falló", estado: "datos", vista: "fallo" }, ...S,
      { label: "Variante B · hora oficial visible", estado: "datos", variante: "B" }] },
    { n: "10", file: "10 Checklist certificacion", title: "Checklist de certificación", roles: "Solo owner", rows: [
      { label: "Datos", estado: "datos" }, ...S] },
  ];
  A.boardsFor = function (row) {
    const sizes = { phone: [375, 812, "375"], tablet: [1024, 768, "1024"], desktop: [1280, 800, "1280"] };
    const devs = row.devices || ["phone", "tablet", "desktop"];
    const out = [];
    for (const theme of ["light", "dark"]) for (const d of devs) out.push({
      key: d + theme, device: d, theme, estado: row.estado, vista: row.vista || "", variante: row.variante || "A",
      label: (theme === "light" ? "Claro" : "Oscuro") + " · " + sizes[d][2], isPhone: d === "phone", isTablet: d === "tablet", isDesktop: d === "desktop",
    });
    return out;
  };
})();
