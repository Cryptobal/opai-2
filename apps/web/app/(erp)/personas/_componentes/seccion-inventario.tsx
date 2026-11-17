import { PERMISOS_INVENTARIO } from "@opai/capabilities";
import { Badge, Enlace, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fecha } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { SeccionError, SeccionSinAcceso } from "./estado-seccion";

const TITULO = "Inventario";

type EntregaAbierta = { id: string; item: string; entregadaEn: string };

/** CAR-503: lo que la persona tiene entregado (activos y ropa), si Inventario está activo en la empresa. */
export async function SeccionInventario({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  if (!identidad.modulosActivos.includes("inventario")) return null;
  if (!puedeDeIdentidad(identidad)(PERMISOS_INVENTARIO.read))
    return <SeccionSinAcceso titulo={TITULO} />;
  const r = await ejecutarComoUsuario<{ items: EntregaAbierta[] }>("erp", "inventario.entregas.list", {
    personaId,
    estado: "abiertas",
    limite: 50,
  });
  if (!r.ok) return <SeccionError titulo={TITULO} que="el inventario entregado" />;
  const puedeDevolver = puedeDeIdentidad(identidad)(PERMISOS_INVENTARIO.gestionar);
  const items = r.data.items;
  return (
    <SeccionTarjeta titulo={TITULO}>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="t-body">{e.item}</span>
              <span className="flex items-center gap-2">
                <span className="t-caption">desde {fecha(e.entregadaEn)}</span>
                {puedeDevolver ? (
                  <Enlace Link={LinkNext} href={`/inventario/entregas?devolver=${e.id}`}>
                    Devolver
                  </Enlace>
                ) : (
                  <Badge tono="info">Entregado</Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ParesGrid unaColumna items={[{ etiqueta: "Entregas abiertas", valor: "Ninguna" }]} />
      )}
      <p className="t-caption mt-3">
        Las devoluciones se registran en{" "}
        <Enlace Link={LinkNext} href="/inventario/entregas">
          Inventario › Entregas
        </Enlace>
        .
      </p>
    </SeccionTarjeta>
  );
}