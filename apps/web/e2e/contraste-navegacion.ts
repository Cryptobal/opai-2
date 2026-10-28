import { expect, type Page } from "@playwright/test";

/** Contraste WCAG de texto visible del shell/overlay, con colores computados y fondos compuestos. */
export async function comprobarContrasteNavegacion(page: Page, selector: string) {
  const fallos = await page.evaluate((selector) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    function rgba(css: string): number[] {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    }
    function sobre(f: number[], b: number[]): number[] {
      const a = f[3]! / 255;
      return [0, 1, 2].map((i) => f[i]! * a + b[i]! * (1 - a)).concat(255);
    }
    function luminancia(c: number[]) {
      const l = c.slice(0, 3).map((n) => n / 255).map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
      return l[0]! * 0.2126 + l[1]! * 0.7152 + l[2]! * 0.0722;
    }
    const errores: { elemento: string; clase: string | null; contraste: number; minimo: number }[] = [];
    const vistos = new Set<Node>();
    for (const raiz of document.querySelectorAll(selector)) {
      const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const nodo = walker.currentNode;
        const el = nodo.parentElement;
        if (vistos.has(nodo) || !nodo.textContent?.trim() || !el || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
        vistos.add(nodo);
        const cadena: Element[] = [];
        for (let p: Element | null = el; p; p = p.parentElement) cadena.unshift(p);
        const rango = document.createRange();
        rango.selectNodeContents(nodo);
        const caja = rango.getBoundingClientRect();
        // checkVisibility no detecta texto recortado por un acordeón cerrado con overflow:hidden.
        if (cadena.some((p) => {
          const s = getComputedStyle(p);
          const r = p.getBoundingClientRect();
          return /(hidden|clip|auto|scroll)/.test(s.overflowY) && (caja.bottom <= r.top || caja.top >= r.bottom);
        })) continue;
        let fondo = [255, 255, 255, 255];
        for (const p of cadena) fondo = sobre(rgba(getComputedStyle(p).backgroundColor), fondo);
        const estilo = getComputedStyle(el);
        const frente = sobre(rgba(estilo.color), fondo);
        const [a, b] = [luminancia(frente), luminancia(fondo)].sort((x, y) => y - x);
        const contraste = (a! + 0.05) / (b! + 0.05);
        const grande = parseFloat(estilo.fontSize) >= 24 || (parseFloat(estilo.fontSize) >= 18.666 && parseInt(estilo.fontWeight) >= 700);
        const minimo = grande ? 3 : 4.5;
        if (contraste + 0.01 < minimo) errores.push({ elemento: el.tagName, clase: el.getAttribute("class"), contraste, minimo });
      }
    }
    return errores;
  }, selector);
  expect(fallos, `Contraste AA del texto visible en ${selector}`).toEqual([]);
}
