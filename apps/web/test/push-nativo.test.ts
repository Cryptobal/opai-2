import { afterEach, describe, expect, it, vi } from "vitest";

import { rutaPushInterna } from "@opai/domain";

const addListener = vi.fn();
const requestPermissions = vi.fn();
const register = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => "ios",
  },
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: { addListener, requestPermissions, register },
}));

describe("push nativo (app)", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("registra token iOS en core.push.suscribir tras permiso concedido", async () => {
    requestPermissions.mockResolvedValue({ receive: "granted" });
    addListener.mockImplementation(async (event: string, cb: (ev: { value: string }) => void) => {
      if (event === "registration") await cb({ value: "cFM-ios-token:APA91b-prueba" });
      return { remove: vi.fn() };
    });
    const ejecutar = vi.fn().mockResolvedValue({ suscrito: true });
    const { suscribirPushNativo } = await import("@/lib/push-nativo");
    await suscribirPushNativo(ejecutar);
    expect(register).toHaveBeenCalled();
    expect(ejecutar).toHaveBeenCalledWith(
      "core.push.suscribir",
      {
        tipo: "nativa",
        token: "cFM-ios-token:APA91b-prueba",
        plataforma: "ios",
        dispositivo: "iPhone o iPad",
      },
      false,
      "ninguna",
    );
  });

  it("al tocar la notificación navega solo rutas internas", async () => {
    const navegar = vi.fn();
    let performed: ((ev: { notification: { data: Record<string, string> } }) => void) | undefined;
    addListener.mockImplementation(async (event: string, cb: typeof performed) => {
      if (event === "pushNotificationActionPerformed") performed = cb;
      return { remove: vi.fn() };
    });
    const { escucharToquePushNativo } = await import("@/lib/push-nativo");
    escucharToquePushNativo(navegar);
    await vi.waitFor(() => expect(performed).toBeDefined());
    performed!({ notification: { data: { ruta: "/trabajador/pauta" } } });
    expect(navegar).toHaveBeenCalledWith(rutaPushInterna("/trabajador/pauta"));
    performed!({ notification: { data: { ruta: "https://malicia" } } });
    expect(navegar).toHaveBeenLastCalledWith("/bandeja");
  });
});