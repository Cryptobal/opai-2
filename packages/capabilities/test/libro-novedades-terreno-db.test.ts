// CAR-77 parte 3: novedades del libro desde el equipo de terreno (`terreno.novedad`), sin depender de Rondas, y la
// lectura del libro por el equipo emparejado. Postgres real con dos empresas; solo datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res = { clave: string; estado: string; motivo: string | null };
type Pagina = { items: { id: string; codigo: string; modulo: string; instalacionId: string }[] };

describe.skipIf(!urlPropietario)(
  "libro de novedades desde el equipo de terreno (CAR-77 parte 3)",
  () => {
    let e: Entorno;
    let mod: typeof ModuloCapacidades;
    const t = { A: "", B: "" };
    const inst = { A: "", B: "" };
    const disp = { A: "", B: "" };

    const ctx = (k: "A" | "B") =>
      mod.crearContexto({
        tenantId: t[k],
        actor: { tipo: "system" },
        rol: "owner",
        alcance: null,
        medidor: { registrar: async () => undefined },
        modulosActivos: [],
      });
    const recibir = async (k: "A" | "B", hechos: unknown[]) => {
      const r = await mod.executeCapability(ctx(k), "core.hechos_terreno.recibir", {
        dispositivoId: disp[k],
        horaEnvio: new Date().toISOString(),
        hechos,
      });
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return (r.data as { resultados: Res[] }).resultados;
    };
    const leer = (k: "A" | "B", dispositivoId: string) =>
      mod.executeCapability(ctx(k), "core.libro_novedades_equipo.listar", { dispositivoId });
    const novedad = (p: object = {}) => ({
      clave: randomUUID(),
      tipo: "terreno.novedad",
      payload: { resumen: "Luz quemada en el acceso", ...p },
      horaHecho: new Date(Date.now() - 30_000).toISOString(),
    });

    beforeAll(async () => {
      e = await prepararEntorno();
      mod = await import("../src");
      mod.limpiarRegistro();
      mod.registrarCapacidades(mod.capacidadesDelNucleo);
      const s = randomUUID().slice(0, 8);
      for (const k of ["A", "B"] as const) {
        t[k] = (
          await e.admin.tenant.create({
            data: { slug: `qa-lt-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
          })
        ).id;
        const cuentaId = (
          await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `Cliente ${k}` } })
        ).id;
        inst[k] = (
          await e.admin.instalacion.create({
            data: { tenantId: t[k], cuentaId, nombre: `Planta ${k}` },
          })
        ).id;
        disp[k] = (
          await e.admin.dispositivo.create({
            data: {
              tenantId: t[k],
              instalacionId: inst[k],
              identificador: "DSP-1",
              estado: "activo",
              tokenHash: `lt-${s}-${k}`,
            },
          })
        ).id;
      }
    }, 120_000);
    afterAll(async () => {
      await e?.cerrar?.();
    });

    it("guarda la novedad sin Rondas activo, con el equipo y una sola vez aunque se reenvíe", async () => {
      const n = novedad({ gravedad: "alta" });
      expect((await recibir("A", [n]))[0]?.estado).toBe("recibido");
      await recibir("A", [n]);
      const filas = await e.admin.libroNovedad.findMany({
        where: { tenantId: t.A, idempotencyKey: n.clave },
      });
      expect(filas).toHaveLength(1);
      expect(filas[0]).toMatchObject({
        modulo: "terreno",
        gravedad: "alta",
        dispositivoId: disp.A,
        numero: 1,
      });
      const ev = await e.admin.evento.count({
        where: {
          tenantId: t.A,
          tipo: "core.libro_novedades.registrada",
          entidadId: filas[0]?.id ?? "",
        },
      });
      expect(ev).toBe(1);
    });

    it("el equipo lee el libro de su instalación y no el de otra empresa", async () => {
      await recibir("B", [novedad()]);
      const a = await leer("A", disp.A);
      if (!a.ok) throw new Error(JSON.stringify(a.error));
      expect((a.data as Pagina).items.map((x) => x.instalacionId)).toEqual([inst.A]);
      expect((a.data as Pagina).items[0]?.codigo).toBe("NOV-0001");
      const ajeno = await leer("A", disp.B);
      expect(ajeno.ok ? null : ajeno.error.code).toBe("NOT_FOUND");
    });

    it("un equipo revocado ya no lee el libro", async () => {
      await e.admin.dispositivo.update({ where: { id: disp.B }, data: { estado: "revocado" } });
      const r = await leer("B", disp.B);
      expect(r.ok ? null : r.error.code).toBe("UNPROCESSABLE");
    });
  },
);
