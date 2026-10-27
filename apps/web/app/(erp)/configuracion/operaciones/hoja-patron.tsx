"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Segmentado, Sheet, Switch } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { Contador, PreviewCiclo, Semana } from "./controles-patron";
import { conteoPuestos, type Patron } from "./tipos";

/** Crear o editar un patrón de turno (Brief 11). Un patrón en uso no cambia su estructura (EN_USO). */
export function HojaPatron({ patron }: { patron?: Patron }) {
  const hoja = useHojaUrl(patron ? "editar" : "nuevo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(patron?.nombre ?? "");
  const [clase, setClase] = useState(patron?.clase ?? "ciclico");
  const [trabajo, setTrabajo] = useState(patron?.diasTrabajo ?? 4);
  const [descanso, setDescanso] = useState(patron?.diasDescanso ?? 4);
  const [semana, setSemana] = useState<number[]>(patron?.diasSemana ?? [1, 2, 3, 4, 5]);
  const [activo, setActivo] = useState(patron?.activo ?? true);
  const enUso = (patron?.puestosActivos ?? 0) > 0;
  const semanal = clase === "semanal";
  const semanaMala = semanal && (semana.length < 1 || semana.length > 6);
  const estructura = semanal ? { clase, diasSemana: semana } : { clase, diasTrabajo: trabajo, diasDescanso: descanso };

  async function guardar() {
    if (patron) {
      // Un patrón en uso solo cambia el nombre; su estructura no se envía (el servidor la rechaza).
      const r = await ejecutar("core.patrones.update", {
        id: patron.id,
        nombre: nombre.trim(),
        ...(enUso ? {} : estructura),
      });
      if (!r) return;
      if (activo !== patron.activo) {
        const r2 = await ejecutar("core.patrones.set_activo", { id: patron.id, activo });
        if (!r2) return;
      }
      avisar.exito("Patrón actualizado");
    } else {
      const r = await ejecutar("core.patrones.create", { nombre: nombre.trim(), ...estructura });
      if (!r) return;
      avisar.exito("Patrón creado");
    }
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={patron ? hoja.valor === patron.id : hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={patron ? "Editar patrón" : "Nuevo patrón"}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || nombre.trim().length < 1 || semanaMala}
            onClick={() => void guardar()}
          >
            {pendiente ? "Guardando…" : patron ? "Guardar cambios" : "Crear patrón"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {enUso ? (
          <Alerta tono="info" titulo="Patrón en uso">
            Está en {conteoPuestos(patron?.puestosActivos ?? 0)}: su estructura no se puede cambiar.
            Puedes renombrarlo o crear un patrón nuevo.
          </Alerta>
        ) : null}
        <Campo etiqueta="Nombre del patrón" htmlFor="p-nombre">
          <Input id="p-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Clase">
          {enUso ? (
            // En uso: la clase no se cambia (lo explica la Alerta de arriba); se muestra como texto.
            <p className="t-body text-fg-muted">{semanal ? "Semanal" : "Cíclico"}</p>
          ) : (
            <Segmentado
              etiqueta="Clase del patrón"
              activa={clase}
              opciones={[
                { id: "ciclico", etiqueta: "Cíclico", onClick: () => setClase("ciclico") },
                { id: "semanal", etiqueta: "Semanal", onClick: () => setClase("semanal") },
              ]}
            />
          )}
        </Campo>
        {semanal ? (
          <Campo etiqueta="Días de la semana" ayuda="Marca uno a seis días; el resto es descanso.">
            <Semana dias={semana} onCambiar={setSemana} deshabilitado={enUso} />
          </Campo>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Contador etiqueta="Días de trabajo" valor={trabajo} onCambiar={setTrabajo} deshabilitado={enUso} />
              <Contador etiqueta="Días de descanso" valor={descanso} onCambiar={setDescanso} deshabilitado={enUso} />
            </div>
            <Campo etiqueta="Vista de ciclo">
              <PreviewCiclo trabajo={trabajo} descanso={descanso} />
            </Campo>
          </>
        )}
        {patron ? (
          <Switch
            etiqueta="Activo"
            descripcion="Un patrón inactivo no se ofrece en puestos nuevos; los de fábrica no se borran."
            activo={activo}
            onCambiar={setActivo}
          />
        ) : null}
      </div>
    </Sheet>
  );
}
