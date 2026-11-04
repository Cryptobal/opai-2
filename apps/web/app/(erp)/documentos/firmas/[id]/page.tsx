import { PERMISOS_CORE } from "@opai/domain";
import { Badge, DetailScreen, Pares } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fecha } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { contextoServidor, ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { AccionesSolicitud } from "./_componentes/acciones";
import {
  ETIQUETA_CLASE,
  ETIQUETA_ESTADO,
  TONO_ESTADO,
  type Solicitud,
} from "../_componentes/datos";

export const metadata = { title: "Solicitud de firma" };
type Props = { params: Promise<{ id: string }> };

const VIVOS = new Set(["enviada", "en_curso", "espera_prestador"]);

/** Ficha de la solicitud (firma.md §5, §7): quién firmó, quién falta, recordar y cancelar. */
export default function FirmaFicha({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Solicitud de firma"
      ruta="/documentos/firmas"
      cargar={async () => {
        const [{ id }, identidad] = await Promise.all([params, identidadActual()]);
        const r = await ejecutarComoUsuario<Solicitud>("erp", "core.firmas.estado", { id });
        const puedeGestionar = Boolean(
          identidad && contextoServidor(identidad, "erp").autorizar(PERMISOS_CORE.firmasEnviar),
        );
        return { id, r, puedeGestionar };
      }}
      opciones={({ r }) => ({
        titulo: r.ok ? (ETIQUETA_CLASE[r.data.clase] ?? r.data.clase) : "Solicitud de firma",
      })}
    >
      {({ id, r, puedeGestionar }) => {
        const s = r.ok ? r.data : null;
        return (
          <DetailScreen
            state={estadoPantalla(r)}
            titulo={s ? (ETIQUETA_CLASE[s.clase] ?? s.clase) : "Solicitud de firma"}
            subtitulo={
              s
                ? `Nivel ${s.nivel} · orden ${s.orden === "paralelo" ? "paralelo" : "secuencial"}`
                : undefined
            }
            estado={
              s ? (
                <Badge tono={TONO_ESTADO[s.estado] ?? "neutro"}>
                  {ETIQUETA_ESTADO[s.estado] ?? s.estado}
                </Badge>
              ) : undefined
            }
            acciones={
              s ? (
                <AccionesSolicitud
                  id={id}
                  puedeGestionar={puedeGestionar}
                  viva={VIVOS.has(s.estado)}
                />
              ) : undefined
            }
          >
            {s ? (
              <div className="flex flex-col gap-4">
                <Pares
                  items={[
                    { etiqueta: "Vence", valor: fecha(s.plazoVence) },
                    { etiqueta: "Enviada", valor: fecha(s.creadaEn) },
                    ...(s.motivo ? [{ etiqueta: "Motivo", valor: s.motivo }] : []),
                    ...(s.completadaEn
                      ? [{ etiqueta: "Completada", valor: fecha(s.completadaEn) }]
                      : []),
                  ]}
                />
                <section className="flex flex-col gap-2">
                  <h3 className="t-label text-fg">Firmantes</h3>
                  <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                    {s.firmantes.map((f) => (
                      <li
                        key={f.id}
                        className="flex min-h-14 items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-medium text-fg">{f.nombre}</span>
                          <span className="t-caption block">
                            {f.rol === "firma" ? "Firma" : f.rol === "copia" ? "Copia" : "Aprueba"}
                            {f.run ? ` · ${f.run}` : ""}
                            {f.firmadoEn ? ` · firmó ${fecha(f.firmadoEn)}` : ""}
                            {f.motivoRechazo ? ` · rechazó: ${f.motivoRechazo}` : ""}
                          </span>
                        </span>
                        <Badge
                          tono={
                            f.estado === "firmado"
                              ? "success"
                              : f.estado === "rechazado"
                                ? "danger"
                                : "neutro"
                          }
                        >
                          {f.estado === "firmado"
                            ? "Firmó"
                            : f.estado === "rechazado"
                              ? "Rechazó"
                              : "Pendiente"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : null}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
