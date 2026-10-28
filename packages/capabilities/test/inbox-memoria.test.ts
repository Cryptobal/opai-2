import { expect, it } from "vitest";

import { lecturasLocksMemoria } from "../src/testing/lecturas-locks-memoria";

it("el inbox en memoria ordena por timestamp e id descendentes, igual que SQL", async () => {
  const filas = [
    { id: "a", createdAt: new Date("2026-01-01T00:00:00Z") },
    { id: "b", createdAt: new Date("2026-01-02T00:00:00Z") },
    { id: "c", createdAt: new Date("2026-01-02T00:00:00Z") },
  ].map((n) => ({ ...n, tenantId: "tenant", usuarioId: "usuario", titulo: "Aviso" }));
  const consultar = lecturasLocksMemoria(() => filas);
  const sql = Object.assign(["/* nucleo-h:inbox */"], { raw: ["/* nucleo-h:inbox */"] });
  const [r] = await consultar(sql, "tenant", "usuario", null, "tenant", "usuario", null, "tenant", "usuario", false, null, "tenant", "usuario", null, 2);
  expect(r).toMatchObject({ noLeidas: 3, items: [{ id: "c" }, { id: "b" }] });
  const subsegundos = lecturasLocksMemoria(() => [
    {
      id: "b",
      tenantId: "tenant",
      usuarioId: "usuario",
      createdAt: new Date("2026-01-02T00:00:00.100Z"),
    },
    {
      id: "a",
      tenantId: "tenant",
      usuarioId: "usuario",
      createdAt: new Date("2026-01-02T00:00:00.900Z"),
    },
  ]);
  expect(await subsegundos(sql, "tenant", "usuario", null, "tenant", "usuario", null, "tenant", "usuario", false, null, "tenant", "usuario", null, 2)).toMatchObject([
    { items: [{ id: "a" }, { id: "b" }] },
  ]);
});
