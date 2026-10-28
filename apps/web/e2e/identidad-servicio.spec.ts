import { expect, test } from "@playwright/test";

import { entrar } from "./sesion";

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme });
    test("crea servicio con permisos mínimos, presupuesto y sin rol heredado", async ({
      page,
      request,
    }, info) => {
      await entrar(page);
      await page.goto("/configuracion/agentes?crear=1");
      const hoja = page.getByRole("dialog", { name: "Crear key" });
      const nombre = `Servicio E2E ${info.project.name} ${Date.now()}`;
      // Los switches y checkbox del DS pliegan su descripción visible en el nombre accesible del
      // control (la etiqueta envuelve ambos textos): por eso estos locators no van con `exact: true`.
      await hoja.getByLabel("Agente de servicio").click();
      await hoja.getByLabel("Nombre", { exact: true }).fill(nombre);
      await expect(hoja.getByRole("button", { name: "Crear", exact: true })).toBeDisabled();
      const presupuesto = hoja.getByLabel("Presupuesto mensual (US$)");
      await presupuesto.fill("1.2.3");
      await expect(
        hoja.getByText("Ingresa un monto mayor que cero, por ejemplo 15 o 10,5."),
      ).toBeVisible();
      await expect(hoja.getByRole("button", { name: "Crear", exact: true })).toBeDisabled();
      await presupuesto.fill("1.000");
      await expect(
        hoja.getByText("Ingresa un monto mayor que cero, por ejemplo 15 o 10,5."),
      ).toBeHidden();
      await presupuesto.fill("10,5");
      await hoja.getByRole("checkbox", { name: "cuentas · ver" }).check();
      await hoja.getByLabel("Todos los módulos").click();
      await expect(hoja.getByText(/incluidos los que se agreguen después/)).toBeVisible();
      await hoja.getByLabel("Todos los módulos").click();
      await hoja.getByRole("button", { name: "Crear", exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath("servicio-formulario.png"), fullPage: true });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await hoja.getByRole("button", { name: "Crear", exact: true }).click();
      const creada = page.getByRole("dialog", { name: `Key creada: ${nombre}` });
      const secreto = (await creada.getByText(/^opai_/).textContent())?.trim();
      if (!secreto || !/^opai_/.test(secreto))
        throw new Error("No se recibió el secreto de creación.");
      // Sin capturas del secreto, ni impresión de cabeceras o cuerpos de las solicitudes.
      const headers = { Authorization: `Bearer ${secreto}` };
      const me = await request.get("/api/v1/core/me", { headers });
      const identidad = await me.json();
      expect(identidad).toMatchObject({
        ok: true,
        data: {
          rol: null,
          principal: { tipo: "servicio" },
          permisos: ["core:cuentas.read"],
          agente: { presupuestoMensualUsd: 10.5 },
        },
      });
      expect((await request.get("/api/v1/core/users/list", { headers })).status()).toBe(403);
      await creada.getByRole("button", { name: "Ya lo copié" }).click();
      await expect(page.getByRole("link", { name: new RegExp(nombre) })).toBeVisible();
      await page.screenshot({ path: info.outputPath("servicio-creado.png"), fullPage: true });
    });
  });
}
