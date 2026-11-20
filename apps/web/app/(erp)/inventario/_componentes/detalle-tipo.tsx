import { Badge, Chip, DetailScreen, SeccionTarjeta } from "@opai/ds";

import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { conteo } from "@/lib/plural";

import type { cargarTipo } from "./datos";
import { etiquetaCategoria, type PrendaKit, type TipoInventario } from "./tipos";
import { HojaTipo } from "./diferidas";

const TIPO_CAMPO = { texto: "Texto", numero: "Número", fecha: "Fecha" } as const;

function Contenido({ t, kit }: { t: TipoInventario; kit: PrendaKit[] }) {
  if (t.categoria === "ropa") {
    return (
      <SeccionTarjeta titulo="Tallas">
        <div className="flex flex-wrap gap-2">
          {t.tallas.map((talla) => (
            <Chip key={talla} valor={talla} />
          ))}
        </div>
        {t.prendaClave ? (
          <p className="t-caption mt-3">
            Prenda del uniforme: {kit.find((p) => p.clave === t.prendaClave)?.nombre ?? t.prendaClave}. Al entregar a
            una persona se propone la talla de su ficha.
          </p>
        ) : null}
      </SeccionTarjeta>
    );
  }
  return (
    <SeccionTarjeta titulo="Campos propios">
      {t.campos.length === 0 ? (
        <p className="t-caption">Sin campos propios: cada unidad lleva solo su código y número de serie.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {t.campos.map((c) => (
            <li key={c.clave} className="flex items-center justify-between gap-3 py-2.5">
              <span className="font-medium">{c.etiqueta}</span>
              <span className="t-caption">
                {TIPO_CAMPO[c.tipo]}
                {c.obligatorio ? " · obligatorio" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SeccionTarjeta>
  );
}

/** Panel derecho de un tipo de inventario (CAR-235). */
export async function DetalleTipo({
  datos,
  kit,
  puedeGestionar,
}: {
  datos: ReturnType<typeof cargarTipo>;
  kit: PrendaKit[];
  puedeGestionar: boolean;
}) {
  const { state, tipo: t } = await datos;
  return (
    <DetailScreen
      state={t ? state : state === "ready" ? "error" : state}
      titulo={t?.nombre ?? "Tipo"}
      {...(t
        ? {
            estado: <Badge tono={t.activo ? "success" : "neutro"}>{t.activo ? "Activo" : "Inactivo"}</Badge>,
            subtitulo: `${etiquetaCategoria(t.categoria)} · ${
              t.categoria === "ropa" ? conteo(t.tallas.length, "talla") : conteo(t.campos.length, "campo propio", "campos propios")
            }`,
            acciones: (
              <AccionesEntidad
                etiqueta="Acciones del tipo"
                acciones={
                  !puedeGestionar
                    ? []
                    : [
                        { id: "editar", etiqueta: "Editar", parametro: { clave: "editar", valor: "1" } },
                        {
                          id: "activo",
                          etiqueta: t.activo ? "Desactivar" : "Activar",
                          ...(t.activo ? { peligro: true } : {}),
                          capacidad: {
                            id: "inventario.tipos.actualizar",
                            input: { id: t.id, activo: !t.activo },
                            exito: t.activo ? "Tipo desactivado" : "Tipo activado",
                          },
                        },
                      ]
                }
              />
            ),
          }
        : {})}
    >
      {t ? (
        <div className="flex flex-col gap-4">
          {t.descripcion ? <p className="text-fg-muted">{t.descripcion}</p> : null}
          <Contenido t={t} kit={kit} />
          {puedeGestionar ? <HojaTipo tipo={t} kit={kit} /> : null}
        </div>
      ) : null}
    </DetailScreen>
  );
}
