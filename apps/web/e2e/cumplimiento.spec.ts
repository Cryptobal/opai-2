import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Datos personales (Ley 21.719, Brief 07d bloques 7-UI y 8, CAR-39) a 375, 1024 y 1280: las cuatro
// pestañas con capturas, y en iPad los flujos de escritura (solo personas): aceptar el DPA, designar
// el DPO, registrar y revocar un consentimiento, crear y resolver una solicitud de acceso con su
// exportación, y registrar un incidente con sus dos avisos de brecha.

// La versión del DPA es un ajuste de PLATAFORMA (lo publica OPAI): se siembra con el rol propietario
// solo contra una base local o efímera, nunca contra Neon.
const basePropietario = process.env["DATABASE_URL_MIGRATE"] ?? "";
const baseLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(basePropietario);

const PESTANAS = [
  ["", "Resumen"],
  ["/solicitudes", "Solicitudes"],
  ["/incidentes", "Incidentes"],
  ["/retencion", "Retención"],
] as const;

function publicarDpa(version: string) {
  const sql = `INSERT INTO core.ajustes_plataforma (id, modulo, clave, valor, updated_at) VALUES
    (gen_random_uuid(), 'core', 'cumplimiento_dpa_version', to_jsonb('${version}'::text), now()),
    (gen_random_uuid(), 'core', 'cumplimiento_dpa_texto', to_jsonb('Acuerdo de tratamiento de datos de prueba ${version}.'::text), now())
    ON CONFLICT (modulo, clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();`;
  execFileSync("psql", [basePropietario, "-q", "-X", "-c", sql], { stdio: "pipe" });
}

/** Abre la primera persona de la lista y su pestaña Privacidad. */
async function abrirPrivacidadPersona(page: Page): Promise<void> {
  await page.goto("/personas");
  const lista = page.getByRole("region", { name: "Lista de personas" });
  await lista.locator('a[href^="/personas/"]:not([href*="vencimientos"])').first().click();
  await page.waitForURL(/\/personas\/[0-9a-f-]{36}/);
  const id = new URL(page.url()).pathname.split("/")[2];
  await page.goto(`/personas/${id}/privacidad`);
  await expect(page.getByRole("heading", { name: "Consentimientos" })).toBeVisible();
}

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("datos personales (Ley 21.719)", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("cada pestaña carga con su título y sin errores", async ({ page }, info) => {
    await entrar(page);
    for (const [ruta, pestana] of PESTANAS) {
      await page.goto(`/configuracion/cumplimiento${ruta}`);
      await expect(page.getByRole("heading", { name: "Datos personales" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: pestana, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      await page.screenshot({
        path: `e2e/__screenshots__/cumplimiento${ruta.replace("/", "-") || "-resumen"}-${info.project.name}.png`,
        fullPage: true,
      });
    }
    await expect(page.getByText("La política de retención está apagada")).toBeVisible();
  });

  test("DPA y DPO: el owner acepta la versión vigente y designa al DPO", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    test.skip(!baseLocal, "Publicar el DPA exige el rol propietario de una base local o efímera");
    const version = `e2e-${randomUUID().slice(0, 8)}`;
    publicarDpa(version);
    await entrar(page);
    await page.goto("/configuracion/cumplimiento");
    await expect(page.getByText(`Falta aceptar la versión ${version}`)).toBeVisible();
    await page.getByRole("link", { name: "Revisar y aceptar" }).click();
    const dialogo = page.getByRole("dialog", { name: new RegExp(`versión ${version}`) });
    await expect(dialogo.getByText(`Acuerdo de tratamiento de datos de prueba ${version}.`)).toBeVisible();
    await expect(dialogo.getByText(/Huella SHA-256/)).toBeVisible();
    const aceptar = dialogo.getByRole("button", { name: "Aceptar el DPA" });
    await expect(aceptar).toBeDisabled();
    await dialogo.getByRole("checkbox").click();
    await aceptar.click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByText("Aceptada", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: /Designar|Editar/ }).click();
    const hoja = page.getByRole("dialog", { name: "Delegado de protección de datos" });
    await hoja.getByLabel("Nombre").fill("Delegada de prueba");
    await hoja.getByLabel("Correo").fill("dpo-e2e@opai.cl");
    await hoja.getByRole("button", { name: "Guardar" }).click();
    await expect(hoja).toBeHidden();
    await expect(page.getByText("Delegada de prueba")).toBeVisible();
  });

  test("consentimiento y solicitud de acceso desde la ficha, resuelta en la bandeja", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    await abrirPrivacidadPersona(page);

    await page.getByRole("link", { name: "Registrar", exact: true }).click();
    const con = page.getByRole("dialog", { name: "Registrar consentimiento" });
    await con.getByLabel("Versión del aviso de privacidad").fill("2026-11");
    await con.getByRole("button", { name: "Registrar" }).click();
    await expect(con).toBeHidden();
    await expect(page.getByText("Otorgado", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Revocar" }).click();
    const revocar = page.getByRole("dialog", { name: /Revocar/ });
    await revocar.getByLabel("Motivo").fill("El titular lo pidió por correo");
    await revocar.getByRole("button", { name: "Revocar" }).click();
    await expect(page.getByText("Revocado", { exact: true }).first()).toBeVisible();

    await page.getByRole("link", { name: "Registrar solicitud" }).click();
    const sol = page.getByRole("dialog", { name: "Nueva solicitud del titular" });
    await sol.getByRole("button", { name: "Registrar" }).click();
    await expect(sol).toBeHidden();

    // La bandeja ordena por recepción (más reciente primero): la recién registrada va arriba.
    await page.goto("/configuracion/cumplimiento/solicitudes?estado=recibida&tipo=acceso");
    await page.getByRole("link", { name: /Acceso · recibida/ }).first().click();
    await expect(page.getByRole("heading", { name: /^Acceso · / })).toBeVisible();
    await page.getByRole("button", { name: "Tomar en proceso" }).click();
    await expect(page.getByText("En proceso").first()).toBeVisible();
    await page.getByRole("button", { name: "Generar exportación" }).click();
    // Sin R2 (CI y local) la exportación avisa que no hay almacenamiento; con R2, deja la evidencia.
    await expect(
      page.getByText(/El almacenamiento no está configurado|Descargar evidencia/).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Resolver" }).click();
    const resolver = page.getByRole("dialog", { name: "Resolver la solicitud" });
    await resolver.getByLabel("Resultado").fill("Se entregó al titular la copia de sus datos.");
    await resolver.getByRole("button", { name: "Resolver" }).click();
    await expect(resolver).toBeHidden();
    await expect(page.getByText("Resuelta").first()).toBeVisible();
  });

  test("incidente: registro y avisos a la Agencia y a los titulares", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    const descripcion = `Correo enviado a destinatario equivocado ${randomUUID().slice(0, 6)}`;
    await entrar(page);
    await page.goto("/configuracion/cumplimiento/incidentes?nuevo=1");
    const hoja = page.getByRole("dialog", { name: "Registrar incidente" });
    await hoja.getByLabel("Qué pasó").fill(descripcion);
    await hoja.getByLabel("Datos afectados").fill("contacto");
    await hoja.getByRole("button", { name: "Registrar" }).click();
    await expect(hoja).toBeHidden();
    await page.getByRole("link", { name: new RegExp(descripcion) }).click();
    for (const destinatario of ["Agencia de Protección de Datos", "Titulares afectados"]) {
      await page.getByRole("button", { name: "Registrar aviso de brecha" }).click();
      const aviso = page.getByRole("dialog", { name: "Registrar aviso de brecha" });
      await aviso.getByLabel("Aviso a").click();
      await page.getByRole("option", { name: destinatario }).click();
      await aviso.getByLabel("Canal").fill("correo");
      await aviso.getByRole("button", { name: "Registrar aviso" }).click();
      await expect(aviso).toBeHidden();
    }
    await expect(page.getByText("Notificado").first()).toBeVisible();
  });
});
