// OPAI 2.0 · Puestos y guardias — datos ficticios del mockup (ref: dom 25-10-2026 12:40)
(function () {
  const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  // offset 0 = 01-11-2026 (domingo)
  const MONTHS = {
    nov: { label: 'Noviembre 2026', days: 30, off: 0, mm: '11' },
    dic: { label: 'Diciembre 2026', days: 31, off: 30, mm: '12' }
  };
  const wd = o => ((o % 7) + 7) % 7;
  const md = (a, n) => ((a % n) + n) % n;
  const run4 = (o, s) => md(o - s, 8) < 4;
  const sem = (o, days) => days.includes(wd(o));

  // funciones de serie: (offset) => 'D' | 'N' | '-' | {ppc:motivo} | null (fuera de vigencia)
  const S = {
    t4: o => run4(o, 0) ? 'D' : '-',
    r4: o => run4(o, 4) ? 'D' : '-',
    t4n: o => run4(o, 0) ? 'N' : '-',
    r4n: o => run4(o, 4) ? 'N' : '-',
    r4nLic: o => run4(o, 4) ? ((o >= 5 && o <= 11) ? { ppc: 'Licencia', tip: 'PPC · Licencia de Daniel Morales (06-11 a 12-11)' } : 'N') : '-',
    pabloT: o => run4(o, 0) ? (o >= 15 ? { ppc: 'Sin asignar', tip: 'PPC · Sin asignar desde 16-11-2026: traslado de Pablo Gutiérrez' } : 'D') : '-',
    vacR: o => run4(o, 4) ? { ppc: 'Sin asignar', tip: 'PPC · Sin asignar: falta relevo' } : '-',
    rotT: o => run4(o, 0) ? (md(Math.floor(o / 8), 2) ? 'N' : 'D') : '-',
    rotR: o => run4(o, 4) ? (md(Math.floor((o - 4) / 8), 2) ? 'D' : 'N') : '-',
    lv: o => sem(o, [1, 2, 3, 4, 5]) ? 'D' : '-',
    ss: o => sem(o, [6, 0]) ? 'D' : '-',
    ls: o => sem(o, [1, 2, 3, 4, 5, 6]) ? 'D' : '-',
    refT: o => (o < 44 || o > 65) ? null : (run4(o, 44) ? { ppc: 'Sin asignar', tip: 'PPC · Sin asignar · Refuerzo fiestas' } : '-'),
    refR: o => (o < 44 || o > 65) ? null : (run4(o, 48) ? { ppc: 'Sin asignar', tip: 'PPC · Sin asignar · Refuerzo fiestas' } : '-')
  };

  const P = (o) => Object.assign({ relevo: null, chips: [], capa: 'Instalación' }, o);
  const puestos = {
    quilicura: [
      P({ id: 'ca-d1', nombre: 'Control de acceso día 1', funcion: 'Control de acceso', rol: '4x4', horario: '08:00–20:00', horas: '38,5 h', titular: 'Matías Contreras', relevo: 'Ignacio Bravo', hoy: 'ok', capa: 'Grupo', sT: 't4', sR: 'r4' }),
      P({ id: 'ca-d2', nombre: 'Control de acceso día 2', funcion: 'Control de acceso', rol: '4x4', horario: '08:00–20:00', horas: '38,5 h', titular: 'Pablo Gutiérrez', relevo: '', hoy: 'ok', capa: 'Grupo', chips: [{ t: 'Falta relevo', tone: 'danger' }], faltaRelevo: true, sT: 'pabloT', sR: 'vacR' }),
      P({ id: 'ca-n1', nombre: 'Control de acceso noche 1', funcion: 'Control de acceso', rol: '4x4', horario: '20:00–08:00', mid: true, horas: '38,5 h', titular: 'Cristóbal Navarro', relevo: 'Daniel Morales', hoy: 'ppc', motivo: 'Licencia', capa: 'Grupo', sT: 't4n', sR: 'r4nLic' }),
      P({ id: 'ca-rot', nombre: 'Control de acceso rotativo', funcion: 'Control de acceso', rol: '4x4 rotativo', horario: 'D 08:00–20:00 · N 20:00–08:00', horas: '38,5 h', titular: 'Luis Herrera', relevo: 'Andrés Castillo', hoy: 'ok', capa: 'Grupo', sT: 'rotT', sR: 'rotR' }),
      P({ id: 'sup', nombre: 'Supervisor de turno', funcion: 'Supervisor de turno', rol: '5x2 lun–vie', horario: '08:00–17:00', horas: '40 h', titular: 'Patricio Vega', hoy: 'none', capa: 'Puesto', semanal: true, sT: 'lv' }),
      P({ id: 'rec', nombre: 'Recepción', funcion: 'Recepción', rol: '5x2 lun–vie', horario: '09:00–16:30', horas: '35 h', titular: 'Fernanda Ríos', hoy: 'none', capa: 'Instalación', semanal: true, sT: 'lv' }),
      P({ id: 'ref', nombre: 'Refuerzo fiestas', funcion: 'Control de acceso', rol: '4x4', horario: '08:00–20:00', horas: '38,5 h', titular: '', relevo: '', hoy: 'prog', capa: 'Instalación', temporal: true, chips: [{ t: 'Temporal 15-12-2026 → 05-01-2027', tone: 'warn' }], sT: 'refT', sR: 'refR' })
    ],
    costanera: [
      P({ id: 'as-ac', nombre: 'Aseo áreas comunes', funcion: 'Operario de aseo', rol: '5x2 lun–vie', horario: '07:00–15:00', horas: '40 h', titular: 'Rosa Fuentealba', hoy: 'none', semanal: true, sT: 'lv' }),
      P({ id: 'as-fs', nombre: 'Aseo fin de semana', funcion: 'Operario de aseo', rol: '2x5 sáb–dom', horario: '08:00–16:00', horas: '15 h', titular: 'Javiera Molina', hoy: 'ppc', motivo: 'Permiso', semanal: true, sT: 'ss' }),
      P({ id: 'as-sup', nombre: 'Supervisión de aseo', funcion: 'Supervisor de aseo', rol: '6x1 lun–sáb', horario: '08:00–15:00', horas: '39 h', titular: 'Marcela Díaz', hoy: 'none', capa: 'Puesto', semanal: true, sT: 'ls' })
    ]
  };

  const instalaciones = [
    { id: 'quilicura', nombre: 'Planta Quilicura', cuenta: 'Logística Andina SpA', vertical: 'Seguridad', comuna: 'Quilicura', w: 'guardia', ws: 'guardias', kpi: ['7', '4', '1', '11'], sueldo: [['Base', '$ 600.000'], ['Colación', '$ 40.000'], ['Movilización', '$ 40.000']], total: '$ 680.000', usan: 2 },
    { id: 'pudahuel', nombre: 'CD Pudahuel', cuenta: 'Logística Andina SpA', vertical: 'Seguridad', comuna: 'Pudahuel', w: 'guardia', ws: 'guardias', kpi: ['4', '1', '2', '5'], sueldo: [['Base', '$ 580.000'], ['Colación', '$ 40.000'], ['Movilización', '$ 40.000']], total: '$ 660.000', usan: 1 },
    { id: 'costanera', nombre: 'Torre Costanera Oriente', cuenta: 'Inmobiliaria Costanera Ltda.', vertical: 'Aseo', comuna: 'Providencia', w: 'operario', ws: 'operarios', kpi: ['3', '0', '1', '3'], sueldo: [['Base', '$ 560.000'], ['Colación', '$ 35.000'], ['Movilización', '$ 35.000']], total: '$ 630.000', usan: 2 }
  ];

  const ppcHoy = [
    { id: 'p0', inst: 'Planta Quilicura', puesto: 'Control de acceso día 2', funcion: 'Control de acceso', turno: '08:00–20:00', motivo: 'Sin asignar', quien: 'Falta relevo en el puesto', inicio: 'Empezó 08:00', vertical: 'Seguridad', jornada: 'Día' },
    { id: 'p1', inst: 'CD Pudahuel', puesto: 'Control de acceso día 1', funcion: 'Control de acceso', turno: '08:00–20:00', motivo: 'Sin asignar', quien: 'Puesto nuevo', inicio: 'Empezó 08:00', vertical: 'Seguridad', jornada: 'Día' },
    { id: 'p2', inst: 'CD Pudahuel', puesto: 'Control de acceso día 2', funcion: 'Control de acceso', turno: '08:00–20:00', motivo: 'Falta', quien: 'Reemplaza a Gonzalo Paredes · registró Operaciones a las 08:20', inicio: 'Empezó 08:00', vertical: 'Seguridad', jornada: 'Día' },
    { id: 'p3', inst: 'Torre Costanera Oriente', puesto: 'Aseo áreas comunes', funcion: 'Operario de aseo', turno: '07:00–15:00', motivo: 'Permiso', quien: 'Reemplaza a Rosa Fuentealba', inicio: 'Empezó 07:00', vertical: 'Aseo', jornada: 'Día' },
    { id: 'p4', inst: 'Planta Quilicura', puesto: 'Control de acceso noche 1', funcion: 'Control de acceso', turno: '20:00–08:00', mid: true, motivo: 'Licencia', quien: 'Reemplaza a Daniel Morales · licencia 06-11 a 12-11', inicio: 'en 7 h 20 min', vertical: 'Seguridad', jornada: 'Noche', urg: true }
  ];
  const cubiertosHoy = [
    { id: 'c1', inst: 'CD Pudahuel', puesto: 'Control de acceso noche 2', funcion: 'Control de acceso', turno: '20:00–08:00', mid: true, badge: 'Cubierto · Turno extra', quien: 'Sebastián Muñoz · motivo original: Licencia' }
  ];

  const candidatos = [
    { id: 'fa', nombre: 'Felipe Araya', first: 'Felipe', dist: '3,2 km', hoy: 'Libre (día 2 de 4)', os10: 'OS10 vigente hasta 14-03-2027', ult: 'Terminó 04-11 08:00 · descanso 60 h', tel: '+56 9 5123 4410', chips: [] },
    { id: 'vp', nombre: 'Valentina Pérez', first: 'Valentina', dist: '5,8 km', hoy: 'Libre', os10: 'OS10 vigente hasta 02-12-2026', ult: 'Terminó 05-11 20:00 · descanso 24 h', tel: '+56 9 5234 7781', chips: [{ t: 'Vence en 26 días', tone: 'warn' }] },
    { id: 'sm', nombre: 'Sebastián Muñoz', first: 'Sebastián', dist: '8,9 km', hoy: 'Libre', os10: 'OS10 vigente hasta 30-06-2027', ult: 'Sin turnos recientes', tel: '+56 9 5345 1902', chips: [{ t: 'Sin contrato: solo turno extra', tone: 'warn' }] },
    { id: 'rf', nombre: 'Rodrigo Fuentes', first: 'Rodrigo', dist: '12,4 km', hoy: 'Libre', os10: 'OS10 vigente hasta 11-08-2027', ult: 'Terminó 06-11 08:00 · descanso 12 h', tel: '+56 9 5456 3318', chips: [] },
    { id: 'ct', nombre: 'Camila Torres', first: 'Camila', dist: '21,0 km', hoy: 'Libre', os10: 'OS10 vigente hasta 19-01-2027', ult: 'Terminó 03-11 20:00 · descanso 3 días', tel: '+56 9 5567 2290', chips: [] }
  ];
  const noCumplen = [
    { nombre: 'Diego Rojas', dist: '2,1 km', razon: 'OS10 vencido el 10-10-2026' },
    { nombre: 'Javier León', dist: '4,0 km', razon: 'Descanso insuficiente (terminó hoy 14:00, 6 h)' },
    { nombre: 'Ana Vergara', dist: '6,7 km', razon: 'Con licencia' },
    { nombre: 'Tomás Silva', dist: '9,1 km', razon: 'Otra función (Supervisor de turno)' }
  ];

  const patrones = [
    { n: '4×4 Día 08:00–20:00', base: '4×4', tipo: 'Cíclico', dias: 'ciclo de 8 · días 1–4', uso: '6 puestos', fab: true, f: S.t4 },
    { n: '4×4 Noche 20:00–08:00', base: '4×4', tipo: 'Cíclico', dias: 'ciclo de 8 · días 1–4', uso: '4 puestos', fab: true, f: S.t4n },
    { n: '4×4 Rotativo día/noche', base: '4×4', tipo: 'Cíclico', dias: 'ciclo de 8 · alterna D y N', uso: '2 puestos', fab: true, f: S.rotT },
    { n: '7×7 Día 08:00–20:00', base: '7×7', tipo: 'Cíclico', dias: 'ciclo de 14 · días 1–7', uso: '0', fab: true, f: o => md(o, 14) < 7 ? 'D' : '-' },
    { n: '14×14 Día 08:00–20:00', base: '14×14', tipo: 'Cíclico', dias: 'ciclo de 28 · días 1–14', uso: '0', fab: true, f: o => md(o, 28) < 14 ? 'D' : '-' },
    { n: '3×4 Día 08:00–20:00', base: '3×4', tipo: 'Cíclico', dias: 'ciclo de 7 · días 1–3', uso: '0', fab: true, f: o => md(o, 7) < 3 ? 'D' : '-' },
    { n: '5×2 · 40 h', base: '5×2', tipo: 'Semanal', dias: 'lun–vie', uso: '3 puestos', fab: true, f: S.lv },
    { n: '5×2 · 35 h', base: '5×2', tipo: 'Semanal', dias: 'lun–vie', uso: '2 puestos', fab: true, f: S.lv },
    { n: '2×5 · 15 h', base: '2×5', tipo: 'Semanal', dias: 'sáb–dom', uso: '1 puesto', fab: true, f: S.ss },
    { n: '6×1 · 39 h', base: '6×1', tipo: 'Semanal', dias: 'lun–sáb', uso: '1 puesto (aseo)', fab: false, f: S.ls }
  ];
  // escenario de Pauta: hoy = vie 06-11-2026 (offset 5), 12:40
  const TODAY = 5;
  const TODAY_LABEL = 'vie 06-11';
  // marcas de hoy por fila (puestoId-T|R): días asistidos que no se repintan
  const marcasHoy = { 'ca-d1-R': 'entrada 07:54 · facial', 'sup-T': 'entrada 08:17 · facial' };
  const personas = {
    'Matías Contreras': { id: 'matias', rut: '15.234.871-1' }, 'Ignacio Bravo': { rut: '16.420.553-3' }, 'Pablo Gutiérrez': { id: 'pablo', rut: '17.988.204-3' },
    'Cristóbal Navarro': { rut: '18.345.120-0' }, 'Daniel Morales': { rut: '19.011.457-0' }, 'Luis Herrera': { rut: '14.876.302-K' }, 'Andrés Castillo': { rut: '20.112.986-9' },
    'Patricio Vega': { rut: '13.567.024-3' }, 'Fernanda Ríos': { rut: '21.004.388-8' }, 'Rosa Fuentealba': { rut: '16.789.345-7' }, 'Javiera Molina': { rut: '18.902.117-8' }, 'Marcela Díaz': { rut: '17.200.456-3' }
  };
  // asistencia de hoy (vie 06-11, 12:40) · Planta Quilicura
  const asistencia = [
    { id: 'a1', grupo: 'Turnos de día', puesto: 'Control de acceso día 1', pid: 'ca-d1', turno: '08:00–20:00', quien: 'Ignacio Bravo', rol: 'Relevo', ent: { h: '07:54', via: 'Facial' }, sal: null, estado: 'presente', nota: 'En turno' },
    { id: 'a2', grupo: 'Turnos de día', puesto: 'Control de acceso día 2', pid: 'ca-d2', turno: '08:00–20:00', quien: '', rol: 'Relevo', ent: null, sal: null, estado: 'ppc', motivo: 'Sin asignar', nota: 'Falta relevo en el puesto' },
    { id: 'a3', grupo: 'Turnos de día', puesto: 'Supervisor de turno', pid: 'sup', turno: '08:00–17:00', quien: 'Patricio Vega', rol: 'Titular', ent: { h: '08:17', via: 'Facial' }, sal: null, estado: 'atrasado', nota: '17 min de atraso' },
    { id: 'a4', grupo: 'Turnos de día', puesto: 'Recepción', pid: 'rec', turno: '09:00–16:30', quien: 'Fernanda Ríos', rol: 'Titular', ent: null, sal: null, estado: 'ausente', nota: 'Sin marca desde 09:00 · 3 h 40 min' },
    { id: 'a5', grupo: 'Turnos de noche de hoy', puesto: 'Control de acceso noche 1', pid: 'ca-n1', turno: '20:00–08:00', mid: true, quien: 'Daniel Morales', rol: 'Relevo', ent: null, sal: null, estado: 'ppc', motivo: 'Licencia', nota: 'Licencia 06-11 a 12-11' },
    { id: 'a6', grupo: 'Turnos de noche de hoy', puesto: 'Control de acceso rotativo', pid: 'ca-rot', turno: '20:00–08:00', mid: true, quien: 'Andrés Castillo', rol: 'Relevo', ent: null, sal: null, estado: 'programado', nota: 'Empieza en 7 h 20 min' },
    { id: 'a7', grupo: 'Noche de ayer (terminó hoy)', puesto: 'Control de acceso noche 1', pid: 'ca-n1', turno: 'jue 05 20:00–08:00', mid: true, quien: 'Daniel Morales', rol: 'Relevo', ent: { h: '19:52', via: 'Facial' }, sal: { h: '08:03', via: 'Manual', por: 'Ricardo Soto · lector sin conexión' }, estado: 'completo', nota: 'Turno completo' },
    { id: 'a8', grupo: 'Noche de ayer (terminó hoy)', puesto: 'Control de acceso rotativo', pid: 'ca-rot', turno: 'jue 05 20:00–08:00', mid: true, quien: 'Andrés Castillo', rol: 'Relevo', ent: { h: '19:58', via: 'Facial' }, sal: { h: '08:01', via: 'Facial' }, estado: 'completo', nota: 'Turno completo' }
  ];

  const pad = n => String(n).padStart(2, '0');
  function cellsFor(key, month) {
    const m = MONTHS[month], f = S[key];
    const out = [];
    for (let d = 1; d <= m.days; d++) {
      const o = m.off + d - 1, v = f ? f(o) : '-';
      out.push(v);
    }
    return out;
  }
  function days(month) {
    const m = MONTHS[month], out = [];
    for (let d = 1; d <= m.days; d++) { const w = wd(m.off + d - 1); out.push({ d, label: WD[w] + ' ' + pad(d), wd: WD[w], we: w === 0 || w === 6, date: pad(d) + '-' + m.mm + '-2026' }); }
    return out;
  }
  // tira desde offset (puede ser negativo: octubre) — usa misma función
  // fecha de un offset (0 = 01-11-2026)
  function dateOf(o) { const d = new Date(2026, 10, 1 + o); return { dd: pad(d.getDate()), mm: pad(d.getMonth() + 1), wd: WD[d.getDay()], s: pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear() }; }
  // celdas de tira para la UI: v = 'D'|'N'|'-'|{ppc}|null
  function cellUI(v) {
    if (v === null) return { t: '', bg: 'repeating-linear-gradient(135deg, transparent 0 3px, hsl(var(--ds-border-default)) 3px 4px)', fg: 'transparent', bd: 'hsl(var(--ds-border-subtle))', tip: 'Fuera de vigencia' };
    if (typeof v === 'object') return { t: 'PPC', ppc: true, bg: 'hsl(var(--ds-danger-soft))', fg: 'hsl(var(--ds-danger-fg))', bd: 'hsl(var(--ds-danger-border))', tip: v.tip || ('PPC · ' + v.ppc), motivo: v.ppc };
    if (v === '-') return { t: '–', bg: 'hsl(var(--app-muted))', fg: 'hsl(var(--ds-text-4))', bd: 'transparent', tip: 'Libre' };
    return { t: v, bg: 'hsl(var(--app-muted))', fg: 'hsl(var(--ds-text-1))', bd: 'hsl(var(--ds-border-strong))', tip: v === 'D' ? 'Día' : 'Noche', work: true };
  }
  function strip(key, from, n) { const f = S[key], out = []; for (let i = 0; i < n; i++) out.push(f ? f(from + i) : '-'); return out; }

  window.PG = { TODAY, TODAY_LABEL, marcasHoy, personas, asistencia, WD, MONTHS, S, puestos, instalaciones, ppcHoy, cubiertosHoy, candidatos, noCumplen, patrones, cellsFor, days, strip, wd, pad, md, run4, dateOf, cellUI };
})();
