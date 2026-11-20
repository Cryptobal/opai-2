"use client";

import { rutaPushInterna } from "@opai/domain";
import { Capacitor } from "@capacitor/core";

/** Ejecuta una capacidad de escritura (mismo contrato que `useCapacidad`). */
type EjecutarCap = (
  id: string,
  input: unknown,
  dryRun?: boolean,
  revalidar?: "ninguna",
) => Promise<unknown>;

function plataformaNativa(): "ios" | "android" | null {
  const p = Capacitor.getPlatform();
  if (p === "ios") return "ios";
  if (p === "android") return "android";
  return null;
}

/** Registra FCM/APNs tras el login y envía el token al backend. Idempotente en cada `registration`. */
export async function suscribirPushNativo(ejecutar: EjecutarCap): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const plataforma = plataformaNativa();
  if (!plataforma) return;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const permiso = await PushNotifications.requestPermissions();
  if (permiso.receive !== "granted") return;
  await PushNotifications.addListener("registration", async (ev) => {
    const token = ev.value?.trim();
    if (!token) return;
    await ejecutar(
      "core.push.suscribir",
      { tipo: "nativa", token, plataforma, dispositivo: plataforma === "ios" ? "iPhone o iPad" : "Android" },
      false,
      "ninguna",
    );
  });
  await PushNotifications.addListener("registrationError", () => undefined);
  await PushNotifications.register();
}

/** Abre la ruta del portal al tocar la notificación (solo `data.ruta`, sin datos personales). */
export function escucharToquePushNativo(navegar: (ruta: string) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  let activo = true;
  let remover: (() => void) | undefined;
  void import("@capacitor/push-notifications").then(({ PushNotifications }) => {
    if (!activo) return;
    const sub = PushNotifications.addListener("pushNotificationActionPerformed", (ev) => {
      const cruda = ev.notification.data?.["ruta"];
      navegar(typeof cruda === "string" ? rutaPushInterna(cruda) : "/bandeja");
    });
    void sub.then((h) => {
      remover = () => void h.remove();
    });
  });
  return () => {
    activo = false;
    remover?.();
  };
}