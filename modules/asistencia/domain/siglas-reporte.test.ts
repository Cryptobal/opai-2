import { describe, expect, it } from "vitest";

import { SIGLAS, siglaDelDia, type EntradaEstadoDia } from "./siglas";

/** Cada sigla oficial debe poder salir del consolidado de un día (CAR-590). */
describe("siglas oficiales en reportes DT", () => {
  const turno = { hayTurno: true, hayEntrada: false, haySalida: false, sobretiempoS: 0 };
  for (const sigla of Object.keys(SIGLAS) as (keyof typeof SIGLAS)[]) {
    it(sigla, () => {
      const e: EntradaEstadoDia =
        sigla === "J.O."
          ? { ...turno, hayEntrada: true, haySalida: true }
          : sigla === "H.E."
            ? { ...turno, hayEntrada: true, haySalida: true, sobretiempoS: 120 }
            : { ...turno, ausenciaRegistrada: sigla };
      if (sigla === "S.A.") {
        expect(siglaDelDia(turno)).toBe("S.A.");
        return;
      }
      if (sigla === "J.O." || sigla === "H.E.") {
        expect(siglaDelDia(e)).toBe(sigla);
        return;
      }
      expect(siglaDelDia(e)).toBe(sigla);
    });
  }
});