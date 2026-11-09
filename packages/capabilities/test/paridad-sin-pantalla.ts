/**
 * Capacidades `soloPersonas` que todavía no tienen camino humano en `apps/web` (gate I-13 de la
 * auditoría del Núcleo, CAR-52). Por MCP y API key están bloqueadas por diseño, así que sin pantalla
 * nadie las puede ejecutar en el producto: cada una lleva el encargo que la construye y desde cuándo
 * espera. `paridad-camino-humano.test.ts` exige que toda `soloPersonas` tenga pantalla o esté aquí, y
 * que esta lista no guarde entradas obsoletas (al construir la pantalla, se borra la fila).
 */
export type SinPantalla = { encargo: string; desde: string; motivo: string };

export const SOLO_PERSONAS_SIN_PANTALLA: Readonly<Record<string, SinPantalla>> = {
  "finanzas.apertura.importar": {
    encargo: "CAR-168",
    desde: "2026-11-04",
    motivo: "Carga de apertura desde 1.0: se opera una vez por empresa; su pantalla (Finanzas › Apertura) y el CLI llegan cuando el exportador 1.0 entregue documentos y saldos.",
  },
  "finanzas.apertura.revertir": {
    encargo: "CAR-168",
    desde: "2026-11-04",
    motivo: "Reversión de la carga de apertura; va en la misma pantalla de Finanzas › Apertura.",
  },
  "core.firmas.firmante_empresa_set": {
    encargo: "CAR-82",
    desde: "2026-10-29",
    motivo:
      "Registrar al firmante de la empresa: su pantalla (Configuración → Documentos → Firma) va en el PR 2 de firma; en el PR 1 entra la capa de datos y gobernanza.",
  },
  "core.firmas.firma_automatica_autorizar": {
    encargo: "CAR-82",
    desde: "2026-10-29",
    motivo:
      "Autorizar la firma automática del representante (R16, P5): su pantalla de configuración va en el PR 2 de firma; aquí entra la capacidad de gobernanza.",
  },
  "core.firmas.firma_automatica_revocar": {
    encargo: "CAR-82",
    desde: "2026-10-29",
    motivo:
      "Revocar la firma automática del representante (R16): su pantalla de configuración va en el PR 2 de firma; aquí entra la capacidad de gobernanza.",
  },
  "core.users.restablecer_mfa": {
    encargo: "CAR-54",
    desde: "2026-10-29",
    motivo:
      "Restablecer el MFA de un usuario desde su ficha (owner): las pantallas de MFA no tienen diseño aprobado en Claude Design (export-acceso/README.md).",
  },
  "platform.usuarios.restablecer_mfa": {
    encargo: "CAR-54",
    desde: "2026-10-29",
    motivo:
      "Restablecer el MFA desde Plataforma: los usuarios de plataforma aún no tienen pantalla y las de MFA no tienen diseño aprobado.",
  },
  "platform.usuarios.borrar": {
    encargo: "CAR-45",
    desde: "2026-10-29",
    motivo:
      "Borrar la cuenta de un usuario sin empresas desde Plataforma: los usuarios de plataforma aún no tienen pantalla con diseño aprobado.",
  },
  "core.remuneraciones.confirmar": {
    encargo: "CAR-142",
    desde: "2026-11-02",
    motivo:
      "Confirmar un valor propuesto o retenido en Configuración › Remuneraciones: la acción por fila entra con el diseño aprobado del brief 07e M2.",
  },
  "asistencia.contingencias.responder": {
    encargo: "CAR-89",
    desde: "2026-11-10",
    motivo:
      "Aceptar u objetar una contingencia desde el Portal Trabajador: la pantalla entra con el diseño aprobado del portal. Mientras tanto responde por la capacidad (solo personas).",
  },
  "asistencia.correcciones.responder": {
    encargo: "CAR-89",
    desde: "2026-11-10",
    motivo:
      "Aceptar u objetar una corrección desde el Portal Trabajador: la pantalla entra con el diseño aprobado del portal (A3). Mientras tanto responde por el enlace del correo personal (página pública, capacidad interna).",
  },
  "core.biometria.enrolar": {
    encargo: "CAR-78",
    desde: "2026-11-10",
    motivo:
      "El enrolamiento del rostro necesita la cámara y la pantalla de Face ID de Asistencia (frente «Face ID»); B4 deja el adaptador, la base y la capacidad. Mientras tanto no hay quién enrole: nadie queda con reconocimiento facial y se marca con RUT y PIN.",
  },
  "core.biometria.verificar": {
    encargo: "CAR-78",
    desde: "2026-11-10",
    motivo:
      "La verificación con prueba de vida se invoca desde la marcación de Asistencia (frente «Face ID»), que aporta la cámara; B4 deja el adaptador y la capacidad.",
  },
};
