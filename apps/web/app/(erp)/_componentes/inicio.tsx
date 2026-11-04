import { Building2, MapPin, UserPlus } from "lucide-react";
import { Suspense } from "react";

import { Estado } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { diaLargo } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { nombreDePila } from "@/lib/nombre";
import { ejecutarComoUsuario } from "@/lib/servidor";
import { vocabularioActual } from "@/lib/vocabulario";

import { ActividadInicio } from "./actividad-inicio";
import { IndicadoresInicio } from "./indicadores-inicio";
import { type Pendiente, PendientesInicio } from "./pendientes-inicio";
import { SeguimientosInicio } from "./seguimientos-inicio";
import { TareasInicio } from "./tareas-inicio";

const acciones = (persona: string) => [
  { href: "/cuentas?nueva=1", etiqueta: "Nueva cuenta", corta: "Cuenta", icono: Building2 },
  {
    href: "/personas?nueva=1",
    etiqueta: `Agregar ${persona}`,
    corta: persona.charAt(0).toUpperCase() + persona.slice(1),
    icono: UserPlus,
  },
  {
    href: "/instalaciones/nueva",
    etiqueta: "Nueva instalación",
    corta: "Instalación",
    icono: MapPin,
  },
];

function saludo(ahora: Date) {
  const h = Number(
    new Intl.DateTimeFormat("es-CL", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Santiago",
    }).format(ahora),
  );
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

type Props = { nombre: string; empresa: string; actor: string | undefined };

/** Inicio del ERP (46/47): saludo, lo que requiere decisión hoy, accesos rápidos y actividad. La
 *  Bandeja completa vive solo en `/bandeja` (CAR-182): Inicio no la repite. */
export async function InicioErp({ nombre, empresa, actor }: Props) {
  const r = await ejecutarComoUsuario<Pendiente[]>("erp", "core.inicio.pendientes", {});
  const ahora = new Date();
  const ACCIONES = acciones((await vocabularioActual()).persona.singular);
  const pila = nombreDePila(nombre);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-title text-fg">
            <span className="md:hidden">Hola, {pila}</span>
            <span className="hidden md:inline">
              {saludo(ahora)}, {pila}
            </span>
          </h2>
          <p className="text-base text-fg-muted">
            {diaLargo(ahora)}
            <span className="hidden md:inline"> · {empresa}</span>
          </p>
        </div>
        <div className="hidden gap-2 md:flex">
          {ACCIONES.map((a) => (
            <EnlaceBoton key={a.href} href={a.href} variante="secondary" icono={a.icono}>
              {a.etiqueta}
            </EnlaceBoton>
          ))}
        </div>
      </div>
      <Suspense fallback={null}>
        <IndicadoresInicio />
      </Suspense>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
        {/* Sin el permiso, la bandeja queda vacía; un fallo se ve como error, no como «nada pendiente» (CAR-50). */}
        {r.ok || r.error.code === "FORBIDDEN" ? (
          <PendientesInicio items={r.ok ? r.data : []} />
        ) : (
          <Estado state={estadoPantalla(r)} variante="lista">
            {null}
          </Estado>
        )}
        <div className="grid grid-cols-3 gap-2 md:hidden">
          {ACCIONES.map((a) => (
            <EnlaceBoton
              key={a.href}
              href={a.href}
              variante="secondary"
              className="h-auto flex-col gap-1.5 py-3.5"
            >
              <a.icono className="size-5" aria-hidden />
              {a.corta}
            </EnlaceBoton>
          ))}
        </div>
        <ActividadInicio actor={actor} />
      </div>
      <Suspense fallback={null}>
        <TareasInicio />
      </Suspense>
      <Suspense fallback={null}>
        <SeguimientosInicio />
      </Suspense>
    </div>
  );
}
