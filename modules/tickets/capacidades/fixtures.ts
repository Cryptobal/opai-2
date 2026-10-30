// Fixtures compartidos entre los tests de capacidades de Tickets.
export const ACTIVOS = ["tickets"];
export const OTRO_USUARIO = "0192f3a0-0000-7000-8000-0000000000b2";
export const TIPO_ID = "0192f3a0-0000-7000-8000-0000000000c1";
export const TIPO_SOLICITUD_ID = "0192f3a0-0000-7000-8000-0000000000c2";
export const TICKET_1 = "0192f3a0-0000-7000-8000-0000000000d1";
export const SOLICITUD_1 = "0192f3a0-0000-7000-8000-0000000000d2";

export function semilla() {
  return {
    tipoTicket: [
      {
        id: TIPO_ID,
        tenantId: "",
        nombre: "Incidencia",
        descripcion: null,
        responsableDefectoTipo: "usuario",
        responsableDefectoRol: null,
        responsableDefectoUsuarioId: OTRO_USUARIO,
        requiereAprobacion: false,
        aprobadorRol: null,
        slaHoras: null,
        rolesPermitidos: [],
        activo: true,
        orden: 0,
      },
      {
        id: TIPO_SOLICITUD_ID,
        tenantId: "",
        nombre: "Vacaciones",
        descripcion: null,
        responsableDefectoTipo: "usuario",
        responsableDefectoRol: null,
        responsableDefectoUsuarioId: OTRO_USUARIO,
        requiereAprobacion: true,
        aprobadorRol: "supervisor",
        slaHoras: null,
        rolesPermitidos: [],
        activo: true,
        orden: 1,
      },
    ],
    membership: [
      {
        id: "0192f3a0-0000-7000-8000-0000000000e1",
        tenantId: "",
        userId: OTRO_USUARIO,
        rol: "supervisor",
        estado: "activa",
      },
    ],
  };
}

export function ticketFila(overrides: Record<string, unknown>) {
  return {
    id: TICKET_1,
    tenantId: "",
    tipoId: TIPO_ID,
    titulo: "x",
    descripcion: "x",
    prioridad: "p3",
    estado: "abierto",
    solicitanteId: OTRO_USUARIO,
    responsableId: OTRO_USUARIO,
    motivoRechazo: null,
    slaVenceEn: null,
    resueltoEn: null,
    cerradoEn: null,
    createdAt: new Date("2026-10-01T10:00:00Z"),
    ...overrides,
  };
}
