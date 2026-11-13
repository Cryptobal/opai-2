import { describe, expect, it } from "vitest";

import { COOKIE_MENU, cookieMenu, menuPlegadoDeCookie } from "@/lib/marco";

describe("menú plegado del diseño nuevo (CAR-335 D2b)", () => {
  it("solo «plegado» pliega el menú; cualquier otro valor lo deja abierto", () => {
    expect(menuPlegadoDeCookie("plegado")).toBe(true);
    expect(menuPlegadoDeCookie(undefined)).toBe(false);
    expect(menuPlegadoDeCookie("1")).toBe(false);
  });

  it("plegado se recuerda un año; abierto borra la cookie", () => {
    expect(cookieMenu(true)).toContain(`${COOKIE_MENU}=plegado; Path=/; Max-Age=31536000`);
    expect(cookieMenu(false)).toContain(`${COOKIE_MENU}=; Path=/; Max-Age=0`);
  });
});
