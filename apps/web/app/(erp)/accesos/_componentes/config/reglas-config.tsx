"use client";

import { Campo, Checkbox, Input, SeccionTarjeta, Select, Switch } from "@opai/ds";
import { type ConfigAcceso, TIPOS_REGISTRO } from "@opai/domain/acceso-config";

import { tipoDe } from "../etiquetas";

type Props = {
  config: ConfigAcceso;
  onCambiar: (c: Partial<ConfigAcceso>) => void;
  disabled: boolean;
};

const HORAS = [
  { valor: "", etiqueta: "Sin cierre automático" },
  ...Array.from({ length: 24 }, (_, h) => ({
    valor: String(h),
    etiqueta: `${String(h).padStart(2, "0")}:00`,
  })),
];

/** Tipos de ingreso habilitados y reglas de la portería: RUN, lista, permanencia y cierre (R2, R5, R25). */
export function ReglasConfig({ config: c, onCambiar, disabled }: Props) {
  const alternar = (t: (typeof TIPOS_REGISTRO)[number], si: boolean) =>
    onCambiar({ tipos: TIPOS_REGISTRO.filter((x) => (x === t ? si : c.tipos.includes(x))) });
  return (
    <>
      <SeccionTarjeta titulo="Tipos de ingreso">
        <p className="t-caption mb-2">La portería solo ofrece los habilitados.</p>
        {TIPOS_REGISTRO.map((t) => (
          <Checkbox
            key={t}
            etiqueta={tipoDe(t)}
            marcado={c.tipos.includes(t)}
            disabled={disabled || (c.tipos.length === 1 && c.tipos.includes(t))}
            onCambiar={(si) => alternar(t, si)}
          />
        ))}
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Reglas">
        <Switch
          etiqueta="Validar el RUT"
          descripcion="Exige el dígito verificador correcto. Apagado, un RUN mal escrito se guarda como otro documento."
          activo={c.validarRut}
          disabled={disabled}
          onCambiar={(validarRut) => onCambiar({ validarRut })}
        />
        <Switch
          etiqueta="Permitir ingresos fuera de lista"
          descripcion="Si hay lista autorizada, quien no está en ella igual puede entrar y queda marcado «fuera de lista». La lista bloqueada siempre manda."
          activo={c.permitirFueraDeLista}
          disabled={disabled}
          onCambiar={(permitirFueraDeLista) => onCambiar({ permitirFueraDeLista })}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Permanencia máxima (minutos)"
            htmlFor="cfg-permanencia"
            ayuda="Vacío, sin límite. Quien la supera aparece destacado en la portería."
          >
            <Input
              id="cfg-permanencia"
              inputMode="numeric"
              value={c.permanenciaMaxMin === null ? "" : String(c.permanenciaMaxMin)}
              disabled={disabled}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
                onCambiar({ permanenciaMaxMin: Number.isNaN(n) ? null : Math.min(n, 1_440) });
              }}
            />
          </Campo>
          <Campo
            etiqueta="Cierre automático"
            htmlFor="cfg-cierre"
            ayuda="A esa hora, quienes sigan en sitio quedan con «salida no registrada»."
          >
            <Select
              id="cfg-cierre"
              valor={c.cierreHora === null ? "" : String(c.cierreHora)}
              opciones={HORAS}
              onCambiar={(v) => onCambiar({ cierreHora: v === "" ? null : Number(v) })}
            />
          </Campo>
        </div>
      </SeccionTarjeta>
    </>
  );
}
