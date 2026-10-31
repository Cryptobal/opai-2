"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Checkbox, Input, SeccionTarjeta, Switch } from "@opai/ds";
import { normalizarCorreo, tipoNuncaVisibleParaCliente } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { ConfigCuenta, TipoDocumentoOpcion } from "./tipos";

/**
 * Pantalla 12: qué ve el cliente. Documentos visibles (los vedados por la Ley 21.719 no se pueden
 * marcar), datos de los guardias, listas de acceso y destinatarios del informe mensual. Guarda con
 * `portal_cliente.config.actualizar`; el servidor vuelve a validar todo.
 */
export function TarjetasConfiguracion({
  config: inicial,
  tiposDocumento,
}: {
  config: ConfigCuenta;
  tiposDocumento: TipoDocumentoOpcion[];
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [c, setC] = useState(inicial.config);
  const [correo, setCorreo] = useState("");
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null);

  const marcarTipo = (codigo: string, on: boolean) =>
    setC({
      ...c,
      tiposDocumentoVisibles: on
        ? [...c.tiposDocumentoVisibles, codigo]
        : c.tiposDocumentoVisibles.filter((x) => x !== codigo),
    });
  function agregarCorreo() {
    const n = normalizarCorreo(correo);
    if (!n) return setErrorCorreo("Escribe un correo válido.");
    if (!c.destinatariosInforme.includes(n))
      setC({ ...c, destinatariosInforme: [...c.destinatariosInforme, n] });
    setCorreo("");
    setErrorCorreo(null);
  }
  async function guardar() {
    const r = await ejecutar("portal_cliente.config.actualizar", { cuentaId: inicial.cuentaId, ...c });
    if (r) avisar.exito("Configuración guardada");
  }

  return (
    <div className="flex flex-col gap-4">
      <SeccionTarjeta titulo="Documentos visibles para el cliente">
        <p className="t-caption pb-2">
          Ve solo los tipos marcados, de los guardias asignados a sus instalaciones. Liquidaciones,
          exámenes de salud y finiquitos nunca son visibles.
        </p>
        {tiposDocumento.length === 0 ? (
          <p className="t-body-sm">Aún no hay tipos de documento de personas en Documentos.</p>
        ) : null}
        {tiposDocumento.map((t) => {
          const vedado = tipoNuncaVisibleParaCliente(t.codigo);
          return (
            <Checkbox
              key={t.codigo}
              etiqueta={t.nombre}
              {...(vedado ? { descripcion: "Nunca visible para clientes" } : {})}
              marcado={!vedado && c.tiposDocumentoVisibles.includes(t.codigo)}
              disabled={vedado}
              onCambiar={(on) => marcarTipo(t.codigo, on)}
            />
          );
        })}
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Datos de los guardias · Ley 21.719">
        <p className="t-caption pb-2">
          El cliente ve el nombre de los guardias asignados a sus instalaciones. Finalidad:
          identificar a quien presta el servicio. Base: la ejecución del contrato de servicio.
        </p>
        <Switch etiqueta="Mostrar la foto" activo={c.muestraFotoGuardias} onCambiar={(v) => setC({ ...c, muestraFotoGuardias: v })} />
        <Switch etiqueta="Mostrar el RUT" activo={c.muestraRutGuardias} onCambiar={(v) => setC({ ...c, muestraRutGuardias: v })} />
        <Switch
          etiqueta="Incluir el RUT en los reportes descargables"
          descripcion="Por defecto se omite: incluirlo permitiría que el RUT salga del portal."
          activo={c.rutEnReportes === "incluido"}
          onCambiar={(v) => setC({ ...c, rutEnReportes: v ? "incluido" : "omitido" })}
        />
        <Alerta tono="info" titulo="Sin descarga ni exportación" className="mt-3">
          Nunca se muestran coordenadas, teléfono, dirección, salud ni remuneraciones.
        </Alerta>
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Listas de acceso">
        <Switch
          etiqueta="El cliente gestiona sus listas"
          descripcion="Agrega y quita personas autorizadas, solo en instalaciones con Accesos contratado."
          activo={c.gestionaListas}
          onCambiar={(v) => setC({ ...c, gestionaListas: v })}
        />
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Destinatarios del informe mensual" sinRelleno>
        <ul>
          {c.destinatariosInforme.map((d) => (
            <li key={d} className="flex min-h-11 items-center gap-2 border-b border-border px-4">
              <span className="min-w-0 flex-1 truncate text-sm">{d}</span>
              <Button
                variant="ghost"
                aria-label={`Quitar ${d}`}
                onClick={() => setC({ ...c, destinatariosInforme: c.destinatariosInforme.filter((x) => x !== d) })}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 p-4">
          <Input
            type="email"
            aria-label="Agregar destinatario"
            placeholder="nombre@empresa.cl"
            className="min-w-0 flex-1"
            value={correo}
            aria-invalid={errorCorreo ? true : undefined}
            onChange={(e) => setCorreo(e.target.value)}
          />
          <Button variant="secondary" onClick={agregarCorreo}>Agregar</Button>
        </div>
        {errorCorreo ? <p className="px-4 pb-3 text-xs font-medium text-danger-fg">{errorCorreo}</p> : null}
      </SeccionTarjeta>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div>
        <Button disabled={pendiente} onClick={() => void guardar()}>
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
