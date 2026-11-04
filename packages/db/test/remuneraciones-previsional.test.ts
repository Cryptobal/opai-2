import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { remuneracionesProponerPrevisional, remuneracionesResolverPropuesta } from "../src/remuneraciones-previsional";
import { enTransaccion } from "../src/transaccion";
import { enTransaccionCapturaSii } from "../src/transaccion-captura-sii";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

const FUENTE = "https://www.previred.com/indicadores-previsionales/";
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", dateStyle: "short" }).format(new Date());
const desde = `${hoy.slice(0, 7)}-01`;

describe.skipIf(!urlPropietario)("captura previsional: propuestas y aprobación (CAR-193)", () => {
  let e: Entorno;
  const tenantId = randomUUID();
  let indicadorId = "";
  let vigenteId = "";
  let vigenteValor = 0;
  let platformId = "";
  let comunId = "";
  const proponer = (valor: unknown, clave: "sis" | "imm" = "sis", fuente = FUENTE) =>
    enTransaccionCapturaSii(tenantId, (tx) =>
      remuneracionesProponerPrevisional(tx, { clave, valor, vigenteDesde: desde, fuente, consultada: hoy }),
    );
  const resolver = (id: string, aprobar: boolean, actorId: string) =>
    enTransaccion(tenantId, (tx) => remuneracionesResolverPropuesta(tx, { id, aprobar, actorId }));

  beforeAll(async () => {
    e = await prepararEntorno();
    await e.admin.tenant.create({
      data: { id: tenantId, slug: `prev-${randomUUID().slice(0, 6)}`, nombre: "Previsional", vertical: "seguridad" },
    });
    const ind = await e.admin.indicadorLegal.findUniqueOrThrow({ where: { clave: "sis" } });
    indicadorId = ind.id;
    const vigente = await e.admin.valorPublicado.findFirstOrThrow({
      where: { indicadorId, estado: "vigente" }, orderBy: { vigenteDesde: "desc" },
    });
    vigenteId = vigente.id;
    vigenteValor = Number(vigente.valorJson);
    platformId = (await e.admin.user.create({ data: { name: "P", email: `p-${randomUUID()}@example.test`, platformRole: "owner" } })).id;
    comunId = (await e.admin.user.create({ data: { name: "C", email: `c-${randomUUID()}@example.test` } })).id;
  });

  afterAll(async () => {
    if (!e) return;
    await e.admin.valorPublicado.deleteMany({ where: { indicadorId, id: { not: vigenteId }, vigenteDesde: { gte: new Date(desde) } } });
    await e.admin.valorPublicado.updateMany({ where: { id: vigenteId }, data: { vigenteHasta: null } });
    await e.admin.user.deleteMany({ where: { id: { in: [platformId, comunId] } } });
    await e.cerrar();
  });

  it("opai_app no puede proponer: solo el rol del cron", async () => {
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesProponerPrevisional(tx, { clave: "sis", valor: vigenteValor, vigenteDesde: desde, fuente: FUENTE, consultada: hoy }),
      ),
    ).rejects.toThrow(/permission denied|42501/i);
  });

  it("rechaza clave, fuente y vigencia inválidas", async () => {
    await expect(proponer(vigenteValor, "sis", "https://example.com/x")).rejects.toThrow(/fuente inválida/);
    await expect(
      enTransaccionCapturaSii(tenantId, (tx) =>
        remuneracionesProponerPrevisional(tx, { clave: "uf" as "sis", valor: 1, vigenteDesde: desde, fuente: FUENTE, consultada: hoy }),
      ),
    ).rejects.toThrow(/clave inválida/);
    await expect(
      enTransaccionCapturaSii(tenantId, (tx) =>
        remuneracionesProponerPrevisional(tx, { clave: "sis", valor: 1, vigenteDesde: "2020-01-01", fuente: FUENTE, consultada: hoy }),
      ),
    ).rejects.toThrow(/fuera de ventana/);
  });

  it("el mismo valor renueva; uno distinto queda propuesto y no cambia el vigente", async () => {
    expect(await proponer(vigenteValor)).toBe("renovado");
    expect(await proponer(vigenteValor + 100)).toBe("propuesto");
    expect(await proponer(vigenteValor + 100)).toBe("propuesto");
    const pend = await e.admin.valorPublicado.findMany({ where: { indicadorId, estado: "propuesto" } });
    expect(pend).toHaveLength(1);
    expect(pend[0]?.verificacion).toBe("por_verificar");
    expect((await e.admin.valorPublicado.findUniqueOrThrow({ where: { id: vigenteId } })).estado).toBe("vigente");
  });

  it("otra lectura distinta reemplaza la propuesta pendiente; volver al vigente la descarta", async () => {
    expect(await proponer(vigenteValor + 200)).toBe("propuesto");
    expect(await e.admin.valorPublicado.count({ where: { indicadorId, estado: "propuesto" } })).toBe(1);
    expect(await proponer(vigenteValor)).toBe("renovado");
    expect(await e.admin.valorPublicado.count({ where: { indicadorId, estado: "propuesto" } })).toBe(0);
  });

  it("solo un usuario de plataforma resuelve; rechazar no toca el vigente", async () => {
    await proponer(vigenteValor + 300);
    const p = await e.admin.valorPublicado.findFirstOrThrow({ where: { indicadorId, estado: "propuesto" } });
    await expect(resolver(p.id, true, comunId)).rejects.toThrow(/no es de plataforma/);
    expect(await resolver(p.id, false, platformId)).toBe("rechazado");
    const r = await e.admin.valorPublicado.findUniqueOrThrow({ where: { id: p.id } });
    expect([r.estado, r.resueltoPorId]).toEqual(["rechazado", platformId]);
    await expect(resolver(p.id, true, platformId)).rejects.toThrow(/no hay propuesta pendiente/);
  });

  it("aprobar deja el nuevo vigente y cierra el anterior el día previo", async () => {
    await proponer(vigenteValor + 400);
    const p = await e.admin.valorPublicado.findFirstOrThrow({ where: { indicadorId, estado: "propuesto" } });
    expect(await resolver(p.id, true, platformId)).toBe("aprobado");
    const nuevo = await e.admin.valorPublicado.findUniqueOrThrow({ where: { id: p.id } });
    expect([nuevo.estado, nuevo.verificacion]).toEqual(["vigente", "verificado"]);
    const anterior = await e.admin.valorPublicado.findUniqueOrThrow({ where: { id: vigenteId } });
    expect(anterior.vigenteHasta?.toISOString().slice(0, 10)).toBe(
      new Date(Date.parse(`${desde}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10),
    );
  });
});
