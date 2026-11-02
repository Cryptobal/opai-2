import type { MisDatos } from "./tipos";

/** Bloque de solo lectura (servidor): no pesa en el JS de la ruta mis-datos (ADR-037). */
export function FichaIdentidadTrabajador({ datos }: { datos: MisDatos }) {
  return (
    <fieldset className="rounded-lg border border-border bg-surface p-4">
      <legend className="t-subheading px-1 text-fg">Tu ficha</legend>
      <p className="t-caption mb-3">Estos datos los gestiona Recursos Humanos. Si algo está mal, avísales.</p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="t-caption">Nombre</dt>
          <dd className="text-base text-fg">{`${datos.nombres} ${datos.apellidos}`}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="t-caption">RUT</dt>
          <dd className="t-mono text-base text-fg">{datos.rut}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="t-caption">Correo laboral</dt>
          <dd className="text-base text-fg">{datos.emailLaboral ?? "—"}</dd>
        </div>
      </dl>
    </fieldset>
  );
}
