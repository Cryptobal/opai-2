// CAR-48: pasada por TODAS las capacidades de lectura del núcleo y de comercial con dos empresas
// sembradas desde el catálogo (una fila por tabla con tenant_id en A y en B). Como owner de A, cada
// lectura corre sin filtros y, si su input acepta un id, con cada id de B: ninguna salida trae un id ni
// un texto sembrado en B. «Sin datos de B» se prueba con marcas únicas, no con conteos.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { conectar, limpiarClaves, type Siembra, sembrar } from "../../db/test/dos-empresas/siembra";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { entradasDePrueba, marcasDe } from "./aislamiento-capacidades-entradas";

describe.skipIf(!urlPropietario)(
  "dos empresas: capacidades de lectura sin datos de la otra",
  () => {
    let e: Entorno;
    let mod: typeof ModuloCapacidades;
    let admin: Awaited<ReturnType<typeof conectar>>;
    let s: Siembra;
    const t = { a: "", b: "" };
    const medidor = { registrar: async () => undefined };

    beforeAll(async () => {
      e = await prepararEntorno();
      mod = await import("../src");
      mod.limpiarRegistro();
      mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
      const sufijo = randomUUID().slice(0, 8);
      const nuevo = (slug: string) =>
        e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
      t.a = (await nuevo(`cap-a-${sufijo}`)).id;
      t.b = (await nuevo(`cap-b-${sufijo}`)).id;
      admin = await conectar(urlPropietario as string);
      s = await sembrar(admin, t);
    });

    afterAll(async () => {
      if (admin) await limpiarClaves(admin, [t.a, t.b]);
      await admin?.end();
      await e?.cerrar();
    });

    const ctxA = (portal: string) =>
      mod.crearContexto({
        tenantId: t.a,
        actor: { tipo: "user", id: randomUUID() },
        portal,
        portalesMembresia: ["erp", "supervisor", "cliente", "trabajador", "terreno"],
        rol: "owner",
        modulosActivos: ["comercial"],
        medidor,
      });

    it("ninguna lectura de A devuelve ids ni textos sembrados en B", async () => {
      expect(Object.fromEntries(s.errores)).toEqual({});
      // El id del tenant propio sale en muchas respuestas: no cuenta como dato sembrado de A.
      const deB = marcasDe(s.filas.b);
      const deA = marcasDe(s.filas.a, [t.a]);
      const lecturas = mod
        .listarCapacidades()
        .filter((c) => c.efecto === "lectura" && !c.sinTenant && !c.id.startsWith("platform."));
      expect(lecturas.length).toBeGreaterThan(40);
      const fugas: string[] = [];
      let ejecutadas = 0;
      let conDatosDeA = 0;
      for (const c of lecturas) {
        for (const input of entradasDePrueba(c.input, s.filas.b)) {
          const r = await mod.executeCapability(ctxA(c.portales?.[0] ?? "erp"), c.id, input, {});
          if (!r.ok) continue;
          ejecutadas += 1;
          const salida = JSON.stringify(r.data);
          const vistas = deB.filter((m) => salida.includes(m));
          if (vistas.length)
            fugas.push(`${c.id} ${JSON.stringify(input)}: ${vistas.length} marca(s) de B`);
          if (deA.some((m) => salida.includes(m))) conDatosDeA += 1;
        }
      }
      expect(fugas).toEqual([]);
      // La pasada no es vacía: hubo lecturas exitosas y varias devolvieron datos sembrados en A.
      expect(ejecutadas).toBeGreaterThan(40);
      expect(conDatosDeA).toBeGreaterThan(10);
    }, 600_000);
  },
);
