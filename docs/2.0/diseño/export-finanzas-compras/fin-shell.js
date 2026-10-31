// Datos compartidos de las pantallas de Finanzas: navegación del shell, renderizadores de celda y textos de estado.
(() => {
  const h = (...a) => React.createElement(...a);
  const NS = () => window.OPAI20DesignSystem_44e4d7 || {};
  const tabs = [
    { id: "ini", label: "Inicio", icon: "home" },
    { id: "per", label: "Personas", icon: "users" },
    { id: "pau", label: "Pauta", icon: "calendar" },
    { id: "fin", label: "Finanzas", icon: "wallet" },
    { id: "mas", label: "Más", icon: "more" },
  ];
  const groups = [
    { items: [{ id: "ini", label: "Inicio", icon: "home" }, { id: "ban", label: "Bandeja", icon: "inbox" }] },
    { title: "Operaciones", items: [{ id: "ins", label: "Instalaciones", icon: "building" }, { id: "pau", label: "Pauta mensual", icon: "calendar" }] },
    { title: "Finanzas", items: [
      { id: "com", label: "Libro de compras", icon: "file" },
      { id: "pro", label: "Proveedores", icon: "briefcase" },
      { id: "con", label: "Conciliación", icon: "landmark" },
      { id: "reg", label: "Reglas", icon: "filter" },
    ] },
    { title: "Contabilidad", items: [
      { id: "pla", label: "Plan de cuentas", icon: "grid" },
      { id: "asi", label: "Asientos y períodos", icon: "clipboard" },
      { id: "eer", label: "EERR y balance", icon: "chart" },
    ] },
  ];
  const badge = (tone, t) => { const B = NS().Badge; return B ? h(B, { tone }, t) : t; };
  const mono = (t) => h("span", { className: "t-mono" }, t);
  const num = (t, tone) => h("span", { className: "t-numeric", style: tone ? { color: "var(--ds-" + tone + "-fg)" } : null }, t);
  const two = (a, b) => h("span", { style: { display: "flex", flexDirection: "column" } }, h("span", { className: "t-label" }, a), h("span", { className: "t-caption" }, b));
  window.FinShell = {
    tabs, groups, badge, mono, num, two,
    shell(navId, device) { return { tabs, groups, active: device === "desktop" ? navId : "fin" }; },
    estado(props) {
      const e = props.estado ?? "datos";
      return { estado: e, isDatos: e === "datos", isVacio: e === "vacio", isCargando: e === "cargando", isError: e === "error", isForbidden: e === "sinPermiso", notForbidden: e !== "sinPermiso", isB: props.variante === "B", isA: props.variante !== "B" };
    },
    forbidden: {
      title: "No tienes acceso a Finanzas",
      description: "Tu rol no permite ver compras, conciliación ni contabilidad. Pídele acceso a Andrés Molina, administrador de Atlas Seguridad SpA.",
    },
  };
})();
