import { AlertTriangle, Bell, CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, Empty, Estado } from "@opai/ds";
import { primerNombre } from "@opai/domain";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { fechaHora } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { estadoTrabajador, SIN_FICHA } from "./_componentes/estado";
import { etiquetaDia, horario, type MisTurnos } from "./mi-pauta/_componentes/semanas";
import { type Aviso, ETIQUETA_FALTANTE, type MisDatos } from "./_componentes/tipos";

export const metadata = { title: tituloPagina("trabajador", "Inicio") };

/** Pantalla 01 · Inicio: solo tarjetas de lo que existe (datos por completar y avisos). */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Inicio"
      ruta="/trabajador"
      cargar={async () => {
        const [datos, avisos, turnos] = await Promise.all([
          ejecutarComoUsuario<MisDatos>("trabajador", "portal_trabajador.mis_datos.obtener"),
          ejecutarComoUsuario<{ items: Aviso[]; noLeidas: number }>("trabajador", "core.notificaciones.list", {
            limite: 5,
          }),
          ejecutarComoUsuario<MisTurnos>("trabajador", "portal_trabajador.mis_turnos.listar", { dias: 14, limite: 3 }),
        ]);
        return {
          state: estadoTrabajador(datos, avisos),
          datos: datos.ok ? datos.data : null,
          avisos: avisos.ok ? avisos.data.items : [],
          // Tarjeta secundaria (CAR-462): si su carga falla, el Inicio sigue sin ella.
          // El próximo turno es el primero que aún no termina (uno de hoy ya cumplido no cuenta).
          turnos: turnos.ok ? { ...turnos.data, items: turnos.data.items.filter((t) => Date.parse(t.fin) > Date.now()) } : null,
        };
      }}
    >
      {({ state, datos, avisos, turnos }) => (
        <Estado state={state} variante="detalle" textos={{ vacio: SIN_FICHA, error: { accion: <BotonReintentar /> } }}>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="t-title text-fg">Hola{datos ? `, ${primerNombre(datos.nombres)}` : ""}</h2>
              <p className="text-base text-fg-muted">Esto es lo que tienes hoy.</p>
            </div>
            {datos?.faltantes.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle aria-hidden className="size-4 text-warning-fg" />
                    Completa tus datos
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-base text-fg-muted">
                    Te falta: {datos.faltantes.map((f) => ETIQUETA_FALTANTE[f].toLowerCase()).join(", ")}.
                  </p>
                  <EnlaceBoton href="/trabajador/mis-datos">Completar mis datos</EnlaceBoton>
                </CardContent>
              </Card>
            ) : null}
            {turnos ? <ProximoTurno r={turnos} /> : null}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell aria-hidden className="size-4 text-fg-muted" />
                  Avisos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {avisos.length ? (
                  <ul className="flex flex-col divide-y divide-border">
                    {avisos.map((a) => (
                      <li key={a.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                        <span className={a.leidaEn ? "text-base text-fg" : "text-base font-semibold text-fg"}>
                          {a.titulo}
                        </span>
                        {a.cuerpo ? <span className="text-sm text-fg-muted">{a.cuerpo}</span> : null}
                        <span className="t-caption">{fechaHora(a.creadaEn)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty titulo="Sin avisos por ahora" descripcion="Cuando haya algo para ti, aparecerá aquí." />
                )}
              </CardContent>
            </Card>
          </div>
        </Estado>
      )}
    </PaginaPortal>
  );
}

/** Tarjeta «Tu próximo turno» (CAR-462): el primero de los próximos 14 días, con acceso a «Mi pauta». */
function ProximoTurno({ r }: { r: MisTurnos }) {
  const t = r.items[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays aria-hidden className="size-4 text-fg-muted" />
          Tu próximo turno
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {t ? (
          <p className="text-base text-fg">
            <span className="font-medium">{t.fecha === r.hoy ? "Hoy" : etiquetaDia(t.fecha)}</span>
            {` · ${horario(t, r.zona)} · ${t.instalacion.nombre}`}
          </p>
        ) : (
          <p className="text-base text-fg-muted">No tienes turnos en los próximos 14 días.</p>
        )}
        <EnlaceBoton href="/trabajador/mi-pauta" variante="secondary">
          Ver mi pauta
        </EnlaceBoton>
      </CardContent>
    </Card>
  );
}
