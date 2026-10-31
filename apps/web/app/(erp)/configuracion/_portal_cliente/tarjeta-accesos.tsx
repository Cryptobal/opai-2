"use client";

import { lazy, Suspense, useState } from "react";

import { Alerta, avisar, Badge, Button, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { AccesoFila, Candidato, InstalacionOpcion } from "./tipos";

// La hoja (Sheet, Select y casillas) se descarga al abrirse: no pesa en el JS inicial (ADR-037).
const HojaVincular = lazy(() => import("./hoja-vincular").then((m) => ({ default: m.HojaVincular })));

const ESTADO = {
  activo: { tono: "success", texto: "Activo" },
  suspendido: { tono: "warning", texto: "Suspendido" },
  revocado: { tono: "neutro", texto: "Revocado" },
} as const;

/**
 * Contactos de la cuenta con acceso al portal: a qué instalaciones entra cada uno y, desde aquí,
 * vincular, suspender, reactivar o revocar. Todo por capacidades; un agente pasa por aprobación.
 */
export function TarjetaAccesos({
  cuentaId,
  accesos,
  candidatos,
  instalaciones,
  recargar,
}: {
  cuentaId: string;
  accesos: AccesoFila[];
  candidatos: Candidato[];
  instalaciones: InstalacionOpcion[];
  recargar: () => Promise<void>;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [abierta, setAbierta] = useState(false);

  async function cambiar(a: AccesoFila, estado: "activo" | "suspendido" | "revocado") {
    const r = await ejecutar("portal_cliente.accesos.actualizar", { accesoId: a.id, estado }, false, "ninguna");
    if (r) {
      avisar.exito("Acceso actualizado");
      await recargar();
    }
  }

  return (
    <SeccionTarjeta
      titulo="Accesos de contactos"
      accion={<Button variant="secondary" onClick={() => setAbierta(true)}>Vincular contacto</Button>}
      sinRelleno
    >
      {error ? <Alerta tono="danger" titulo={error} className="m-4" /> : null}
      {accesos.length === 0 ? (
        <p className="t-body-sm p-4">
          Aún nadie de este cliente entra a su portal. Invita al contacto desde Usuarios con el
          portal «Cliente» y vincúlalo aquí a sus instalaciones.
        </p>
      ) : (
        <ul>
          {accesos.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 border-b border-border px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{a.nombre}</span>
                <Badge tono={ESTADO[a.estado].tono}>{ESTADO[a.estado].texto}</Badge>
              </div>
              <span className="t-caption truncate">{a.email}</span>
              <span className="t-body-sm">
                {a.todasInstalaciones
                  ? "Todas las instalaciones de la cuenta"
                  : a.instalaciones.length === 0
                    ? "Sin instalaciones habilitadas: no ve nada"
                    : a.instalaciones.map((i) => i.nombre).join(" · ")}
              </span>
              {a.estado === "revocado" ? null : (
                <div className="flex gap-2 pt-1">
                  {a.estado === "activo" ? (
                    <Button variant="secondary" disabled={pendiente} onClick={() => void cambiar(a, "suspendido")}>Suspender</Button>
                  ) : (
                    <Button variant="secondary" disabled={pendiente} onClick={() => void cambiar(a, "activo")}>Reactivar</Button>
                  )}
                  <Button variant="ghost" disabled={pendiente} onClick={() => void cambiar(a, "revocado")}>Revocar</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {abierta ? (
        <Suspense fallback={null}>
          <HojaVincular
            abierta
            onCerrar={() => setAbierta(false)}
            cuentaId={cuentaId}
            candidatos={candidatos}
            instalaciones={instalaciones}
            recargar={recargar}
          />
        </Suspense>
      ) : null}
    </SeccionTarjeta>
  );
}
