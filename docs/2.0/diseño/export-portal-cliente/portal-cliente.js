// Datos ficticios, navegación y marca del Portal Cliente (OPAI 2.0) · v2
(() => {
  const I = (id, label, icon) => ({ id, label, icon });
  const NAV_PHONE = [I("res", "Resumen", "home"), I("ins", "Instalaciones", "building"), I("cot", "Cotizaciones", "briefcase"), I("rep", "Reportes", "chart"), I("mas", "Más", "more")];
  const NAV_RAIL = [I("res", "Resumen", "home"), I("ins", "Instalac.", "building"), I("cot", "Cotizac.", "briefcase"), I("rep", "Reportes", "chart"), I("doc", "Docs.", "file"), I("sol", "Solicitudes", "ticket")];
  const GROUPS = [{ items: [I("res", "Resumen", "home"), I("ins", "Instalaciones", "building"), I("cot", "Cotizaciones", "briefcase"), I("rep", "Reportes", "chart"), I("doc", "Documentos", "file"), I("sol", "Solicitudes", "ticket"), I("age", "Agentes", "bot")] }];
  const PROSPECT_GROUPS = [{ items: [I("cot", "Cotizaciones", "briefcase"), I("cta", "Mi cuenta", "user")] }];
  const PHONE_IDS = ["res", "ins", "cot", "rep"];
  const activeFor = (device, id) => (device === "phone" && !PHONE_IDS.includes(id) ? "mas" : id);

  const USERS = {
    total: { name: "Andrea Rojas", initials: "AR", role: "Logística Andina SpA" },
    limitado: { name: "Felipe Soto", initials: "FS", role: "Logística Andina SpA · 2 instalaciones" },
    prospecto: { name: "Paula Ortiz", initials: "PO", role: "Frigorífico del Maipo SpA" },
    erp: { name: "Andrés Molina", initials: "AM", role: "Administrador" },
  };
  const ERP_TABS = [I("ini", "Inicio", "home"), I("ins", "Instalac.", "building"), I("pau", "Pauta", "calendar"), I("per", "Personas", "users"), I("cfg", "Config.", "grid")];
  const ERP_GROUPS = [
    { items: [I("ini", "Inicio", "home"), I("ban", "Bandeja", "inbox")] },
    { title: "Operaciones", items: [I("ins", "Instalaciones", "building"), I("pau", "Pauta mensual", "calendar"), I("ron", "Rondas", "route")] },
    { title: "Personas", items: [I("per", "Personas", "users")] },
    { title: "Configuración", items: [I("cfg", "Portal Cliente", "grid")] },
  ];

  const INST = [
    { id: "pq", name: "Planta Quilicura", dir: "Av. Lo Echevers 550, Quilicura", cob: "98,6 %", cobN: 98.6, turnos: "296 de 300", rondas: "412 de 420", rondasPct: "98 %", graves: 0, moderadas: 2, leves: 5, tone: "success", estado: "Cumple", accesos: true },
    { id: "bl", name: "Bodega Lampa", dir: "Camino Lo Echevers 12.300, Lampa", cob: "91,2 %", cobN: 91.2, turnos: "219 de 240", rondas: "268 de 310", rondasPct: "86 %", graves: 1, moderadas: 3, leves: 4, tone: "warning", estado: "Bajo la meta", accesos: false },
    { id: "ta", name: "Torre Apoquindo", dir: "Av. Apoquindo 4.800, Las Condes", cob: "100 %", cobN: 100, turnos: "180 de 180", rondas: "186 de 186", rondasPct: "100 %", graves: 0, moderadas: 0, leves: 2, tone: "success", estado: "Cumple", accesos: true },
  ];

  const GUARDIAS = [
    { id: 1, name: "Juan Pérez Soto", ini: "JP", rut: "16.234.567-8", puesto: "Portería 1 · Día", turno: true },
    { id: 2, name: "Marcela Díaz Rojas", ini: "MD", rut: "17.845.120-3", puesto: "Portería 1 · Día", turno: false },
    { id: 3, name: "Luis Contreras Vega", ini: "LC", rut: "15.902.334-1", puesto: "Portería 1 · Noche", turno: false },
    { id: 4, name: "Pedro Muñoz Lagos", ini: "PM", rut: "18.120.456-K", puesto: "Patio · Día", turno: true },
    { id: 5, name: "Rosa Fuentes Araya", ini: "RF", rut: "14.567.890-2", puesto: "Patio · Noche", turno: false },
    { id: 6, name: "Diego Sepúlveda Mora", ini: "DS", rut: "19.034.778-5", puesto: "Relevo", turno: false },
  ];

  // Marcaciones: hora programada al lado de la real
  const MARCACIONES = [
    { id: 1, dia: "30-10-2026", guardia: "Juan Pérez Soto", ini: "JP", rut: "16.234.567-8", puesto: "Portería 1 · Día", pe: "08:00", re: "07:52", ps: "20:00", rs: "—", tone: "success", estado: "En turno", nota: "" },
    { id: 2, dia: "30-10-2026", guardia: "Pedro Muñoz Lagos", ini: "PM", rut: "18.120.456-K", puesto: "Patio · Día", pe: "08:00", re: "08:14", ps: "20:00", rs: "—", tone: "warning", estado: "Atraso 14 min", nota: "" },
    { id: 3, dia: "29-10-2026", guardia: "Luis Contreras Vega", ini: "LC", rut: "15.902.334-1", puesto: "Portería 1 · Noche", pe: "20:00", re: "19:55", ps: "08:00", rs: "08:03", tone: "success", estado: "A tiempo", nota: "" },
    { id: 4, dia: "29-10-2026", guardia: "Rosa Fuentes Araya", ini: "RF", rut: "14.567.890-2", puesto: "Patio · Noche", pe: "20:00", re: "—", ps: "08:00", rs: "—", tone: "danger", estado: "Ausente", nota: "Cubrió D. Sepúlveda" },
    { id: 5, dia: "29-10-2026", guardia: "Diego Sepúlveda Mora", ini: "DS", rut: "19.034.778-5", puesto: "Patio · Noche", pe: "20:00", re: "20:40", ps: "08:00", rs: "08:01", tone: "info", estado: "Reemplazo", nota: "Por R. Fuentes" },
    { id: 6, dia: "29-10-2026", guardia: "Marcela Díaz Rojas", ini: "MD", rut: "17.845.120-3", puesto: "Portería 1 · Día", pe: "08:00", re: "07:58", ps: "20:00", rs: "20:06", tone: "success", estado: "A tiempo", nota: "" },
  ];

  const RONDAS = [
    { id: "r1", hora: "08:00", nombre: "Ronda perimetral", guardia: "Pedro Muñoz Lagos", real: "08:14–08:41", puntos: "6 de 6", inc: 0, tone: "success", estado: "Completa" },
    { id: "r2", hora: "10:00", nombre: "Ronda perimetral", guardia: "Pedro Muñoz Lagos", real: "10:02–10:30", puntos: "6 de 6", inc: 1, tone: "success", estado: "Completa" },
    { id: "r3", hora: "12:00", nombre: "Ronda de andenes", guardia: "Pedro Muñoz Lagos", real: "12:05–12:22", puntos: "4 de 5", inc: 1, tone: "warning", estado: "Incompleta" },
    { id: "r4", hora: "14:00", nombre: "Ronda perimetral", guardia: "Pedro Muñoz Lagos", real: "14:01–14:29", puntos: "6 de 6", inc: 0, tone: "success", estado: "Completa" },
    { id: "r5", hora: "16:00", nombre: "Ronda de andenes", guardia: "Pedro Muñoz Lagos", real: "—", puntos: "0 de 5", inc: 0, tone: "neutral", estado: "Programada" },
    { id: "r6", hora: "18:00", nombre: "Ronda perimetral", guardia: "Pedro Muñoz Lagos", real: "—", puntos: "0 de 6", inc: 0, tone: "neutral", estado: "Programada" },
  ];
  const PUNTOS = [
    { id: 1, nombre: "Portería 1", prog: "12:00", real: "12:05", ok: true, inc: "" },
    { id: 2, nombre: "Andén 1", prog: "12:05", real: "12:09", ok: true, inc: "" },
    { id: 3, nombre: "Andén 2", prog: "12:10", real: "12:13", ok: true, inc: "Portón sin candado; se cerró y se avisó a jefe de turno" },
    { id: 4, nombre: "Andén 3", prog: "12:15", real: "—", ok: false, inc: "Sin marcar: acceso bloqueado por carga" },
    { id: 5, nombre: "Patio de contenedores", prog: "12:20", real: "12:22", ok: true, inc: "" },
  ];

  const NOVEDADES = [
    { id: "NOV-0231", f: "30-10-2026", hh: "06:12", g: "Grave", tone: "danger", cat: "Seguridad", tit: "Intento de ingreso por cerco norte", txt: "Dos personas intentaron saltar el cerco norte. Se dio aviso a Carabineros (parte 4471) y se retiraron antes de su llegada.", quien: "Luis Contreras Vega", puesto: "Portería 1 · Noche", estado: "Abierta", eTone: "warning", resp: 2, adj: 3 },
    { id: "NOV-0229", f: "29-10-2026", hh: "20:40", g: "Moderada", tone: "warning", cat: "Personal", tit: "Ausencia en turno noche de patio", txt: "Rosa Fuentes no se presentó. Cubrió Diego Sepúlveda desde las 20:40.", quien: "Jorge Muñoz", puesto: "Supervisor", estado: "Cerrada", eTone: "neutral", resp: 1, adj: 0 },
    { id: "NOV-0226", f: "27-10-2026", hh: "03:40", g: "Moderada", tone: "warning", cat: "Infraestructura", tit: "Portón de patio sin cierre", txt: "El motor del portón no cierra. Se aseguró con cadena hasta la mantención.", quien: "Rosa Fuentes Araya", puesto: "Patio · Noche", estado: "Abierta", eTone: "warning", resp: 1, adj: 2 },
    { id: "NOV-0221", f: "21-10-2026", hh: "14:15", g: "Leve", tone: "neutral", cat: "Proveedores", tit: "Proveedor sin guía de despacho", txt: "Ingresó con autorización telefónica de bodega.", quien: "Juan Pérez Soto", puesto: "Portería 1 · Día", estado: "Cerrada", eTone: "neutral", resp: 1, adj: 1 },
    { id: "NOV-0214", f: "12-10-2026", hh: "22:15", g: "Leve", tone: "neutral", cat: "Personal", tit: "Relevo llegó 22:15", txt: "El guardia de día extendió su turno hasta la llegada del relevo.", quien: "Marcela Díaz Rojas", puesto: "Portería 1 · Día", estado: "Cerrada", eTone: "neutral", resp: 0, adj: 0 },
    { id: "NOV-0208", f: "04-10-2026", hh: "09:05", g: "Leve", tone: "neutral", cat: "Infraestructura", tit: "Luminaria del acceso norte apagada", txt: "Se avisó a mantención; repuesta el 05-10-2026.", quien: "Juan Pérez Soto", puesto: "Portería 1 · Día", estado: "Cerrada", eTone: "neutral", resp: 1, adj: 1 },
  ];

  const VISITAS_SUP = [
    { id: 1, f: "28-10-2026", hh: "10:30–11:15", sup: "Jorge Muñoz", hall: ["Libro de novedades al día", "Portón de patio pendiente de mantención"], fotos: 4, tone: "warning", estado: "1 hallazgo abierto" },
    { id: 2, f: "17-10-2026", hh: "22:00–22:40", sup: "Jorge Muñoz", hall: ["Visita nocturna sin observaciones"], fotos: 2, tone: "success", estado: "Sin hallazgos" },
    { id: 3, f: "06-10-2026", hh: "09:10–10:00", sup: "Jorge Muñoz", hall: ["Credencial OS-10 por vencer de Marcela Díaz", "Uniformes completos"], fotos: 3, tone: "success", estado: "Cerrada" },
  ];
  const KPIS = [
    { id: "cob", label: "Cobertura", valor: "98,6 %", meta: "Meta 95 %", tone: "success", estado: "Cumple", serie: [97.2, 98.1, 96.4, 99.0, 98.3, 98.6], min: 90 },
    { id: "pun", label: "Puntualidad", valor: "94,1 %", meta: "Meta 95 %", tone: "warning", estado: "Bajo la meta", serie: [96.0, 95.2, 93.8, 95.5, 94.9, 94.1], min: 90 },
    { id: "ron", label: "Rondas cumplidas", valor: "98 %", meta: "Meta 95 %", tone: "success", estado: "Cumple", serie: [95, 97, 96, 98, 99, 98], min: 90 },
    { id: "nov", label: "Novedades graves", valor: "1", meta: "Meta 0", tone: "danger", estado: "Sobre la meta", serie: [0, 0, 1, 0, 0, 1], min: 0, detalle: "1 grave · 2 moderadas · 5 leves" },
    { id: "res", label: "Respuesta a novedades", valor: "38 min", meta: "Meta ≤ 60 min", tone: "success", estado: "Cumple", serie: [52, 47, 61, 44, 40, 38], min: 0, inv: true },
    { id: "vis", label: "Visitas de supervisión", valor: "3 de 4", meta: "Meta 4 al mes", tone: "warning", estado: "Falta 1", serie: [4, 4, 3, 4, 4, 3], min: 0 },
  ];
  const MESES6 = ["May", "Jun", "Jul", "Ago", "Sep", "Oct"];

  const PERSONAS_AUT = [
    { id: 1, nombre: "Ricardo Lagos Peña", rut: "12.345.678-5", empresa: "Logística Andina SpA", tipo: "Visita frecuente", vig: "31-12-2026", tone: "success", estado: "Vigente" },
    { id: 2, nombre: "Carolina Vera Soto", rut: "15.678.234-1", empresa: "Transportes Maipo", tipo: "Proveedor", vig: "15-11-2026", tone: "warning", estado: "Vence pronto" },
    { id: 3, nombre: "Mauricio Toro Díaz", rut: "13.902.115-K", empresa: "Clima Norte Ltda.", tipo: "Contratista", vig: "30-09-2026", tone: "neutral", estado: "Vencida" },
  ];
  const VEHICULOS_AUT = [
    { id: 1, patente: "PRTZ-41", modelo: "Camión Volvo FH", empresa: "Transportes Maipo", vig: "31-12-2026", tone: "success", estado: "Vigente" },
    { id: 2, patente: "LKJH-22", modelo: "Furgón Peugeot Partner", empresa: "Clima Norte Ltda.", vig: "15-11-2026", tone: "warning", estado: "Vence pronto" },
  ];
  const REGISTRO_ACC = [
    { id: 1, hh: "30-10-2026 · 09:42", quien: "PRTZ-41 · Carolina Vera Soto", tipo: "Entrada", puerta: "Portería 1", guardia: "Juan Pérez Soto" },
    { id: 2, hh: "30-10-2026 · 09:10", quien: "Ricardo Lagos Peña", tipo: "Salida", puerta: "Portería 1", guardia: "Juan Pérez Soto" },
    { id: 3, hh: "30-10-2026 · 08:31", quien: "Ricardo Lagos Peña", tipo: "Entrada", puerta: "Portería 1", guardia: "Juan Pérez Soto" },
    { id: 4, hh: "29-10-2026 · 17:55", quien: "LKJH-22 · Mauricio Toro Díaz", tipo: "Rechazada", puerta: "Portería 1", guardia: "Marcela Díaz Rojas" },
  ];
  const VISITAS_PEND = [
    { id: 1, nombre: "Sofía Castro Ibáñez", empresa: "Auditores Pacífico", cuando: "31-10-2026 · 10:00", motivo: "Auditoría de inventario", anfitrion: "Ricardo Lagos Peña" },
    { id: 2, nombre: "Hernán Bravo Leiva", empresa: "Fumigaciones Sur", cuando: "02-11-2026 · 07:30", motivo: "Control de plagas", anfitrion: "Andrea Rojas" },
  ];

  const DOCS = [
    { id: 1, guardia: "Juan Pérez Soto", rut: "16.234.567-8", tipo: "Credencial OS-10", inst: "Planta Quilicura", vence: "14-03-2027", tone: "success", estado: "Vigente" },
    { id: 2, guardia: "Marcela Díaz Rojas", rut: "17.845.120-3", tipo: "Curso OS-10", inst: "Planta Quilicura", vence: "22-11-2026", tone: "warning", estado: "Por vencer" },
    { id: 3, guardia: "Luis Contreras Vega", rut: "15.902.334-1", tipo: "Certificado de antecedentes", inst: "Planta Quilicura", vence: "05-01-2027", tone: "success", estado: "Vigente" },
    { id: 4, guardia: "Camila Reyes Tapia", rut: "18.456.002-7", tipo: "Credencial OS-10", inst: "Bodega Lampa", vence: "28-10-2026", tone: "danger", estado: "Vencido" },
    { id: 5, guardia: "Tomás Herrera Ruiz", rut: "17.230.981-4", tipo: "Curso OS-10", inst: "Bodega Lampa", vence: "30-06-2027", tone: "success", estado: "Vigente" },
    { id: 6, guardia: "Ignacio Vidal Pino", rut: "16.998.120-0", tipo: "Credencial OS-10", inst: "Torre Apoquindo", vence: "11-08-2027", tone: "success", estado: "Vigente" },
  ];
  const TIPOS_VISIBLES = ["Credencial OS-10", "Curso OS-10", "Certificado de antecedentes"];
  const PROTOCOLOS = [
    { id: 1, tipo: "Protocolo", nombre: "Protocolo de control de accesos", inst: "Planta Quilicura", ver: "v4", desde: "01-09-2026" },
    { id: 2, tipo: "Plan de emergencia", nombre: "Plan de emergencia y evacuación", inst: "Planta Quilicura", ver: "v2", desde: "15-03-2026" },
    { id: 3, tipo: "Procedimiento", nombre: "Procedimiento de rondas nocturnas", inst: "Planta Quilicura", ver: "v3", desde: "01-06-2026" },
    { id: 4, tipo: "Contrato", nombre: "Contrato de servicio de seguridad", inst: "Planta Quilicura", ver: "v1", desde: "01-03-2025" },
    { id: 5, tipo: "Anexo", nombre: "Anexo 2 · Refuerzo de patio nocturno", inst: "Planta Quilicura", ver: "v1", desde: "01-08-2026" },
    { id: 6, tipo: "Protocolo", nombre: "Protocolo de recepción de camiones", inst: "Bodega Lampa", ver: "v2", desde: "10-05-2026" },
    { id: 7, tipo: "Plan de emergencia", nombre: "Plan de emergencia Torre Apoquindo", inst: "Torre Apoquindo", ver: "v5", desde: "02-01-2026" },
  ];
  const TIPOS_PROT = ["Protocolo", "Procedimiento", "Plan de emergencia", "Contrato", "Anexo"];

  const FACTURAS = [
    { id: 1, folio: "F-004812", periodo: "Septiembre 2026", emision: "01-10-2026", vence: "31-10-2026", tone: "warning", estado: "Por pagar" },
    { id: 2, folio: "F-004655", periodo: "Agosto 2026", emision: "01-09-2026", vence: "01-10-2026", tone: "success", estado: "Pagada" },
    { id: 3, folio: "F-004501", periodo: "Julio 2026", emision: "01-08-2026", vence: "31-08-2026", tone: "success", estado: "Pagada" },
    { id: 4, folio: "F-004702", periodo: "Servicio adicional · 18-09-2026", emision: "20-09-2026", vence: "20-10-2026", tone: "success", estado: "Pagada" },
  ];

  const INFORMES = [
    { id: "oct", mes: "Octubre 2026", detalle: "Mes en curso · se cierra el 31-10-2026", tone: "info", estado: "En curso" },
    { id: "sep", mes: "Septiembre 2026", detalle: "Enviado el 01-10-2026 08:00 · 3 destinatarios", tone: "neutral", estado: "Cerrado" },
    { id: "ago", mes: "Agosto 2026", detalle: "Enviado el 01-09-2026 08:00 · 3 destinatarios", tone: "neutral", estado: "Cerrado" },
    { id: "jul", mes: "Julio 2026", detalle: "Enviado el 01-08-2026 08:00 · 2 destinatarios", tone: "neutral", estado: "Cerrado" },
  ];
  const REPORTES = [
    { id: "asi", icon: "user-check", nombre: "Asistencia y marcaciones", desc: "Entradas y salidas por turno, atrasos, ausencias y reemplazos." },
    { id: "ron", icon: "route", nombre: "Rondas", desc: "Programadas contra realizadas, con puntos e incidencias." },
    { id: "nov", icon: "flag", nombre: "Libro de novedades", desc: "Novedades por gravedad, categoría y estado, con respuestas." },
    { id: "sup", icon: "eye", nombre: "Supervisión", desc: "Visitas del supervisor, hallazgos e indicadores contra meta." },
    { id: "acc", icon: "scan", nombre: "Control de accesos", desc: "Registro de entradas y salidas, y visitas aprobadas." },
  ];
  const DESTINATARIOS = ["andrea.rojas@logisticaandina.cl", "gerencia@logisticaandina.cl", "felipe.soto@logisticaandina.cl"];

  const SOLICITUDES = [
    { id: "SOL-0142", tipo: "Guardia adicional por un día", inst: "Bodega Lampa", cuando: "05-11-2026 · 08:00–20:00", tone: "info", estado: "En revisión" },
    { id: "SOL-0139", tipo: "Refuerzo nocturno", inst: "Planta Quilicura", cuando: "31-10-2026 · 20:00–08:00", tone: "success", estado: "Confirmada" },
    { id: "SOL-0131", tipo: "Guardia para evento", inst: "Torre Apoquindo", cuando: "18-10-2026 · 18:00–23:00", tone: "neutral", estado: "Realizada" },
    { id: "SOL-0127", tipo: "Guardia adicional por un día", inst: "Bodega Lampa", cuando: "09-10-2026 · 08:00–20:00", tone: "danger", estado: "Rechazada" },
  ];

  const COTIZACIONES = [
    { id: "CPQ-2026-118", fecha: "27-10-2026", serv: "Bodega Lampa · refuerzo nocturno", total: "$ 2.940.000", tone: "info", estado: "Enviada", vence: "26-11-2026" },
    { id: "CPQ-2026-104", fecha: "14-10-2026", serv: "Torre Apoquindo · control de accesos", total: "$ 1.180.000", tone: "neutral", estado: "Vista", vence: "13-11-2026" },
    { id: "CPQ-2026-087", fecha: "02-09-2026", serv: "Planta Quilicura · guardia de patio", total: "$ 3.420.000", tone: "success", estado: "Aceptada", vence: "02-10-2026" },
    { id: "CPQ-2026-061", fecha: "18-07-2026", serv: "Evento aniversario · 2 guardias", total: "$ 396.000", tone: "danger", estado: "Rechazada", vence: "17-08-2026" },
    { id: "CPQ-2026-042", fecha: "05-06-2026", serv: "Bodega Lampa · ronda motorizada", total: "$ 1.650.000", tone: "warning", estado: "Vencida", vence: "05-07-2026" },
  ];
  const COT_PROSPECTO = [
    { id: "CPQ-2026-121", fecha: "29-10-2026", serv: "Planta San Bernardo · seguridad 24/7", total: "$ 8.925.000", tone: "info", estado: "Enviada", vence: "28-11-2026" },
    { id: "CPQ-2026-109", fecha: "16-10-2026", serv: "Centro de distribución Buin · nocturno", total: "$ 4.410.000", tone: "neutral", estado: "Vista", vence: "15-11-2026" },
  ];
  const COT_LINEAS = [
    { id: 1, item: "Guardia noche 20:00–08:00 · patio", cant: "1 puesto · 30 turnos", unit: "$ 82.000", sub: "$ 2.460.000" },
    { id: 2, item: "Supervisión nocturna adicional", cant: "4 visitas", unit: "$ 60.000", sub: "$ 240.000" },
    { id: 3, item: "Equipo de radio y linterna", cant: "1 kit · mensual", unit: "$ 240.000", sub: "$ 240.000" },
  ];

  const AB = { phone: { w: 375, h: 812, l: "375" }, tablet: { w: 1024, h: 768, l: "1024" }, desktop: { w: 1280, h: 800, l: "1280" } };
  function board(rows, defDevices) {
    return rows.map((r, ri) => {
      const devs = r.devices || defDevices || ["phone", "tablet", "desktop"];
      const ths = r.themes || ["light", "dark"];
      const items = [];
      devs.forEach((d) => ths.forEach((t) => items.push(Object.assign({ key: ri + d + t, label: (t === "light" ? "Claro" : "Oscuro") + " · " + AB[d].l, device: d, theme: t, w: AB[d].w + "px", h: (r.h && r.h[d] ? r.h[d] : AB[d].h) + "px" }, r.props || {}))));
      return { key: "r" + ri, title: r.title, note: r.note || "", isB: !!r.isB, items };
    });
  }

  // Marca fija del cliente: sin selector de tenant (contenedores con data-pc-brand="fijo").
  function fixBrand(root) {
    root.querySelectorAll('[data-pc-brand="fijo"] .sidebar-portal, [data-pc-brand="fijo"] .rail-portal').forEach((b) => {
      if (b.dataset.pcFixed) return;
      b.dataset.pcFixed = "1";
      b.querySelectorAll(".i-updown").forEach((i) => { i.style.display = "none"; });
      b.setAttribute("tabindex", "-1"); b.setAttribute("aria-label", "Logística Andina SpA · Portal Cliente de Atlas Seguridad SpA");
      b.style.cursor = "default"; b.style.pointerEvents = "none";
      if (b.classList.contains("rail-portal")) { b.querySelectorAll("span").forEach((s) => { s.style.whiteSpace = "normal"; s.style.textAlign = "center"; s.style.lineHeight = "14px"; }); const c = document.createElement("span"); c.textContent = "Portal Cliente de Atlas Seguridad SpA"; c.style.cssText = "font:400 11px/14px var(--font-sans);color:var(--ds-fg-subtle);white-space:normal;text-align:center"; b.appendChild(c); b.style.height = "auto"; b.style.paddingBottom = "8px"; }
    });
  }
  if (typeof MutationObserver !== "undefined") {
    let pend = false;
    const mo = new MutationObserver(() => { if (pend) return; pend = true; setTimeout(() => { pend = false; fixBrand(document); }, 120); });
    const start = () => { fixBrand(document); mo.observe(document.body, { childList: true, subtree: true }); };
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  }

  // TopBar del teléfono con la variante selector={false}: se pasa por la prop left del TopBar del DS (sin parche).
  function topBar(device, rol, selector) {
    const R = window.React, NS = window.OPAI20DesignSystem_44e4d7;
    if (device !== "phone" || !R || !NS || !NS.TopBar) return undefined;
    const h = R.createElement;
    const pros = rol === "prospecto";
    const empresa = pros ? "Frigorífico del Maipo SpA" : "Logística Andina SpA";
    const cap = selector ? "2 empresas · cambiar" : "Portal Cliente de Atlas Seguridad SpA";
    const u = USERS[pros ? "prospecto" : rol === "limitado" ? "limitado" : "total"];
    const txt = h("span", { style: { flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" } },
      h("span", { style: { font: "600 15px/20px var(--font-sans)", color: "var(--ds-fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, empresa),
      h("span", { style: { font: "400 11px/14px var(--font-sans)", color: "var(--ds-fg-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, cap));
    const left = selector
      ? h("button", { type: "button", className: "portal-btn", "aria-label": empresa + " · cambiar de empresa", style: { flex: "1 1 auto", minWidth: 0, maxWidth: "100%" } }, NS.TenantMark ? h(NS.TenantMark, { initials: "AS" }) : null, txt, NS.Icon ? h(NS.Icon, { name: "updown", size: "sm", className: "subtle" }) : null)
      : h("div", { role: "group", "aria-label": empresa + " · Portal Cliente de Atlas Seguridad SpA", style: { display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", minWidth: 0, minHeight: 44, padding: "0 4px" } }, NS.TenantMark ? h(NS.TenantMark, { initials: "AS" }) : null, txt);
    return h(NS.TopBar, { left, tenantInitials: "AS", userInitials: u.initials, style: { gap: 4 } });
  }

  window.PC = { topBar, NAV_PHONE, NAV_RAIL, GROUPS, PROSPECT_GROUPS, activeFor, USERS, ERP_TABS, ERP_GROUPS, INST, GUARDIAS, MARCACIONES, RONDAS, PUNTOS, NOVEDADES, VISITAS_SUP, KPIS, MESES6,
    PERSONAS_AUT, VEHICULOS_AUT, REGISTRO_ACC, VISITAS_PEND, DOCS, TIPOS_VISIBLES, PROTOCOLOS, TIPOS_PROT, FACTURAS, INFORMES, REPORTES, DESTINATARIOS, SOLICITUDES,
    COTIZACIONES, COT_PROSPECTO, COT_LINEAS, board, fixBrand,
    TENANT: "Atlas Seguridad SpA", CLIENTE: "Logística Andina SpA", ADMIN: "Andrés Molina", limitadas: ["pq", "bl"] };
})();
