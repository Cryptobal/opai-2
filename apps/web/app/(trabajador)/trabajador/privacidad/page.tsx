import { Card, CardContent, CardHeader, CardTitle, Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { fechaCorta } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { estadoTrabajador, SIN_FICHA } from "../_componentes/estado";
import type { Privacidad } from "../_componentes/tipos";

export const metadata = { title: tituloPagina("trabajador", "Privacidad") };

const TIPO: Record<string, string> = {
  acceso: "Acceso a mis datos",
  rectificacion: "Corregir mis datos",
  cancelacion: "Eliminar mis datos",
  oposicion: "Oponerme a un uso",
  portabilidad: "Llevarme mis datos",
  bloqueo: "Bloquear el uso",
};
const ESTADO: Record<string, string> = {
  recibida: "Recibida",
  en_proceso: "En proceso",
  resuelta: "Resuelta",
  rechazada: "Rechazada",
};

/** Pantalla 11 · Privacidad (Ley 21.719): quién atiende mis derechos, qué datos hay y qué pedí. */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Privacidad"
      ruta="/trabajador/privacidad"
      volver={{ href: "/trabajador/mas", etiqueta: "Más" }}
      volverSoloTelefono
      cargar={async () => {
        const r = await ejecutarComoUsuario<Privacidad>("trabajador", "portal_trabajador.privacidad.obtener");
        return { state: estadoTrabajador(r), p: r.ok ? r.data : null };
      }}
    >
      {({ state, p }) => (
        <Estado state={state} variante="detalle" textos={{ vacio: SIN_FICHA, error: { accion: <BotonReintentar /> } }}>
          {p ? (
            <div className="flex flex-col gap-4">
              <h2 className="t-title text-fg md:hidden">Privacidad</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Quién cuida tus datos</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-base text-fg">
                  {p.dpo.correo || p.dpo.nombre ? (
                    <>
                      <span className="font-medium">{p.dpo.nombre ?? "Delegado de protección de datos"}</span>
                      {p.dpo.correo ? <span>{p.dpo.correo}</span> : null}
                      {p.dpo.telefono ? <span className="t-mono">{p.dpo.telefono}</span> : null}
                      <p className="t-caption mt-2">
                        Escríbele para pedir acceso, corrección, eliminación, oposición, portabilidad o bloqueo de tus datos
                        {p.empresa ? ` en ${p.empresa}` : ""}.
                      </p>
                    </>
                  ) : (
                    <p className="text-fg-muted">
                      Tu empresa aún no publicó a la persona que atiende estos derechos. Pídele a Recursos Humanos que te
                      atienda mientras tanto.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Qué datos tratamos</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {p.datosTratados.map((d) => (
                    <div key={d.dato} className="flex flex-col">
                      <span className="text-base font-medium text-fg">{d.dato}</span>
                      <span className="t-caption">{d.finalidad}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tus consentimientos</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {p.consentimientos.length ? (
                    p.consentimientos.map((c) => (
                      <div key={c.finalidad} className="flex items-baseline justify-between gap-3 text-base text-fg">
                        <span>{c.finalidad}</span>
                        <span className="t-caption">
                          {c.estado === "otorgado" ? "Otorgado" : "Revocado"} · {fechaCorta(c.desde)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-fg-muted">No has dado consentimientos adicionales. Tu relación laboral no los necesita.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tus solicitudes</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {p.solicitudes.length ? (
                    p.solicitudes.map((s) => (
                      <div key={s.id} className="flex items-baseline justify-between gap-3 text-base text-fg">
                        <span>{TIPO[s.tipo] ?? s.tipo}</span>
                        <span className="t-caption">
                          {ESTADO[s.estado] ?? s.estado} · {fechaCorta(s.recibidaEn)}
                          {s.plazoEn ? ` · plazo ${fechaCorta(s.plazoEn)}` : ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-fg-muted">No tienes solicitudes abiertas.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
