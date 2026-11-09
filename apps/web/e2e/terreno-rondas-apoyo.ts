import { expect, type Page } from "@playwright/test";

/**
 * E3e · «Mis rondas» de punta a punta: inicia una ronda, marca sus dos puntos con el código del QR (el servidor
 * confirma cada uno) y la cierra. Devuelve false si Rondas no está activo o la instalación no tiene la ronda de
 * prueba. Con capturas a 375 y 1280 px, en claro y oscuro, con la ronda en curso.
 */
export async function rondaIniciarMarcarYCerrar(
  t: Page,
  codigos: [string, string],
): Promise<boolean> {
  await t.goto("/terreno/rondas");
  const iniciar = t.getByRole("region", { name: "Iniciar ronda" });
  const enCurso = t.getByRole("region", { name: "Ronda en curso" });
  await expect(iniciar.or(enCurso).or(t.getByText("Rondas no está activo"))).toBeVisible({
    timeout: 30_000,
  });
  const fila = iniciar.getByRole("listitem").filter({ hasText: "Ronda E2E" });
  if (!(await fila.isVisible())) return false;

  await fila.getByRole("button", { name: "Iniciar" }).click();
  await expect(enCurso).toBeVisible({ timeout: 15_000 });
  const marcar = async (codigo: string) => {
    await enCurso.getByLabel("Código del punto (QR)").fill(codigo);
    await enCurso.getByRole("button", { name: "Marcar", exact: true }).click();
    await expect(enCurso.getByText("Marca guardada en el teléfono")).toBeVisible();
  };
  const confirmados = async (n: number) =>
    expect(async () => {
      await t.reload();
      await expect(enCurso.getByText(`${n} de 2 puntos confirmados por el servidor`)).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 60_000 });

  await marcar(codigos[0]);
  await confirmados(1);
  await marcar(codigos[1]);
  await confirmados(2);

  // E5a: una novedad de gravedad alta desde la ronda queda en el teléfono y llega al libro de novedades.
  const novedad = enCurso.getByRole("region", { name: "Reportar novedad" });
  await novedad.getByLabel("¿Qué pasó?").fill("Puerta del bodegón forzada (e2e)");
  await novedad.getByRole("button", { name: "Alta" }).click();
  await novedad.getByRole("button", { name: "Enviar novedad" }).click();
  await expect(novedad.getByText("Novedad guardada")).toBeVisible();

  // El formulario de marcado se carga aparte: la captura espera a que esté.
  await expect(enCurso.getByLabel("Código del punto (QR)")).toBeVisible();
  for (const [ancho, alto] of [
    [375, 812],
    [1280, 800],
  ] as const) {
    for (const tema of ["light", "dark"] as const) {
      await t.setViewportSize({ width: ancho, height: alto });
      await t.emulateMedia({ colorScheme: tema });
      // Las transiciones de color duran 150-200 ms: la captura espera a que el tema termine de aplicarse.
      await t.waitForTimeout(400);
      await t.screenshot({
        path: `e2e/__screenshots__/terreno-rondas-${ancho}-${tema}.png`,
        fullPage: true,
      });
    }
  }
  await t.setViewportSize({ width: 375, height: 812 });
  await t.emulateMedia({ colorScheme: "light" });

  await enCurso.getByRole("button", { name: "Cerrar ronda" }).click();
  await expect(t.getByText("Cierre guardado en el teléfono")).toBeVisible();
  await expect(async () => {
    await t.reload();
    await expect(t.getByRole("region", { name: "Iniciar ronda" })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
  return true;
}
