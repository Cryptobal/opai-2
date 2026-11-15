import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { captura, erroresDeConsola } from "./hilo-apoyo";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-366: Configuración › Comunicaciones con la empresa ficticia `qa-e2e`. En el teléfono la tabla
// se apila (nombre e interruptor arriba; canales y destinatarios abajo) y los avisos que siempre se
// envían muestran sus canales como íconos, no como botones deshabilitados.
test.describe("@preview configuración: comunicaciones", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la lista se lee en el teléfono y los transaccionales no ofrecen botones", async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    const errores = erroresDeConsola(page);
    await entrar(page);
    await page.goto("/configuracion/comunicaciones");
    const sw = page.getByRole("switch", { name: "Activar Documento vencido" });
    await hidratado(sw);
    await expect(sw).toBeVisible();
    const telefono = (page.viewportSize()?.width ?? 0) < 768;
    await expect(page.getByRole("columnheader", { name: "Evento" })).toBeVisible({
      visible: !telefono,
    });
    // Ningún canal se ofrece como botón deshabilitado: o se puede cambiar o es un ícono.
    await expect(
      page.getByRole("button", { name: /^(Correo|In-app): activo$/, disabled: true }),
    ).toHaveCount(0);
    if (telefono) {
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(ancho).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
    }
    await captura(page, "comunicaciones-lista", info);
    expect(errores).toEqual([]);
  });
});
