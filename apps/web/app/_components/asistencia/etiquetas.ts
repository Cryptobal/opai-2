export const MOTIVOS: { valor: string; etiqueta: string }[] = [
  { valor: "rostro_no_coincide", etiqueta: "No me reconoció el rostro" },
  { valor: "vida_fallida", etiqueta: "Falló la prueba de vida" },
  { valor: "proveedor_caido", etiqueta: "El reconocimiento facial no responde" },
  { valor: "sin_camara", etiqueta: "No tengo cámara disponible" },
  { valor: "otro", etiqueta: "Otro motivo" },
];

export const TIPO_MARCA: Record<string, string> = {
  entrada: "Entrada", salida: "Salida", inicio_colacion: "Inicio de colación", fin_colacion: "Fin de colación",
};

export const METODO: Record<string, string> = {
  rostro: "Rostro con prueba de vida", rut_pin: "RUT y PIN", pin_respaldo: "PIN de respaldo", manual_contingencia: "Contingencia",
};

export const GPS: Record<string, string> = { dentro: "Dentro del radio", fuera: "Fuera del radio (se registró igual)", sin_gps: "Sin ubicación" };

/** Motivo de respaldo sugerido según por qué falló el rostro (el mensaje viene del servidor). */
export function motivoDeFallo(mensaje: string | null): string {
  if (!mensaje) return "otro";
  if (/reconocer tu rostro/i.test(mensaje)) return "rostro_no_coincide";
  if (/prueba de vida/i.test(mensaje)) return "vida_fallida";
  if (/no respondi|no está disponible/i.test(mensaje)) return "proveedor_caido";
  return "otro";
}

/** Ubicación puntual al marcar: nunca bloquea, se pide una sola vez y con tope de tiempo. */
export function ubicacion(): Promise<{ lat: number; lng: number; precisionM: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolver) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude, precisionM: Math.round(p.coords.accuracy) }),
      () => resolver(null),
      { timeout: 4000, maximumAge: 30_000 },
    );
  });
}
