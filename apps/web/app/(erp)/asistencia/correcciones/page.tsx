import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const metadata = { title: "Correcciones de marcas" };

type Fila = {
  correccionId: string;
  personaNombre: string;
  original: { tipo: string; hora: string };
  propuesta: { tipo: string; hora: string };
  motivo: string;
  venceEn: string | null;
  estado: "pendiente" | "aceptada" | "objetada" | "vencida";
  rige: "original" | "propuesta";
};

const TONO: Record<Fila["estado"], "warning" | "success" | "danger" | "neutro"> = {
  pendiente: "warning",
  aceptada: "success",
  objetada: "danger",
  vencida: "neutro",
};

function Lista({ state, items, zona }: { state: EstadoPantalla; items: Fila[]; zona: string }) {
  const hora = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: zona, hourCycle: "h23" });
  const legible = (t: { tipo: string; hora: string }) => `${t.tipo} · ${hora.format(new Date(t.hora))}`;
  return (
    <ListScreen<Fila>
      state={state}
      titulo="Correcciones"
      subtitulo="Propuestas sobre marcas existentes. Mientras están pendientes, rige el valor original."
      items={items}
      clave={(x) => x.correccionId}
      columnas={[
        { id: "persona", etiqueta: "Trabajador", render: (x) => x.personaNombre },
        { id: "original", etiqueta: "Original", render: (x) => legible(x.original) },
        { id: "propuesta", etiqueta: "Propuesta", render: (x) => legible(x.propuesta) },
        { id: "estado", etiqueta: "Estado", render: (x) => <Badge tono={TONO[x.estado]}>{x.estado}</Badge> },
        { id: "rige", etiqueta: "Rige hoy", render: (x) => (x.rige === "propuesta" ? "Propuesta" : "Original") },
      ]}
    />
  );
}

export default function PaginaCorrecciones() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Correcciones"
      ruta="/asistencia/correcciones"
      cargar={async () => {
        const [lista, hoy] = await Promise.all([
          ejecutarComoUsuario<{ items: Fila[] }>("erp", "asistencia.correcciones.listar", {}),
          ejecutarComoUsuario<{ zona: string }>("erp", "asistencia.dias.hoy", {}),
        ]);
        return {
          state: estadoPantalla(lista),
          items: lista.ok ? lista.data.items : [],
          zona: hoy.ok ? hoy.data.zona : "America/Santiago",
        };
      }}
    >
      {({ state, items, zona }) => <Lista state={state} items={items} zona={zona} />}
    </PaginaPortal>
  );
}