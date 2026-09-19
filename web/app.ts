import { createClient, type Session, type User } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

const SUPABASE_URL = "https://dvdpgllezrmttrknbcjq.supabase.co";
const SUPABASE_KEY = "sb_publishable_u8aF30AdRo_flW3qb-Z8sg_evTHk9Ry";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

type Profile = { user_id:string; full_name:string; email:string; phone_e164:string; role:string; identity_verified_at:string|null };
type AnyRow = Record<string, any>;

const app = document.querySelector<HTMLDivElement>("#app")!;
const toastRegion = document.querySelector<HTMLDivElement>("#toast-region")!;
let session: Session | null = null;
let profile: Profile | null = null;
let route = location.hash.replace("#","") || "dashboard";
let authMode: "login"|"signup" = "login";
let selectedRegistryActivities: Array<{ciiu:string;activity:string;primary:boolean}> = [];
let lastIcaCalculation: AnyRow | null = null;
let lastReteicaCalculation: AnyRow | null = null;

const esc = (v:any) => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!));
const money = (v:any) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(v||0));
const date = (v:any) => v ? new Intl.DateTimeFormat("es-CO",{dateStyle:"medium"}).format(new Date(v)) : "—";
const statusClass = (s:string) => /APPROVED|PAID|FILED|ISSUED|VERIFIED|ACTIVE|AVAILABLE/i.test(s) ? "ok" : /REJECT|DECLIN|DEFAULT|CANCEL/i.test(s) ? "danger" : /PENDING|DRAFT|REVIEW|SUBMITTED|READY/i.test(s) ? "warn" : "info";
const humanStatus = (s:any) => String(s||"").replaceAll("_"," ");
const userInitials = () => (profile?.full_name || session?.user.email || "HC").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();

function toast(message:string,type:"ok"|"error"|"warn"="ok"){
  const n=document.createElement("div"); n.className="toast "+type; n.textContent=message; toastRegion.appendChild(n); setTimeout(()=>n.remove(),4500);
}
function spinner(label="Procesando"){ return `<div class="empty">${esc(label)}…</div>`; }
function requireSession(){
  if(!session){ toast("Debes iniciar sesión para continuar.","warn"); route="dashboard"; render(); return false; }
  return true;
}
async function api<T=any>(promise:PromiseLike<{data:T|null,error:any}>):Promise<T>{
  const {data,error}=await promise; if(error) throw error; return data as T;
}
async function loadProfile(){
  if(!session){profile=null;return;}
  const {data}=await supabase.from("profiles").select("user_id,full_name,email,phone_e164,role,identity_verified_at").eq("user_id",session.user.id).maybeSingle();
  profile=data as Profile|null;
}
async function bootstrap(){
  const {data}=await supabase.auth.getSession(); session=data.session; await loadProfile();
  supabase.auth.onAuthStateChange(async (_event,newSession)=>{session=newSession; await loadProfile(); render();});
  addEventListener("hashchange",()=>{route=location.hash.replace("#","")||"dashboard";render();});
  render();
}

function navItem(id:string,icon:string,label:string){return `<button data-route="${id}" class="${route===id?"active":""}"><span class="ico">${icon}</span><span>${label}</span></button>`;}
function shell(content:string){
  const official=profile && profile.role!=="citizen";
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><div class="brand-badge">HC</div><div><strong>Hacienda Conecta</strong><small>San Pedro · Valle</small></div></div>
      <nav class="nav">
        <div class="sep">Principal</div>
        ${navItem("dashboard","⌂","Inicio")}
        ${navItem("registry","◎","Registro Tributario")}
        ${navItem("declarations","▤","Mis declaraciones")}
        <div class="sep">Declaraciones y recaudo</div>
        ${navItem("ica","Σ","ICA · Avisos")}
        ${navItem("reteica","⇄","RETEICA")}
        ${navItem("payments","$","Pagos")}
        ${navItem("security","✓","Firma y MFA")}
        ${navItem("certificates","▣","Certificados")}
        <div class="sep">Hacienda</div>
        ${navItem("predial","⌂","Predial y paz y salvo")}
        ${navItem("agreements","▦","Acuerdos de pago")}
        ${navItem("refunds","↶","Devoluciones")}
        ${navItem("audit","◉","Fiscalización")}
        ${navItem("revenues","◇","Demás rentas")}
        ${navItem("legal","§","Normativa y parámetros")}
        ${official?'<div class="sep">Funcionarios</div>'+navItem("staff","◆","Consola de Hacienda"):""}
      </nav>
      <div class="side-status"><strong>Base tributaria 2026</strong><small>UVT $52.374 · 324 actividades ICA</small></div>
    </aside>
    <section class="content">
      <header class="topbar">
        <div class="top-left"><button class="btn ghost small mobile-menu" id="menuBtn">☰</button><div><span class="top-title">Secretaría de Hacienda</span><span class="top-sub">Servicios tributarios digitales</span></div></div>
        <div class="top-actions">
          <span class="pill">🔒 Sesión segura</span>
          ${session?`<span class="avatar">${esc(userInitials())}</span><button class="btn ghost small" id="logoutBtn">Salir</button>`:`<button class="btn small" data-action="login">Ingresar</button>`}
        </div>
      </header>
      <main class="main">${content}</main>
    </section>
  </div>`;
}
function bindShell(){
  document.querySelectorAll<HTMLElement>("[data-route]").forEach(b=>b.onclick=()=>{location.hash=b.dataset.route!;});
  document.querySelector("#menuBtn")?.addEventListener("click",()=>document.querySelector("#sidebar")?.classList.toggle("open"));
  document.querySelector("#logoutBtn")?.addEventListener("click",async()=>{await supabase.auth.signOut();location.hash="dashboard";});
  document.querySelectorAll<HTMLElement>('[data-action="login"]').forEach(b=>b.onclick=()=>renderAuth());
}

function renderAuth(){
  app.innerHTML=`<div class="auth-page">
    <section class="auth-visual">
      <div class="brand-badge">HC</div>
      <div class="kicker" style="color:#b9ddff;margin-top:24px">Municipio de San Pedro · Valle del Cauca</div>
      <h1>Hacienda Conecta</h1>
      <p>Un solo portal para registro tributario, declaraciones ICA y RETEICA, firma con autenticación reforzada, pagos, certificados, predial, acuerdos de pago, devoluciones y seguimiento de trámites.</p>
      <div class="kpi-strip"><span class="kpi-chip"><strong>324</strong>Códigos ICA</span><span class="kpi-chip"><strong>2026</strong>UVT parametrizada</span><span class="kpi-chip"><strong>RLS</strong>Privacidad por usuario</span></div>
    </section>
    <section class="auth-panel"><div class="auth-card">
      <div class="kicker">Acceso ciudadano</div><h2>${authMode==="login"?"Ingresar":"Crear cuenta"}</h2>
      <p class="muted">Tu sesión se gestiona mediante Supabase Auth y los datos tributarios se aíslan mediante Row Level Security.</p>
      <div class="auth-tabs"><button id="loginTab" class="${authMode==="login"?"active":""}">Ingresar</button><button id="signupTab" class="${authMode==="signup"?"active":""}">Registrarme</button></div>
      <form id="authForm" class="stack">
        ${authMode==="signup"?'<div class="field"><label>Nombre completo / razón social</label><input class="input" name="name" required autocomplete="name"></div>':""}
        <div class="field"><label>Correo electrónico</label><input class="input" type="email" name="email" required autocomplete="email"></div>
        ${authMode==="signup"?'<div class="field"><label>Teléfono</label><input class="input" name="phone" placeholder="+573001234567" required autocomplete="tel"></div>':""}
        <div class="field"><label>Contraseña</label><input class="input" type="password" name="password" minlength="10" required autocomplete="${authMode==="login"?"current-password":"new-password"}"><span class="hint">Mínimo 10 caracteres. Para firmar se exigirá un segundo factor.</span></div>
        <button class="btn" type="submit">${authMode==="login"?"Ingresar":"Crear cuenta segura"}</button>
      </form>
      <div class="note mt">El registro de usuario no sustituye el Registro Tributario. Al ingresar deberás completar NIT/identificación, actividad CIIU, establecimiento y relaciones tributarias.</div>
      <button class="btn ghost mt" id="publicBtn">Continuar sin cuenta a servicios públicos</button>
    </div></section>
  </div>`;
  document.querySelector("#loginTab")!.addEventListener("click",()=>{authMode="login";renderAuth();});
  document.querySelector("#signupTab")!.addEventListener("click",()=>{authMode="signup";renderAuth();});
  document.querySelector("#publicBtn")!.addEventListener("click",()=>{route="dashboard";location.hash="dashboard";render();});
  document.querySelector("#authForm")!.addEventListener("submit",async(e)=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget as HTMLFormElement);
    const email=String(fd.get("email")||"").trim(), password=String(fd.get("password")||"");
    try{
      if(authMode==="login"){
        const {error}=await supabase.auth.signInWithPassword({email,password}); if(error)throw error;
        toast("Ingreso exitoso.");
      }else{
        const name=String(fd.get("name")||"").trim(), phone=String(fd.get("phone")||"").trim();
        const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name,phone}}}); if(error)throw error;
        if(!data.session) toast("Cuenta creada. Revisa tu correo para confirmar el acceso.","warn"); else toast("Cuenta creada.");
      }
    }catch(err:any){toast(err.message||"No fue posible autenticar.","error");}
  });
}

async function render(){
  if(!session && ["registry","declarations","payments","security","predial","agreements","refunds","audit","staff"].includes(route)){renderAuth();return;}
  app.innerHTML=shell(spinner("Cargando módulo"));
  bindShell();
  try{
    let html="";
    switch(route){
      case "dashboard": html=await viewDashboard(); break;
      case "registry": html=await viewRegistry(); break;
      case "declarations": html=await viewDeclarations(); break;
      case "ica": html=await viewIca(); break;
      case "reteica": html=await viewReteica(); break;
      case "payments": html=await viewPayments(); break;
      case "security": html=await viewSecurity(); break;
      case "certificates": html=await viewCertificates(); break;
      case "predial": html=await viewPredial(); break;
      case "agreements": html=await viewAgreements(); break;
      case "refunds": html=await viewRefunds(); break;
      case "audit": html=await viewAudit(); break;
      case "revenues": html=await viewRevenues(); break;
      case "legal": html=await viewLegal(); break;
      case "staff": html=await viewStaff(); break;
      default: route="dashboard"; html=await viewDashboard();
    }
    app.innerHTML=shell(html); bindShell(); bindView(route);
  }catch(err:any){app.innerHTML=shell(`<div class="note danger"><strong>No fue posible cargar este módulo.</strong><br>${esc(err.message||err)}</div>`);bindShell();}
}

async function viewDashboard(){
  let summary:any={declarations:0,pendingPayments:0,certificates:0,notifications:0,registrationStatus:null};
  if(session){try{summary=await api(supabase.rpc("dashboard_summary"));}catch{}}
  const {data:catalog}=await supabase.from("revenue_catalog").select("code,name,implementation_phase,implementation_status").order("implementation_phase").limit(8);
  return `<section class="hero"><div><div class="kicker" style="color:#b9ddff">Portal tributario municipal</div><h1>Hacienda sin filas, con trazabilidad.</h1><p>Consulta, liquida, presenta y realiza seguimiento a tus obligaciones desde un entorno único. Los cálculos ICA/RETEICA usan reglas almacenadas y versionadas en la base tributaria.</p><div class="actions"><button class="btn" data-route="ica">Liquidar ICA</button><button class="btn secondary" data-route="reteica">Calcular RETEICA</button></div></div><div class="hero-panel"><small>Parámetro oficial cargado</small><strong>UVT 2026 · $52.374</strong><small>Resolución DIAN 000238 de 2025</small></div></section>
  <div class="grid cols-4 mb">
    ${metric("▤",summary.declarations,"Declaraciones")}
    ${metric("$",summary.pendingPayments,"Pagos pendientes")}
    ${metric("▣",summary.certificates,"Certificados")}
    ${metric("●",summary.registrationStatus||"No iniciado","Registro tributario")}
  </div>
  <div class="grid cols-2">
    <section class="card"><div class="section-title"><div><div class="kicker">Accesos rápidos</div><h2>Trámites principales</h2></div></div>
      <div class="module-grid">
        ${moduleCard("◎","Registro Tributario","Actualiza identificación, CIIU, establecimiento y responsables.","registry","Fase 1")}
        ${moduleCard("Σ","Declaración ICA","Liquidación multiactividad, avisos y mínimo tributario.","ica","Operativo")}
        ${moduleCard("⇄","RETEICA","Cálculo por compra/servicio y base mínima en UVT.","reteica","Operativo")}
        ${moduleCard("⌂","Predial","Consulta de cuenta, deuda y solicitudes de paz y salvo.","predial","Integración")}
        ${moduleCard("▦","Acuerdos de pago","Radica solicitudes y consulta su estado.","agreements","Disponible")}
        ${moduleCard("↶","Devoluciones","Solicitud, soportes y seguimiento.","refunds","Disponible")}
      </div>
    </section>
    <section class="card accent"><div class="section-title"><div><div class="kicker">Estado del sistema</div><h2>Implementación por módulos</h2></div><button class="btn ghost small" data-route="revenues">Ver todas</button></div>
      <div class="timeline">${(catalog||[]).map((x:any)=>`<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(x.name)}</strong><br><small>Fase ${x.implementation_phase} · ${esc(humanStatus(x.implementation_status))}</small></div></div>`).join("")}</div>
    </section>
  </div>`;
}
function metric(icon:string,value:any,label:string){return `<div class="card"><div class="metric"><div><div class="value">${esc(value)}</div><div class="label">${label}</div></div><div class="metric-icon">${icon}</div></div></div>`;}
function moduleCard(icon:string,title:string,desc:string,to:string,status:string){return `<article class="module" data-route="${to}"><div class="module-top"><span class="metric-icon">${icon}</span><span class="status info">${status}</span></div><h3>${title}</h3><p>${desc}</p></article>`;}

async function viewRegistry(){
  if(!requireSession()) return "";
  const {data:reg}=await supabase.from("taxpayer_registrations").select("*").eq("user_id",session!.user.id).maybeSingle();
  const {data:acts}=reg?await supabase.from("taxpayer_activities").select("ciiu,is_primary").eq("registration_id",reg.id):{data:null};
  if(acts){
    const codes=(acts as any[]).map(a=>a.ciiu);
    const {data:catalog}=codes.length?await supabase.from("ica_tariffs").select("ciiu,activity").in("ciiu",codes):{data:[] as any[]};
    const names=new Map((catalog||[]).map((x:any)=>[x.ciiu,x.activity]));
    selectedRegistryActivities=(acts as any[]).map(a=>({ciiu:a.ciiu,activity:names.get(a.ciiu)||"",primary:a.is_primary}));
  }
  const readonly=reg && reg.status!=="PENDING";
  return `<div class="page-head"><div><div class="kicker">Registro tributario</div><h1>Identificación del contribuyente</h1><p>Consolida los datos necesarios para presentar declaraciones y operar trámites de Hacienda. Los documentos de identificación se almacenan como huellas criptográficas, no en texto plano.</p></div><span class="status ${statusClass(reg?.status||"PENDING")}">${esc(reg?.status||"SIN REGISTRO")}</span></div>
  ${readonly?'<div class="note warn mb">El registro ya fue enviado a validación. Los campos tributarios quedan bloqueados para evitar alteraciones posteriores sin trazabilidad.</div>':""}
  <form id="registryForm" class="card">
    <div class="section-title"><h2>Datos generales</h2><span class="status info">RLS protegido</span></div>
    <div class="form-grid">
      <div class="field"><label>Tipo de persona</label><select class="select" name="personType" ${readonly?"disabled":""}><option value="NATURAL" ${reg?.person_type==="NATURAL"?"selected":""}>Persona natural</option><option value="JURIDICA" ${reg?.person_type==="JURIDICA"?"selected":""}>Persona jurídica</option></select></div>
      <div class="field"><label>Tipo de identificación</label><select class="select" name="documentType" ${readonly?"disabled":""}><option>CC</option><option>NIT</option><option>CE</option><option>PASAPORTE</option></select></div>
      <div class="field"><label>Número de identificación / NIT</label><input class="input" name="documentNumber" required placeholder="Se procesa para generar una huella SHA-256" ${readonly?"disabled":""}></div>
      <div class="field"><label>Nombre completo / razón social</label><input class="input" name="name" required value="${esc(reg?.business_name||profile?.full_name||session!.user.user_metadata?.full_name||"")}" ${readonly?"disabled":""}></div>
      <div class="field"><label>Correo</label><input class="input" type="email" name="email" required value="${esc(profile?.email||session!.user.email||"")}" ${readonly?"disabled":""}></div>
      <div class="field"><label>Teléfono internacional</label><input class="input" name="phone" required placeholder="+573001234567" value="${esc(profile?.phone_e164||session!.user.user_metadata?.phone||"")}" ${readonly?"disabled":""}></div>
      <div class="field full"><label>Dirección fiscal</label><input class="input" name="address" required value="${esc(reg?.fiscal_address||"")}" ${readonly?"disabled":""}></div>
    </div>
    <hr style="border:0;border-top:1px solid var(--line);margin:22px 0">
    <div class="section-title"><div><h2>Actividades económicas</h2><span class="hint">Selecciona del catálogo municipal de 324 códigos.</span></div></div>
    <div id="selectedActivities">${renderSelectedActivities(readonly)}</div>
    ${readonly?"":`<div class="searchbox mt"><input id="ciiuSearch" class="input" placeholder="Buscar por CIIU o descripción"><button class="btn secondary" type="button" id="ciiuSearchBtn">Buscar</button></div><div id="ciiuResults"></div>`}
    <hr style="border:0;border-top:1px solid var(--line);margin:22px 0">
    <details><summary><strong>Representante legal y contador</strong> <span class="muted tiny">Opcional / según obligación</span></summary>
      <div class="grid cols-2 mt">
        <div class="card"><h3>Representante legal</h3><div class="stack"><input class="input" name="repName" placeholder="Nombre completo" ${readonly?"disabled":""}><input class="input" name="repDoc" placeholder="Documento" ${readonly?"disabled":""}><input class="input" type="email" name="repEmail" placeholder="Correo" ${readonly?"disabled":""}></div></div>
        <div class="card"><h3>Contador</h3><div class="stack"><input class="input" name="accName" placeholder="Nombre completo" ${readonly?"disabled":""}><input class="input" name="accDoc" placeholder="Documento" ${readonly?"disabled":""}><input class="input" name="accCard" placeholder="Tarjeta profesional" ${readonly?"disabled":""}></div></div>
      </div>
    </details>
    ${readonly?"":`<label class="checkbox mt"><input type="checkbox" name="policy" required><span>Autorizo el tratamiento de los datos necesarios para la gestión tributaria, conforme a la política vigente del Municipio y la finalidad del trámite.</span></label><div class="actions mt"><button class="btn" type="submit">Guardar Registro Tributario</button></div>`}
  </form>`;
}
function renderSelectedActivities(readonly=false){
  if(!selectedRegistryActivities.length)return '<div class="empty">Aún no has seleccionado actividades económicas.</div>';
  return `<div class="table-wrap"><table class="table"><thead><tr><th>CIIU</th><th>Actividad</th><th>Tipo</th><th></th></tr></thead><tbody>${selectedRegistryActivities.map((a,i)=>`<tr><td><strong>${esc(a.ciiu)}</strong></td><td>${esc(a.activity)}</td><td>${a.primary?'<span class="status ok">Principal</span>':'Secundaria'}</td><td class="right">${readonly?"":`<button type="button" class="btn ghost small" data-primary="${i}">Hacer principal</button> <button type="button" class="btn danger small" data-remove-act="${i}">Quitar</button>`}</td></tr>`).join("")}</tbody></table></div>`;
}

async function viewIca(){
  return `<div class="page-head"><div><div class="kicker">Industria y Comercio</div><h1>Liquidación ICA 2026</h1><p>Calcula por actividad económica, aplica la tarifa por mil, el complementario de Avisos y Tableros y el mínimo tributario parametrizado. El resultado proviene de funciones de base de datos, no de fórmulas incrustadas en la pantalla.</p></div><span class="status ok">Motor activo</span></div>
  <div class="split">
    <section class="card">
      <div class="section-title"><h2>Datos de liquidación</h2><span class="pill">UVT $52.374</span></div>
      <div id="icaRows" class="stack">
        <div class="form-grid ica-row"><div class="field"><label>CIIU</label><input class="input" data-ciiu maxlength="4" value="1011"></div><div class="field"><label>Ingreso gravable en San Pedro</label><input class="input" data-income type="number" min="0" value="100000000"></div></div>
      </div>
      <div class="actions mt"><button class="btn secondary" type="button" id="addIcaRow">+ Agregar actividad</button></div>
      <label class="checkbox mt"><input id="icaNotices" type="checkbox"><span>Liquidar complementario de Avisos y Tableros cuando corresponda.</span></label>
      <div class="actions mt"><button class="btn" id="calculateIca">Calcular liquidación</button><button class="btn ghost" id="saveIca" disabled>Guardar declaración</button></div>
    </section>
    <aside class="card accent"><div class="kicker">Resultado</div><h2>Resumen ICA</h2><div id="icaResult">${lastIcaCalculation?renderIcaResult(lastIcaCalculation):'<div class="empty">Realiza el cálculo para ver el detalle.</div>'}</div></aside>
  </div>
  <section class="card mt"><div class="note">La tarifa se obtiene del catálogo CIIU municipal cargado en Supabase. Si una actividad no existe o no está validada, el motor rechaza el cálculo en lugar de asumir una tarifa.</div></section>`;
}
function renderIcaResult(r:any){return `<div class="stack"><div class="metric"><div><div class="label">ICA por actividades</div><div class="value">${money(r.subtotalIcaCop)}</div></div></div><div class="kpi-strip"><span class="kpi-chip"><strong>${money(r.minimumTaxCop)}</strong>Mínimo 2 UVT</span><span class="kpi-chip"><strong>${money(r.noticesAndBoardsCop)}</strong>Avisos y Tableros</span><span class="kpi-chip"><strong>${money(r.minimumAdjustmentCop)}</strong>Ajuste a mínimo</span></div><hr style="border:0;border-top:1px solid var(--line)"><div class="metric"><div><div class="label">Total antes de anticipos/retenciones</div><div class="value">${money(r.totalBeforeCreditsCop)}</div></div><span class="status ok">Calculado</span></div><div class="tiny muted">UVT aplicada: ${money(r.uvtValueCop)} · Vigencia ${r.taxYear}</div></div>`;}

async function viewReteica(){
  return `<div class="page-head"><div><div class="kicker">Retención de ICA</div><h1>Calculadora RETEICA</h1><p>Determina si una operación supera la base mínima y calcula la retención con la tarifa de la actividad. La periodicidad de presentación 2026 permanece bloqueada hasta validación jurídica formal.</p></div><span class="status warn">Periodicidad en validación</span></div>
  <div class="split"><section class="card"><div id="reteRows" class="stack"><div class="form-grid rete-row"><div class="field"><label>CIIU</label><input class="input" data-ciiu maxlength="4" value="1011"></div><div class="field"><label>Concepto</label><select class="select" data-concept><option value="services">Servicios</option><option value="goods">Compras / bienes</option></select></div><div class="field full"><label>Base de la operación</label><input class="input" data-base type="number" min="0" value="500000"></div></div></div><div class="actions mt"><button class="btn secondary" id="addReteRow">+ Agregar operación</button><button class="btn" id="calculateRete">Calcular RETEICA</button><button class="btn ghost" id="saveRete" disabled>Guardar declaración</button></div></section><aside class="card accent"><div class="kicker">Resultado</div><h2>Retención</h2><div id="reteResult">${lastReteicaCalculation?renderReteResult(lastReteicaCalculation):'<div class="empty">Agrega las operaciones y calcula.</div>'}</div></aside></div>
  <div class="note warn mt"><strong>Control normativo:</strong> el sistema calcula la retención, pero no muestra una fecha de vencimiento ni define mensual/bimestral hasta que Hacienda valide el acto vigente.</div>`;
}
function renderReteResult(r:any){return `<div class="metric"><div><div class="label">Total RETEICA</div><div class="value">${money(r.totalWithheldCop)}</div></div><span class="status ok">Calculado</span></div><div class="table-wrap mt"><table class="table"><thead><tr><th>CIIU</th><th>Base</th><th>Umbral</th><th>Tarifa</th><th>Retención</th></tr></thead><tbody>${(r.lines||[]).map((x:any)=>`<tr><td>${esc(x.ciiu)}</td><td>${money(x.baseCop)}</td><td>${money(x.thresholdCop)}</td><td>${x.ratePerThousand}‰</td><td class="money">${money(x.withheldCop)}</td></tr>`).join("")}</tbody></table></div>`;}

async function viewDeclarations(){
  if(!requireSession())return "";
  const {data}=await supabase.from("declarations").select("*").order("created_at",{ascending:false});
  return `<div class="page-head"><div><div class="kicker">Obligaciones</div><h1>Mis declaraciones</h1><p>Borradores, documentos listos para firma, pagos pendientes y declaraciones radicadas.</p></div><div class="actions"><button class="btn" data-route="ica">Nueva ICA</button><button class="btn secondary" data-route="reteica">Nueva RETEICA</button></div></div>
  <section class="card">${data?.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Tipo</th><th>Vigencia / período</th><th>Estado</th><th>Saldo</th><th>Creada</th><th></th></tr></thead><tbody>${data.map((d:any)=>`<tr><td><strong>${esc(d.tax_type)}</strong></td><td>${d.tax_year} · ${esc(d.period)}</td><td><span class="status ${statusClass(d.status)}">${esc(humanStatus(d.status))}</span></td><td class="money">${money(d.balance_due_cop)}</td><td>${date(d.created_at)}</td><td class="right">${declarationActions(d)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">No tienes declaraciones guardadas.</div>'}</section>`;
}
function declarationActions(d:any){
  if(d.status==="DRAFT"||d.status==="IDENTITY_VERIFIED") return `<button class="btn small" data-prepare="${d.id}">Preparar firma</button>`;
  if(d.status==="READY_TO_SIGN") return `<button class="btn small" data-sign="${d.id}">Firmar con MFA</button>`;
  if(d.status==="PAYMENT_PENDING") return `<button class="btn small" data-pay="${d.id}">Solicitar pago</button>`;
  return `<button class="btn ghost small" data-pdf="${d.id}">PDF</button>`;
}

async function viewPayments(){
  if(!requireSession())return "";
  const [{data:reqs},{data:paid},{data:decls}]=await Promise.all([
    supabase.from("payment_requests").select("*,declarations(tax_type,tax_year,period)").order("created_at",{ascending:false}),
    supabase.from("payments").select("*,declarations(tax_type,tax_year,period)").order("created_at",{ascending:false}),
    supabase.from("declarations").select("id,tax_type,tax_year,period,balance_due_cop,status").eq("status","PAYMENT_PENDING")
  ]);
  return `<div class="page-head"><div><div class="kicker">Recaudo</div><h1>Pagos y conciliación</h1><p>Los pagos definitivos solo avanzarán después de confirmación server-to-server de la pasarela y conciliación. El navegador nunca marca un impuesto como pagado por sí solo.</p></div></div>
  <div class="note warn mb"><strong>Integración comercial pendiente:</strong> todavía no hay credenciales de una pasarela PSE/tarjetas asociadas al Municipio. Puedes generar la solicitud y referencia; el cobro real permanecerá bloqueado hasta conectar el proveedor.</div>
  ${decls?.length?`<section class="card mb"><h2>Declaraciones pendientes de pago</h2><div class="actions">${decls.map((d:any)=>`<button class="btn" data-pay="${d.id}">${d.tax_type} ${d.period} · ${money(d.balance_due_cop)}</button>`).join("")}</div></section>`:""}
  <section class="card"><h2>Solicitudes de pago</h2>${reqs?.length?tableRows(reqs.map((p:any)=>[`<strong>${esc(p.reference)}</strong>`,esc(p.declarations?.tax_type||""),money(p.amount_cop),`<span class="status ${statusClass(p.status)}">${humanStatus(p.status)}</span>`,date(p.created_at)]),["Referencia","Tributo","Valor","Estado","Fecha"]):'<div class="empty">Aún no hay solicitudes de pago.</div>'}</section>
  ${paid?.length?`<section class="card mt"><h2>Pagos confirmados</h2>${tableRows(paid.map((p:any)=>[esc(p.reference),money(p.amount_cop),`<span class="status ok">${p.status}</span>`,date(p.verified_at)]),["Referencia","Valor","Estado","Verificado"])}</section>`:""}`;
}

async function viewSecurity(){
  if(!requireSession())return "";
  const [aal,factors]=await Promise.all([supabase.auth.mfa.getAuthenticatorAssuranceLevel(),supabase.auth.mfa.listFactors()]);
  const current=aal.data?.currentLevel||"aal1"; const verified=[...(factors.data?.totp||[]),...(factors.data?.phone||[])].filter((f:any)=>f.status==="verified");
  return `<div class="page-head"><div><div class="kicker">Seguridad de firma</div><h1>Autenticación multifactor</h1><p>Las firmas de declaraciones exigen nivel AAL2. La evidencia queda vinculada al usuario, hash SHA-256 del documento y método de autenticación.</p></div><span class="status ${current==="aal2"?"ok":"warn"}">${current.toUpperCase()}</span></div>
  <div class="grid cols-2">
    <section class="card accent"><h2>Estado de tu segundo factor</h2><div class="metric"><div><div class="value">${verified.length}</div><div class="label">Factores verificados</div></div><div class="metric-icon">✓</div></div><div class="actions mt">${verified.length?'<button class="btn" id="mfaChallengeBtn">Elevar sesión a AAL2</button>':'<button class="btn" id="mfaEnrollBtn">Configurar Authenticator</button>'}</div><div id="mfaBox" class="mt"></div></section>
    <section class="card"><h2>Qué protege la firma</h2><div class="timeline"><div class="timeline-item"><span class="timeline-dot"></span><div><strong>Documento congelado</strong><br><small>Se calcula SHA-256 antes de firmar.</small></div></div><div class="timeline-item"><span class="timeline-dot"></span><div><strong>Segundo factor</strong><br><small>Supabase MFA eleva la sesión a AAL2.</small></div></div><div class="timeline-item"><span class="timeline-dot"></span><div><strong>Evidencia</strong><br><small>Se registra firmante, AAL, AMR, fecha y hash.</small></div></div></div></section>
  </div>`;
}

async function viewCertificates(){
  const publicVerify=`<section class="card"><div class="section-title"><div><div class="kicker">Consulta pública</div><h2>Verificar certificado</h2></div></div><form id="verifyCertForm" class="searchbox"><input class="input" name="token" placeholder="Token de verificación"><button class="btn">Verificar</button></form><div id="verifyCertResult" class="mt"></div></section>`;
  if(!session)return `<div class="page-head"><div><div class="kicker">Documentos verificables</div><h1>Certificados Hacienda</h1><p>Consulta la autenticidad de un certificado mediante su token de verificación.</p></div></div>${publicVerify}`;
  const [{data:requests},{data:certs},{data:decls}]=await Promise.all([
    supabase.from("certificate_requests").select("*").order("submitted_at",{ascending:false}),
    supabase.from("certificates").select("*,declarations(tax_type,tax_year,period)").order("issued_at",{ascending:false}),
    supabase.from("declarations").select("id,tax_type,tax_year,period,status").in("status",["FILED","CERTIFICATE_AVAILABLE","PAID"])
  ]);
  return `<div class="page-head"><div><div class="kicker">Documentos</div><h1>Certificados y constancias</h1><p>Solicita documentos, consulta su estado y verifica documentos emitidos mediante serial y huella.</p></div></div>
  <div class="grid cols-2"><section class="card"><h2>Nueva solicitud</h2><form id="certRequestForm" class="stack"><select class="select" name="type"><option value="DECLARACION_PRESENTADA">Constancia de declaración presentada</option><option value="PAZ_Y_SALVO">Paz y salvo tributario</option><option value="CERTIFICADO_RETENCION">Certificado de retención</option></select><select class="select" name="declarationId"><option value="">Sin declaración asociada</option>${(decls||[]).map((d:any)=>`<option value="${d.id}">${d.tax_type} ${d.tax_year} · ${esc(d.period)}</option>`).join("")}</select><button class="btn">Radicar solicitud</button></form>${(decls||[]).filter((d:any)=>["FILED","CERTIFICATE_AVAILABLE"].includes(d.status)).length?`<hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><h3>Emisión automática habilitada</h3><p class="muted tiny">Las declaraciones ya radicadas pueden generar una constancia verificable de presentación.</p><div class="actions">${(decls||[]).filter((d:any)=>["FILED","CERTIFICATE_AVAILABLE"].includes(d.status)).map((d:any)=>`<button class="btn secondary small" data-issue-cert="${d.id}">${d.tax_type} ${d.tax_year} · ${esc(d.period)}</button>`).join("")}</div>`:""}</section>${publicVerify}</div>
  <section class="card mt"><h2>Mis solicitudes</h2>${requests?.length?tableRows(requests.map((r:any)=>[esc(r.certificate_type),`<span class="status ${statusClass(r.status)}">${humanStatus(r.status)}</span>`,date(r.submitted_at)]),["Tipo","Estado","Fecha"]):'<div class="empty">No hay solicitudes.</div>'}</section>
  ${certs?.length?`<section class="card mt"><h2>Certificados emitidos</h2>${tableRows(certs.map((c:any)=>[esc(c.serial),esc(c.type),date(c.issued_at),c.revoked_at?'<span class="status danger">Revocado</span>':'<span class="status ok">Vigente</span>']),["Serial","Tipo","Emisión","Estado"])}</section>`:""}`;
}

async function viewPredial(){
  if(!requireSession())return "";
  const [{data:props},{data:reqs}]=await Promise.all([supabase.from("property_accounts").select("*").order("tax_year",{ascending:false}),supabase.from("paz_y_salvo_requests").select("*").order("submitted_at",{ascending:false})]);
  return `<div class="page-head"><div><div class="kicker">Impuesto Predial</div><h1>Predial y paz y salvo</h1><p>El módulo ya está conectado a la base segura. La consulta oficial de saldos quedará habilitada en cuanto se conecte la fuente maestra catastral/predial del Municipio.</p></div><span class="status warn">Integración catastral pendiente</span></div>
  <div class="grid cols-2"><section class="card"><h2>Mis predios</h2>${props?.length?tableRows(props.map((p:any)=>[esc(p.property_number),esc(p.address),String(p.tax_year),money(p.tax_balance_cop),`<button class="btn small" data-paz="${p.id}">Paz y salvo</button>`]),["Cuenta","Dirección","Vigencia","Saldo",""]):'<div class="empty">No hay predios asociados todavía. La base municipal/catastral aún no ha sido integrada.</div>'}</section><section class="card"><h2>Solicitudes de paz y salvo</h2>${reqs?.length?tableRows(reqs.map((r:any)=>[esc(r.request_type),`<span class="status ${statusClass(r.status)}">${humanStatus(r.status)}</span>`,date(r.submitted_at)]),["Tipo","Estado","Radicación"]):'<div class="empty">Sin solicitudes.</div>'}</section></div>`;
}

async function viewAgreements(){
  if(!requireSession())return "";
  const {data}=await supabase.from("payment_agreements").select("*").order("created_at",{ascending:false});
  return `<div class="page-head"><div><div class="kicker">Cartera</div><h1>Acuerdos de pago</h1><p>Radica una solicitud y conserva trazabilidad. El cálculo oficial de intereses/cuotas no se automatiza hasta cargar el reglamento de recaudo vigente.</p></div></div>
  <div class="grid cols-2"><section class="card"><h2>Nueva solicitud</h2><form id="agreementForm" class="stack"><div class="field"><label>Tipo de deuda</label><select class="select" name="debt"><option>Predial</option><option>ICA</option><option>RETEICA</option><option>Otra renta</option></select></div><div class="field"><label>Capital adeudado</label><input class="input" type="number" min="1" name="principal" required></div><div class="field"><label>Número de cuotas solicitadas</label><input class="input" type="number" min="1" max="120" name="installments" value="12" required></div><button class="btn">Radicar solicitud</button></form><div class="note warn mt">La simulación oficial de intereses permanecerá bloqueada hasta parametrizar la norma de cartera vigente.</div></section><section class="card"><h2>Mis acuerdos</h2>${data?.length?tableRows(data.map((x:any)=>[esc(x.debt_type),money(x.principal_cop),String(x.requested_installments),`<span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span>`]),["Deuda","Capital","Cuotas","Estado"]):'<div class="empty">No hay solicitudes.</div>'}</section></div>`;
}

async function viewRefunds(){
  if(!requireSession())return "";
  const {data}=await supabase.from("refund_requests").select("*").order("created_at",{ascending:false});
  return `<div class="page-head"><div><div class="kicker">Devoluciones y compensaciones</div><h1>Solicitud de saldos a favor</h1><p>Radicación electrónica con expediente, soportes y estado. La decisión final corresponde a Hacienda y requiere revisión segregada.</p></div></div>
  <div class="grid cols-2"><section class="card"><h2>Nueva solicitud</h2><form id="refundForm" class="stack"><select class="select" name="tax"><option>ICA</option><option>RETEICA</option><option>PREDIAL</option><option>OTRO</option></select><input class="input" name="year" type="number" value="2026" min="2021"><input class="input" name="amount" type="number" min="1" placeholder="Valor solicitado" required><textarea class="textarea" name="reason" placeholder="Fundamento de la solicitud" required></textarea><button class="btn">Guardar y radicar</button></form></section><section class="card"><h2>Mis solicitudes</h2>${data?.length?tableRows(data.map((x:any)=>[esc(x.tax_type),money(x.amount_cop),`<span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span>`,date(x.created_at)]),["Tributo","Valor","Estado","Fecha"]):'<div class="empty">No hay solicitudes registradas.</div>'}</section></div>`;
}
async function viewAudit(){
  if(!requireSession())return "";
  const {data}=await supabase.from("audit_cases").select("*").order("opened_at",{ascending:false});
  return `<div class="page-head"><div><div class="kicker">Fiscalización</div><h1>Expedientes y actuaciones</h1><p>Consulta actuaciones de fiscalización asociadas a tu identificación tributaria. La información está sometida a reserva tributaria.</p></div></div><section class="card">${data?.length?tableRows(data.map((x:any)=>[esc(x.case_number),esc(x.tax_type),esc(x.current_stage),`<span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span>`,date(x.opened_at)]),["Expediente","Tributo","Etapa","Estado","Apertura"]):'<div class="empty">No existen actuaciones de fiscalización asociadas a tu cuenta.</div>'}</section>`;
}
async function viewRevenues(){
  const {data}=await supabase.from("revenue_catalog").select("*").order("implementation_phase").order("name");
  return `<div class="page-head"><div><div class="kicker">Catálogo municipal</div><h1>Impuestos, tasas, contribuciones y estampillas</h1><p>Inventario funcional derivado del Estatuto Tributario municipal. Cada renta se activa únicamente cuando sus reglas estén consolidadas y validadas.</p></div></div><section class="card">${tableRows((data||[]).map((x:any)=>[esc(x.name),esc(x.category),`Fase ${x.implementation_phase}`,`<span class="status ${statusClass(x.implementation_status)}">${humanStatus(x.implementation_status)}</span>`]),["Renta","Categoría","Fase","Estado"])}</section>`;
}
async function viewLegal(){
  const [{data:sources},{data:params},{data:calendar}]=await Promise.all([supabase.from("legal_sources").select("*").order("norm_year",{ascending:false}),supabase.from("tax_parameters").select("*").eq("tax_year",2026).order("key"),supabase.from("filing_calendar").select("*").eq("tax_year",2026)]);
  return `<div class="page-head"><div><div class="kicker">Gobernanza de reglas</div><h1>Normativa y parámetros 2026</h1><p>El motor no inventa vigencias: cada parámetro conserva su referencia jurídica y estado de validación.</p></div></div>
  <div class="grid cols-2"><section class="card"><h2>Parámetros activos</h2>${tableRows((params||[]).map((x:any)=>[esc(x.key),x.numeric_value!==null?esc(x.numeric_value):esc(x.text_value),`<span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span>`,esc(x.legal_reference)]),["Parámetro","Valor","Estado","Fuente"])}</section><section class="card"><h2>Calendario tributario 2026</h2>${calendar?.length?tableRows(calendar.map((x:any)=>[esc(x.tax_type),esc(x.period),date(x.due_date),esc(x.legal_reference)]),["Tributo","Período","Vence","Fuente"]):'<div class="note warn">Aún no se ha cargado el acto administrativo del calendario tributario 2026. El sistema bloquea la invención automática de vencimientos.</div>'}</section></div>
  <section class="card mt"><h2>Fuentes jurídicas registradas</h2>${tableRows((sources||[]).map((x:any)=>[`${esc(x.norm_type)} ${esc(x.norm_number||"")} de ${x.norm_year||""}`,esc(x.title),`<span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span>`,x.source_url?`<a href="${esc(x.source_url)}" target="_blank" rel="noopener">Fuente oficial</a>`:"Fuente suministrada"]),["Norma","Objeto","Estado","Fuente"])}</section>`;
}
async function viewStaff(){
  if(!profile||profile.role==="citizen")return '<div class="note danger">Esta sección requiere rol de funcionario de Hacienda.</div>';
  const [{data:regs},{data:decls},{data:agreements},{data:refunds}]=await Promise.all([
    supabase.from("taxpayer_registrations").select("id,business_name,person_type,status,created_at").order("created_at",{ascending:false}).limit(50),
    supabase.from("declarations").select("id,tax_type,tax_year,period,status,balance_due_cop,created_at").order("created_at",{ascending:false}).limit(50),
    supabase.from("payment_agreements").select("*").order("created_at",{ascending:false}).limit(30),
    supabase.from("refund_requests").select("*").order("created_at",{ascending:false}).limit(30)
  ]);
  return `<div class="page-head"><div><div class="kicker">Consola interna</div><h1>Gestión de Hacienda</h1><p>Vista operativa de consulta con segregación de funciones. Las acciones de aprobación se habilitarán por rol y flujo administrativo.</p></div><span class="status info">${esc(profile.role)}</span></div>
  <div class="grid cols-4 mb">${metric("◎",regs?.length||0,"Registros recientes")}${metric("▤",decls?.length||0,"Declaraciones")}${metric("▦",agreements?.length||0,"Acuerdos")}${metric("↶",refunds?.length||0,"Devoluciones")}</div>
  <section class="card"><h2>Declaraciones recientes</h2>${tableRows((decls||[]).map((d:any)=>[esc(d.tax_type),`${d.tax_year} · ${esc(d.period)}`,money(d.balance_due_cop),`<span class="status ${statusClass(d.status)}">${humanStatus(d.status)}</span>`,date(d.created_at)]),["Tipo","Período","Saldo","Estado","Fecha"])}</section>`;
}
function tableRows(rows:string[][],headers:string[]){
  return `<div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function bindView(which:string){
  document.querySelectorAll<HTMLElement>("[data-route]").forEach(b=>b.onclick=()=>{location.hash=b.dataset.route!;});
  if(which==="registry") bindRegistry();
  if(which==="ica") bindIca();
  if(which==="reteica") bindReteica();
  if(which==="declarations") bindDeclarations();
  if(which==="payments") bindPayments();
  if(which==="security") bindSecurity();
  if(which==="certificates") bindCertificates();
  if(which==="predial") bindPredial();
  if(which==="agreements") bindAgreements();
  if(which==="refunds") bindRefunds();
}

function bindRegistry(){
  const search=async()=>{
    const q=(document.querySelector<HTMLInputElement>("#ciiuSearch")?.value||"").trim(); if(q.length<2)return;
    const {data,error}=await supabase.from("ica_tariffs").select("ciiu,activity,rate_per_thousand").or(`ciiu.eq.${q},activity.ilike.%${q}%`).limit(20);
    if(error){toast(error.message,"error");return;}
    const box=document.querySelector("#ciiuResults")!; box.innerHTML=`<div class="ciiu-results">${(data||[]).map((x:any)=>`<div class="ciiu-item" data-ciiu-add="${x.ciiu}" data-activity="${esc(x.activity)}"><strong>${x.ciiu}</strong>${esc(x.activity)} · ${x.rate_per_thousand}‰</div>`).join("")||'<div class="empty">Sin resultados</div>'}</div>`;
    box.querySelectorAll<HTMLElement>("[data-ciiu-add]").forEach(el=>el.onclick=()=>{
      if(!selectedRegistryActivities.some(a=>a.ciiu===el.dataset.ciiu)){selectedRegistryActivities.push({ciiu:el.dataset.ciiu!,activity:el.dataset.activity||"",primary:selectedRegistryActivities.length===0});}
      refreshActivities(); box.innerHTML="";
    });
  };
  document.querySelector("#ciiuSearchBtn")?.addEventListener("click",search);
  document.querySelector<HTMLInputElement>("#ciiuSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();search();}});
  refreshActivities();
  document.querySelector("#registryForm")?.addEventListener("submit",async(e)=>{
    e.preventDefault(); if(!selectedRegistryActivities.length){toast("Selecciona al menos una actividad económica.","warn");return;}
    const fd=new FormData(e.currentTarget as HTMLFormElement);
    const personType=String(fd.get("personType")||"NATURAL");
    const payload:any={personType,documentType:String(fd.get("documentType")||""),documentNumber:String(fd.get("documentNumber")||""),fullNameOrBusinessName:String(fd.get("name")||""),email:String(fd.get("email")||""),phoneE164:String(fd.get("phone")||""),fiscalAddress:String(fd.get("address")||""),municipality:"San Pedro",department:"Valle del Cauca",economicActivities:selectedRegistryActivities.map(a=>({ciiu:a.ciiu,primary:a.primary})),dataPolicyAccepted:fd.get("policy")==="on",dataPolicyVersion:"2026-01"};
    if(personType==="JURIDICA"&&fd.get("repName"))payload.representative={documentType:"CC",documentNumber:String(fd.get("repDoc")||""),fullName:String(fd.get("repName")||""),email:String(fd.get("repEmail")||"")};
    if(fd.get("accName"))payload.accountant={documentNumber:String(fd.get("accDoc")||""),fullName:String(fd.get("accName")||""),professionalCard:String(fd.get("accCard")||"")};
    try{await api(supabase.rpc("register_taxpayer",{p_data:payload}));toast("Registro Tributario guardado y protegido.");await loadProfile();render();}catch(err:any){toast(err.message,"error");}
  });
}
function refreshActivities(){
  const box=document.querySelector("#selectedActivities"); if(!box)return; box.innerHTML=renderSelectedActivities(false);
  box.querySelectorAll<HTMLElement>("[data-remove-act]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.removeAct);selectedRegistryActivities.splice(i,1);if(selectedRegistryActivities.length&&!selectedRegistryActivities.some(x=>x.primary)){const first=selectedRegistryActivities[0];if(first)first.primary=true;}refreshActivities();});
  box.querySelectorAll<HTMLElement>("[data-primary]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.primary);selectedRegistryActivities=selectedRegistryActivities.map((a,j)=>({...a,primary:i===j}));refreshActivities();});
}

function bindIca(){
  document.querySelector("#addIcaRow")?.addEventListener("click",()=>{document.querySelector("#icaRows")?.insertAdjacentHTML("beforeend",`<div class="form-grid ica-row"><div class="field"><label>CIIU</label><input class="input" data-ciiu maxlength="4"></div><div class="field"><label>Ingreso gravable</label><input class="input" data-income type="number" min="0"></div></div>`);});
  document.querySelector("#calculateIca")?.addEventListener("click",async()=>{
    const activities=[...document.querySelectorAll<HTMLElement>(".ica-row")].map(r=>({ciiu:(r.querySelector<HTMLInputElement>("[data-ciiu]")?.value||"").trim(),taxableIncomeCop:Number(r.querySelector<HTMLInputElement>("[data-income]")?.value||0)})).filter(x=>x.ciiu);
    try{lastIcaCalculation=await api(supabase.rpc("calculate_ica",{p_activities:activities,p_apply_notices:(document.querySelector<HTMLInputElement>("#icaNotices")?.checked||false),p_tax_year:2026}));document.querySelector("#icaResult")!.innerHTML=renderIcaResult(lastIcaCalculation);(document.querySelector<HTMLButtonElement>("#saveIca")!).disabled=false;toast("Liquidación calculada.");}catch(err:any){toast(err.message,"error");}
  });
  document.querySelector("#saveIca")?.addEventListener("click",async()=>{
    if(!session){renderAuth();return;} if(!lastIcaCalculation)return;
    try{const id=await api<string>(supabase.rpc("create_declaration",{p_tax_type:"ICA",p_period:"ANUAL",p_payload:{source:"web",activities:lastIcaCalculation.lines},p_calculation:lastIcaCalculation,p_balance_due_cop:lastIcaCalculation.totalBeforeCreditsCop,p_tax_year:2026}));toast("Declaración ICA guardada.");location.hash="declarations";}catch(err:any){toast(err.message,"error");}
  });
}
function bindReteica(){
  document.querySelector("#addReteRow")?.addEventListener("click",()=>{document.querySelector("#reteRows")?.insertAdjacentHTML("beforeend",`<div class="form-grid rete-row"><div class="field"><label>CIIU</label><input class="input" data-ciiu maxlength="4"></div><div class="field"><label>Concepto</label><select class="select" data-concept><option value="services">Servicios</option><option value="goods">Compras / bienes</option></select></div><div class="field full"><label>Base</label><input class="input" data-base type="number" min="0"></div></div>`);});
  document.querySelector("#calculateRete")?.addEventListener("click",async()=>{
    const transactions=[...document.querySelectorAll<HTMLElement>(".rete-row")].map(r=>({ciiu:(r.querySelector<HTMLInputElement>("[data-ciiu]")?.value||"").trim(),concept:(r.querySelector<HTMLSelectElement>("[data-concept]")?.value||"services"),baseCop:Number(r.querySelector<HTMLInputElement>("[data-base]")?.value||0)})).filter(x=>x.ciiu);
    try{lastReteicaCalculation=await api(supabase.rpc("calculate_reteica",{p_transactions:transactions,p_tax_year:2026}));document.querySelector("#reteResult")!.innerHTML=renderReteResult(lastReteicaCalculation);(document.querySelector<HTMLButtonElement>("#saveRete")!).disabled=false;toast("RETEICA calculado.");}catch(err:any){toast(err.message,"error");}
  });
  document.querySelector("#saveRete")?.addEventListener("click",async()=>{if(!session){renderAuth();return;}if(!lastReteicaCalculation)return;try{await api(supabase.rpc("create_declaration",{p_tax_type:"RETEICA",p_period:"PENDIENTE_DEFINICION_NORMATIVA",p_payload:{source:"web",transactions:lastReteicaCalculation.lines},p_calculation:lastReteicaCalculation,p_balance_due_cop:lastReteicaCalculation.totalWithheldCop,p_tax_year:2026}));toast("Borrador RETEICA guardado.");location.hash="declarations";}catch(err:any){toast(err.message,"error");}});
}
function bindDeclarations(){
  document.querySelectorAll<HTMLElement>("[data-prepare]").forEach(b=>b.onclick=async()=>{try{await api(supabase.rpc("prepare_declaration_for_signature",{p_declaration_id:b.dataset.prepare}));toast("Documento listo para firma.");render();}catch(e:any){toast(e.message,"error");}});
  document.querySelectorAll<HTMLElement>("[data-sign]").forEach(b=>b.onclick=()=>signDeclaration(b.dataset.sign!));
  document.querySelectorAll<HTMLElement>("[data-pay]").forEach(b=>b.onclick=()=>requestPayment(b.dataset.pay!));
  document.querySelectorAll<HTMLElement>("[data-pdf]").forEach(b=>b.onclick=()=>downloadDeclarationPdf(b.dataset.pdf!));
}
function bindPayments(){document.querySelectorAll<HTMLElement>("[data-pay]").forEach(b=>b.onclick=()=>requestPayment(b.dataset.pay!));}
async function requestPayment(id:string){try{await api(supabase.rpc("request_payment",{p_declaration_id:id}));toast("Referencia de pago generada. Queda pendiente conectar la pasarela real.");location.hash="payments";render();}catch(e:any){toast(e.message,"error");}}
async function signDeclaration(id:string){
  try{
    const aal=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.data?.currentLevel!=="aal2"){toast("Debes elevar la sesión a AAL2 antes de firmar.","warn");location.hash="security";return;}
    const {data:d,error}=await supabase.from("declarations").select("*").eq("id",id).single(); if(error)throw error;
    const canonical=JSON.stringify({id:d.id,tax_type:d.tax_type,tax_year:d.tax_year,period:d.period,payload:d.payload,calculation:d.calculation,balance_due_cop:d.balance_due_cop});
    const hash=await sha256(canonical);
    const status=await api(supabase.rpc("sign_declaration",{p_declaration_id:id,p_document_sha256:hash,p_auth_method:"SUPABASE_MFA_AAL2"}));
    toast("Declaración firmada. Estado: "+humanStatus(status));render();
  }catch(e:any){toast(e.message,"error");}
}
async function sha256(text:string){const bytes=new TextEncoder().encode(text);const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");}

function bindSecurity(){
  document.querySelector("#mfaEnrollBtn")?.addEventListener("click",async()=>{
    const box=document.querySelector("#mfaBox")!; box.innerHTML=spinner("Generando factor");
    try{
      const {data,error}=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"Hacienda Conecta"}); if(error)throw error;
      box.innerHTML=`<div class="stack"><div class="note">Escanea el código con tu aplicación autenticadora y escribe el código de 6 dígitos.</div><div style="background:#fff;padding:12px;border-radius:12px;width:max-content;max-width:100%"><img src="${esc(data.totp.qr_code)}" alt="Código QR MFA" style="max-width:230px;width:100%"></div><div class="codebox">Clave manual: ${esc(data.totp.secret)}</div><div class="searchbox"><input class="input" id="mfaCode" inputmode="numeric" maxlength="6" placeholder="000000"><button class="btn" id="mfaVerifyEnroll">Verificar</button></div></div>`;
      document.querySelector("#mfaVerifyEnroll")?.addEventListener("click",()=>verifyMfa(data.id));
    }catch(e:any){box.innerHTML=`<div class="note danger">${esc(e.message)}</div>`;}
  });
  document.querySelector("#mfaChallengeBtn")?.addEventListener("click",async()=>{
    const factors=await supabase.auth.mfa.listFactors(); const factor=[...(factors.data?.totp||[]),...(factors.data?.phone||[])].find((f:any)=>f.status==="verified"); if(!factor){toast("No existe un factor verificado.","warn");return;}
    const box=document.querySelector("#mfaBox")!; box.innerHTML=`<div class="searchbox"><input class="input" id="mfaCode" inputmode="numeric" maxlength="6" placeholder="Código MFA"><button class="btn" id="mfaVerifyExisting">Verificar</button></div>`;
    document.querySelector("#mfaVerifyExisting")?.addEventListener("click",()=>verifyMfa(factor.id));
  });
}
async function verifyMfa(factorId:string){
  const code=(document.querySelector<HTMLInputElement>("#mfaCode")?.value||"").trim(); if(code.length!==6){toast("Ingresa un código de 6 dígitos.","warn");return;}
  try{const {data:challenge,error}=await supabase.auth.mfa.challenge({factorId});if(error)throw error;const {error:verifyError}=await supabase.auth.mfa.verify({factorId,challengeId:challenge.id,code});if(verifyError)throw verifyError;await supabase.auth.refreshSession();toast("Segundo factor verificado. Sesión AAL2 activa.");render();}catch(e:any){toast(e.message,"error");}
}

function bindCertificates(){
  document.querySelector("#certRequestForm")?.addEventListener("submit",async(e)=>{e.preventDefault();if(!session)return;const fd=new FormData(e.currentTarget as HTMLFormElement);try{const {error}=await supabase.from("certificate_requests").insert({user_id:session.user.id,declaration_id:String(fd.get("declarationId")||"")||null,certificate_type:String(fd.get("type")),status:"SUBMITTED"});if(error)throw error;toast("Solicitud de certificado radicada.");render();}catch(err:any){toast(err.message,"error");}});
  const verify=async(token:string)=>{const box=document.querySelector("#verifyCertResult")!;try{const {data,error}=await supabase.functions.invoke("verify-certificate",{body:{token}});if(error)throw error;box.innerHTML=data?.serial?`<div class="note"><strong>${data.valid?"Certificado válido":"Certificado revocado"}</strong><br>Serial: ${esc(data.serial)} · Tipo: ${esc(data.type)} · Emitido: ${date(data.issuedAt)} ${data.revoked?'<br><span class="status danger">REVOCADO</span>':'<br><span class="status ok">VIGENTE</span>'}</div>`:'<div class="note danger">No se encontró un certificado válido con ese token.</div>';}catch(err:any){box.innerHTML=`<div class="note danger">No se encontró un certificado válido o el servicio no respondió.</div>`;}};
  document.querySelector("#verifyCertForm")?.addEventListener("submit",async(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget as HTMLFormElement);await verify(String(fd.get("token")||"").trim());});
  const queryToken=new URLSearchParams(location.search).get("certificate"); if(queryToken) verify(queryToken);
  document.querySelectorAll<HTMLElement>("[data-issue-cert]").forEach(b=>b.onclick=async()=>{try{const cert=await api<any>(supabase.rpc("issue_filing_certificate",{p_declaration_id:b.dataset.issueCert}));toast("Constancia emitida con serial "+cert.serial);await downloadCertificatePdf(cert);history.replaceState({},document.title,location.pathname+"#certificates");render();}catch(err:any){toast(err.message,"error");}});
}
function bindPredial(){document.querySelectorAll<HTMLElement>("[data-paz]").forEach(b=>b.onclick=async()=>{if(!session)return;try{const {error}=await supabase.from("paz_y_salvo_requests").insert({user_id:session.user.id,property_account_id:b.dataset.paz,request_type:"PREDIAL",status:"SUBMITTED"});if(error)throw error;toast("Solicitud de paz y salvo radicada.");render();}catch(e:any){toast(e.message,"error");}});}
function bindAgreements(){document.querySelector("#agreementForm")?.addEventListener("submit",async(e)=>{e.preventDefault();if(!session)return;const fd=new FormData(e.currentTarget as HTMLFormElement);const {error}=await supabase.from("payment_agreements").insert({user_id:session.user.id,debt_type:String(fd.get("debt")),principal_cop:Number(fd.get("principal")),interest_cop:0,requested_installments:Number(fd.get("installments")),status:"SUBMITTED"});if(error)toast(error.message,"error");else{toast("Solicitud radicada.");render();}});}
function bindRefunds(){document.querySelector("#refundForm")?.addEventListener("submit",async(e)=>{e.preventDefault();if(!session)return;const fd=new FormData(e.currentTarget as HTMLFormElement);const {error}=await supabase.from("refund_requests").insert({user_id:session.user.id,tax_type:String(fd.get("tax")),tax_year:Number(fd.get("year")),amount_cop:Number(fd.get("amount")),reason:String(fd.get("reason")),status:"SUBMITTED",submitted_at:new Date().toISOString()});if(error)toast(error.message,"error");else{toast("Solicitud radicada.");render();}});}

async function downloadCertificatePdf(cert:any){
  const pdf=await PDFDocument.create(); const page=pdf.addPage([595,842]);
  const font=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({x:0,y:754,width:595,height:88,color:rgb(.03,.22,.42)});
  page.drawText("MUNICIPIO DE SAN PEDRO",{x:40,y:806,size:17,font:bold,color:rgb(1,1,1)});
  page.drawText("Secretaría de Hacienda · Hacienda Conecta",{x:40,y:782,size:10,font,color:rgb(.82,.91,.98)});
  page.drawText("CONSTANCIA DE PRESENTACIÓN",{x:40,y:710,size:18,font:bold,color:rgb(.03,.31,.57)});
  page.drawText("Documento electrónico verificable",{x:40,y:688,size:10,font,color:rgb(.35,.43,.52)});
  const rows=[["Serial",cert.serial],["Tipo",cert.type],["Fecha de emisión",new Date(cert.issuedAt).toLocaleString("es-CO")],["Hash documental",cert.documentSha256]];
  let y=645; for(const [label,value] of rows){page.drawText(label,{x:40,y,size:9,font:bold,color:rgb(.2,.3,.4)});page.drawText(String(value),{x:175,y,size:9,font,color:rgb(.08,.14,.22),maxWidth:370});y-=32;}
  const verifyUrl=location.origin+"/?certificate="+encodeURIComponent(cert.verificationToken)+"#certificates";
  const qrData=await QRCode.toDataURL(verifyUrl,{margin:1,width:220,errorCorrectionLevel:"M"});
  const qrBase64=qrData.split(",")[1] ?? ""; if(!qrBase64) throw new Error("No fue posible generar el código QR.");\n  const qrBytes=Uint8Array.from(atob(qrBase64),c=>c.charCodeAt(0)); const qr=await pdf.embedPng(qrBytes);
  page.drawImage(qr,{x:40,y:285,width:145,height:145});
  page.drawText("Verificación pública",{x:210,y:398,size:11,font:bold});page.drawText("Escanea el QR o ingresa el token en Hacienda Conecta.",{x:210,y:378,size:9,font});
  page.drawText("Token",{x:210,y:350,size:8,font:bold});page.drawText(String(cert.verificationToken),{x:210,y:333,size:7,font,maxWidth:330});
  page.drawText("Esta constancia acredita la emisión electrónica registrada en Hacienda Conecta.",{x:40,y:90,size:8,font,color:rgb(.35,.42,.5)});
  page.drawText("Su estado puede verificarse en línea y puede ser revocada mediante trazabilidad administrativa.",{x:40,y:75,size:8,font,color:rgb(.35,.42,.5)});
  const bytes=await pdf.save(); const blob=new Blob([bytes as any],{type:"application/pdf"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="Constancia_"+String(cert.serial)+".pdf";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

async function downloadDeclarationPdf(id:string){
  try{
    const {data:d,error}=await supabase.from("declarations").select("*").eq("id",id).single(); if(error)throw error;
    const pdf=await PDFDocument.create(); const page=pdf.addPage([595,842]); const font=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
    page.drawRectangle({x:0,y:770,width:595,height:72,color:rgb(.03,.22,.42)});
    page.drawText("HACIENDA CONECTA",{x:42,y:806,size:18,font:bold,color:rgb(1,1,1)}); page.drawText("Municipio de San Pedro - Valle del Cauca",{x:42,y:785,size:10,font,color:rgb(.83,.91,.98)});
    let y=730; const line=(label:string,value:string)=>{page.drawText(label,{x:42,y,size:9,font:bold,color:rgb(.18,.28,.39)});page.drawText(value,{x:185,y,size:9,font,color:rgb(.08,.14,.22)});y-=24;};
    page.drawText("Constancia de declaración",{x:42,y,size:16,font:bold,color:rgb(.03,.31,.57)});y-=35;
    line("Tipo",d.tax_type);line("Vigencia",String(d.tax_year));line("Período",d.period);line("Estado",humanStatus(d.status));line("Saldo",money(d.balance_due_cop));line("Identificador",d.id);line("Hash documental",d.document_sha256||"Pendiente de firma");
    y-=10;page.drawText("Resumen de cálculo",{x:42,y,size:12,font:bold});y-=22;
    const calc=JSON.stringify(d.calculation||{},null,2).slice(0,1600).split("\n"); for(const l of calc){if(y<70)break;page.drawText(l.slice(0,95),{x:42,y,size:7,font});y-=10;}
    page.drawText("Documento generado por Hacienda Conecta. La validez oficial depende del estado de radicación y firma.",{x:42,y:38,size:7,font,color:rgb(.35,.42,.5)});
    const bytes=await pdf.save(); const blob=new Blob([bytes as any],{type:"application/pdf"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Hacienda_${d.tax_type}_${d.tax_year}_${d.id.slice(0,8)}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }catch(e:any){toast(e.message,"error");}
}

bootstrap().catch((e)=>{app.innerHTML=`<div class="boot"><div class="note danger">No fue posible iniciar Hacienda Conecta: ${esc(e.message)}</div></div>`;});
