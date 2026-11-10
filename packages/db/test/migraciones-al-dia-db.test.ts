// `prepararEntorno` omite `prisma migrate deploy` solo si la base tiene exactamente las migraciones del repo (CAR-240,
// tiempo del job `test:db`). Ante una migración nueva, una editada o una base inalcanzable, se vuelve a migrar.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, urlPropietario, type Entorno } from "./entorno";
import { migracionesAlDia, migracionesDelRepo } from "./migraciones-al-dia";

describe.skipIf(!urlPropietario)("migraciones al día en la base de tests", () => {
  let e: Entorno;
  beforeAll(async () => {
    e = await prepararEntorno();
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("con todas las migraciones del repo aplicadas se puede omitir migrate deploy", async () => {
    expect(await migracionesAlDia(urlPropietario!)).toBe(true);
  });

  it("una migración nueva o con otro contenido obliga a migrar", async () => {
    const repo = migracionesDelRepo();
    const [primera] = [...repo.keys()];
    expect(await migracionesAlDia(urlPropietario!, new Map([...repo, ["29991231000000_nueva", "0".repeat(64)]]))).toBe(false);
    expect(await migracionesAlDia(urlPropietario!, new Map([...repo, [primera!, "f".repeat(64)]]))).toBe(false);
    expect(await migracionesAlDia(urlPropietario!, new Map())).toBe(false);
  });

  it("una base inalcanzable no se da por migrada", async () => {
    const u = new URL(urlPropietario!);
    u.port = "1";
    expect(await migracionesAlDia(u.toString())).toBe(false);
  });
});
