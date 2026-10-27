class Component extends DCLogic {
  renderVals() {
    const h = React.createElement, NS = window.OPAI20DesignSystem_44e4d7 || {};
    const C_ = (n, p, ...k) => (NS[n] ? h(NS[n], p, ...k) : null);
    const Bd = (tone, t, dot) => C_('Badge', { tone, dot: dot !== false }, t);
    const Bt = (variant, t, o) => C_('Button', Object.assign({ variant }, o || {}), t);
    const F = (...k) => h(React.Fragment, null, ...k);
    const muted = (t) => h('span', { className: 't-body-sm', style: { color: 'var(--ds-fg-muted)', whiteSpace: 'normal', display: 'inline-block', minWidth: 150, maxWidth: 260 } }, t);
    const E = {
      ins: [['Sueldo base', '$ 600.000', 'Imponible'], ['Colación', '$ 60.000', 'No imponible'], ['Movilización', '$ 50.000', 'No imponible'], ['Gratificación', 'Legal 25 %', 'Imponible'], ['Bono asistencia', '$ 40.000', 'Bono fijo · imponible'], ['Bono responsabilidad', '10 % del base', 'Bono porcentual · imponible']],
      insOld: [['Sueldo base', '$ 580.000', 'Imponible'], ['Colación', '$ 55.000', 'No imponible'], ['Movilización', '$ 45.000', 'No imponible'], ['Gratificación', 'Legal 25 %', 'Imponible'], ['Bono asistencia', '$ 35.000', 'Bono fijo · imponible'], ['Bono responsabilidad', '10 % del base', 'Bono porcentual · imponible']],
      pue: [['Sueldo base', '$ 650.000', 'Imponible'], ['Colación', '$ 60.000', 'No imponible'], ['Movilización', '$ 50.000', 'No imponible'], ['Gratificación', 'Legal 25 %', 'Imponible'], ['Bono nocturno', '$ 80.000', 'Bono fijo · imponible']],
      rut: [['Sueldo base', '$ 700.000', 'Imponible'], ['Colación', '$ 60.000', 'No imponible'], ['Movilización', '$ 60.000', 'No imponible'], ['Gratificación', 'Legal 25 %', 'Imponible'], ['Bono nocturno', '$ 80.000', 'Bono fijo · imponible']],
    };
    const rows = (a) => a.map((r, i) => ({ id: i, c: r[0], m: r[1], i: r[2] }));
    const ORG = {
      pue: 'Puesto · Guardia noche · v. 01-03-2026',
      insOld: 'Instalación · Planta Norte · v. 01-01-2026',
      rut: 'Sueldo por RUT · desde 01-11-2026',
    };
    const amount = (hide) => (r) => hide ? h('span', { 'aria-label': 'Monto oculto', className: 't-numeric', style: { color: 'var(--ds-fg-muted)' } }, '••••') : h('span', { className: 't-numeric', style: { fontWeight: 500 } }, r.m);
    const mk = (origin, hide, short) => [{ key: 'c', label: 'Concepto', strong: true }].concat(origin || short ? [] : [{ key: 'i', label: 'Tipo', muted: true }]).concat([{ key: 'm', label: 'Monto', align: 'right', render: amount(hide) }]).concat(origin ? [{ key: 'o', label: 'Origen', render: () => muted(origin) }] : []);
    const mkCard = (origin, hide) => (r) => ({ title: r.c, subtitle: origin ? r.i + ' · ' + origin : r.i, trailing: amount(hide)(r) });
    const capaB = (t) => Bd('neutral', t, false);
    const puestos = [{ id: 1, p: 'Guardia día', t: '08:00–20:00', n: 6, s: 'Usa el de la instalación' }, { id: 2, p: 'Guardia noche', t: '20:00–08:00', n: 4, s: 'Sueldo propio' }, { id: 3, p: 'Control de acceso', t: '08:00–20:00', n: 4, s: 'Usa el de la instalación' }, { id: 4, p: 'Rondín', t: '20:00–08:00', n: 2, s: 'Usa el de la instalación' }];
    const lock = (t) => h('span', { style: { display: 'inline-flex', gap: 6, alignItems: 'center' } }, C_('Icon', { name: 'lock', size: 'sm' }), t);
    const cargos = [['Guardia', 'Operativo', 38, 14, false, true], ['Supervisor de turno', 'Operativo', 6, 3, true, true], ['Jefe de operaciones', 'Administrativo', 2, 0, true, true], ['Operador de CCTV', 'Operativo', 5, 2, false, true], ['Conserje', 'Operativo', 4, 2, false, true], ['Rondín nocturno', 'Operativo', 0, 0, false, false]].map((r, i) => ({ id: i, c: r[0], k: r[1], p: r[2], u: r[3], s: r[4], a: r[5] }));
    const hist = [{ id: 1, p: '01-03-2026 – hoy', k: 'Capa puesto', o: 'Guardia noche · versión del 01-03-2026', b: '$ 650.000' }, { id: 2, p: '01-01-2026 – 28-02-2026', k: 'Capa instalación', o: 'Planta Norte (ejemplo) · versión del 01-01-2026', b: '$ 580.000' }, { id: 3, p: '01-06-2025 – 31-12-2025', k: 'Capa cargo (retirada)', o: 'Guardia · versión del 01-06-2025 · solo lectura', b: '$ 560.000', ro: true }];
    const pend = [{ id: 1, n: 'Juan Pérez Soto (ejemplo)', c: 'Sueldo por RUT', f: '26-10-2026', g: 'Paula Rivas (ejemplo)' }, { id: 2, n: 'María González Rojas (ejemplo)', c: 'Cambio de instalación', f: '25-10-2026', g: 'Paula Rivas (ejemplo)' }, { id: 3, n: 'Ana Torres Díaz (ejemplo)', c: 'Cambio de puesto', f: '25-10-2026', g: 'Agente de RRHH vía Paula Rivas', ag: true }, { id: 4, n: 'Pedro Muñoz Vera (ejemplo)', c: 'Versión de instalación (lote)', f: '26-10-2026', g: 'Paula Rivas (ejemplo)' }];
    return {
      user: { name: 'Paula Rivas (ejemplo)', initials: 'PR', role: 'Administradora' },
      userG: { name: 'Tomás Vidal (ejemplo)', initials: 'TV', role: 'Gerente' },
      tabs: [{ id: 'ini', label: 'Inicio', icon: 'home' }, { id: 'ins', label: 'Instalaciones', icon: 'building' }, { id: 'pau', label: 'Pauta', icon: 'calendar' }, { id: 'per', label: 'Personas', icon: 'users' }, { id: 'mas', label: 'Más', icon: 'more' }],
      groups: [
        { items: [{ id: 'ini', label: 'Inicio', icon: 'home' }, { id: 'ban', label: 'Bandeja', icon: 'inbox', count: 5 }] },
        { title: 'Operaciones', items: [{ id: 'ins', label: 'Instalaciones', icon: 'building' }, { id: 'pau', label: 'Pauta mensual', icon: 'calendar' }] },
        { title: 'Personas', items: [{ id: 'per', label: 'Personas', icon: 'users' }, { id: 'car', label: 'Cargos y sueldos', icon: 'briefcase' }] },
        { title: 'Finanzas', items: [{ id: 'fin', label: 'Resumen', icon: 'chart' }] },
      ],
      tIns: [{ id: 'res', label: 'Resumen' }, { id: 'pue', label: 'Puestos', count: 4 }, { id: 'sue', label: 'Sueldo' }, { id: 'con', label: 'Contactos' }, { id: 'neg', label: 'Negocios' }, { id: 'doc', label: 'Documentos' }, { id: 'act', label: 'Actividad' }],
      tPer: [{ id: 'res', label: 'Resumen' }, { id: 'lab', label: 'Laboral' }, { id: 'sue', label: 'Sueldo' }, { id: 'doc', label: 'Documentos' }, { id: 'act', label: 'Actividad' }],
      R: { ins: rows(E.ins), insOld: rows(E.insOld), pue: rows(E.pue), rut: rows(E.rut), insH: rows(E.ins.slice(0, 3)), puestos, cargos, hist, pend },
      C: {
        est: mk(), pue: mk(ORG.pue), insOld: mk(ORG.insOld), rut: mk(ORG.rut), hid: mk(ORG.pue, true), hidS: mk(null, true, true),
        puestos: [{ key: 'p', label: 'Puesto', strong: true }, { key: 't', label: 'Turno', muted: true }, { key: 'n', label: 'Personas', align: 'right' }, { key: 's', label: 'Sueldo', render: (r) => capaB(r.s) }],
        cargos: [{ key: 'c', label: 'Cargo', strong: true }, { key: 'k', label: 'Clase', muted: true }, { key: 'p', label: 'Personas', align: 'right' }, { key: 'u', label: 'Puestos', align: 'right' }, { key: 's', label: 'Sueldo sensible', render: (r) => r.s ? lock('Sensible') : muted('—') }, { key: 'a', label: 'Estado', render: (r) => r.a ? Bd('success', 'Activo') : Bd('neutral', 'Inactivo') }],
        hist: [{ key: 'p', label: 'Periodo' }, { key: 'k', label: 'Capa', render: (r) => r.ro ? h('span', { style: { display: 'inline-flex', gap: 6, alignItems: 'center' } }, capaB(r.k), C_('Icon', { name: 'lock', size: 'sm', label: 'Solo lectura' })) : capaB(r.k) }, { key: 'o', label: 'Origen', render: (r) => muted(r.o) }, { key: 'b', label: 'Sueldo base', align: 'right' }],
        pend: [{ key: 'n', label: 'Persona', strong: true }, { key: 'c', label: 'Cambio' }, { key: 'g', label: 'Generado por', render: (r) => h('span', { style: { display: 'inline-flex', gap: 6, alignItems: 'center', whiteSpace: 'normal', maxWidth: 200 } }, r.ag ? C_('Icon', { name: 'bot', size: 'sm' }) : null, r.g) }, { key: 'x', label: '', align: 'right', render: () => Bt('secondary', 'Revisar') }],
      },
      TC: {
        est: mkCard(), pue: mkCard(ORG.pue), insOld: mkCard(ORG.insOld), rut: mkCard(ORG.rut), hid: mkCard(ORG.pue, true), hidS: mkCard(null, true),
        puestos: (r) => ({ title: r.p, subtitle: r.t + ' · ' + r.n + ' personas', trailing: capaB(r.s), chevron: true }),
        cargos: (r) => ({ title: r.c, subtitle: r.k + ' · ' + r.p + ' personas', trailing: r.s ? lock('') : null, chevron: true }),
      },
      KV: {
        cargo: [{ label: 'Nombre', value: 'Guardia' }, { label: 'Descripción', value: 'Vigilancia y control de acceso (ejemplo)' }, { label: 'Clase', value: 'Operativo' }],
        vinc: [{ label: 'Cargo', value: 'Guardia' }, { label: 'Tipo de contrato', value: 'Indefinido' }, { label: 'Inicio', value: '01-06-2025', numeric: true }, { label: 'Término', value: 'Sin término' }, { label: 'Instalación', value: 'Planta Norte (ejemplo)' }, { label: 'Puesto (opcional)', value: 'Guardia noche' }, { label: 'Jornada pactada', value: '45 h semanales · lunes a viernes (ejemplo)' }],
        anexo: [{ label: 'Qué lo generó', value: 'Sueldo por RUT desde 01-11-2026' }, { label: 'Generado por', value: 'Paula Rivas (ejemplo)' }, { label: 'Cuándo', value: '26-10-2026 10:42', numeric: true }, { label: 'Plantilla', value: 'Base del sistema · marca del tenant' }],
        apr: [{ label: 'Persona', value: 'Juan Pérez Soto (ejemplo)' }, { label: 'Cambio', value: 'Puesto → Sueldo por RUT' }, { label: 'Rige desde', value: '01-11-2026', numeric: true }, { label: 'Se guarda en', value: 'Documentos · SHA-256' }],
      },
      TL: {
        vinc: [{ who: 'Paula Rivas', initials: 'PR', action: 'cambió el vínculo', changes: [{ field: 'Puesto', from: 'Guardia día', to: 'Guardia noche' }], when: '01-03-2026 09:10' }, { who: 'Paula Rivas', initials: 'PR', action: 'creó el vínculo · Planta Norte (ejemplo) · indefinido', when: '01-06-2025 08:30' }],
        act: [{ who: 'Paula Rivas', initials: 'PR', action: 'definió sueldo por RUT · motivo: «Acuerdo por traslado de comuna (ejemplo)» · borrador ANX-0057', changes: [{ field: 'Capa', from: 'Puesto', to: 'Sueldo por RUT' }], when: '26-10-2026 10:42' }, { who: 'Paula Rivas', initials: 'PR', action: 'dio sueldo propio al puesto Guardia noche · borrador ANX-0041', changes: [{ field: 'Capa', from: 'Instalación', to: 'Puesto' }], when: '01-03-2026 09:12' }, { agent: true, who: 'Agente de RRHH (ejemplo)', action: 'vía Paula Rivas (persona responsable) · aplicó la capa instalación al retirar el nivel cargo · borrador ANX-0032', changes: [{ field: 'Capa', from: 'Cargo (retirada)', to: 'Instalación' }], when: '01-01-2026 00:05' }],
        doc: [{ who: 'Paula Rivas', initials: 'PR', action: 'generó el borrador desde el cambio de capa', when: '26-10-2026 10:42' }],
        rech: [{ who: 'Paula Rivas', initials: 'PR', action: 'rechazó el anexo ANX-0058 · motivo: «La movilización no corresponde (ejemplo)»', changes: [{ field: 'Estado', from: 'Borrador', to: 'Rechazado' }], when: '26-10-2026 11:05' }, { agent: true, who: 'Agente de RRHH (ejemplo)', action: 'vía Paula Rivas · generó el borrador ANX-0058', when: '26-10-2026 10:58' }],
      },
      O: {
        seg: [{ value: 'ins', label: 'Usa el de la instalación' }, { value: 'propio', label: 'Sueldo propio' }],
        grat: [{ value: 'legal', label: 'Legal 25 %' }, { value: 'fijo', label: 'Monto fijo' }, { value: 'ninguna', label: 'Ninguna' }],
        ins: [{ value: 'norte', label: 'Planta Norte (ejemplo)' }, { value: 'sur', label: 'Planta Sur (ejemplo)' }],
        pueSur: [{ value: 'sin', label: 'Sin puesto' }, { value: 'dia', label: 'Guardia día' }, { value: 'acc', label: 'Control de acceso' }],
        pueAll: [{ value: 'sin', label: 'Sin puesto' }, { value: 'dia', label: 'Guardia día' }, { value: 'noche-n', label: 'Guardia noche · Planta Norte' }],
        dist: [{ value: 'lv', label: 'Lunes a viernes' }, { value: 'ls', label: 'Lunes a sábado' }, { value: '4x4', label: '4×4' }],
      },
      B: { activa: Bd('success', 'Activa'), borr: Bd('warning', 'Borrador') },
      A: {
        def: Bt('primary', 'Definir sueldo', { icon: 'plus' }), def2: Bt('secondary', 'Definir sueldo'),
        nv: F(Bt('secondary', 'Cancelar'), Bt('primary', 'Revisar y guardar', { disabled: true })),
        gv: F(Bt('secondary', 'Cancelar'), Bt('primary', 'Guardar versión')),
        cerrar: Bt('secondary', 'Cerrar'),
        cambio: F(Bt('secondary', 'Cancelar'), Bt('primary', 'Guardar cambio')),
        rut: F(Bt('secondary', 'Cancelar'), Bt('primary', 'Revisar cambio', { disabled: true })),
        grut: F(Bt('secondary', 'Cancelar'), Bt('primary', 'Guardar')),
        sincapa: Bt('primary', 'Definir sueldo de la instalación'),
        vinc: F(Bt('secondary', 'Cancelar'), Bt('primary', 'Guardar')),
        guardando: F(Bt('secondary', 'Cancelar', { disabled: true }), Bt('primary', 'Guardando…', { disabled: true })),
        apr: F(Bt('secondary', 'Cancelar'), Bt('primary', 'Aprobar')),
        rech: F(Bt('secondary', 'Cancelar'), Bt('destructive', 'Rechazar')),
        retry: Bt('secondary', 'Reintentar', { icon: 'refresh' }), verCapas: Bt('secondary', 'Ver capas'), crearV: Bt('secondary', 'Crear vínculo'), verDocs: Bt('secondary', 'Ver Documentos'), pedir: Bt('secondary', 'Pedir acceso'),
      },
    };
  }
}
