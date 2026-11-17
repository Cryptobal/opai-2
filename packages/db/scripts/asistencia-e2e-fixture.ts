// IDs fijos del fixture de Asistencia en e2e (CAR-599). Comparte instalación y personas de `seed-pauta-e2e`.
import { PAUTA_E2E } from "./seed-pauta-e2e";

export const ASISTENCIA_E2E = {
  ...PAUTA_E2E,
  dispositivo: "00000000-0000-7000-8000-0000000b00c1",
  serie: "00000000-0000-7000-8000-0000000b00c2",
  patron: "00000000-0000-7000-8000-0000000b00c3",
  /** Token plano del kiosco; en la base solo vive el HMAC (`BETTER_AUTH_SECRET` del runner de CI). */
  tokenDispositivo: "e2e-asistencia-dispositivo-token-ficticio-seguro-abc123",
  pin: "482915",
  trabajadorEmail: "asistencia-circuito-trabajador@opai.cl",
  supervisorEmail: "supervisor-asistencia-hoy@opai.cl",
} as const;