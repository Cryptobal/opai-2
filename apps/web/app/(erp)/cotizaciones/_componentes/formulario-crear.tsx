"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Alerta, avisar, Button, Campo, FormScreen, Input } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { type NegocioOpcion, SelectorNegocio } from "./selector-negocio";

type ResultadoCrear = { id: string; codigo: string; vigente: boolean };

/** Dos pasos: la vista previa valida las reglas sin escribir; confirmar usa el mismo input. */
export function FormularioCrear({ inicial }: { inicial: NegocioOpcion | null }) {
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [negocioId, setNegocio] = useState<string | null>(inicial?.valor ?? null);
  const [titulo, setTitulo] = useState("");
  const [validaHasta, setValidaHasta] = useState("");
  const [preview, setPreview] = useState<ResultadoCrear | null>(null);
  const clave = useRef<string | null>(null);
  const ocupado = useRef(false);
  const incompleto = !negocioId || titulo.trim().length < 3;
  const input = { negocioId, titulo: titulo.trim(), ...(validaHasta ? { validaHasta } : {}) };
  async function continuar() {
    if (ocupado.current || incompleto) return;
    ocupado.current = true;
    try {
      if (!clave.current) clave.current = crypto.randomUUID();
      const r = await ejecutar<ResultadoCrear>(
        "cpq.cotizaciones.create",
        input,
        !preview,
        "layout",
        clave.current,
      );
      if (!r) return;
      if (!preview) {
        setPreview(r);
        return;
      }
      avisar.exito(`Cotización ${r.codigo} creada`);
      router.push("/cotizaciones");
    } finally {
      ocupado.current = false;
    }
  }
  function editar() {
    setPreview(null);
    clave.current = null;
    limpiarError();
  }
  return (
    <FormScreen
      state="ready"
      titulo="Nueva cotización"
      subtitulo="La cotización siempre pertenece a un negocio abierto."
      formProps={{
        onSubmit: (e) => {
          e.preventDefault();
          void continuar();
        },
      }}
      acciones={
        <>
          <EnlaceBoton
            href={inicial ? `/negocios/${inicial.valor}/cotizaciones` : "/cotizaciones"}
            variante="secondary"
          >
            Cancelar
          </EnlaceBoton>
          {preview ? (
            <Button type="button" variant="secondary" disabled={pendiente} onClick={editar}>
              Editar
            </Button>
          ) : null}
          <Button type="submit" disabled={pendiente || incompleto}>
            {pendiente ? "Validando…" : preview ? "Confirmar creación" : "Revisar cotización"}
          </Button>
        </>
      }
      secciones={[
        {
          id: "cotizacion",
          titulo: preview ? "Vista previa" : "Datos de la cotización",
          contenido: (
            <>
              {error ? <Alerta tono="danger" titulo={error} /> : null}
              {preview ? (
                <div role="status">
                  <Alerta tono="info" titulo={`Se creará ${preview.codigo} en borrador`}>
                    {`Versión 1 · ${preview.vigente ? "Vigente" : "Alternativa"}. El código es provisional hasta confirmar. Válida hasta: ${validaHasta || "hoy más 30 días"}.`}
                  </Alerta>
                </div>
              ) : null}
              <SelectorNegocio
                inicial={inicial}
                valor={negocioId}
                cambiar={setNegocio}
                disabled={pendiente || Boolean(preview)}
              />
              <Campo etiqueta="Título" htmlFor="cpq-titulo" ayuda="Entre 3 y 160 caracteres.">
                <Input
                  id="cpq-titulo"
                  value={titulo}
                  required
                  minLength={3}
                  maxLength={160}
                  onChange={(e) => setTitulo(e.target.value)}
                  disabled={pendiente || Boolean(preview)}
                />
              </Campo>
              <Campo
                etiqueta="Válida hasta"
                htmlFor="cpq-valida"
                ayuda="Si la dejas vacía, se usan 30 días desde hoy."
              >
                <Input
                  id="cpq-valida"
                  type="date"
                  value={validaHasta}
                  onChange={(e) => setValidaHasta(e.target.value)}
                  disabled={pendiente || Boolean(preview)}
                />
              </Campo>
              <p className="t-body-sm text-fg-muted">Pendiente del motor de costeo</p>
            </>
          ),
        },
      ]}
    />
  );
}
