// Datos ficticios y helpers compartidos de Nómina (Atlas Seguridad SpA).
window.ND = (() => {
  const money = (n) => "$ " + Math.round(n).toLocaleString("es-CL");
  const tabs = [
    { id: "ini", label: "Inicio", icon: "home" },
    { id: "per", label: "Personas", icon: "users" },
    { id: "nom", label: "Nómina", icon: "wallet" },
    { id: "ban", label: "Bandeja", icon: "inbox" },
    { id: "mas", label: "Más", icon: "more" },
  ];
  const groups = [
    { items: [{ id: "ini", label: "Inicio", icon: "home" }, { id: "ban", label: "Bandeja", icon: "inbox" }] },
    { title: "Personas", items: [{ id: "pers", label: "Personas", icon: "users" }, { id: "pue", label: "Puestos", icon: "briefcase" }] },
    { title: "Nómina", items: [
      { id: "pdo", label: "Períodos", icon: "wallet" },
      { id: "cie", label: "Cierre de mes", icon: "check-circle" },
      { id: "liq", label: "Liquidaciones", icon: "file" },
      { id: "nov", label: "Novedades", icon: "clipboard" },
      { id: "arc", label: "Archivos y declaraciones", icon: "download" },
      { id: "cal", label: "Calendario de obligaciones", icon: "calendar" },
    ] },
    { title: "Cumplimiento DT", items: [
      { id: "con", label: "Contratos y anexos", icon: "landmark" },
      { id: "fin", label: "Finiquitos", icon: "user-check" },
    ] },
    { title: "Configuración", items: [{ id: "cfg", label: "Módulos", icon: "grid" }] },
  ];
  const personas = [
    { id: 1, ini: "CH", nombre: "Camila Herrera", rut: "12.345.678-9", cargo: "Guardia", inst: "Planta Quilicura", dias: 30, imp: 776230, desc: 271118, liq: 590112, dif: 3.1, estado: "Revisada", tone: "success" },
    { id: 2, ini: "LP", nombre: "Luis Pérez", rut: "9.876.543-2", cargo: "Guardia", inst: "Bodega Lampa", dias: 18, imp: 465600, desc: 98420, liq: 412180, dif: -38.4, estado: "Con observación", tone: "warning" },
    { id: 3, ini: "JM", nombre: "Jorge Muñoz", rut: "11.222.333-K", cargo: "Supervisor", inst: "Torre Apoquindo", dias: 30, imp: 1120000, desc: 248950, liq: 921050, dif: 1.2, estado: "Revisada", tone: "success" },
    { id: 4, ini: "MS", nombre: "María F. Soto", rut: "16.234.567-8", cargo: "Guardia", inst: "Planta Quilicura", dias: 30, imp: 842300, desc: 187400, liq: 704900, dif: 14.6, estado: "Calculada", tone: "neutral" },
    { id: 5, ini: "HA", nombre: "Héctor Araya", rut: "15.009.332-7", cargo: "Guardia", inst: "Torre Apoquindo", dias: 30, imp: 735000, desc: 163600, liq: 621400, dif: 0, estado: "Revisada", tone: "success" },
    { id: 6, ini: "DS", nombre: "Diego Silva", rut: "13.456.789-0", cargo: "Guardia", inst: "Planta Quilicura", dias: 22, imp: 571900, desc: 127300, liq: 494600, dif: -12.8, estado: "Calculada", tone: "neutral" },
    { id: 7, ini: "PR", nombre: "Paula Rojas", rut: "17.654.321-5", cargo: "Guardia", inst: "Bodega Lampa", dias: 30, imp: 760400, desc: 169200, liq: 641200, dif: 2.4, estado: "Revisada", tone: "success" },
    { id: 8, ini: "RV", nombre: "Ricardo Vega", rut: "14.111.222-3", cargo: "Conserje", inst: "Torre Apoquindo", dias: 30, imp: 698000, desc: 155300, liq: 592700, dif: 0.8, estado: "Revisada", tone: "success" },
  ];
  // Helper base: flags de dispositivo, estado y rol; navegación.
  function base(props, active, title) {
    const device = props.device ?? "desktop";
    const role = props.role ?? "admin";
    let state = props.state ?? "ok";
    if (role === "supervisor" || role === "viewer") state = "sinpermiso";
    const isPhone = device === "phone";
    return {
      device, theme: props.theme ?? "light", role,
      isPhone, notPhone: !isPhone, isDesktop: device === "desktop", isTablet: device === "tablet",
      isOk: state === "ok", isVacio: state === "vacio", isCargando: state === "cargando", isError: state === "error", isSinPermiso: state === "sinpermiso",
      showHeader: state !== "sinpermiso",
      canEdit: ["owner", "admin", "rrhh"].includes(role) && state === "ok",
      isGerente: role === "gerente", isInspector: role === "inspector", readOnly: role === "inspector" || role === "gerente",
      tabs, groups, active: device !== "desktop" ? (active === "cfg" ? "mas" : "nom") : active,
      shellTitle: isPhone ? "" : title,
      user: role === "gerente" ? { name: "Andrea Fuentes", initials: "AF", role: "Gerente" } : role === "inspector" ? { name: "Rodrigo Lagos", initials: "RL", role: "Inspector DT" } : { name: "Marcela Rojas", initials: "MR", role: "Administrador" },
      noop: () => {},
      skel: [1, 2, 3, 4, 5],
      pad: isPhone ? 16 : device === "tablet" ? 24 : 32,
    };
  }
  const mask = "$ ••••••";
  return { money, tabs, groups, personas, base, mask };
})();
