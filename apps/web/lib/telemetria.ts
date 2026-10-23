import { after } from "next/server";

import { telemetriaEnDb, type Telemetria } from "@opai/capabilities";

/** Telemetría fuera del request (`after()`), para no retrasar respuestas. */
export const telemetriaDiferida: Telemetria = {
  async registrar(evento) {
    after(() => telemetriaEnDb.registrar(evento).catch(() => undefined));
  },
};
