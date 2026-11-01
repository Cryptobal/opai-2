"use client";

import { type FormEvent, type ReactNode, lazy, Suspense, useState } from "react";

import { avisar, Button, Campo, Input, Skeleton, type SwitchProps } from "@opai/ds";
import { CATEGORIAS_AVISO, type CategoriaAviso } from "@opai/domain";

import { FormScreenListo } from "@opai/ds/form-screen-listo";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Preferencias } from "./tipos";

// Aparte (React.lazy, ADR-037): el interruptor sobre Radix no pesa en el JS inicial de la ruta;
// esta pantalla es la única del portal trabajador que lo usa. Se importa por su propio subpath
// (no el barrel de `@opai/ds`) para que el split no se mezcle con el resto del paquete.
const SwitchDiferido = lazy(() => import("@opai/ds/switch").then((m) => ({ default: m.Switch })));

function Switch(props: SwitchProps) {
  return (
    <Suspense fallback={<Skeleton className="h-11 w-full" />}>
      <SwitchDiferido {...props} />
    </Suspense>
  );
}

const CATEGORIA: Record<CategoriaAviso, { titulo: string; detalle: string }> = {
  pauta: { titulo: "Pauta y turnos", detalle: "Cuando cambia o se asigna un turno tuyo." },
  documentos: {
    titulo: "Liquidaciones y documentos",
    detalle: "Liquidaciones nuevas y documentos por firmar.",
  },
  solicitudes: { titulo: "Solicitudes y tickets", detalle: "Cuando se resuelve algo que pediste." },
  empresa: { titulo: "Avisos de la empresa", detalle: "Comunicados generales de tu empresa." },
};

/** Pantalla 12 · Notificaciones: por categoría, push y correo; y un horario de silencio. */
export function FormularioAvisos({
  inicial,
  cabecera,
}: {
  inicial: Preferencias;
  cabecera: ReactNode;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("trabajador");
  const [prefs, setPrefs] = useState(inicial.preferencias);
  const [conSilencio, setConSilencio] = useState(inicial.silencio !== null);
  const [desde, setDesde] = useState(inicial.silencio?.desde ?? "22:00");
  const [hasta, setHasta] = useState(inicial.silencio?.hasta ?? "07:00");

  function fijar(c: CategoriaAviso, canal: "push" | "correo", activo: boolean) {
    setPrefs((p) => ({ ...p, [c]: { ...p[c], [canal]: activo } }));
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = await ejecutar<Preferencias>(
      "portal_trabajador.preferencias_notificacion.actualizar",
      {
        preferencias: prefs,
        silencio: conSilencio ? { desde, hasta } : null,
      },
    );
    if (r) avisar.exito("Tus avisos quedaron guardados");
    else avisar.error("No se pudo guardar. Inténtalo de nuevo.");
  }

  return (
    <FormScreenListo
      cabecera={cabecera}
      formProps={{ onSubmit: guardar, noValidate: true }}
      secciones={[
        ...CATEGORIAS_AVISO.map((c) => ({
          id: c,
          titulo: CATEGORIA[c].titulo,
          descripcion: CATEGORIA[c].detalle,
          contenido: (
            <>
              <Switch
                etiqueta="Aviso en el celular (push)"
                activo={prefs[c].push}
                onCambiar={(v) => fijar(c, "push", v)}
              />
              <Switch
                etiqueta="Aviso por correo"
                activo={prefs[c].correo}
                onCambiar={(v) => fijar(c, "correo", v)}
              />
            </>
          ),
        })),
        {
          id: "silencio",
          titulo: "Horario de silencio",
          descripcion: "Sin avisos por celular ni correo en estas horas (hora de Chile).",
          contenido: (
            <>
              <Switch
                etiqueta="Activar horario de silencio"
                activo={conSilencio}
                onCambiar={setConSilencio}
              />
              {conSilencio ? (
                <div className="grid grid-cols-2 gap-3">
                  <Campo etiqueta="Desde" htmlFor="silencio-desde">
                    <Input
                      id="silencio-desde"
                      type="time"
                      value={desde}
                      onChange={(e) => setDesde(e.target.value)}
                    />
                  </Campo>
                  <Campo etiqueta="Hasta" htmlFor="silencio-hasta">
                    <Input
                      id="silencio-hasta"
                      type="time"
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                    />
                  </Campo>
                </div>
              ) : null}
            </>
          ),
        },
      ]}
      resumen={error ? <span className="text-sm font-medium text-danger-fg">{error}</span> : null}
      acciones={
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </Button>
      }
    />
  );
}
