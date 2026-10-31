(function () {
  const R = (t, s, m, a, b, o) => Object.assign({ title: t, sub: s, monto: m || '', action: a || '', badges: (b || []).map(x => ({ tone: x[0], label: x[1] })) }, o || {});
  const L = (title, rows, o) => Object.assign({ t: 'list', title, rows, count: rows.length }, o || {});
  const P = (title, pairs, o) => Object.assign({ t: 'pairs', title, pairs: pairs.map(p => ({ k: p[0], v: p[1], mono: !!p[2] })) }, o || {});
  const A = (tono, titulo, texto, o) => Object.assign({ t: 'alert', tono, titulo, texto, wide: true }, o || {});
  const TABS = (items, value) => ({ t: 'tabs', items: items.map(i => ({ id: i, label: i })), value, wide: true });
  const K = (items) => ({ t: 'kpis', items: items.map(i => ({ k: i[0], v: i[1], tone: i[2] || '' })), wide: true });
  const F = (label, value, o) => Object.assign({ t: 'field', label, value, hint: '' }, o || {});
  const CC = ['Torre Apoquindo', 'Planta Quilicura', 'Bodega Lampa', 'Administración / Oficina central'];
  const SEL = (label, value, options, hint) => ({ t: 'select', label, value, options: options || CC, hint: hint || '' });
  const SW = (label, description, checked) => ({ t: 'switch', label, description, checked, wide: true });
  const TA = (label, value, o) => Object.assign({ t: 'textarea', label, value }, o || {});
  const SEG = (label, items, value) => ({ t: 'seg', label, items: items.map(i => ({ value: i, label: i })), value });
  const PV = (head, lines, total, note) => ({ t: 'preview', head, lines: lines.map(l => ({ d: l[0], m: l[1] })), total, note: note || '' });
  const TX = (text, o) => Object.assign({ t: 'text', text, wide: true }, o || {});
  const BTN = (items) => ({ t: 'btns', items: items.map(i => ({ label: i[0], variant: i[1] || 'secondary', icon: i[2] || '' })), wide: true });
  const TL = (items) => ({ t: 'timeline', title: 'Historial', items });
  const C = (o) => Object.assign({ t: 'conn' }, o);
  const B = (label, tone) => ({ label, tone });
  const act = (primary, secondary) => ({ primary, secondary: secondary || 'Cancelar' });

  const ventasTabs = TABS(['Todas', 'Borradores', 'Emitidas', 'Con saldo'], 'Todas');
  const progTabs = (v) => TABS(['Plantillas', 'Tablero del mes'], v);
  const bancaTabs = (v) => TABS(['Sin reconocer', 'Por autorizar', 'Conciliados'], v);
  const fctTabs = (v) => TABS(['Por ceder', 'Cedidas', 'Giradas', 'Cobradas'], v);
  const preview33 = PV('Factura electrónica 33 · borrador', [['Servicio de guardias · Torre Apoquindo · septiembre 2026', '$ 6.400.000'], ['Supervisión y rondas', '$ 540.000']], '$ 6.940.000', 'Neto $ 5.831.933 · IVA 19% $ 1.108.067 · referencias OC 4500012871, HES 9901233');

  const FIN = {
    groups: [
      { items: [{ id: 'ini', label: 'Inicio', icon: 'home' }, { id: 'ban', label: 'Bandeja', icon: 'check' }] },
      { title: 'Operaciones', items: [{ id: 'ins', label: 'Instalaciones', icon: 'building' }, { id: 'pau', label: 'Pauta mensual', icon: 'calendar' }, { id: 'per', label: 'Personas', icon: 'users' }] },
      { title: 'Finanzas', items: [{ id: 'hoy', label: 'Hoy en Finanzas', icon: 'check' }, { id: 'ven', label: 'Ventas', icon: 'file' }, { id: 'cob', label: 'Cobranza', icon: 'wallet' }, { id: 'bco', label: 'Banca', icon: 'building' }, { id: 'fct', label: 'Factoring', icon: 'refresh' }, { id: 'int', label: 'Integraciones', icon: 'briefcase' }, { id: 'flu', label: 'Flujo de caja', icon: 'wallet' }] },
      { title: 'Sistema', items: [{ id: 'cfg', label: 'Configuración', icon: 'filter' }] },
    ],
    pantallas: {
      ventas: {
        nav: 'ven', code: 'FIN-VEN-503', empty: ['file', 'Aún no hay documentos', 'Los borradores del cierre de mes y las facturas emitidas aparecen aquí.', 'Ver cierre de mes'],
        vistas: {
          lista: { title: 'Ventas (DTE)', sub: 'Facturas 33 y 34, notas de crédito 61 y débito 56', primary: 'Emitir', icon: 'plus', cols: [1, 1, 1], blocks: [ventasTabs,
            L('Documentos de octubre 2026', [
              R('Factura 33 · folio 20418', 'Logística Norte SpA · Bodega Lampa · 12-09-2026', '$ 4.115.000', 'Ver', [['success', 'SII aceptado'], ['success', 'Correo enviado'], ['danger', 'Vencida']]),
              R('Factura 33 · folio 20431', 'Alimentos del Maipo SA · Planta Quilicura · 14-10-2026', '$ 8.325.000', 'Ver', [['success', 'SII aceptado'], ['warning', 'Correo pendiente'], ['neutral', 'Por vencer']]),
              R('Nota de crédito 61 · folio 61', 'Logística Norte SpA · ref. folio 20402', '−$ 420.000', 'Ver', [['info', 'SII enviado'], ['danger', 'Correo rechazado'], ['neutral', 'Sin cobro']]),
              R('Factura exenta 34 · folio 1208', 'Constructora Andes Ltda · Torre Apoquindo · 02-10-2026', '$ 3.480.000', 'Ver', [['success', 'SII aceptado'], ['success', 'Correo enviado'], ['success', 'Pagada']]),
              R('Borrador · Factura 33', 'Inmobiliaria Apoquindo SpA · Torre Apoquindo · septiembre 2026', '$ 6.940.000', 'Emitir', [['neutral', 'Borrador']]),
            ], { wide: true })] },
          detalle: { title: 'Factura 33 · folio 20418', sub: 'Logística Norte SpA', primary: 'Nota de crédito', icon: 'file', cols: [1, 2, 2], blocks: [
            P('Documento', [['Estado SII', 'Aceptado'], ['Cliente', 'Logística Norte SpA'], ['RUT', '76.412.890-3', 1], ['Centro de costo', 'Bodega Lampa'], ['Emisión', '12-09-2026'], ['Vencimiento', '12-10-2026'], ['Total', '$ 4.115.000']]),
            { t: 'stack', blocks: [
              A('success', 'Correo enviado', 'Enviado el 12-09-2026 08:15 al contacto de facturación del cliente, con PDF y XML adjuntos.', { wide: false }),
              BTN([['Ver PDF', 'secondary', 'file'], ['Descargar XML', 'secondary', 'file']]),
              L('Vínculos al banco', [R('Transferencia recibida · 29-10-2026', 'Banco de Chile · RUT 76.412.890-3', '$ 4.115.000', 'Reconocer', [['info', 'Sugerencia']])]),
            ] },
            TL([{ who: 'Andrés Valdivia', initials: 'AV', action: 'emitió la factura 33', when: '12-09-2026 08:14' }, { who: 'Programación', agent: true, action: 'creó el borrador desde la plantilla', when: '05-09-2026 06:00' }, { who: 'Logística Norte SpA', initials: 'LN', action: 'aprobó la proforma', when: '10-09-2026 16:40' }]),
          ] },
        },
        sheets: {
          emitir: { title: 'Emitir factura 33', desc: 'Revisa la vista previa antes de confirmar.', blocks: [SEL('Centro de costo', 'Torre Apoquindo', null, 'Se usa para el reporte por centro de costo.'), preview33, A('warning', 'Emitir no se puede deshacer', 'Queda a nombre de Andrés Valdivia y se envía al SII.', { wide: false })], ...act('Emitir factura') },
          nc: { title: 'Nota de crédito 61', desc: 'Anula o corrige la factura 33 folio 20402.', blocks: [F('Documento de referencia', 'Factura 33 · folio 20402', { readonly: true }), F('Monto', '$ 420.000'), TA('Motivo', 'Descuento por servicio no prestado en septiembre 2026'), PV('Nota de crédito electrónica 61 · vista previa', [['Descuento por servicio no prestado', '$ 420.000']], '$ 420.000', 'El correo sale por Comunicaciones con PDF y XML adjuntos.')], ...act('Emitir nota de crédito') },
        },
      },
      programacion: {
        nav: 'ven', code: 'FIN-PRG-503', empty: ['calendar', 'Sin plantillas todavía', 'Crea una plantilla para que el sistema prepare los borradores cada mes.', 'Nueva plantilla'],
        vistas: {
          plantillas: { title: 'Programación y cierre de mes', sub: 'Plantillas de facturación recurrente', primary: 'Nueva plantilla', icon: 'plus', cols: [1, 1, 1], blocks: [progTabs('Plantillas'), A('info', 'El cron crea borradores, nunca emite', 'Una persona revisa y emite cada documento.'),
            L('Plantillas activas', [
              R('Alimentos del Maipo SA', 'Planta Quilicura · facturar a los 5 días · cobrar a 30 días', '$ 8.325.000', 'Editar', [['info', 'Próximo borrador 05-11-2026']]),
              R('Inmobiliaria Apoquindo SpA', 'Torre Apoquindo · facturar a los 5 días · cobrar a 30 días', '$ 6.940.000', 'Editar', [['info', 'Próximo borrador 05-11-2026']]),
              R('Logística Norte SpA', 'Bodega Lampa · facturar a los 10 días · cobrar a 45 días', '$ 4.115.000', 'Editar', [['info', 'Próximo borrador 10-11-2026']]),
              R('Constructora Andes Ltda', 'Torre Apoquindo · facturar a los 5 días · cobrar a 30 días', '$ 3.480.000', 'Editar', [['info', 'Próximo borrador 05-11-2026']]),
              R('Retail Sur SpA', 'Facturar a los 5 días · cobrar a 30 días', '$ 5.120.000', 'Editar', [['neutral', 'Pausada']]),
            ], { wide: true }),
            L('Cómo se ve en el flujo de caja', [
              R('Alimentos del Maipo SA', 'Cobro esperado semana 30-11 al 06-12', '$ 8.325.000', 'Ver en flujo', [['info', 'Comprometido']], { link: 'Viene de la plantilla Alimentos del Maipo SA' }),
              R('Inmobiliaria Apoquindo SpA', 'Cobro esperado semana 30-11 al 06-12', '$ 6.940.000', 'Ver en flujo', [['info', 'Comprometido']], { link: 'Viene de la plantilla Inmobiliaria Apoquindo SpA' }),
              R('Constructora Andes Ltda', 'Sin facturar en su semana: pasa a la semana 07-12 al 13-12', '$ 3.480.000', 'Ver en flujo', [['warning', 'Arrastrado']], { link: 'Viene de la plantilla Constructora Andes Ltda' }),
            ], { wide: true }),
            SW('Arrastrar lo no facturado a la semana siguiente', 'Por empresa. Cada fila puede desactivarlo; queda en la bitácora y se puede deshacer.', true),
            { t: 'link', title: 'Flujo de caja semanal', text: 'Cada factura programada aparece como comprometida en su semana esperada de cobro. Pasa a real cuando una persona emite la factura.', label: 'Abrir flujo de caja', wide: true }] },
  tablero: { title: 'Cierre de octubre 2026', sub: 'Avance por etapa', primary: '', cols: [1, 2, 3], blocks: [progTabs('Tablero del mes'),
            L('Falta OC/HES', [R('Inmobiliaria Apoquindo SpA', 'Falta OC', '$ 6.940.000', 'Ingresar OC'), R('Logística Norte SpA', 'Falta HES', '$ 4.215.000', 'Ingresar HES')]),
            L('Observado', [R('Retail Sur SpA', 'Observó 29-10-2026: monto no coincide con la HES', '$ 5.120.000', 'Ver')]),
            L('Por enviar', [R('Constructora Andes Ltda', 'Proforma lista', '$ 3.480.000', 'Enviar')]),
            L('Esperando OK', [R('Constructora Andes Ltda', 'Enviada 27-10-2026 · recordatorio 03-11-2026', '$ 3.480.000', 'Recordar'), R('Retail Sur SpA', 'Enviada 22-10-2026', '$ 5.120.000', 'Recordar')]),
            L('Listo para emitir', [R('Alimentos del Maipo SA', 'OK 29-10-2026', '$ 7.910.000', 'Emitir'), R('Inmobiliaria Apoquindo SpA', 'OK 28-10-2026', '$ 2.350.000', 'Emitir')]),
            L('Emitido', [R('Logística Norte SpA', 'Folio 20418', '$ 4.115.000', 'Ver', [['success', 'Aceptado']])]),
          ] },
        },
        sheets: { plantilla: { title: 'Nueva plantilla', desc: 'El próximo borrador se crea en la fecha indicada.', blocks: [F('Cliente', 'Alimentos del Maipo SA'), SEL('Centro de costo', 'Planta Quilicura'), F('Días hasta facturar', '5'), F('Días hasta cobrar', '30'), F('Próximo borrador', '05-11-2026')], ...act('Guardar plantilla') } },
      },
      cobro: {
        bare: true, code: 'COBRO-503',
        empty: ['file', 'Sin documentos', 'No hay documentos para revisar en este enlace.', ''],
        vistas: {
          enlace: { title: 'Proforma octubre 2026', sub: 'Torre Apoquindo', primary: '', blocks: [
            { t: 'brand', tenant: 'Atlas Seguridad SpA', text: 'Aviso de cobro para Inmobiliaria Apoquindo SpA', wide: true },
            PV('Proforma · Torre Apoquindo · octubre 2026', [['Servicio de guardias de seguridad', '$ 6.400.000'], ['Supervisión y rondas', '$ 540.000']], '$ 6.940.000', 'IVA incluido. Orden de compra solicitada: 4500012871.'),
            BTN([['Aprobar', 'primary', 'check'], ['Observar', 'secondary'], ['Ingresar OC/HES', 'secondary']]),
            TX('Este enlace es personal y vence el 06-11-2026.', { small: true }),
          ] },
        },
        sheets: {
          observar: { title: 'Observar proforma', desc: 'Cuéntanos qué debemos corregir.', blocks: [TA('Observación', 'El monto no coincide con la HES 9901233.')], ...act('Enviar observación') },
          oc: { title: 'Ingresar OC/HES', desc: 'Con estos números preparamos la factura.', blocks: [F('N° de orden de compra', '4500012871', { mono: true }), F('N° de HES', '9901233', { mono: true })], ...act('Enviar') },
        },
      },
      cobranza: {
        nav: 'cob', code: 'FIN-COB-503', empty: ['wallet', 'Sin deudas vencidas', 'Cuando una factura venza, el deudor aparece en su tramo.', 'Ver ventas'],
        vistas: {
          tramos: { title: 'Cobranza', sub: 'Facturas vencidas por tramo', primary: 'Enviar recordatorios', icon: 'bell', cols: [1, 1, 1], blocks: [
            K([['0-30 días', '$ 12.300.000'], ['31-60 días', '$ 6.940.000', 'warning'], ['60+ días', '$ 2.140.000', 'danger']]),
            L('Deudores', [
              R('Retail Sur SpA', '1 factura · última gestión 27-10-2026', '$ 2.140.000', 'Ver ficha', [['danger', '60+ días']]),
              R('Constructora Andes Ltda', '1 factura · última gestión 20-10-2026', '$ 6.940.000', 'Ver ficha', [['warning', '31-60 días']]),
              R('Logística Norte SpA', '2 facturas · sin gestión', '$ 9.580.000', 'Ver ficha', [['neutral', '0-30 días']]),
              R('Alimentos del Maipo SA', '1 factura · última gestión 29-10-2026', '$ 2.720.000', 'Ver ficha', [['neutral', '0-30 días']]),
            ], { wide: true })] },
          ficha: { title: 'Retail Sur SpA', sub: 'RUT 77.105.334-K · total vencido $ 2.140.000', primary: 'Enviar recordatorio', icon: 'bell', cols: [1, 2, 2], blocks: [
            L('Facturas vencidas', [R('Folio 20377', 'Venció 28-08-2026', '$ 2.140.000', 'Ver', [['danger', '60+ días']])]),
            { t: 'stack', blocks: [
              L('Contactos de facturación', [R('Paula Reyes', 'pagos@retailsur.example · +56 9 5555 0142', '', 'Copiar'), R('Marcelo Soto', 'mcontreras@retailsur.example', '', 'Copiar')]),
              A('info', 'Los contactos vienen de la ficha del cliente', 'Edítalos en Clientes.', { wide: false }),
            ] },
            TL([{ who: 'Andrés Valdivia', initials: 'AV', action: 'envió recordatorio por correo con PDF', when: '27-10-2026 09:02' }, { who: 'Cobranza', agent: true, action: 'recordatorio a +7 días hábiles, feriados contados', when: '20-10-2026 06:00' }, { who: 'Cobranza', agent: true, action: 'recordatorio a +3 días hábiles', when: '15-10-2026 06:00' }]),
          ] },
        },
        sheets: {
          enviar: { title: 'Recordatorio a Retail Sur SpA', desc: 'Revisa el mensaje antes de enviar.', blocks: [SEG('Canal', ['Correo', 'WhatsApp'], 'Correo'), F('Para', 'pagos@retailsur.example', { readonly: true }), PV('Correo · vista previa', [['Hola Paula, te recordamos que la factura folio 20377 por $ 2.140.000 venció el 28-08-2026.', '']], '', 'Adjunto: factura-20377.pdf')], ...act('Enviar correo') },
          'whatsapp-b': { title: 'Recordatorio por WhatsApp', desc: 'Variante B', blocks: [A('info', 'Propuesta, a confirmar por Andrés', 'Enlace manual wa.me por defecto. Envío automático solo con aprobación por lote.', { wide: false }), SEG('Envío', ['Manual (wa.me)', 'Automático por lote'], 'Manual (wa.me)'), PV('Mensaje · vista previa', [['Hola Paula, te recordamos la factura folio 20377 por $ 2.140.000, vencida el 28-08-2026.', '']], '', 'Se abre WhatsApp con el mensaje listo; tú lo envías.')], ...act('Abrir WhatsApp') },
        },
      },
      banca: {
        nav: 'bco', code: 'FIN-BCO-503', empty: ['building', 'Sin movimientos por reconocer', 'Los movimientos nuevos del banco aparecen aquí. Si falta alguno, sube la cartola.', 'Subir cartola'],
        vistas: {
          sin: { title: 'Banca', sub: 'Banco de Chile · cuenta corriente', primary: 'Subir cartola', icon: 'plus', cols: [1, 1, 1], blocks: [bancaTabs('Sin reconocer'),
            A('info', 'Duplicados descartados por huella', '2 movimientos repetidos de la cartola de hoy no se importaron.'),
            P('Cuadratura de saldo', [['Saldo del banco al 29-10-2026', '$ 48.215.300'], ['Saldo en OPAI', '$ 48.233.750'], ['Diferencia', '$ 18.450']]),
            L('Movimientos sin reconocer', [
              R('Transferencia recibida', 'Banco de Chile · 29-10-2026 · RUT 76.412.890-3', '$ 4.115.000', 'Reconocer', [['info', 'Sugerencia folio 20418']]),
              R('Transferencia recibida', 'Banco de Chile · 29-10-2026 · RUT 77.105.334-K', '$ 1.980.000', 'Reconocer', [['neutral', 'Sin sugerencia']]),
              R('Comisión mantención', 'Banco de Chile · 28-10-2026 · Administración / Oficina central', '−$ 18.450', 'Reconocer'),
            ])] },
          autorizar: { title: 'Banca', sub: 'Banco de Chile · cuenta corriente', primary: 'Subir cartola', icon: 'plus', cols: [1, 1, 1], blocks: [bancaTabs('Por autorizar'),
            L('Movimientos por autorizar', [R('Seguridad Integral Ltda', 'Pago a proveedor · 30-10-2026 · RUT 78.220.115-6', '−$ 2.760.000', 'Autorizar'), R('Abono asociado a folio 20390', 'Banco de Chile · 28-10-2026 · RUT 76.880.451-2', '$ 3.300.000', 'Autorizar')], { wide: true })] },
          conciliados: { title: 'Banca', sub: 'Banco de Chile · cuenta corriente', primary: 'Subir cartola', icon: 'plus', cols: [1, 1, 1], blocks: [bancaTabs('Conciliados'),
            L('Conciliados esta semana', [R('Transferencia recibida', 'Folio 20351 · 26-10-2026', '$ 6.940.000', 'Ver', [['success', 'Conciliado']]), R('Transferencia recibida', 'Folio 20390 · 24-10-2026', '$ 3.300.000', 'Ver', [['success', 'Conciliado']])], { wide: true })] },
        },
        sheets: { reconocer: { title: 'Reconocer movimiento', desc: 'Transferencia recibida · $ 4.115.000', blocks: [
          P('Movimiento', [['Fecha', '29-10-2026'], ['RUT', '76.412.890-3', 1], ['Monto', '$ 4.115.000']]),
          L('Sugerencias', [R('Folio 20418 · Logística Norte SpA', 'Pendiente $ 4.115.000', '', 'Elegir', [['success', 'Monto exacto']]), R('Folio 20431 · Logística Norte SpA', 'Diferencia $ 120', '', 'Elegir', [['warning', 'Con tolerancia']]), R('Folio 20377 · Retail Sur SpA', 'Mismo RUT', '', 'Elegir', [['info', 'RUT']])]),
          SEL('Centro de costo', 'Administración / Oficina central'), A('info', 'Es una sugerencia', 'No marca la factura como pagada hasta que la confirmes.', { wide: false }),
          SEG('Regla', ['Solo este movimiento', 'Crear regla por RUT'], 'Crear regla por RUT'),
        ], ...act('Reconocer y conciliar') } },
      },
      factoring: {
        nav: 'fct', code: 'FIN-FCT-503', empty: ['refresh', 'Sin operaciones de factoring', 'Elige facturas emitidas para simular una cesión.', 'Ceder facturas'],
        vistas: {
          operaciones: { title: 'Factoring', sub: 'Cesión por Octava · sin cesión directa con el SII', primary: 'Ceder facturas', icon: 'refresh', cols: [1, 1, 1], blocks: [fctTabs('Cedidas'),
            L('Operaciones cedidas', [
              R('Folio 20351 · Constructora Andes Ltda', 'Cedida 20-10-2026 · giro pendiente', '$ 6.940.000', 'Conciliar giro', [['info', 'Cedida']]),
              R('Folio 20390 · Alimentos del Maipo SA', 'Cedida 12-10-2026 · giro recibido 14-10-2026', '$ 3.300.000', 'Conciliar giro', [['warning', 'Giro con merma']]),
              R('Folio 20277 · Retail Sur SpA', 'Cobrada 10-10-2026', '$ 2.980.000', 'Ver', [['success', 'Cobrada']]),
            ], { wide: true })] },
        },
        sheets: {
          ceder: { title: 'Ceder facturas', desc: 'Simulación con 2 facturas.', blocks: [P('Simulación', [['Facturas', 'Folio 20431 y folio 20418'], ['Monto cedido', '$ 12.440.000'], ['Anticipo', '$ 11.196.000'], ['Costo financiero', '$ 248.800'], ['Líquido estimado', '$ 10.947.200']]), A('warning', 'Ceder requiere tu aprobación', 'La cesión se hace por el proveedor Octava.', { wide: false })], ...act('Confirmar cesión', 'Volver') },
          conciliar: { title: 'Conciliar giro', desc: 'Folio 20390 · Alimentos del Maipo SA', blocks: [P('Giro', [['Esperado', '$ 2.970.000'], ['Recibido', '$ 2.941.200'], ['Merma', '$ 28.800']]), SEG('Merma', ['Gasto financiero', 'Dejar pendiente'], 'Gasto financiero')], ...act('Conciliar giro') },
          'ceder-b': { title: 'Ceder desde el flujo', desc: 'Variante B', blocks: [A('info', 'Propuesta, a confirmar por Andrés', 'Acceso directo desde la alerta del flujo de caja.', { wide: false }), A('warning', 'El saldo no alcanza el 06-11-2026', 'Faltan $ 3.200.000 para cubrir pagos.', { wide: false }), P('Facturas sugeridas', [['Folio 20431', '$ 8.325.000'], ['Anticipo estimado', '$ 7.492.500']])], ...act('Simular cesión', 'Cerrar') },
        },
      },
      flujo: {
        nav: 'flu', code: 'FIN-FLU-503', empty: ['wallet', 'Sin partidas en el flujo', 'Cuando haya plantillas activas, sus facturas programadas aparecen aquí como comprometidas.', 'Ver programación'],
        vistas: {
          semanal: { title: 'Flujo de caja', sub: 'Saldo proyectado por semana · Banco de Chile', primary: '', cols: [1, 1, 2], blocks: [TABS(['Semanal', 'Bitácora de arrastre'], 'Semanal'),
            K([['Saldo al 30-10-2026', '$ 48.233.750'], ['Comprometido · 8 semanas', '$ 22.860.000'], ['Arrastrado a la semana siguiente', '$ 3.480.000']]),
            A('info', 'El cron crea borradores, nunca emite', 'Una partida comprometida pasa a real cuando una persona emite la factura.'),
            SW('Arrastrar lo no facturado a la semana siguiente', 'Atlas Seguridad SpA · aplica a todas las filas salvo las que desactives.', true),
            P('Saldo proyectado al cierre de la semana', [['02-11 al 08-11', '$ 45.833.750'], ['30-11 al 06-12', '$ 61.098.750'], ['07-12 al 13-12', '$ 64.578.750'], ['14-12 al 20-12', '$ 68.693.750']]),
            L('Semana 02-11 al 08-11', [R('Arriendo oficina central', 'Administración / Oficina central · pago real', '−$ 2.400.000', '', [['neutral', 'Real']])]),
            L('Semana 30-11 al 06-12', [
              R('Alimentos del Maipo SA', 'Planta Quilicura · cobro esperado 03-12-2026', '$ 8.325.000', 'Mover', [['info', 'Comprometido']], { link: 'Viene de la plantilla Alimentos del Maipo SA', toggle: true }),
              R('Inmobiliaria Apoquindo SpA', 'Torre Apoquindo · cobro esperado 04-12-2026', '$ 6.940.000', 'Mover', [['info', 'Comprometido']], { link: 'Viene de la plantilla Inmobiliaria Apoquindo SpA', toggle: true })]),
            L('Semana 07-12 al 13-12', [R('Constructora Andes Ltda', 'Sin facturar en su semana · arrastrado desde 30-11 al 06-12', '$ 3.480.000', 'Mover', [['warning', 'Arrastrado'], ['info', 'Comprometido']], { link: 'Viene de la plantilla Constructora Andes Ltda', toggle: true })]),
            L('Semana 14-12 al 20-12', [R('Logística Norte SpA', 'Bodega Lampa · cobro esperado 16-12-2026 · arrastre desactivado', '$ 4.115.000', 'Mover', [['info', 'Comprometido']], { link: 'Viene de la plantilla Logística Norte SpA', toggle: false })]),
          ] },
          bitacora: { title: 'Flujo de caja', sub: 'Bitácora de arrastres y movimientos', primary: '', cols: [1, 1, 1], blocks: [TABS(['Semanal', 'Bitácora de arrastre'], 'Bitácora de arrastre'),
            L('Bitácora', [
              R('Arrastre automático · Retail Sur SpA', 'De 19-10 al 25-10 a 26-10 al 01-11 · Sistema · 26-10-2026 06:00', '$ 5.120.000', 'Deshacer', [['warning', 'Arrastrado']]),
              R('Movida +1 semana · Alimentos del Maipo SA', 'Por Andrés Valdivia · 28-10-2026 10:12', '$ 2.350.000', 'Deshacer', [['info', 'Movida']]),
              R('Arrastre desactivado · Logística Norte SpA', 'Por Andrés Valdivia · 27-10-2026 16:40', '$ 4.115.000', 'Deshacer', [['neutral', 'Fila']]),
            ], { wide: true })] },
        },
        sheets: {
          mover: { title: 'Mover partida', desc: 'Constructora Andes Ltda · $ 3.480.000', blocks: [F('Semana actual', '07-12 al 13-12', { readonly: true }), SEG('Mover', ['−2', '−1', '+1', '+2'], '+1'),
            P('Saldo proyectado antes y después', [['07-12 al 13-12 · antes', '$ 64.578.750'], ['07-12 al 13-12 · después', '$ 61.098.750'], ['14-12 al 20-12 · antes', '$ 68.693.750'], ['14-12 al 20-12 · después', '$ 68.693.750']]),
            A('info', 'Es una vista previa', 'El saldo no cambia hasta que confirmes. Queda en la bitácora y se puede deshacer.', { wide: false })], ...act('Mover partida') },
          arrastre: { title: 'Arrastre de lo no facturado', desc: 'Atlas Seguridad SpA', blocks: [SW('Arrastrar a la semana siguiente', 'Activo para toda la empresa.', true), SW('Respetar la configuración de cada fila', 'Las filas desactivadas no se arrastran.', true), A('info', 'Queda en la bitácora', 'Cada arrastre se puede deshacer.', { wide: false })], ...act('Guardar') },
          deshacer: { title: 'Deshacer arrastre', desc: 'Retail Sur SpA · $ 5.120.000', blocks: [P('Arrastre', [['Semana original', '19-10 al 25-10'], ['Semana actual', '26-10 al 01-11'], ['Hecho por', 'Sistema · 26-10-2026 06:00']]), A('warning', 'Volverá a su semana original', 'El saldo proyectado se recalcula.', { wide: false })], ...act('Deshacer arrastre', 'Cancelar') },
        },
      },
      integraciones: {
        nav: 'int', code: 'FIN-INT-503', empty: ['briefcase', 'Sin conectores', 'Conecta Banca, DTE y Cesión para operar Finanzas.', 'Conectar'],
        vistas: {
          conectores: { title: 'Integraciones de Finanzas', sub: 'Un conector por tenant; el proveedor se puede cambiar', primary: '', cols: [1, 2, 3], blocks: [
            C({ title: 'Banca', provider: 'WEB4LEADS · webhook firmado', estado: 'Conectado', tone: 'success', secretLabel: 'Secreto del webhook', secret: '••••••••••••3f9a', hint: 'Cartola manual siempre disponible como respaldo.', primary: 'Probar conexión', secondary: 'Subir cartola' }),
            C({ title: 'DTE', provider: 'SimpleAPI', estado: 'Credencial por vencer', tone: 'warning', secretLabel: 'Clave de API', secret: '••••••••••••a81c', hint: 'Vence el 15-12-2026.', alert: ['warning', 'Renueva la credencial', 'Quedan 46 días.'], primary: 'Probar conexión', secondary: 'Reemplazar' }),
            C({ title: 'Cesión', provider: 'Octava', estado: 'Error', tone: 'danger', secretLabel: 'Clave de API', secret: '••••••••••••77d2', hint: 'Cupo del proveedor al 92%.', alert: ['danger', 'No pudimos autenticar', 'El proveedor rechazó la credencial.'], primary: 'Probar conexión', secondary: 'Reemplazar' }),
          ] },
        },
        sheets: { secreto: { title: 'Nueva credencial · DTE', desc: 'Se muestra una sola vez.', blocks: [A('warning', 'Cópiala ahora', 'No volverá a mostrarse. Queda en el almacén de secretos.', { wide: false }), F('Clave de API', 'dte_EJEMPLO_••••', { mono: true, readonly: true })], ...act('Guardar credencial') } },
      },
      configdte: {
        nav: 'cfg', tab: 'mas', code: 'FIN-DTE-503', empty: ['file', 'DTE sin configurar', 'Sube el certificado y un CAF para emitir.', 'Subir CAF'],
        vistas: {
          config: { eyebrow: 'Configuración › Módulos › Finanzas', title: 'DTE', sub: 'Certificado digital y folios autorizados', primary: 'Subir CAF', icon: 'plus', cols: [1, 1, 2], blocks: [
            C({ title: 'Certificado digital', provider: 'Titular Andrés Valdivia · RUT 12.345.678-5', estado: 'Vigente', tone: 'success', secretLabel: 'Clave del certificado', secret: '••••••••••••90be', hint: 'Vence el 14-03-2027.', primary: 'Reemplazar', secondary: '' }),
            L('Folios por tipo', [
              R('Factura 33', 'Folios 20001–21000 · quedan 570', '', '', [['success', 'CAF vence 28-02-2027']]),
              R('Factura exenta 34', 'Folios 1201–1300 · quedan 12', '', '', [['warning', 'Quedan pocos folios']]),
              R('Nota de crédito 61', 'Folios 51–150 · quedan 90', '', '', [['success', 'CAF vence 28-02-2027']]),
              R('Nota de débito 56', 'Folios 11–60 · quedan 49', '', '', [['warning', 'CAF vence 20-11-2026']]),
            ]),
            { t: 'link', title: 'Correos de facturación', text: 'Los eventos «Factura emitida» y «Nota de crédito emitida» se editan en Comunicaciones. Aquí solo se ve el estado del envío.', label: 'Abrir Comunicaciones', wide: true },
          ] },
        },
        sheets: { caf: { title: 'Subir CAF', desc: 'Archivo XML del SII', blocks: [F('Archivo', 'caf_33_20001-21000.xml', { mono: true, readonly: true }), A('info', 'El CAF queda en el almacén de secretos', 'No podrás volver a descargarlo desde aquí.', { wide: false })], ...act('Cargar CAF') } },
      },
    },
  };
  window.FIN = FIN;
})();
