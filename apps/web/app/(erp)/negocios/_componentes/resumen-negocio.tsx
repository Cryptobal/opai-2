import { Badge, Enlace, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { fecha, pesos } from "@/lib/fechas";

import type { NegocioDetalle } from "./datos";
import { ROL_CONTACTO as ROL, TIPO_VINCULO } from "./etiquetas";

/** Abre una hoja de vínculos de la ficha (`?instalaciones=1`, `?contactos=1`). */
const AccionHoja = (p: { id: string; hoja: string; texto: string }) => (
  <EnlaceBoton href={`/negocios/${p.id}?${p.hoja}=1`} variante="ghost">
    {p.texto}
  </EnlaceBoton>
);

/** Tab Resumen de un negocio: datos, instalaciones vinculadas y contactos con su rol (ADR-041). */
export function ResumenNegocio({ n }: { n: NegocioDetalle }) {
  const monto = n.valorMensual ?? n.montoEstimadoMensual;
  return (
    <div className="flex flex-col gap-4">
      <SeccionTarjeta titulo="Oportunidad">
        <ParesGrid
          items={[
            {
              etiqueta: "Cuenta",
              valor: (
                <Enlace Link={LinkNext} href={`/cuentas/${n.cuentaId}`}>
                  {n.cuentaNombre}
                </Enlace>
              ),
            },
            { etiqueta: "Etapa", valor: n.etapaNombre },
            { etiqueta: "Monto mensual", valor: monto != null ? `${pesos(monto)}/mes` : null },
            { etiqueta: "Probabilidad", valor: `${n.probabilidad}%` },
            {
              etiqueta: "Cierre estimado",
              valor: n.cierreEstimado ? fecha(n.cierreEstimado) : null,
            },
            {
              etiqueta: "Inicio de servicio",
              valor: n.inicioServicioEstimado ? fecha(n.inicioServicioEstimado) : null,
            },
            ...(n.estado === "perdido"
              ? [
                  { etiqueta: "Competidor", valor: n.competidor },
                  { etiqueta: "Detalle", valor: n.motivoPerdidaDetalle, ancho: true },
                ]
              : []),
          ]}
        />
      </SeccionTarjeta>
      <SeccionTarjeta
        titulo={`Instalaciones (${n.instalaciones.length})`}
        {...(n.archivadoEn
          ? {}
          : { accion: <AccionHoja id={n.id} hoja="instalaciones" texto="Vincular" /> })}
      >
        {n.instalaciones.length ? (
          <div className="flex flex-col gap-2">
            {n.instalaciones.map((i) => (
              <div key={i.id} className="flex items-center justify-between">
                <Enlace Link={LinkNext} href={`/instalaciones/${i.instalacionId}`}>
                  {i.nombre}
                </Enlace>
                <Badge punto={false}>{TIPO_VINCULO[i.tipo] ?? i.tipo}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-caption">Sin instalaciones vinculadas.</p>
        )}
      </SeccionTarjeta>
      <SeccionTarjeta
        titulo={`Contactos (${n.contactos.length})`}
        {...(n.archivadoEn
          ? {}
          : { accion: <AccionHoja id={n.id} hoja="contactos" texto="Editar" /> })}
      >
        {n.contactos.length ? (
          <div className="flex flex-col gap-2">
            {n.contactos.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <span>{c.nombre}</span>
                <span className="flex gap-1">
                  {c.esPrincipal ? <Badge punto={false}>Principal</Badge> : null}
                  <Badge punto={false}>{ROL[c.rol] ?? c.rol}</Badge>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-caption">Sin contactos en el negocio.</p>
        )}
      </SeccionTarjeta>
    </div>
  );
}
