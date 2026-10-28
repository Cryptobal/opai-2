"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet, Textarea } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

/** «YYYY-MM-DDTHH:mm» local del navegador → ISO 8601 (o nada si está vacío). */
const aIso = (v: string) => (v ? new Date(v).toISOString() : undefined);

/**
 * Registrar un incidente de seguridad (`?nuevo=1`, §16.5): flujo manual, sin detector automático.
 * El plazo de aviso corre desde la detección (`ocurridoEn`) o, si no se sabe, desde el registro.
 */
export function HojaIncidente() {
  const hoja = useHojaUrl("nuevo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [descripcion, setDescripcion] = useState("");
  const [alcance, setAlcance] = useState("");
  const [datos, setDatos] = useState("");
  const [ocurrido, setOcurrido] = useState("");
  async function registrar() {
    const iso = aIso(ocurrido);
    const r = await ejecutar("core.cumplimiento.incidente_registrar", {
      descripcion: descripcion.trim(),
      ...(alcance.trim() ? { alcance: alcance.trim() } : {}),
      ...(datos.trim() ? { datosAfectados: datos.trim() } : {}),
      ...(iso ? { ocurridoEn: iso } : {}),
    });
    if (!r) return;
    avisar.exito("Incidente registrado");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Registrar incidente"
      descripcion="Una posible brecha de datos personales. No copies datos personales en el registro."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || descripcion.trim().length < 5}
            onClick={() => void registrar()}
          >
            {pendiente ? "Registrando…" : "Registrar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Qué pasó" htmlFor="inc-desc">
          <Textarea
            id="inc-desc"
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Campo>
        <Campo
          etiqueta="Cuándo se detectó"
          htmlFor="inc-cuando"
          ayuda="Desde aquí corre el plazo de aviso"
        >
          <Input
            id="inc-cuando"
            type="datetime-local"
            value={ocurrido}
            onChange={(e) => setOcurrido(e.target.value)}
          />
        </Campo>
        <Campo
          etiqueta="Alcance"
          htmlFor="inc-alcance"
          ayuda="Sistemas, sedes o personas involucradas (sin nombres)"
        >
          <Textarea
            id="inc-alcance"
            rows={2}
            value={alcance}
            onChange={(e) => setAlcance(e.target.value)}
          />
        </Campo>
        <Campo
          etiqueta="Datos afectados"
          htmlFor="inc-datos"
          ayuda="Categorías, p. ej. «contacto, laboral»"
        >
          <Input id="inc-datos" value={datos} onChange={(e) => setDatos(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
