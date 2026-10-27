/** Descarga la limpieza PWA al usarla, sin impedir salir si falta un chunk tras un despliegue. */
export function trasLimpiarCaches(accion: () => unknown): Promise<void> {
  return import("./pwa/limpiar-cache").then(
    (m) => m.trasLimpiarCaches(accion),
    () => {
      void accion();
    },
  );
}
