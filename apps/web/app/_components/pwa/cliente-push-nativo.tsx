"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { esAppNativa } from "@/lib/app-nativa";
import { escucharToquePushNativo, suscribirPushNativo } from "@/lib/push-nativo";

import { ejecutarCapacidad } from "../ejecutar-capacidad";

function portalDeRuta(pathname: string): string {
  if (pathname.startsWith("/trabajador")) return "trabajador";
  if (pathname.startsWith("/terreno")) return "terreno";
  if (pathname.startsWith("/supervisor")) return "supervisor";
  return "erp";
}

/** Tras el login, pide permiso de push nativo y registra el token FCM/APNs (Brief 17). */
export function ClientePushNativo() {
  const router = useRouter();
  const pathname = usePathname();
  const portal = useMemo(() => portalDeRuta(pathname), [pathname]);
  const ejecutar = useMemo(
    () => (id: string, input: unknown, dryRun = false) =>
      ejecutarCapacidad(portal, id, input, dryRun, "ninguna").then((r) => (r.ok ? r.data : null)),
    [portal],
  );

  useEffect(() => {
    if (!esAppNativa(navigator.userAgent)) return;
    void suscribirPushNativo(ejecutar);
    return escucharToquePushNativo((ruta) => router.push(ruta));
  }, [ejecutar, router]);

  return null;
}