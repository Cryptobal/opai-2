import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion } from "../src/transaccion";
import { remuneracionesPublicarSii } from "../src/remuneraciones-sii";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

const ZONA = "America/Santiago";

function hoySantiago(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, dateStyle: "short" }).format(ahora);
}

function restarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const t = Date.UTC(y!, m! - 1, d! - dias);
  return new Date(t).toISOString().slice(0, 10);
}

function primerDiaMes(fecha: string): string {
  const [y, m] = fecha.split("-");
  return `${y}-${m}-01`;
}

describe.skipIf(!urlPropietario)("remuneraciones SII publicar (SECURITY DEFINER)", () => {
  let e: Entorno;
  let ufId = "";
  let utmId = "";
  const tenantId = randomUUID();
  const hoy = hoySantiago();
  const ayer = restarDias(hoy, 1);
  const anio = Number(hoy.slice(0, 4));

  beforeAll(async () => {
    e = await prepararEntorno();
    await e.admin.tenant.create({
      data: { id: tenantId, slug: `sii-${randomUUID().slice(0, 6)}`, nombre: "SII test", vertical: "seguridad" },
    });
    ufId = (await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "uf" } })).id;
    utmId = (await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "utm" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("opai_app no inserta directo en valores_publicados", async () => {
    await expect(
      e.appSinTenant.valorPublicado.create({
        data: {
          indicadorId: ufId,
          valorJson: 1,
          vigenteDesde: new Date(hoy),
          estado: "vigente",
          fuente: "https://www.sii.cl/x",
        },
      }),
    ).rejects.toThrow();
  });

  it("publica UF vía función con fuente SII", async () => {
    const id = await enTransaccion(tenantId, (tx) =>
      remuneracionesPublicarSii(tx, {
        clave: "uf",
        valor: 4_125_826,
        vigenteDesde: hoy,
        fuente: `https://www.sii.cl/valores_y_fechas/uf/uf${anio}.htm`,
        consultadaEn: new Date(),
      }),
    );
    const row = await e.admin.valorPublicado.findUniqueOrThrow({ where: { id } });
    expect(Number(row.valorJson)).toBe(4_125_826);
  });

  it("rechaza fuente fuera del SII", async () => {
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "uf",
          valor: 4_125_826,
          vigenteDesde: hoy,
          fuente: "https://example.com/uf",
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow();
  });

  it("rechaza encadenamiento mismo día con otro valor", async () => {
    const fuente = `https://www.sii.cl/valores_y_fechas/uf/uf${anio}.htm`;
    await enTransaccion(tenantId, (tx) =>
      remuneracionesPublicarSii(tx, {
        clave: "uf",
        valor: 4_125_826,
        vigenteDesde: hoy,
        fuente,
        consultadaEn: new Date(),
      }),
    );
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "uf",
          valor: Math.round(4_125_826 * 1.05),
          vigenteDesde: hoy,
          fuente,
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow(/mismo día|variación/i);
  });

  it("rechaza vigente_desde futuro para UTM", async () => {
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "utm",
          valor: 72_440,
          vigenteDesde: "2099-01-01",
          fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2099.htm",
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow(/ventana/i);
  });

  it("rechaza UF futura aunque la sesión adelante CURRENT_DATE (America/Santiago)", async () => {
    const manana = restarDias(hoy, -1);
    await expect(
      enTransaccion(tenantId, async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE 'Etc/GMT-14'`);
        return remuneracionesPublicarSii(tx, {
          clave: "uf",
          valor: 4_125_826,
          vigenteDesde: manana,
          fuente: `https://www.sii.cl/valores_y_fechas/uf/uf${anio}.htm`,
          consultadaEn: new Date(),
        });
      }),
    ).rejects.toThrow(/ventana/i);
  });

  it("rechaza escalera diaria de variación sobre el día calendario anterior", async () => {
    await e.admin.valorPublicado.deleteMany({ where: { indicadorId: ufId } });
    const fuente = `https://www.sii.cl/valores_y_fechas/uf/uf${anio}.htm`;
    const base = 4_000_000;
    await enTransaccion(tenantId, (tx) =>
      remuneracionesPublicarSii(tx, {
        clave: "uf",
        valor: base,
        vigenteDesde: ayer,
        fuente,
        consultadaEn: new Date(),
      }),
    );
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "uf",
          valor: Math.round(base * 1.05),
          vigenteDesde: hoy,
          fuente,
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow(/variación/i);
  });

  it("rechaza UTM con salto mensual fuera del tope diario acotado", async () => {
    const mesActual = primerDiaMes(hoy);
    const mesAnteriorInicio = `${restarDias(mesActual, 1).slice(0, 7)}-01`;
    const fuentePrev = `https://www.sii.cl/valores_y_fechas/utm/utm${mesAnteriorInicio.slice(0, 4)}.htm`;
    const fuenteActual = `https://www.sii.cl/valores_y_fechas/utm/utm${anio}.htm`;
    await e.admin.valorPublicado.deleteMany({ where: { indicadorId: utmId } });
    await e.admin.valorPublicado.create({
      data: {
        indicadorId: utmId,
        valorJson: 70_000,
        vigenteDesde: new Date(mesAnteriorInicio),
        vigenteHasta: new Date(restarDias(mesActual, 1)),
        estado: "vigente",
        fuente: fuentePrev,
        verificacion: "verificado",
      },
    });
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "utm",
          valor: Math.round(70_000 * 1.25),
          vigenteDesde: mesActual,
          fuente: fuenteActual,
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow(/variación/i);
  });

  it("rechaza UF con hueco sin referencia exacta D-1 (tope acumulado por días)", async () => {
    await e.admin.valorPublicado.deleteMany({ where: { indicadorId: ufId } });
    const fuente = `https://www.sii.cl/valores_y_fechas/uf/uf${anio}.htm`;
    const base = 4_125_826;
    const hace3 = restarDias(hoy, 3);
    await e.admin.valorPublicado.create({
      data: {
        indicadorId: ufId,
        valorJson: base,
        vigenteDesde: new Date(`${hace3}T12:00:00.000Z`),
        estado: "vigente",
        fuente,
        verificacion: "verificado",
      },
    });
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "uf",
          valor: 19_999_999,
          vigenteDesde: hoy,
          fuente,
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow(/variación/i);
  });

  it("acepta UF tras hueco si el valor respeta el tope acumulado", async () => {
    await e.admin.valorPublicado.deleteMany({ where: { indicadorId: ufId } });
    const fuente = `https://www.sii.cl/valores_y_fechas/uf/uf${anio}.htm`;
    const base = 4_125_826;
    const hace3 = restarDias(hoy, 3);
    await e.admin.valorPublicado.create({
      data: {
        indicadorId: ufId,
        valorJson: base,
        vigenteDesde: new Date(`${hace3}T12:00:00.000Z`),
        estado: "vigente",
        fuente,
        verificacion: "verificado",
      },
    });
    const tope = Math.round(base * (1 + 3 * 0.005));
    const id = await enTransaccion(tenantId, (tx) =>
      remuneracionesPublicarSii(tx, {
        clave: "uf",
        valor: tope,
        vigenteDesde: hoy,
        fuente,
        consultadaEn: new Date(),
      }),
    );
    expect(id).toBeTruthy();
  });

  it("rechaza UTM del mes sin valor el día 1 del mes anterior (first-mover)", async () => {
    const mesActual = primerDiaMes(hoy);
    const dosMesesAtras = `${restarDias(mesActual, 40).slice(0, 7)}-01`;
    const fuente = `https://www.sii.cl/valores_y_fechas/utm/utm${anio}.htm`;
    await e.admin.valorPublicado.deleteMany({ where: { indicadorId: utmId } });
    await e.admin.valorPublicado.create({
      data: {
        indicadorId: utmId,
        valorJson: 70_000,
        vigenteDesde: new Date(dosMesesAtras),
        estado: "vigente",
        fuente,
        verificacion: "verificado",
      },
    });
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "utm",
          valor: Math.round(70_000 * 1.05),
          vigenteDesde: mesActual,
          fuente,
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow(/referencia mes anterior/i);
  });
});
