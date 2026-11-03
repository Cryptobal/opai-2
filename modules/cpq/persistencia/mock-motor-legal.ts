import { juegoDeValores } from "@opai/domain";
import { publicacionesReferencia } from "../../../packages/domain/src/remuneraciones/referencia.fixture";
import { vi } from "vitest";

import * as proveedor from "./proveedor";
import * as valoresLegales from "./valores-legales";

/** Motor legal completo (publicaciones + mutual) para tests CPQ sin base remuneraciones. */
export function mockMotorLegal() {
  vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
  vi.spyOn(valoresLegales, "mutualAdicionalTenant").mockResolvedValue(2_700);
  vi.spyOn(proveedor, "mutualParaCalculo").mockResolvedValue({ tasa: 2_700, confirmada: true });
  vi.spyOn(proveedor, "juegoParaFecha").mockImplementation(async (_ctx, fecha) => ({
    juego: await juegoDeValores(fecha, publicacionesReferencia()),
  }));
}
