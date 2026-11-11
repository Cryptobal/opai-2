/**
 * Error de un proveedor (R2, Resend) con un motivo seguro para el log de `error_interno` (CAR-242,
 * CAR-160): solo el proveedor, el paso y el código HTTP, sin claves, destinatarios ni contenido. El
 * registro de capacidades lo lee por `motivoSeguro`; la persona sigue viendo el mensaje genérico.
 */
export class ErrorDeProveedor extends Error {
  readonly motivoSeguro: string;

  constructor(motivoSeguro: string) {
    super(motivoSeguro);
    this.name = "ErrorDeProveedor";
    this.motivoSeguro = motivoSeguro;
  }
}
