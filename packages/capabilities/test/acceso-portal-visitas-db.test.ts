// CAR-539: el contacto de un cliente prerregistra visitas en SUS instalaciones desde el Portal Cliente, contra
// Postgres real con dos empresas. Otra cuenta, otra empresa o una instalación no habilitada no se ven ni se escriben.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { diaEnZona } from "@opai/domain";

import { urlPropietario } from "../../db/test/entorno";

import { entornoPortalAccesos } from "./acceso-portal-cliente-entorno";

type Prerregistro = {
  id: string;
  instalacionId: string;
  visitantes: { id: string; documento: string }[];
};
type Pagina = { items: Prerregistro[]; siguiente: string | null };

const hoy = diaEnZona(new Date(), "America/Santiago");
const visita = (instalacionId: string, nombre = "Visita portal") => ({
  instalacionId,
  visitantes: [{ nombre, documento: { tipo: "run", numero: "11.111.111-1" } }],
  desde: hoy,
  anfitrion: "Anfitrión de prueba",
});

describe.skipIf(!urlPropietario)(
  "Prerregistro desde el Portal Cliente, base real (CAR-539)",
  () => {
    let x: Awaited<ReturnType<typeof entornoPortalAccesos>>;
    let propio: Prerregistro;
    let deEmpresa: Prerregistro;
    const code = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? "ok" : r.error?.code);

    beforeAll(async () => {
      x = await entornoPortalAccesos();
      propio = await x.ok<Prerregistro>(
        x.contacto("X"),
        "acceso.portal_visitas.crear",
        visita(x.inst.X1),
      );
      deEmpresa = await x.ok<Prerregistro>(
        x.sistema(x.t.A),
        "acceso.prerregistros.crear",
        visita(x.inst.X1, "De la empresa"),
      );
    });

    afterAll(async () => {
      await x?.e.cerrar();
    });

    it("crea en su instalación: documento enmascarado, creador el contacto y sin el número en la auditoría", async () => {
      expect(propio.visitantes[0]?.documento).not.toContain("111.111");
      const fila = await x.e.admin.prerregistro.findUniqueOrThrow({ where: { id: propio.id } });
      expect(fila.creadoPor).toBe(x.usuarios.X);
      const a = await x.e.admin.auditEvent.findMany({
        where: { capability: "acceso.portal_visitas.crear", actorId: x.usuarios.X },
      });
      expect(a.length).toBe(1);
      expect(JSON.stringify(a)).not.toContain("11.111.111");
    });

    it("otra instalación de su cuenta, de otra cuenta o de otra empresa: NOT_FOUND sin escribir", async () => {
      const antes = await x.e.admin.prerregistro.count();
      for (const i of [x.inst.X2, x.inst.Y, x.inst.B]) {
        expect(code(await x.run(x.contacto("X"), "acceso.portal_visitas.crear", visita(i)))).toBe(
          "NOT_FOUND",
        );
      }
      expect(await x.e.admin.prerregistro.count()).toBe(antes);
    });

    it("lista solo las visitas de sus instalaciones; otra cuenta y otra empresa no las ven", async () => {
      const l = await x.ok<Pagina>(x.contacto("X"), "acceso.portal_visitas.listar", {});
      expect(l.items.map((p) => p.id).sort()).toEqual([propio.id, deEmpresa.id].sort());
      expect(
        (await x.ok<Pagina>(x.contacto("Y"), "acceso.portal_visitas.listar", {})).items,
      ).toEqual([]);
      expect(
        (await x.ok<Pagina>(x.contacto("B"), "acceso.portal_visitas.listar", {})).items,
      ).toEqual([]);
    });

    it("el contacto no usa las capacidades del ERP: invitación y cancelación FORBIDDEN", async () => {
      const inv = { visitanteId: propio.visitantes[0]?.id ?? "", dia: hoy };
      expect(code(await x.run(x.contacto("X"), "acceso.prerregistros.invitacion", inv))).toBe(
        "FORBIDDEN",
      );
      const cancelar = await x.run(x.contacto("X"), "acceso.prerregistros.cancelar", {
        id: propio.id,
      });
      expect(code(cancelar)).toBe("FORBIDDEN");
    });

    it("sin la sección Accesos en su portal, FORBIDDEN", async () => {
      await x.e.admin.configPortalCuenta.update({
        where: { tenantId_cuentaId: { tenantId: x.t.A, cuentaId: x.cuentas.Y } },
        data: { seccionesVisibles: ["cobertura"] },
      });
      const r = await x.run(x.contacto("Y"), "acceso.portal_visitas.crear", visita(x.inst.Y));
      expect(code(r)).toBe("FORBIDDEN");
    });
  },
);
