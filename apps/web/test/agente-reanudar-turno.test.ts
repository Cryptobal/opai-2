import { describe, expect, it } from "vitest";

import {
  decidirReanudar,
  historialIncluyeTurno,
  type PendienteTurno,
} from "../app/_components/agente/reanudar-turno";

const pendiente = (reintentosEnvio = 0): PendienteTurno => ({
  turnoId: "0192f3a0-0000-7000-8000-000000000099",
  mensajeId: "m1",
  texto: "hola",
  reintentosEnvio,
});

describe("reanudar turno del agente (CAR-524)", () => {
  it("aplica el resultado idempotente sin una corrida nueva", () => {
    const d = decidirReanudar(
      { ok: true, data: { texto: "listo", conversacionId: "c1" } },
      pendiente(),
      false,
    );
    expect(d).toEqual({ accion: "aplicar", data: { texto: "listo", conversacionId: "c1" } });
  });

  it("espera si la idempotencia sigue en curso", () => {
    expect(
      decidirReanudar(
        { ok: false, error: { code: "CONFLICT", message: "sigue en curso" } },
        pendiente(),
        false,
      ),
    ).toEqual({ accion: "esperar" });
  });

  it("reintenta el envío una sola vez si no llegó", () => {
    expect(
      decidirReanudar(
        { ok: false, error: { code: "NETWORK", message: "sin red" } },
        pendiente(0),
        false,
      ),
    ).toEqual({ accion: "reintentar_envio" });
    expect(
      decidirReanudar(
        { ok: false, error: { code: "NETWORK", message: "sin red" } },
        pendiente(1),
        false,
      ),
    ).toEqual({ accion: "fallar" });
  });

  it("usa el historial guardado si el turno ya está persistido", () => {
    const turnoId = pendiente().turnoId;
    expect(historialIncluyeTurno([{ turno: turnoId }], turnoId)).toBe(true);
    expect(
      decidirReanudar(
        { ok: false, error: { code: "CONFLICT", message: "en curso" } },
        pendiente(),
        true,
      ),
    ).toEqual({ accion: "usar_historial" });
  });
});
