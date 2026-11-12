import AxeBuilder from "@axe-core/playwright";
import { type Page } from "@playwright/test";

// Mediciones automáticas de las reglas de DISENO-hilo.md sobre la pantalla dibujada (CAR-334). No
// juzgan: anotan. Los hallazgos los clasifica la sesión al revisar capturas e informe.

export type Medicion = {
  titulo: string;
  primarios: string[]; // R1: nombres de los botones primarios visibles fuera de diálogos
  repetidos: string[]; // R2: acciones con el mismo nombre más de una vez en la vista
  pequenos: string[]; // R9: controles de menos de 44 px (solo teléfono)
  desborde: number; // R10: px de scroll horizontal de la página
  ingles: string[]; // R6/R12: palabras en inglés o valores rotos visibles
  fechas: string[]; // R5: fechas fuera del formato dd-mm-aaaa
  axe: { id: string; impacto: string; nodos: number }[]; // R11
  vacia: boolean; // la vista no muestra contenido en el área principal
};

const INGLES =
  /\b(Loading|Submit|Cancel|Save|Delete|Search|Settings|Dashboard|Untitled|Not found|Something went wrong|undefined|null|NaN|Invalid Date|\[object Object\])\b/g;

export async function medir(page: Page, telefono: boolean): Promise<Omit<Medicion, "axe">> {
  return page.evaluate(
    ({ telefono, inglesFuente }) => {
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
      };
      const fueraDeDialogo = (el: Element) => !el.closest('[role="dialog"],[role="alertdialog"]');
      const nombre = (el: Element) =>
        (el.getAttribute("aria-label") ?? (el as HTMLElement).innerText ?? "").trim().replace(/\s+/g, " ");
      const raiz = document.querySelector("main") ?? document.body;

      const primarios = [...document.querySelectorAll(".ds-primario")]
        .filter((el) => visible(el) && fueraDeDialogo(el))
        .map(nombre);

      const acciones = [...raiz.querySelectorAll("button, a.ds-primario, [role='button']")]
        .filter((el) => visible(el) && fueraDeDialogo(el))
        .map(nombre)
        .filter((n) => n.length > 2);
      const cuenta = new Map<string, number>();
      for (const n of acciones) cuenta.set(n, (cuenta.get(n) ?? 0) + 1);
      const repetidos = [...cuenta].filter(([, c]) => c > 1).map(([n, c]) => `${n} ×${c}`);

      const pequenos = telefono
        ? [...raiz.querySelectorAll("button, input, select, textarea, [role='tab'], [role='button']")]
            .filter((el) => visible(el) && el.getBoundingClientRect().height < 43.5)
            .filter((el) => !(el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)))
            .map((el) => `${nombre(el) || el.tagName.toLowerCase()} (${Math.round(el.getBoundingClientRect().height)} px)`)
            .slice(0, 12)
        : [];

      const ancho = document.scrollingElement?.scrollWidth ?? 0;
      const texto = document.body.innerText;
      const ingles = [...new Set(texto.match(new RegExp(inglesFuente, "g")) ?? [])];
      const fechas = [
        ...new Set(texto.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) ?? []),
      ].slice(0, 6);
      const h1 = document.querySelector("h1");
      return {
        titulo: (h1 ? (h1 as HTMLElement).innerText : document.title).trim(),
        primarios,
        repetidos: repetidos.slice(0, 8),
        pequenos,
        desborde: Math.max(0, ancho - window.innerWidth),
        ingles,
        fechas,
        vacia: ((raiz as HTMLElement).innerText ?? "").trim().length < 20,
      };
    },
    { telefono, inglesFuente: INGLES.source },
  );
}

export async function axe(page: Page): Promise<Medicion["axe"]> {
  try {
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    return r.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({ id: v.id, impacto: v.impact ?? "", nodos: v.nodes.length }));
  } catch {
    return [];
  }
}
