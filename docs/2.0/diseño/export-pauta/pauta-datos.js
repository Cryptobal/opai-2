(function(){
const DOW=['dom','lun','mar','mié','jue','vie','sáb'];
const DOWL=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DL=['D','L','M','M','J','V','S'];
const FER={12:'Encuentro de Dos Mundos',31:'Día de las Iglesias Evangélicas y Protestantes'};
const HOY=30, AHORA='10:24';
const pad=n=>String(n).padStart(2,'0');
const dow=d=>(d+3)%7;
const fch=d=>pad(d)+'-10-2026';
const fl=d=>DOW[dow(d)]+' '+fch(d);
const DAYS=Array.from({length:31},(_,i)=>i+1);
const PATS={'4x4':[4,4],'7x7':[7,7],'14x14':[14,14],'5x2':null,'2x5':[2,5],'3x4':[3,4]};
const PAT_HINT={'4x4':'4 días de turno y 4 libres.','7x7':'7 días de turno y 7 libres.','14x14':'14 días de turno y 14 libres.','5x2':'Lunes a viernes; libre sábado y domingo.','2x5':'2 días de turno y 5 libres.','3x4':'3 días de turno y 4 libres.'};
const INST=[
 {id:'q',n:'Planta Quilicura',cli:'Logística Andes SpA',sup:true},
 {id:'l',n:'Bodega Lampa',cli:'Logística Andes SpA',sup:true},
 {id:'t',n:'Torre Apoquindo',cli:'Inmobiliaria Apoquindo S.A.',sup:false}];
const E=(k,rep)=>({k,rep});
const PU={
 q:[
  {id:'q1',n:'Portería principal',t:'Día',h:'08:00–20:00',pat:'4x4',o:0,tit:'Juan Pérez Soto',rut:'16.234.567-8',exc:{17:E('Ausencia')}},
  {id:'q2',n:'Portería principal',t:'Noche',h:'20:00–08:00',pat:'4x4',o:4,tit:'Luis Muñoz Vera',rut:'15.876.234-1',exc:{29:E('Licencia médica','Pedro Rojas Díaz'),30:E('Licencia médica'),31:E('Licencia médica')}},
  {id:'q3',n:'Andén de carga',t:'Día',h:'08:00–20:00',pat:'7x7',o:2,tit:'Javiera Morales Pinto',rut:'18.402.113-5',alert:'horas'},
  {id:'q4',n:'Andén de carga',t:'Noche',h:'20:00–08:00',pat:'7x7',o:9,tit:'Rodrigo Tapia Fuentes',rut:'14.991.320-7',exc:{8:E('Permiso','Jorge Díaz Ortiz')}},
  {id:'q5',n:'Control de camiones',t:'Día',h:'08:00–18:00',pat:'5x2',tit:'Marcela Vidal Núñez',rut:'17.118.604-2',exc:{19:E('Vacaciones','Felipe Cortés Silva'),20:E('Vacaciones','Felipe Cortés Silva'),21:E('Vacaciones','Felipe Cortés Silva'),22:E('Vacaciones'),23:E('Vacaciones')}},
  {id:'q6',n:'Sala de monitoreo',t:'Día',h:'08:00–20:00',pat:'3x4',o:0,tit:'Andrés Soto Pinto',rut:'13.554.901-6',vac:20},
  {id:'q7',n:'Ronda perímetro',t:'Noche',h:'20:00–08:00',pat:'14x14',o:0,tit:'Camila Herrera Lagos',rut:'19.230.875-4'},
  {id:'q8',n:'Recepción',t:'Día',h:'09:00–21:00',pat:'2x5',o:2,tit:'Tomás Lagos Ruiz',rut:'20.115.448-9'}],
 l:[
  {id:'l1',n:'Portería',t:'Día',h:'08:00–20:00',pat:'4x4',o:3,tit:'Luis Alberto Pérez',rut:'16.778.120-3',exc:{30:E('Ausencia','Felipe Cortés Silva')}},
  {id:'l2',n:'Portería',t:'Noche',h:'20:00–08:00',pat:'4x4',o:7,tit:'Hernán Silva Mora',rut:'12.903.448-1',exc:{13:E('Ausencia')}},
  {id:'l3',n:'Acceso vehicular',t:'Día',h:'08:00–20:00',pat:'5x2',tit:'Pedro Rojas Díaz',rut:'15.320.887-K'},
  {id:'l4',n:'Ronda',t:'Día',h:'12:00–00:00',pat:'7x7',o:2,tit:'Ignacio Fuentes Mora',rut:'18.660.214-0'}],
 t:[
  {id:'t1',n:'Recepción',t:'Día',h:'08:30–17:30',pat:'5x2',tit:'Daniela Reyes Soto',rut:'17.451.009-8'},
  {id:'t2',n:'Control de acceso',t:'Día',h:'08:00–18:00',pat:'5x2',tit:'Rosa Castillo Mella',rut:'14.220.763-5',exc:{30:E('Vacaciones')}},
  {id:'t3',n:'Control de acceso',t:'Noche',h:'20:00–08:00',pat:'7x7',o:9,tit:'Mauricio Peña Araya',rut:'16.002.381-7'}]
};
const ALL=[].concat(PU.q,PU.l,PU.t);
const instOf=id=>INST.find(i=>PU[i.id].some(p=>p.id===id));
const puesto=id=>ALL.find(p=>p.id===id);
function works(p,d){const P=PATS[p.pat];if(!P){const w=dow(d);return w>=1&&w<=5;}return ((d-1+(p.o||0))%(P[0]+P[1]))<P[0];}
function base(p,d){if(p.vac&&d>=p.vac)return{st:'X',m:'Sin titular',exc:false};const e=p.exc&&p.exc[d];if(e&&e.rep)return{st:'R',m:e.k,rep:e.rep,exc:true};if(e)return{st:'X',m:e.k,exc:true};return{st:'OK'};}
function cell(p,d,reps,nl){if(!works(p,d))return{st:'L'};let b=base(p,d);if(d===HOY&&nl&&nl[p.id]&&b.st==='OK')b={st:'X',m:'No llegó',exc:true};if(d===HOY&&reps&&reps[p.id]&&b.st==='X')return{st:'R',rep:reps[p.id],m:b.m,exc:true,extra:true};return b;}
const titOf=(p,d)=>p.vac&&d>=p.vac?'':p.tit;
const code=(p,k)=>k.st==='L'?'L':k.st==='X'?'X':(p.t==='Noche'?'N':'D');
const badge=k=>k.st==='OK'?['badge b-success','Cubierto']:k.st==='X'?['badge b-danger','PPC · '+k.m]:k.st==='R'?['badge b-info','Reemplazado']:['badge b-neutral','Libre'];
const ini=n=>n?n.split(' ').slice(0,2).map(x=>x[0]).join(''):'—';
const pct=x=>(x*100).toFixed(1).replace('.',',')+' %';
const ASIS={q3:{m:'08:14',at:14},l3:{m:'07:52'}};
const MK0={l1:{e:{h:'08:02',by:'Marcos Leiva',mot:'El guardia no tiene celular'}},t1:{e:{h:'08:24',by:'Andrés Molina',mot:'Falla del equipo'}}};
const REFS0=[{id:'r1',inst:'q',fn:'Control de acceso evento',d:31,h:'20:00–02:00',n:2,cubre:['Cristián Bravo Leiva',''],mot:'Pedido del cliente',sol:'SOL-0142'},{id:'r2',inst:'l',fn:'Refuerzo de ronda',d:30,h:'18:00–23:00',n:1,cubre:['Andrea Fuentes Vidal'],mot:'Contingencia',sol:''}];
const CONF0={q3:'08:20 · Marcos Leiva',l3:'08:05 · Marcos Leiva',t1:'08:40 · Andrés Molina'};
const USERS={owner:{n:'Andrés Molina',r:'Dueño',ini:'AM'},admin:{n:'Andrés Molina',r:'Administrador',ini:'AM'},gerente:{n:'Paula Sepúlveda',r:'Gerente de operaciones',ini:'PS'},supervisor:{n:'Marcos Leiva',r:'Supervisor',ini:'ML'},viewer:{n:'Daniela Paz',r:'Solo lectura',ini:'DP'}};
const CANDS=[
 {id:'c1',n:'Cristián Bravo Leiva',rut:'17.902.334-6',why:['Libre hoy','A 3 km','Conoce la instalación']},
 {id:'c2',n:'Jorge Díaz Ortiz',rut:'16.554.210-3',why:['Libre hoy','A 6 km','Conoce la instalación'],warn:'horas'},
 {id:'c3',n:'Sebastián Muñoz Rivas',rut:'19.876.002-1',why:['Libre hoy','A 11 km'],warn:'descanso'},
 {id:'c4',n:'Pedro Rojas Díaz',rut:'15.320.887-K',why:['Conoce la instalación'],block:'dobla'}];
const NODISP=[
 {n:'Valentina Rojas Díaz',rut:'18.115.672-2',m:'Permiso administrativo hoy'},
 {n:'Hernán Silva Mora',rut:'12.903.448-1',m:'Vacaciones del 26-10 al 08-11-2026'},
 {n:'Luis Muñoz Vera',rut:'15.876.234-1',m:'Licencia médica hasta el 31-10-2026'}];
const HIST=[
 {dot:'tl-dot person',ini:'ML',t:'Marcos Leiva cargó un reemplazo',d:'Pedro Rojas Díaz cubre Portería principal · Noche el 29-10-2026. Quedó como turno extra por aprobar.',when:'29-10-2026 17:42'},
 {dot:'tl-dot person',ini:'ML',t:'Marcos Leiva registró una licencia médica',d:'Luis Muñoz Vera, del 26-10-2026 al 31-10-2026. Sus turnos quedaron como PPC con motivo «Licencia médica».',when:'26-10-2026 09:15'},
 {dot:'tl-dot agent',ini:'OP',t:'Sala de monitoreo quedó sin titular',d:'Andrés Soto Pinto dejó el puesto. Desde el 20-10-2026 los turnos son PPC con motivo «Sin titular».',when:'20-10-2026 08:00'},
 {dot:'tl-dot person',ini:'AM',t:'Andrés Molina cambió la serie de Control de camiones',d:'De 4x4 a 5x2 desde el 05-10-2026. Los días anteriores no cambiaron.',when:'02-10-2026 11:30'},
 {dot:'tl-dot agent',ini:'OP',t:'La pauta de octubre se replicó sola',d:'8 puestos, según el ciclo de cada serie.',when:'01-10-2026 00:00'}];
window.PD={MK0,REFS0,DOW,DOWL,DL,FER,HOY,AHORA,pad,dow,fch,fl,DAYS,PATS,PAT_HINT,INST,PU,ALL,instOf,puesto,works,base,cell,titOf,code,badge,ini,pct,ASIS,CONF0,USERS,CANDS,NODISP,HIST};
})();
