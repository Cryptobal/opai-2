import { expect, it } from "vitest";

import { entidadAuditada } from "../src/execute-util";

const T = "0190f3a2-7b1c-7d2e-8f00-00000000000a";
const C = "0190f3a2-7b1c-7d2e-8f00-00000000000b";

it("un sub-recurso queda en la ficha de la entrada, no en el id que devuelve (CAR-339)", () => {
  expect(entidadAuditada("tickets.tickets.comentar", { id: T }, { id: C })).toEqual({
    entityType: "ticket",
    entityId: T,
  });
});

it("un alta usa el id que devuelve", () => {
  expect(entidadAuditada("comercial.negocios.create", { nombre: "X" }, { id: C })).toEqual({
    entityType: "negocio",
    entityId: C,
  });
});
