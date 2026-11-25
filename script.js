/* Tato Car Wash · Panel ejecutivo · Solo lectura */
const SUPABASE_URL = 'https://pwjrtooufcuoiiefvqlx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3anJ0b291ZmN1b2lpZWZ2cWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODk2NzMsImV4cCI6MjEwNjg2NTY3M30.FFz5swyLXX7O5INEH_0gJTIAUHjgL6rWwDzhXjasOs0';
const sb = window.supabase.createClient(SUPABASE_URL,
SUPABASE_ANON_KEY,
{
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
}
);
let businessData = null,
channel = null,
currentUser = null;
const $ = id => document.getElementById(id);
const money = n => '$' + (Number(n) || 0).toLocaleString('en-US',
{
    minimumFractionDigits:2,
    maximumFractionDigits:2
}
);
const num = n => Math.max(0,
Number.parseFloat(n) || 0);
function escapeHTML(v){
    return String(v ?? '').replace(/[&<>"']/g,
    c=>({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
    }
[c]));
}
function setConnection(online,
label){
    $('connectionText').textContent=label;
    $('syncStatus').textContent=online?'Datos sincronizados':'Esperando conexión';
    $('connectionText').parentElement.classList.toggle('offline',
    !online);
}
function toast(msg){
    const t=$('toast');
    t.textContent=msg;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),
    2600);
}
function parseLocalDate(value){
    if(!value)return null;
    if(value instanceof Date)return value;
    const s=String(value);
    let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m)return new Date(+m[3],
    +m[2]-1,
    +m[1]);
    m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m)return new Date(+m[1],
    +m[2]-1,
    +m[3]);
    const d=new Date(s);
    return Number.isNaN(d.getTime())?null:d;
}
function recordDate(r){
    return parseLocalDate(r.fecha)|| (Number(r.registroAt)>0?new Date(Number(r.registroAt)):parseLocalDate(r.timestamp));
}
function sameDay(a,
b){
    return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}
function getPeriodRecords(){
    const all=Array.isArray(businessData?.registros)?businessData.registros:[];
    const now=new Date();
    now.setHours(0,
    0,
    0,
    0);
    const mode=$('periodSelect').value;
    return all.filter(r=>{
        const d=recordDate(r);
        if(!d)return false;
        d.setHours(0,
        0,
        0,
        0);
        if(mode==='today')return sameDay(d,
        now);
        if(mode==='month')return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
        const days=Number(mode)||7;
        const start=new Date(now);
        start.setDate(start.getDate()-(days-1));
        return d>=start&&d<=now;
    }
);
}
function serviceAmount(r){
    const base=num(r.monto),
    discount=Math.min(base,
    num(r.descuento));
    return Math.max(0,
    base-discount);
}
function transactionAmount(r){
    return serviceAmount(r)+num(r.propina);
}
function paymentParts(r){
    const fp=String(r.formaPago||r.metodoPago||'').toLowerCase();
    const total=transactionAmount(r);
    if(fp==='mixto')return {
        cash:num(r.montoEfectivoMixto),
        yappy:num(r.montoYappyMixto)
    }
;
if(fp==='yappy'||fp==='yape')return {
    cash:0,
    yappy:total
}
;
if(fp==='efectivo')return {
    cash:total,
    yappy:0
}
;
return {
    cash:0,
    yappy:0
}
;
}
function hasMotor(r){
    const arr=Array.isArray(r.serviciosArray)?r.serviciosArray:[];
    return arr.some(x=>String(x).toLowerCase()==='motor')||/\bmotor\b/i.test(r.servicio||'');
}
function dateKey(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function renderChart(records){
    const mode=$('periodSelect').value,
    now=new Date();
    now.setHours(0,
    0,
    0,
    0);
    let days=mode==='today'?1:mode==='month'?Math.max(1,
    now.getDate()):Number(mode);
    const start=new Date(now);
    start.setDate(start.getDate()-days+1);
    const points=[];
    for(let i=0;
    i<days;
    i++){
        const d=new Date(start);
        d.setDate(start.getDate()+i);
        points.push({
            date:d,
            value:0
        }
    );
}
const map=new Map(points.map(p=>[dateKey(p.date),
p]));
records.forEach(r=>{
    if(r.estadoPago!=='PAGADO')return;
    const d=recordDate(r);
    if(!d)return;
    const p=map.get(dateKey(d));
    if(p)p.value+=serviceAmount(r);
}
);
const vals=points.map(p=>p.value),
max=Math.max(1,
...vals),
W=720,
H=210,
left=12,
right=12,
top=14,
bottom=28,
usableW=W-left-right,
usableH=H-top-bottom;
const coords=points.map((p,
i)=>({
    x:points.length===1?W/2:left+(i/(points.length-1))*usableW,
    y:top+usableH-(p.value/max)*usableH
}
));
const line=coords.map((p,
i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
const area=line+` L ${coords[coords.length-1].x} ${H-bottom} L ${coords[0].x} ${H-bottom} Z`;
$('chartLine').setAttribute('d',
line);
$('chartArea').setAttribute('d',
area);
$('chartPoints').innerHTML=coords.map((p,
i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===coords.length-1?5:2.7}" fill="#fff" stroke="#0ea5e9" stroke-width="2.5"/>`).join('');
const labelIndexes=points.length<=7?points.map((_,
i)=>i):[0,
Math.floor((points.length-1)/3),
Math.floor(2*(points.length-1)/3),
points.length-1];
$('chartLabels').innerHTML=[...new Set(labelIndexes)].map(i=>{
    const p=points[i],
    x=coords[i].x;
    return `<text x="${x}" y="${H-5}" text-anchor="middle" fill="#9aabbd" font-size="10" font-family="Plus Jakarta Sans">${p.date.toLocaleDateString('es-PA',{day:'2-digit',month:'short'})}</text>`
}
).join('');
const total=vals.reduce((a,
b)=>a+b,
0);
$('chartTotal').textContent=money(total);
$('chartCaption').textContent=mode==='today'?'Total de hoy':mode==='month'?'Acumulado del mes':`Total de ${days} días`;
}
function renderActivity(records){
    const list=[...records].sort((a,
    b)=>(Number(b.horaCobroAt)||Number(b.registroAt)||0)-(Number(a.horaCobroAt)||Number(a.registroAt)||0)).slice(0,
    6);
    $('activityCount').textContent=`${records.length} registros`;
    if(!list.length){
        $('activityList').innerHTML='<div class="empty-state">Todavía no hay movimientos en este período.</div>';
        return;
    }
$('activityList').innerHTML=list.map(r=>{
    const paid=r.estadoPago==='PAGADO';
    const plate=r.placa||r.auto||'Sin placa';
    const time=r.horaCobro||r.timestamp||r.hora||'—';
    const value=paid?serviceAmount(r):transactionAmount(r);
    return `<div class="activity-item"><div class="activity-avatar">${paid?'✓':'◷'}</div><div class="activity-info"><b>${escapeHTML(plate)} · ${escapeHTML(r.tipoVehiculo||'Vehículo')}</b><small>${escapeHTML(r.lavador||'Sin lavador')} · ${escapeHTML(time)} · ${paid?'Cobrado':'Pendiente'}</small></div><div class="activity-value ${paid?'':'pending'}">${money(value)}</div></div>`
}
).join('');
}
function render(){
    if(!businessData)return;
    const all=Array.isArray(businessData.registros)?businessData.registros:[];
    const records=getPeriodRecords();
    const paid=records.filter(r=>r.estadoPago==='PAGADO');
    const pending=records.filter(r=>r.estadoPago==='PENDIENTE');
    const cars=records.reduce((n,
    r)=>n+(hasMotor(r)?2:1),
    0);
    const cash=paid.reduce((n,
    r)=>n+paymentParts(r).cash,
    0);
    const yappy=paid.reduce((n,
    r)=>n+paymentParts(r).yappy,
    0);
    const collected=paid.reduce((n,
    r)=>n+serviceAmount(r),
    0);
    const pendingAmount=pending.reduce((n,
    r)=>n+transactionAmount(r),
    0);
    const onTrack=all.filter(r=>r.estadoPago==='PENDIENTE'&&/^[1-6]$/.test(String(r.pista||'').trim())).length;
    $('carsTotal').textContent=cars;
    $('carsHint').textContent=`${records.length} registro${records.length===1?'':'s'}`;
    $('carsOnTrack').textContent=onTrack;
    $('carsPending').textContent=money(pendingAmount);
    $('pendingAmount').textContent=`${pending.length} autos pendientes`;
    $('moneyCollected').textContent=money(collected);
    $('cashTotal').textContent=money(cash);
    $('yappyTotal').textContent=money(yappy);
    $('paymentTotal').textContent=money(cash+yappy);
    renderChart(records);
    renderActivity(records);
    const base=num(businessData.cajaBase);
    const extras=(businessData.ingresosExtras||[]).reduce((n,
    x)=>n+num(x.monto),
    0);
    const expenses=(businessData.gastos||[]).reduce((n,
    x)=>n+num(x.monto),
    0);
    const payouts=Object.values(calculatePaidByWasher()).reduce((n,
    x)=>n+x,
    0);
    const tips=all.filter(r=>r.estadoPago==='PAGADO').reduce((n,
    r)=>n+num(r.propina),
    0);
    const net=base+cash+extras-expenses-payouts-tips;
    $('cashBase').textContent=money(base);
    $('cashIn').textContent=money(cash);
    $('extraIn').textContent=money(extras);
    $('cashOut').textContent='−'+money(expenses+payouts+tips);
    $('cashBalance').textContent=money(net);
    $('cashStatus').textContent=businessData.cajaCerrada?'Caja cerrada':'En operación';
    $('cashStatus').classList.toggle('closed',
    !!businessData.cajaCerrada);
    $('updatedAt').textContent='Actualizado '+new Date().toLocaleTimeString('es-PA',
    {
        hour:'2-digit',
        minute:'2-digit'
    }
);
}
function calculatePaidByWasher(){
    const result={
    }
;
(businessData?.pagosLavadores||[]).forEach(p=>{
    const name=p.lavador||'';
    if(name)result[name]=(result[name]||0)+num(p.monto);
}
);
return result;
}
async function loadSnapshot(){
    if(!currentUser)return;
    setConnection(false,
    'Actualizando');
    const {
        data,
        error
    }
=await sb.from('app_data').select('data,updated_at').eq('user_id',
currentUser.id).maybeSingle();
if(error){
    console.error(error);
    setConnection(false,
    'Sin acceso');
    toast('No se pudieron leer los datos. Revisa el acceso de Supabase.');
    return;
}
if(!data?.data){
    businessData=null;
    toast('No se encontró información en app_data para esta cuenta.');
    return;
}
businessData=data.data;
render();
setConnection(true,
'En vivo');
$('syncStatus').textContent='Nube actualizada '+(data.updated_at?new Date(data.updated_at).toLocaleTimeString('es-PA',
{
    hour:'2-digit',
    minute:'2-digit'
}
):'');
}
function subscribeRealtime(){
    if(channel)sb.removeChannel(channel);
    channel=sb.channel('tato-dashboard-'+currentUser.id).on('postgres_changes',
    {
        event:'*',
        schema:'public',
        table:'app_data',
        filter:'user_id=eq.'+currentUser.id
    }
,
payload=>{
    if(payload.new?.data){
        businessData=payload.new.data;
        render();
        $('updatedAt').textContent='Actualizado en vivo · '+new Date().toLocaleTimeString('es-PA',
        {
            hour:'2-digit',
            minute:'2-digit'
        }
    );
    setConnection(true,
    'En vivo');
}
}
).subscribe(status=>{
    if(status==='SUBSCRIBED'){
        setConnection(true,
        'En vivo');
        loadSnapshot();
    }
else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
    setConnection(false,
    'Reconectando');
}
}
);
}
async function enterApp(user){
    currentUser=user;
    $('loginScreen').classList.add('hidden');
    $('app').classList.remove('hidden');
    await loadSnapshot();
    subscribeRealtime();
}
$('loginForm').addEventListener('submit',
async e=>{
    e.preventDefault();
    const btn=$('loginButton');
    btn.disabled=true;
    btn.textContent='Verificando acceso…';
    $('loginError').textContent='';
    const {
        data,
        error
    }
=await sb.auth.signInWithPassword({
    email:$('email').value.trim(),
    password:$('password').value
}
);
btn.disabled=false;
btn.innerHTML='Entrar al panel <span>→</span>';
if(error){
    $('loginError').textContent='No se pudo iniciar sesión. Verifica el correo, la contraseña y los permisos.';
    return;
}
await enterApp(data.user);
}
);
$('periodSelect').addEventListener('change',
render);
$('refreshBtn').addEventListener('click',
loadSnapshot);
$('logoutBtn').addEventListener('click',
async()=>{
    if(channel){
        await sb.removeChannel(channel);
        channel=null;
    }
await sb.auth.signOut();
businessData=null;
currentUser=null;
$('app').classList.add('hidden');
$('loginScreen').classList.remove('hidden');
$('password').value='';
}
);
sb.auth.getSession().then(({
    data,
    error
}
)=>{
    if(error){
        console.error(error);
        return;
    }
if(data.session?.user)enterApp(data.session.user);
}
);
if('serviceWorker' in navigator)window.addEventListener('load',
()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker:',
err)));
