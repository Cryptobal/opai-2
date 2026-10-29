import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// B1 (5.º ajuste): los enlaces del menú y del riel usan la precarga POR DEFECTO de Next (no fuerzan
// `prefetch` completo por intención). Forzarlo renderizaba en el servidor el hueco dinámico del layout
// (sesión de Better Auth + capacidades) de páginas del menú que nadie abría, la fuente de los P2028 de
// `/negocios`, `/personas` y `/cuentas` del QA en vivo del #136. Este test fija esa conducta.
const capturado = vi.hoisted(() => ({ props: undefined as Record<string, unknown> | undefined }));

vi.mock("next/link", () => ({
  default: (props: Record<string, unknown>) => {
    capturado.props = props;
    return createElement("a", { href: props["href"] as string }, props["children"] as never);
  },
}));
// `EstadoEnlace` usa hooks de cliente (`useLinkStatus`): fuera del árbol real no aportan al test.
vi.mock("@/app/_components/estado-enlace", () => ({ EstadoEnlace: () => null }));

describe("LinkMenu (precarga del menú y del riel)", () => {
  it("no fuerza prefetch completo: deja la precarga por defecto de Next", async () => {
    const { LinkMenu } = await import("@/app/_components/link-menu");
    renderToStaticMarkup(createElement(LinkMenu, { href: "/negocios" }, "Negocios"));
    expect(capturado.props).toBeDefined();
    // Ni `true` (prefetch completo del hueco dinámico) ni `false` (precarga desactivada): sin la prop,
    // Next aplica su precarga por defecto (solo el shell estático del Suspense del layout).
    expect(capturado.props?.["prefetch"]).toBeUndefined();
  });
});
