(() => {
  const fmt = (n) => "$ " + Math.round(n).toLocaleString("es-CL").replace(/,/g, ".");
  const OWN = { VR: "Valentina Rojas", MF: "Matías Fuentes", FS: "Francisca Soto" };
  const stages = [
    { id: "s1", name: "Prospecto", prob: 10, dias: 7, clase: "Abierta" },
    { id: "s2", name: "Calificado", prob: 20, dias: 7, clase: "Abierta" },
    { id: "s3", name: "Visita técnica", prob: 35, dias: 10, clase: "Abierta" },
    { id: "s4", name: "Propuesta enviada", prob: 50, dias: 14, clase: "Abierta" },
    { id: "s5", name: "Negociación", prob: 70, dias: 14, clase: "Abierta" },
    { id: "s6", name: "Firma de contrato", prob: 90, dias: 10, clase: "Abierta" },
    { id: "s7", name: "Ganado", prob: 100, dias: null, clase: "Ganada" },
    { id: "s8", name: "Perdido", prob: 0, dias: null, clase: "Perdida" },
  ];
  const D = (folio, name, acc, stage, val, own, close, days, origen, tipo, puestos) => ({ id: folio, folio, name, acc, stage, val, own, ownName: OWN[own], close, days, origen, tipo, puestos });
  const deals = [
    D("NEG-0158", "Guardias nocturnos · Bodega Quilicura", "Distribuidora Pacífico Sur Ltda.", "s1", 4380000, "VR", "30-11-2026", 3, "Sitio web", "Nuevo cliente", 2),
    D("NEG-0161", "Control de acceso · Edificio Nueva Las Condes", "Inmobiliaria Parque Vitacura SpA", "s1", 6920000, "MF", "15-12-2026", 5, "Referido", "Nuevo cliente", 3),
    D("NEG-0163", "Rondas móviles · Parque industrial Lampa", "Comunidad Parque Industrial Lampa", "s1", 3150000, "FS", "18-12-2026", 1, "Prospección en frío", "Nuevo cliente", 1),
    D("NEG-0149", "Seguridad 24/7 · Colegio Los Robles", "Fundación Educacional Los Robles", "s2", 5640000, "VR", "20-11-2026", 6, "Referido", "Nuevo cliente", 3),
    D("NEG-0152", "Conserjería y guardia · Condominio Alto Chicureo", "Comunidad Alto Chicureo", "s2", 7210000, "MF", "28-11-2026", 9, "Sitio web", "Nuevo cliente", 4),
    D("NEG-0144", "Guardias OS-10 · Faena Til Til", "Constructora Andes Sur S.A.", "s3", 9870000, "FS", "10-11-2026", 21, "Licitación", "Nuevo cliente", 5),
    D("NEG-0147", "Vigilancia · Sucursales zona sur", "Retail Austral SpA", "s3", 11400000, "VR", "30-11-2026", 8, "Cliente actual", "Nueva instalación", 6),
    D("NEG-0139", "Seguridad · Clínica Los Leones", "Clínica Los Leones S.A.", "s4", 13560000, "MF", "05-11-2026", 12, "Licitación", "Nuevo cliente", 7),
    D("NEG-0156", "Guardia adicional · Planta San Bernardo", "Frigorífico del Maipo S.A.", "s4", 2200000, "VR", "15-11-2026", 4, "Cliente actual", "Ampliación de dotación", 1),
    D("NEG-0141", "Guardias de evento · Feria Espacio Riesco", "Producciones Cordillera Ltda.", "s4", 2900000, "FS", "02-11-2026", 10, "Referido", "Servicio temporal", 8),
    D("NEG-0142", "Seguridad 24/7 · CD Lampa", "Frigorífico del Maipo S.A.", "s5", 14250000, "VR", "15-11-2026", 4, "Referido", "Nueva instalación", 6),
    D("NEG-0137", "Renovación · Planta Quilicura", "Logística Andina SpA", "s5", 8325000, "MF", "30-11-2026", 17, "Cliente actual", "Renovación de contrato", 6),
    D("NEG-0133", "Ampliación de dotación · Centro Comercial Paseo Oriente", "Centro Comercial Paseo Oriente S.A.", "s6", 6480000, "FS", "31-10-2026", 6, "Cliente actual", "Ampliación de dotación", 3),
    D("NEG-0128", "Guardias · Viña Cordillera, Pirque", "Viña Cordillera Ltda.", "s7", 5120000, "VR", "14-10-2026", 0, "Referido", "Nuevo cliente", 3),
    D("NEG-0131", "Vigilancia · Bodegas San Bernardo", "Distribuidora Pacífico Sur Ltda.", "s7", 4760000, "MF", "21-10-2026", 0, "Cliente actual", "Nueva instalación", 2),
    D("NEG-0126", "Seguridad · Recintos municipales Colina", "Municipalidad de Colina", "s8", 18900000, "FS", "06-10-2026", 0, "Licitación", "Nuevo cliente", 12),
    D("NEG-0134", "Rondas · Condominio Los Trapenses", "Comunidad Los Trapenses", "s8", 2450000, "MF", "08-10-2026", 0, "Sitio web", "Nuevo cliente", 1),
  ];
  const motivos = { "NEG-0126": "Precio", "NEG-0134": "Eligió a la competencia" };
  const contacts = [
    { id: "c1", ini: "PV", name: "Patricia Valdés", cargo: "Gerenta de operaciones", acc: "Frigorífico del Maipo S.A.", mail: "pvaldes@frigomaipo.cl", tel: "+56 9 8123 4417", open: 2 },
    { id: "c2", ini: "RÁ", name: "Rodrigo Álvarez", cargo: "Jefe de seguridad", acc: "Frigorífico del Maipo S.A.", mail: "ralvarez@frigomaipo.cl", tel: "+56 9 7765 0932", open: 2 },
    { id: "c3", ini: "MP", name: "Mónica Paredes", cargo: "Jefa de compras", acc: "Frigorífico del Maipo S.A.", mail: "mparedes@frigomaipo.cl", tel: "+56 2 2948 3100", open: 1 },
    { id: "c4", ini: "AL", name: "Andrés Lagos", cargo: "Gerente general", acc: "Frigorífico del Maipo S.A.", mail: "alagos@frigomaipo.cl", tel: "+56 9 9012 5586", open: 1 },
    { id: "c5", ini: "CM", name: "Claudia Morales", cargo: "Administradora", acc: "Comunidad Alto Chicureo", mail: "administracion@altochicureo.cl", tel: "+56 9 6634 2210", open: 1 },
    { id: "c6", ini: "JT", name: "Javier Toro", cargo: "Prevencionista de riesgos", acc: "Constructora Andes Sur S.A.", mail: "jtoro@andessur.cl", tel: "+56 9 5521 7843", open: 1 },
    { id: "c7", ini: "FN", name: "Fernanda Navarro", cargo: "Subgerenta de servicios generales", acc: "Clínica Los Leones S.A.", mail: "fnavarro@clinicalosleones.cl", tel: "+56 2 2710 4400", open: 1 },
    { id: "c8", ini: "GC", name: "Gonzalo Cárdenas", cargo: "Jefe de mantención", acc: "Logística Andina SpA", mail: "gcardenas@logandina.cl", tel: "+56 9 8876 1290", open: 1 },
    { id: "c9", ini: "IS", name: "Isabel Sepúlveda", cargo: "Directora administrativa", acc: "Fundación Educacional Los Robles", mail: "isepulveda@colegiolosrobles.cl", tel: "+56 9 7311 0045", open: 1 },
    { id: "c10", ini: "HB", name: "Hernán Bustos", cargo: "Encargado de seguridad", acc: "Viña Cordillera Ltda.", mail: "hbustos@vinacordillera.cl", tel: "+56 9 6402 8817", open: 0 },
  ];
  const tabs = [
    { id: "ini", label: "Inicio", icon: "home" }, { id: "neg", label: "Negocios", icon: "briefcase" },
    { id: "con", label: "Contactos", icon: "user" }, { id: "cue", label: "Cuentas", icon: "landmark" }, { id: "mas", label: "Más", icon: "menu" },
  ];
  const groups = [
    { items: [{ id: "ini", label: "Inicio", icon: "home" }, { id: "ban", label: "Bandeja", icon: "inbox", count: 5 }] },
    { title: "Comercial", items: [{ id: "neg", label: "Negocios", icon: "briefcase", count: 13 }, { id: "con", label: "Contactos", icon: "user" }, { id: "cue", label: "Cuentas", icon: "landmark" }] },
    { title: "Operaciones", items: [{ id: "ins", label: "Instalaciones", icon: "building" }, { id: "pau", label: "Pauta mensual", icon: "calendar" }] },
    { title: "Personas", items: [{ id: "per", label: "Personas", icon: "users" }] },
    { title: "Finanzas", items: [{ id: "fin", label: "Resumen", icon: "chart" }] },
    { items: [{ id: "cfg", label: "Configuración", icon: "grid" }] },
  ];
  const stageName = (id) => (stages.find((s) => s.id === id) || {}).name;
  const stageTone = (id) => (id === "s7" ? "success" : id === "s8" ? "danger" : "neutral");
  window.CRM = { fmt, OWN, stages, deals, motivos, contacts, tabs, groups, stageName, stageTone, tenant: "Atlas Seguridad SpA", tenantInitials: "AS" };
})();
