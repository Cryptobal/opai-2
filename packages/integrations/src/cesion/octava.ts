// Adaptador de cesión Octava + RPETC (CAR-140, CAR-154). Contrato alineado a OPAI 1.0 (api/v1, Basic).

export type EstadoCesionRpetc =
  | "simulada"
  | "enviada"
  | "aprobada"
  | "financiada"
  | "cobrada"
  | "cerrada"
  | "anulada";

export type PayloadCesion = {
  documentoId: string;
  folio: number;
  rutEmisor: string;
  rutDeudor: string;
  montoTotal: number;
  xmlBase64: string;
  factorRut: string;
  tasaBps: number;
};

export type ResultadoEnvioCesion = {
  operacionExternaId: string;
  estado: EstadoCesionRpetc;
};

export type ResultadoConsultaCesion = {
  estado: EstadoCesionRpetc;
  glosa?: string;
};

export interface AdaptadorCesion {
  readonly nombre: string;
  readonly disponible: boolean;
  enviar(payload: PayloadCesion): Promise<ResultadoEnvioCesion>;
  consultar(operacionExternaId: string): Promise<ResultadoConsultaCesion>;
}

export type CredencialesOctava = { usuario: string; clave: string };

const OCTAVA_BASE = "https://api.octava.cl/api/v1";

function authBasic(usuario: string, clave: string): string {
  return `Basic ${Buffer.from(`${usuario}:${clave}`, "utf8").toString("base64")}`;
}

export function adaptadorCesionSimulado(): AdaptadorCesion {
  return {
    nombre: "simulado",
    disponible: true,
    async enviar(payload: PayloadCesion): Promise<ResultadoEnvioCesion> {
      return {
        operacionExternaId: `SIM-CES-${payload.folio}`,
        estado: "enviada",
      };
    },
    async consultar(id: string): Promise<ResultadoConsultaCesion> {
      if (id.includes("RECHAZO")) return { estado: "anulada", glosa: "Rechazo simulado" };
      return { estado: "aprobada" };
    },
  };
}

/** Rutas v1 asumidas desde paridad 1.0; confirmar con certificación Octava antes de producción. */
export function adaptadorOctava(creds: CredencialesOctava | null): AdaptadorCesion {
  const sim = adaptadorCesionSimulado();
  const disponible = Boolean(creds?.usuario && creds.clave);
  return {
    nombre: "octava",
    disponible,
    async enviar(payload) {
      if (!disponible || !creds) throw new Error("Octava no configurado.");
      const auth = authBasic(creds.usuario, creds.clave);
      const res = await fetch(`${OCTAVA_BASE}/cesion/enviar`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Octava enviar: HTTP ${res.status}`);
      const data = (await res.json()) as { id?: string; operacionId?: string; estado?: EstadoCesionRpetc };
      const id = data.id ?? data.operacionId;
      if (!id) throw new Error("Octava enviar: sin id.");
      return { operacionExternaId: id, estado: data.estado ?? "enviada" };
    },
    async consultar(operacionExternaId) {
      if (!disponible || !creds) return sim.consultar(operacionExternaId);
      const auth = authBasic(creds.usuario, creds.clave);
      const res = await fetch(`${OCTAVA_BASE}/cesion/estado/${encodeURIComponent(operacionExternaId)}`, {
        headers: { Authorization: auth },
      });
      if (!res.ok) throw new Error(`Octava consultar: HTTP ${res.status}`);
      const data = (await res.json()) as { estado?: EstadoCesionRpetc; glosa?: string };
      return { estado: data.estado ?? "enviada", ...(data.glosa ? { glosa: data.glosa } : {}) };
    },
  };
}
