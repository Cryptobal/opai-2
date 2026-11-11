import type { AreaIndice, FilaHilo, PendienteHilo } from "@opai/ds";

// Datos ficticios del tablero ERP del diseño aprobado (docs/2.0/design/export-base-hilo/).
export const PENDIENTES: PendienteHilo[] = [
  { id: "d1", origen: "Agente Cobertura", area: "Operaciones", agente: true, titulo: "Cubrir el turno de noche en Planta Norte", contexto: "Marco Fuentes avisó su ausencia a las 18:40. El turno parte a las 20:00.", href: "/ds/hilo?vista=pantalla&de=pendiente", accion: "Revisar" },
  { id: "d2", origen: "Agente Cobranza", area: "Finanzas", agente: true, titulo: "Enviar recordatorio a 3 clientes con facturas vencidas", contexto: "Suman $12.480.000. Ninguno ha recibido gestión de cobro este mes.", href: "/ds/hilo?vista=pantalla&de=pendiente", accion: "Revisar" },
  { id: "d4", origen: "Paula Riquelme", area: "Comercial", titulo: "Aprobar 6 % de descuento en la cotización de Minera Cerro Alto", contexto: "El cliente lo pidió para cerrar esta semana. Supera el descuento que Paula puede dar sola.", href: "/ds/hilo?vista=pantalla&de=pendiente", accion: "Revisar" },
];

export const ACTIVIDAD: FilaHilo[] = [
  { id: "a1", cuando: "06:15", quien: "Agente Conciliación", agente: true, texto: "Calzó 23 movimientos del banco con sus facturas." },
  { id: "a2", cuando: "02:10", quien: "Agente Central", agente: true, texto: "Rondas completas en 4 de 5 instalaciones. Faltó un punto en Clínica del Valle." },
  { id: "a3", cuando: "10-11", quien: "Camilo Ibarra", texto: "Emitió 6 facturas de noviembre." },
];

export const AGENDA: FilaHilo[] = [
  { id: "g1", cuando: "20:00", texto: "Turno de noche en Planta Norte", nota: "Sin cobertura", tono: "alerta" },
  { id: "g2", cuando: "12-11", texto: "Vence el curso OS-10 de 2 personas", nota: "Renovación pendiente", tono: "aviso" },
  { id: "g3", cuando: "13-11", texto: "Pago a proveedores programado", nota: "$5.100.000" },
];

const area = (nombre: string, entradas: string[]): AreaIndice => ({
  id: nombre,
  nombre,
  entradas: entradas.map((etiqueta) => ({ href: "/ds/hilo?vista=pantalla", etiqueta })),
});

export const INDICE: AreaIndice[] = [
  area("Comercial", ["Solicitudes", "Negocios", "Cotizaciones", "Cuentas", "Contactos"]),
  area("Operaciones", ["Instalaciones", "Pauta", "Tickets", "Asistencia"]),
  area("Personas", ["Personas", "Remuneraciones"]),
  area("Finanzas", ["Ventas", "Cobranza", "Compras", "Bancos", "Flujo de caja", "Rendiciones"]),
  area("Documentos", ["Explorador", "Firmas"]),
  area("General", ["Inicio", "Bandeja", "Configuración"]),
];
