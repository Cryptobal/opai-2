const AVISO_PREDETERMINADO =
  "Tratamos tus datos para controlar el ingreso y la seguridad del recinto, según la Ley 21.719. Puedes ejercer tus derechos contactando al responsable indicado abajo.";

export function avisoPrivacidadDeValor(valor: unknown): string {
  if (
    typeof valor === "object" &&
    valor !== null &&
    "avisoPrivacidad" in valor &&
    typeof (valor as { avisoPrivacidad?: string }).avisoPrivacidad === "string"
  ) {
    return (valor as { avisoPrivacidad: string }).avisoPrivacidad;
  }
  return AVISO_PREDETERMINADO;
}