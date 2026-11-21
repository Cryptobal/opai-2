// «Ver como» (CAR-528): owner y administradores ven un portal como otra persona de la empresa, en
// solo lectura y auditado. Lógica pura compartida por la capacidad y el borde.

export const PORTALES_VER_COMO = ["terreno", "trabajador", "cliente", "supervisor"] as const;
export type PortalVerComo = (typeof PORTALES_VER_COMO)[number];

/** Caducidad de una vista: pasado este plazo hay que volver a iniciarla (y queda otro inicio auditado). */
export const VER_COMO_MINUTOS = 30;
