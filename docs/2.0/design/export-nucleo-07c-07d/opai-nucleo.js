// Configuración compartida del shell ERP y datos de ejemplo de Gard Seguridad SpA.
(() => {
  const h = (...a) => React.createElement(...a);
  const NS = () => window.OPAI20DesignSystem_44e4d7 || {};
  const tabs = [
    { id: "ini", label: "Inicio", icon: "home" },
    { id: "cue", label: "Cuentas", icon: "briefcase" },
    { id: "per", label: "Personas", icon: "users" },
    { id: "bus", label: "Buscar", icon: "search" },
    { id: "mas", label: "Más", icon: "more" },
  ];
  const railTabs = [
    { id: "ini", label: "Inicio", icon: "home" },
    { id: "cue", label: "Cuentas", icon: "briefcase" },
    { id: "ins", label: "Instalaciones", icon: "building" },
    { id: "per", label: "Personas", icon: "users" },
    { id: "pau", label: "Pauta", icon: "calendar" },
    { id: "fin", label: "Finanzas", icon: "wallet" },
  ];
  const railFooter = [{ id: "cfg", label: "Configuración", icon: "grid" }];
  const groups = [
    { items: [{ id: "ini", label: "Inicio", icon: "home" }, { id: "ban", label: "Aprobaciones", icon: "inbox", count: 2 }] },
    { title: "Comercial", items: [{ id: "cue", label: "Cuentas", icon: "briefcase" }] },
    { title: "Operaciones", items: [{ id: "ins", label: "Instalaciones", icon: "building" }, { id: "per", label: "Personas", icon: "users" }, { id: "pau", label: "Pauta mensual", icon: "calendar" }, { id: "ron", label: "Rondas", icon: "route" }] },
    { title: "Administración", items: [{ id: "fin", label: "Finanzas", icon: "wallet" }, { id: "nom", label: "Nómina", icon: "landmark" }] },
    { title: "Empresa", items: [{ id: "cfg", label: "Configuración", icon: "grid" }] },
  ];
  const users = {
    af: { name: "Andrés Fuenzalida Rivas", initials: "AF", role: "Owner" },
    dr: { name: "Daniela Rojas Fuentes", initials: "DR", role: "Admin" },
    mt: { name: "Marcelo Tapia Contreras", initials: "MT", role: "Gerente" },
    pv: { name: "Patricio Venegas Soto", initials: "PV", role: "Supervisor" },
  };
  const configIndex = [
    { title: "Empresa", items: [
      { id: "datos", icon: "building", title: "Datos de la empresa", desc: "Razón social, RUT y dirección", short: "RUT y dirección" },
      { id: "priv", icon: "shield", title: "Privacidad y datos personales", desc: "Acuerdo de datos, delegado, registro de tratamientos y solicitudes de titulares", short: "Ley 21.719: DPA, DPO y solicitudes" },
      { id: "marca", icon: "flag", title: "Marca", desc: "Logo y monograma de la empresa", short: "Logo y monograma" },
      { id: "pref", icon: "clock", title: "Preferencias", desc: "Zona horaria, moneda y formatos", short: "Zona horaria y formatos" },
    ] },
    { title: "Acceso", items: [
      { id: "usr", icon: "users", title: "Usuarios y permisos", desc: "Quién entra, con qué rol y a qué portales", short: "Roles y portales" },
      { id: "api", icon: "bot", title: "Agentes y API keys", desc: "Llaves de acceso para agentes e integraciones", short: "Llaves de acceso" },
      { id: "apr", icon: "check-circle", title: "Aprobaciones pendientes", desc: "Cambios que esperan tu visto bueno", short: "2 pendientes" },
    ] },
    { title: "Plataforma", items: [
      { id: "mod", icon: "grid", title: "Módulos", desc: "Activa o apaga los módulos de OPAI", short: "Activos e inactivos" },
      { id: "int", icon: "swap", title: "Integraciones", desc: "Conexiones con otros sistemas", short: "Conexiones" },
      { id: "com", icon: "message", title: "Comunicaciones", desc: "Correos y avisos que envía OPAI", short: "Correos y avisos" },
      { id: "doc", icon: "file", title: "Documentos", desc: "Plantillas y tipos de documento", short: "Plantillas" },
      { id: "con", icon: "chart", title: "Consumos", desc: "Uso del plan y facturación de OPAI", short: "Uso del plan" },
      { id: "aud", icon: "clipboard", title: "Auditoría", desc: "Registro de cambios hechos en OPAI", short: "Registro de cambios" },
    ] },
    { title: "Módulos activos", items: [
      { id: "m-ope", icon: "calendar", title: "Operaciones", desc: "Turnos, rondas y marcaje", short: "Turnos y rondas" },
      { id: "m-fin", icon: "wallet", title: "Finanzas", desc: "Centros de costo y cuentas", short: "Centros de costo" },
      { id: "m-nom", icon: "landmark", title: "Nómina", desc: "Haberes, descuentos e imposiciones", short: "Haberes y descuentos" },
    ] },
  ];
  const indexFor = (active, opts) => configIndex.map((g) => ({
    title: g.title,
    items: g.items.filter((i) => !(opts && opts.hide && opts.hide.includes(i.id))).map((i) => ({ ...i, active: i.id === active, shield: i.icon === "shield", notShield: i.icon !== "shield", bg: i.id === active ? "var(--ds-fill)" : "transparent" })),
  }));
  // Barra superior de teléfono con título (y volver) o con Cancelar / acción principal.
  const phoneBar = ({ title, back, cancel, action, actionDisabled, actionLoading, userInitials }) => {
    const N = NS();
    if (!N.TopBar) return null;
    const ttl = h("span", { className: "t-subheading", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 } }, title);
    if (cancel) {
      return h(N.TopBar, {
        left: h("span", { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } }, h(N.Button, { variant: "ghost" }, "Cancelar"), ttl),
        right: h("span", { style: { display: "flex", alignItems: "center", gap: 8 } }, action ? h(N.Button, { disabled: actionDisabled, loading: actionLoading }, action) : null),
        style: { gap: 8 },
      }, null);
    }
    return h(N.TopBar, {
      left: h("span", { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } }, back ? h(N.IconButton, { icon: "chevron-left", label: "Volver" }) : null, ttl),
      right: h(React.Fragment, null, h(N.IconButton, { icon: "search", label: "Buscar" }), h(N.IconButton, { icon: "bell", label: "Notificaciones", count: 3 }), h(N.IconButton, { label: "Tu perfil" }, h(N.Avatar, { initials: userInitials || "DR" }))),
    });
  };
  const formTitle = (title) => h("span", { className: "t-subheading" }, title);
  const sr = (t) => h("span", { style: { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" } }, t);
  const back = (label) => { const N = NS(); return N.IconButton ? h(N.IconButton, { icon: "chevron-left", label: label || "Volver a Configuración" }) : null; };
  // Barra de iPad / desktop con volver (leading) y título.
  const wideBar = (device, title, opts) => {
    const N = NS(); if (!N.AppBar) return null;
    const o = opts || {};
    const right = device === "desktop"
      ? [h(N.SearchBox, { key: "s" }), h(N.IconButton, { key: "b", icon: "bell", label: "Notificaciones", count: 3 })]
      : [h(N.IconButton, { key: "s", icon: "search", label: "Buscar en OPAI" }), h(N.IconButton, { key: "b", icon: "bell", label: "Notificaciones", count: 3 }), h(N.IconButton, { key: "p", label: "Tu perfil" }, h(N.Avatar, { initials: o.userInitials || "DR" }))];
    const t = o.back === false ? title : h("span", { style: { display: "flex", alignItems: "center", gap: 4, marginLeft: -12 } }, back(o.backLabel), title);
    return h(N.AppBar, { title: t, subtitle: o.subtitle, padding: device === "desktop" ? 32 : undefined }, ...right);
  };
  const shell = (device, title, opts) => {
    const o = opts || {};
    const u = users[o.user || "dr"];
    return {
      device, isPhone: device === "phone", notPhone: device !== "phone",
      navTabs: device === "phone" ? tabs : railTabs, railFooter, groups, active: device === "phone" ? "mas" : "cfg",
      shellUser: u, title,
      topBar: device === "phone" ? phoneBar({ title, back: o.back !== false, cancel: o.cancel, action: o.action, actionDisabled: o.actionDisabled, actionLoading: o.actionLoading, userInitials: u.initials }) : null,
      appBar: device === "phone" ? null : wideBar(device, title, { back: o.back, userInitials: u.initials, subtitle: o.subtitle }),
      hideTab: !!o.cancel,
      pad: device === "phone" ? "16px" : device === "tablet" ? "24px" : "32px",
      listW: device === "phone" ? "100%" : device === "tablet" ? "360px" : "400px",
    };
  };
  const acts = (...btns) => { const N = NS(); if (!N.Button) return null; return h(React.Fragment, null, ...btns.map((b, i) => h(N.Button, { key: i, variant: b.v || "secondary", disabled: b.disabled, loading: b.loading, icon: b.icon }, b.t))); };
  window.OPAINucleo = { wideBar, shell, acts, h, NS, tabs, railTabs, railFooter, groups, users, configIndex, indexFor, phoneBar, formTitle, sr, back };
})();
