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
let registryStep = 1;

const icon = (name:string) => {
  const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const paths:Record<string,string>={
    dashboard:'<path d="M4 13h6V4H4z"/><path d="M14 20h6V11h-6z"/><path d="M14 8h6V4h-6z"/><path d="M4 20h6v-3H4z"/>',
    registry:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6"/><path d="M16 7h5M18.5 4.5v5"/>',
    declarations:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5M9 12h7M9 16h7"/>',
    ica:'<path d="M5 5h14M5 12h14M5 19h14"/><path d="M9 3 6 21M18 3l-3 18"/>',
    reteica:'<path d="m7 7-4 4 4 4"/><path d="M3 11h13a5 5 0 0 1 5 5v2"/><path d="m17 17 4 4 4-4" transform="translate(-4 -3)"/>',
    payments:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
    security:'<path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6z"/><path d="m9 12 2 2 4-5"/>',
    certificates:'<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6"/><circle cx="12" cy="16" r="2"/>',
    predial:'<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
    agreements:'<path d="M7 3h10v4H7z"/><path d="M5 7h14v14H5z"/><path d="M9 12h6M9 16h4"/>',
    refunds:'<path d="M4 10a8 8 0 1 0 2-5"/><path d="M4 4v6h6"/><path d="M9 12h6"/>',
    audit:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M8 11h6M11 8v6"/>',
    revenues:'<path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3M8 12h8M8 16h5"/>',
    legal:'<path d="M4 5h16M7 5v15M17 5v15M7 9h10M7 15h10"/>',
    staff:'<path d="M4 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="10" cy="7" r="3"/><path d="M17 8h4M19 6v4"/>',
    arrow:'<path d="m9 18 6-6-6-6"/>',
    check:'<path d="m5 12 4 4L19 6"/>'
  };
  return `<svg class="ui-icon" ${common}>${paths[name]||paths.dashboard}</svg>`;
};

const esc = (v:any) => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!));
const money = (v:any) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(v||0));
const date = (v:any) => v ? new Intl.DateTimeFormat("es-CO",{dateStyle:"medium"}).format(new Date(v)) : "—";
const statusClass = (s:string) => /APPROVED|PAID|FILED|ISSUED|VERIFIED|ACTIVE|AVAILABLE/i.test(s) ? "ok" : /REJECT|DECLIN|DEFAULT|CANCEL/i.test(s) ? "danger" : /PENDING|DRAFT|REVIEW|SUBMITTED|READY/i.test(s) ? "warn" : "info";
const humanStatus = (s:any) => String(s||"").replaceAll("_"," ");
const userInitials = () => (profile?.full_name || session?.user.email || "HC").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
const appBaseUrl = () => {
  const path = location.pathname.endsWith("/") ? location.pathname : location.pathname.replace(/[^/]*$/,"");
  return location.origin + path;
};
const maskPhone = (phone:string) => {
  if(!phone) return "—";
  const clean=phone.replace(/\s+/g,"");
  return clean.length>6 ? clean.slice(0,3)+"••••"+clean.slice(-4) : "••••";
};
async function getVerifiedPhoneFactor():Promise<any|null>{
  if(!session) return null;
  const {data,error}=await supabase.auth.mfa.listFactors();
  if(error) throw error;
  return ((data.phone||[]) as any[]).find((f:any)=>f.status==="verified") || null;
}
async function needsPhoneOnboarding(){
  if(!session) return false;
  try{return !(await getVerifiedPhoneFactor());}catch{return false;}
}

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
  if(session && route==="dashboard" && await needsPhoneOnboarding()){route="security";location.hash="security";}
  supabase.auth.onAuthStateChange(async (_event,newSession)=>{
    session=newSession;
    await loadProfile();
    if(session && route==="dashboard" && await needsPhoneOnboarding()){route="security";location.hash="security";}
    render();
  });
  addEventListener("hashchange",()=>{route=location.hash.replace("#","")||"dashboard";render();});
  render();
}

function navItem(id:string,iconName:string,label:string){
  return `<button data-route="${id}" class="${route===id?"active":""}">
    <span class="nav-icon">${icon(iconName)}</span>
    <span class="nav-label">${label}</span>
    <span class="nav-arrow">${icon("arrow")}</span>
  </button>`;
}
function shell(content:string){
  const official=profile && profile.role!=="citizen";
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="brand-badge"><span>HC</span></div>
        <div class="brand-copy"><strong>Hacienda Conecta</strong><small>San Pedro · Valle del Cauca</small></div>
      </div>
      <div class="sidebar-context">
        <span class="live-dot"></span>
        <div><strong>Servicios tributarios</strong><small>Plataforma municipal segura</small></div>
      </div>
      <nav class="nav">
        <div class="sep">Mi cuenta</div>
        ${navItem("dashboard","dashboard","Inicio")}
        ${navItem("registry","registry","Registro Tributario")}
        ${navItem("declarations","declarations","Mis declaraciones")}
        <div class="sep">Declaraciones y recaudo</div>
        ${navItem("ica","ica","ICA · Avisos")}
        ${navItem("reteica","reteica","RETEICA")}
        ${navItem("payments","payments","Pagos")}
        ${navItem("security","security","Identidad y firma")}
        ${navItem("certificates","certificates","Certificados")}
        <div class="sep">Otros servicios</div>
        ${navItem("predial","predial","Predial y paz y salvo")}
        ${navItem("agreements","agreements","Acuerdos de pago")}
        ${navItem("refunds","refunds","Devoluciones")}
        ${navItem("audit","audit","Fiscalización")}
        ${navItem("revenues","revenues","Demás rentas")}
        ${navItem("legal","legal","Normativa")}
        ${official?'<div class="sep">Funcionarios</div>'+navItem("staff","staff","Consola de Hacienda"):""}
      </nav>
      <div class="side-status">
        <div class="side-status-top"><span class="security-shield">${icon("security")}</span><div><strong>Base tributaria 2026</strong><small>Parámetros versionados</small></div></div>
        <div class="side-stats"><span><b>$52.374</b>UVT</span><span><b>324</b>CIIU</span></div>
      </div>
    </aside>
    <section class="content">
      <div class="gov-strip"><span>Municipio de San Pedro · Secretaría de Hacienda</span><span class="gov-strip-right">Portal oficial de servicios tributarios</span></div>
      <header class="topbar">
        <div class="top-left">
          <button class="icon-button mobile-menu" id="menuBtn" aria-label="Abrir menú">☰</button>
          <div><span class="top-title">${route==="dashboard"?"Resumen tributario":"Hacienda Conecta"}</span><span class="top-sub">Gestión segura, trazable y digital</span></div>
        </div>
        <div class="top-actions">
          <span class="secure-pill"><span class="secure-dot"></span>Conexión segura</span>
          ${session?`<div class="user-chip"><span class="avatar">${esc(userInitials())}</span><div class="user-copy"><strong>${esc(profile?.full_name||session.user.email||"Usuario")}</strong><small>${esc(profile?.role==="citizen"?"Contribuyente":profile?.role||"Usuario")}</small></div></div><button class="btn ghost small" id="logoutBtn">Salir</button>`:`<button class="btn small" data-action="login">Ingresar</button>`}
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
      <div class="auth-brand"><div class="brand-badge large"><span>HC</span></div><div><strong>Hacienda Conecta</strong><small>Municipio de San Pedro · Valle del Cauca</small></div></div>
      <div class="auth-copy">
        <span class="eyebrow-light">Servicios tributarios digitales</span>
        <h1>Tu Hacienda municipal,<br><span>más clara y más cerca.</span></h1>
        <p>Regístrate, declara, firma, paga y consulta tus trámites desde una plataforma segura, con trazabilidad y reglas tributarias versionadas.</p>
      </div>
      <div class="auth-feature-grid">
        <article><span class="feature-icon">${icon("security")}</span><div><strong>Firma reforzada</strong><small>Segundo factor para operaciones sensibles.</small></div></article>
        <article><span class="feature-icon">${icon("ica")}</span><div><strong>Cálculos automáticos</strong><small>ICA y RETEICA con parámetros 2026.</small></div></article>
        <article><span class="feature-icon">${icon("certificates")}</span><div><strong>Documentos verificables</strong><small>Certificados con serial, hash y QR.</small></div></article>
      </div>
      <div class="auth-trust"><span>UVT 2026 · $52.374</span><span>324 actividades ICA</span><span>RLS + MFA</span></div>
      <div class="auth-orb orb-a"></div><div class="auth-orb orb-b"></div>
    </section>
    <section class="auth-panel">
      <div class="auth-card">
        <div class="auth-card-head"><div class="kicker">Acceso seguro</div><h2>${authMode==="login"?"Bienvenido de nuevo":"Crea tu cuenta"}</h2><p>${authMode==="login"?"Ingresa para continuar con tus obligaciones y trámites.":"Crea tu acceso; después verificaremos tu celular para operaciones sensibles."}</p></div>
        <button class="google-btn" type="button" id="googleLoginBtn"><span class="google-g">G</span><span>Continuar con Google</span></button>
        <div class="auth-divider"><span>o usa tu correo</span></div>
        <div class="auth-tabs"><button id="loginTab" class="${authMode==="login"?"active":""}">Ingresar</button><button id="signupTab" class="${authMode==="signup"?"active":""}">Crear cuenta</button></div>
        <form id="authForm" class="stack">
          ${authMode==="signup"?'<div class="field"><label>Nombre completo / razón social</label><input class="input" name="name" required autocomplete="name" placeholder="Nombre del contribuyente"></div>':""}
          <div class="field"><label>Correo electrónico</label><input class="input" type="email" name="email" required autocomplete="email" placeholder="correo@ejemplo.com"></div>
          ${authMode==="signup"?'<div class="field"><label>Celular</label><input class="input" name="phone" placeholder="+573001234567" required autocomplete="tel"><span class="hint">Se verificará por SMS antes de firmar o autorizar pagos.</span></div>':""}
          <div class="field"><label>Contraseña</label><input class="input" type="password" name="password" minlength="10" required autocomplete="${authMode==="login"?"current-password":"new-password"}" placeholder="••••••••••"><span class="hint">Mínimo 10 caracteres.</span></div>
          <button class="btn primary-wide" type="submit">${authMode==="login"?"Ingresar a Hacienda Conecta":"Crear cuenta segura"}</button>
        </form>
        <div class="auth-security-note"><span>${icon("security")}</span><p>Google o correo validan tu cuenta. El celular funciona como segundo factor para firma y autorización de pagos.</p></div>
        <button class="text-button" id="publicBtn">Consultar servicios públicos sin iniciar sesión</button>
      </div>
      <p class="auth-foot">Tus datos tributarios se protegen mediante Row Level Security y controles de acceso por rol.</p>
    </section>
  </div>`;
  document.querySelector("#googleLoginBtn")?.addEventListener("click",async()=>{
    try{
      const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:appBaseUrl()}});
      if(error) throw error;
    }catch(err:any){toast(err.message||"Google aún no está habilitado en el proveedor de autenticación.","error");}
  });
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
        if(!data.session) toast("Cuenta creada. Confirma tu correo y luego verificaremos tu celular.","warn"); else {toast("Cuenta creada. Verifica tu celular para continuar.");location.hash="security";}
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
  const {data:catalog}=await supabase.from("revenue_catalog").select("code,name,implementation_phase,implementation_status").order("implementation_phase").limit(6);
  const phoneVerified=session?!!(await getVerifiedPhoneFactor().catch(()=>null)):false;
  const registryReady=!!summary.registrationStatus;
  const journeyStep=!session?1:!phoneVerified?2:!registryReady?3:4;
  return `<section class="hero premium-hero">
    <div class="hero-copy">
      <span class="hero-kicker">Portal tributario municipal</span>
      <h1>Gestiona tus obligaciones<br><span>sin filas y con trazabilidad.</span></h1>
      <p>Un único espacio para registro tributario, declaraciones, firma electrónica, pagos, certificados y seguimiento de trámites ante la Secretaría de Hacienda.</p>
      <div class="actions hero-actions"><button class="btn hero-primary" data-route="ica">Liquidar ICA</button><button class="btn hero-secondary" data-route="reteica">Calcular RETEICA</button></div>
      <div class="hero-trust"><span>${icon("security")} Datos protegidos</span><span>${icon("check")} Reglas versionadas</span><span>${icon("certificates")} Documentos verificables</span></div>
    </div>
    <div class="hero-dashboard">
      <div class="hero-dashboard-head"><span>Estado tributario 2026</span><span class="status ok">En línea</span></div>
      <div class="hero-stat"><div><small>UVT vigente</small><strong>$52.374</strong></div><span class="hero-stat-icon">UVT</span></div>
      <div class="hero-stat"><div><small>Catálogo ICA</small><strong>324 actividades</strong></div><span class="hero-stat-icon">CIIU</span></div>
      <div class="hero-law">Resolución DIAN 000238 de 2025</div>
    </div>
    <div class="hero-glow glow-a"></div><div class="hero-glow glow-b"></div>
  </section>

  <section class="journey-card mb">
    <div class="journey-head"><div><div class="kicker">Tu ruta en Hacienda Conecta</div><h2>Completa tu habilitación tributaria</h2></div><span class="journey-count">Paso ${journeyStep} de 4</span></div>
    <div class="journey-track">
      ${journeyItem(1,journeyStep,"Cuenta","Acceso creado","dashboard")}
      ${journeyItem(2,journeyStep,"Celular","Segundo factor","security")}
      ${journeyItem(3,journeyStep,"Registro","Datos tributarios","registry")}
      ${journeyItem(4,journeyStep,"Operar","Declarar y pagar","declarations")}
    </div>
  </section>

  <div class="metric-grid mb">
    ${metric("declarations",summary.declarations,"Declaraciones","Borradores y radicadas")}
    ${metric("payments",summary.pendingPayments,"Pagos pendientes","Referencias por completar")}
    ${metric("certificates",summary.certificates,"Certificados","Documentos emitidos")}
    ${metric("registry",summary.registrationStatus||"No iniciado","Registro tributario","Estado del contribuyente")}
  </div>

  <div class="dashboard-layout">
    <section class="card services-card">
      <div class="section-title"><div><div class="kicker">Servicios</div><h2>¿Qué necesitas hacer hoy?</h2><p class="section-desc">Accede directamente a los trámites tributarios más utilizados.</p></div></div>
      <div class="module-grid premium-modules">
        ${moduleCard("registry","Registro Tributario","Identificación, CIIU, establecimientos y responsables.","registry","Cuenta")}
        ${moduleCard("ica","Declaración ICA","Liquidación por actividad, avisos y mínimo tributario.","ica","Operativo")}
        ${moduleCard("reteica","RETEICA","Retenciones por operación y bases mínimas UVT.","reteica","Operativo")}
        ${moduleCard("predial","Predial y paz y salvo","Consulta y solicitudes asociadas al impuesto predial.","predial","Integración")}
        ${moduleCard("agreements","Acuerdos de pago","Radica solicitudes y consulta su avance.","agreements","Disponible")}
        ${moduleCard("refunds","Devoluciones","Radicación de saldos a favor y seguimiento.","refunds","Disponible")}
      </div>
    </section>
    <aside class="card activity-card">
      <div class="section-title"><div><div class="kicker">Cobertura del sistema</div><h2>Módulos habilitados</h2></div><button class="btn ghost small" data-route="revenues">Ver catálogo</button></div>
      <div class="timeline premium-timeline">${(catalog||[]).map((x:any)=>`<div class="timeline-item"><span class="timeline-dot"></span><div class="timeline-copy"><strong>${esc(x.name)}</strong><small>Fase ${x.implementation_phase} · ${esc(humanStatus(x.implementation_status))}</small></div><span class="mini-chevron">${icon("arrow")}</span></div>`).join("")}</div>
      <div class="compliance-card"><span>${icon("legal")}</span><div><strong>Gobernanza normativa</strong><p>Los parámetros de cálculo se activan solo cuando su fuente y vigencia están registradas.</p></div></div>
    </aside>
  </div>`;
}
function journeyItem(step:number,current:number,title:string,desc:string,to:string){
  const state=step<current?"done":step===current?"active":"pending";
  return `<button class="journey-item ${state}" data-route="${to}"><span class="journey-index">${step<current?icon("check"):step}</span><span><strong>${title}</strong><small>${desc}</small></span></button>`;
}

function metric(iconName:string,value:any,label:string,detail=""){
  return `<article class="metric-card"><div class="metric-icon">${icon(iconName)}</div><div class="metric-body"><div class="metric-value">${esc(value)}</div><div class="metric-label">${label}</div><div class="metric-detail">${detail}</div></div><span class="metric-arrow">${icon("arrow")}</span></article>`;
}
function moduleCard(iconName:string,title:string,desc:string,to:string,status:string){
  return `<article class="module" data-route="${to}"><div class="module-top"><span class="module-icon">${icon(iconName)}</span><span class="status info">${status}</span></div><h3>${title}</h3><p>${desc}</p><span class="module-link">Abrir servicio ${icon("arrow")}</span></article>`;
}

async function viewRegistry(){
  if(!requireSession()) return "";
  const phoneFactor=await getVerifiedPhoneFactor();
  if(!phoneFactor){
    return `<div class="page-head"><div><div class="kicker">Registro tributario</div><h1>Completa tu identidad digital</h1><p>Antes de registrar información tributaria debemos verificar el celular que usarás para firma y autorización de pagos.</p></div></div>
    <section class="identity-gate">
      <div class="identity-gate-icon">${icon("security")}</div>
      <div><span class="status warn">Paso obligatorio</span><h2>Verifica tu número celular</h2><p>Recibirás un código SMS para vincular el número a tu cuenta. Después podrás completar el Registro Tributario y usar los servicios transaccionales.</p><div class="actions"><button class="btn" data-route="security">Verificar celular</button><button class="btn ghost" data-route="dashboard">Volver al inicio</button></div></div>
      <div class="identity-gate-steps"><span class="done">${icon("check")} Cuenta</span><span class="active">2 · Celular</span><span>3 · Registro</span><span>4 · Operar</span></div>
    </section>`;
  }

  const [{data:reg},{data:rels}]=await Promise.all([
    supabase.from("taxpayer_registrations").select("*").eq("user_id",session!.user.id).maybeSingle(),
    supabase.from("taxpayer_relationships").select("relation_type,related_name,related_email,professional_card").order("created_at",{ascending:false})
  ]);
  const {data:acts}=reg?await supabase.from("taxpayer_activities").select("ciiu,is_primary").eq("registration_id",reg.id):{data:null};
  if(acts){
    const codes=(acts as any[]).map(a=>a.ciiu);
    const {data:catalog}=codes.length?await supabase.from("ica_tariffs").select("ciiu,activity").in("ciiu",codes):{data:[] as any[]};
    const names=new Map((catalog||[]).map((x:any)=>[x.ciiu,x.activity]));
    selectedRegistryActivities=(acts as any[]).map(a=>({ciiu:a.ciiu,activity:names.get(a.ciiu)||"",primary:a.is_primary}));
  }
  const representative=(rels||[]).find((x:any)=>x.relation_type==="LEGAL_REPRESENTATIVE");
  const accountant=(rels||[]).find((x:any)=>x.relation_type==="ACCOUNTANT");
  const readonly=!!reg && reg.status!=="PENDING";
  const currentStep=Math.max(1,Math.min(4,registryStep));

  if(readonly){
    return `<div class="page-head"><div><div class="kicker">Registro tributario</div><h1>Perfil tributario</h1><p>Tu información fue enviada a validación. Se conserva bloqueada para mantener integridad y trazabilidad.</p></div><span class="status ${statusClass(reg.status)}">${esc(humanStatus(reg.status))}</span></div>
    <div class="profile-summary-grid">
      <section class="card profile-identity"><div class="profile-avatar">${esc(userInitials())}</div><div><span class="kicker">Contribuyente</span><h2>${esc(reg.business_name)}</h2><p>${esc(reg.person_type==="JURIDICA"?"Persona jurídica":"Persona natural")} · San Pedro, Valle del Cauca</p></div><span class="verified-mark">${icon("check")} Datos registrados</span></section>
      <section class="card"><div class="section-title"><h2>Contacto tributario</h2><span class="status ok">Celular verificado</span></div><div class="detail-list"><div><span>Correo</span><strong>${esc(profile?.email||session!.user.email||"—")}</strong></div><div><span>Celular</span><strong>${esc(maskPhone(phoneFactor.phone||profile?.phone_e164||""))}</strong></div><div><span>Dirección fiscal</span><strong>${esc(reg.fiscal_address)}</strong></div></div></section>
    </div>
    <section class="card mt"><div class="section-title"><div><div class="kicker">Actividades económicas</div><h2>Clasificación CIIU registrada</h2></div><span class="pill">${selectedRegistryActivities.length} actividades</span></div>${renderSelectedActivities(true)}</section>
    <section class="card mt"><div class="section-title"><div><div class="kicker">Estado</div><h2>¿Qué sigue?</h2></div></div><div class="next-action-grid"><button class="next-action" data-route="ica"><span class="module-icon">${icon("ica")}</span><span><strong>Liquidar ICA</strong><small>Preparar declaración anual.</small></span>${icon("arrow")}</button><button class="next-action" data-route="declarations"><span class="module-icon">${icon("declarations")}</span><span><strong>Mis declaraciones</strong><small>Continuar borradores y firmas.</small></span>${icon("arrow")}</button><button class="next-action" data-route="certificates"><span class="module-icon">${icon("certificates")}</span><span><strong>Certificados</strong><small>Solicitar o verificar documentos.</small></span>${icon("arrow")}</button></div></section>`;
  }

  return `<div class="page-head"><div><div class="kicker">Registro tributario</div><h1>Crea tu perfil de contribuyente</h1><p>Completa la información en cuatro pasos. Puedes revisar todo antes de enviarlo a Hacienda.</p></div><span class="status info">Borrador seguro</span></div>
  <form id="registryForm" class="wizard-card">
    <div class="wizard-header">
      <button type="button" class="wizard-step ${currentStep===1?"active":currentStep>1?"done":""}" data-reg-step="1"><span>${currentStep>1?icon("check"):"1"}</span><div><strong>Identificación</strong><small>Datos básicos</small></div></button>
      <span class="wizard-line ${currentStep>1?"done":""}"></span>
      <button type="button" class="wizard-step ${currentStep===2?"active":currentStep>2?"done":""}" data-reg-step="2"><span>${currentStep>2?icon("check"):"2"}</span><div><strong>Actividad</strong><small>Clasificación CIIU</small></div></button>
      <span class="wizard-line ${currentStep>2?"done":""}"></span>
      <button type="button" class="wizard-step ${currentStep===3?"active":currentStep>3?"done":""}" data-reg-step="3"><span>${currentStep>3?icon("check"):"3"}</span><div><strong>Responsables</strong><small>Representante y contador</small></div></button>
      <span class="wizard-line ${currentStep>3?"done":""}"></span>
      <button type="button" class="wizard-step ${currentStep===4?"active":""}" data-reg-step="4"><span>4</span><div><strong>Confirmación</strong><small>Revisar y enviar</small></div></button>
    </div>

    <section class="wizard-panel ${currentStep===1?"active":""}" data-reg-panel="1">
      <div class="panel-heading"><span class="panel-icon">${icon("registry")}</span><div><h2>Identificación y contacto</h2><p>Información principal del contribuyente y domicilio fiscal.</p></div></div>
      <div class="form-grid">
        <div class="field"><label>Tipo de persona</label><select class="select" name="personType" required><option value="NATURAL" ${reg?.person_type==="NATURAL"?"selected":""}>Persona natural</option><option value="JURIDICA" ${reg?.person_type==="JURIDICA"?"selected":""}>Persona jurídica</option></select></div>
        <div class="field"><label>Tipo de identificación</label><select class="select" name="documentType" required><option>CC</option><option>NIT</option><option>CE</option><option>PASAPORTE</option></select></div>
        <div class="field"><label>Número de identificación / NIT</label><input class="input" name="documentNumber" required placeholder="Ej. 900123456-7"><span class="hint">La aplicación genera una huella criptográfica para identificación interna.</span></div>
        <div class="field"><label>Nombre completo / razón social</label><input class="input" name="name" required value="${esc(reg?.business_name||profile?.full_name||session!.user.user_metadata?.full_name||"")}" placeholder="Nombre del contribuyente"></div>
        <div class="field"><label>Correo electrónico</label><input class="input" type="email" name="email" required value="${esc(profile?.email||session!.user.email||"")}"></div>
        <div class="field verified-field"><label>Celular verificado</label><div class="verified-input"><input class="input" name="phone" readonly value="${esc(phoneFactor.phone||profile?.phone_e164||"")}"><span>${icon("check")}</span></div><span class="hint">Segundo factor habilitado para firma y autorización de pagos.</span></div>
        <div class="field full"><label>Dirección fiscal</label><input class="input" name="address" required value="${esc(reg?.fiscal_address||"")}" placeholder="Dirección completa en el municipio"></div>
      </div>
      <div class="wizard-actions"><span></span><button class="btn" type="button" data-reg-next>Continuar a actividad económica ${icon("arrow")}</button></div>
    </section>

    <section class="wizard-panel ${currentStep===2?"active":""}" data-reg-panel="2">
      <div class="panel-heading"><span class="panel-icon">${icon("ica")}</span><div><h2>Actividades económicas</h2><p>Busca y selecciona tus códigos CIIU. Debe existir exactamente una actividad principal.</p></div></div>
      <div class="ciiu-search-card"><div class="searchbox"><input id="ciiuSearch" class="input" placeholder="Ej. 6201 o desarrollo de software"><button class="btn secondary" type="button" id="ciiuSearchBtn">Buscar CIIU</button></div><div id="ciiuResults"></div></div>
      <div class="selected-block"><div class="section-title"><div><h3>Actividades seleccionadas</h3><span class="hint">Puedes cambiar la actividad principal antes de enviar.</span></div><span class="pill">${selectedRegistryActivities.length} seleccionadas</span></div><div id="selectedActivities">${renderSelectedActivities(false)}</div></div>
      <div class="wizard-actions"><button class="btn ghost" type="button" data-reg-prev>Volver</button><button class="btn" type="button" data-reg-next>Continuar a responsables ${icon("arrow")}</button></div>
    </section>

    <section class="wizard-panel ${currentStep===3?"active":""}" data-reg-panel="3">
      <div class="panel-heading"><span class="panel-icon">${icon("staff")}</span><div><h2>Responsables tributarios</h2><p>Registra representante legal o contador cuando corresponda a tu obligación.</p></div></div>
      <div class="role-cards">
        <article class="role-card"><div class="role-head"><span class="module-icon">${icon("registry")}</span><div><h3>Representante legal</h3><small>Obligatorio para persona jurídica</small></div></div><div class="stack"><div class="field"><label>Nombre completo</label><input class="input" name="repName" value="${esc(representative?.related_name||"")}" placeholder="Nombre del representante"></div><div class="field"><label>Documento</label><input class="input" name="repDoc" placeholder="Se almacenará como huella"></div><div class="field"><label>Correo</label><input class="input" type="email" name="repEmail" value="${esc(representative?.related_email||"")}" placeholder="correo@ejemplo.com"></div></div></article>
        <article class="role-card"><div class="role-head"><span class="module-icon">${icon("declarations")}</span><div><h3>Contador</h3><small>Cuando exista obligación profesional</small></div></div><div class="stack"><div class="field"><label>Nombre completo</label><input class="input" name="accName" value="${esc(accountant?.related_name||"")}" placeholder="Nombre del contador"></div><div class="field"><label>Documento</label><input class="input" name="accDoc" placeholder="Se almacenará como huella"></div><div class="field"><label>Tarjeta profesional</label><input class="input" name="accCard" value="${esc(accountant?.professional_card||"")}" placeholder="Número de tarjeta"></div></div></article>
      </div>
      <div class="note mt"><strong>Importante:</strong> la plataforma conserva la relación y evidencia del responsable. Las reglas de obligatoriedad de firma de contador/revisor se validan por tipo de obligación antes de la presentación definitiva.</div>
      <div class="wizard-actions"><button class="btn ghost" type="button" data-reg-prev>Volver</button><button class="btn" type="button" data-reg-next>Revisar información ${icon("arrow")}</button></div>
    </section>

    <section class="wizard-panel ${currentStep===4?"active":""}" data-reg-panel="4">
      <div class="panel-heading"><span class="panel-icon">${icon("check")}</span><div><h2>Revisa antes de enviar</h2><p>Confirma que la información es correcta. El envío queda registrado con fecha y usuario.</p></div></div>
      <div id="registryReview" class="review-grid"></div>
      <label class="consent-card"><input type="checkbox" name="policy" required><span><strong>Autorización y declaración</strong><small>Autorizo el tratamiento de los datos necesarios para la gestión tributaria conforme a la política vigente y declaro que la información suministrada es correcta.</small></span></label>
      <div class="security-confirm"><span>${icon("security")}</span><div><strong>Tu celular ya está verificado</strong><p>El número asociado se utilizará posteriormente para confirmar firma y pagos mediante códigos de un solo uso.</p></div></div>
      <div class="wizard-actions"><button class="btn ghost" type="button" data-reg-prev>Volver</button><button class="btn" type="submit">Guardar Registro Tributario</button></div>
    </section>
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
  const [aal,factors]=await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors()
  ]);
  const current=aal.data?.currentLevel||"aal1";
  const phone=((factors.data?.phone||[]) as any[]).find((f:any)=>f.status==="verified");
  const pendingPhone=((factors.data?.phone||[]) as any[]).find((f:any)=>f.status!=="verified");
  const suggestedPhone=phone?.phone || pendingPhone?.phone || profile?.phone_e164 || session?.user.user_metadata?.phone || "";
  return `<div class="page-head"><div><div class="kicker">Identidad y firma electrónica</div><h1>Verificación por celular</h1><p>Tu acceso puede hacerse con Google o correo. Las acciones sensibles usan un segundo factor independiente: un código enviado al celular verificado.</p></div><span class="status ${phone?"ok":"warn"}">${phone?"CELULAR VERIFICADO":"CELULAR PENDIENTE"}</span></div>
  <div class="grid cols-2">
    <section class="card accent">
      <div class="section-title"><div><div class="kicker">Segundo factor obligatorio</div><h2>${phone?"Celular vinculado":"Vincular celular"}</h2></div><span class="status ${current==="aal2"?"ok":"info"}">${current.toUpperCase()}</span></div>
      ${phone
        ? `<div class="metric"><div><div class="value" style="font-size:1.25rem">${esc(maskPhone(phone.phone||""))}</div><div class="label">Número protegido para firma y pago</div></div><div class="metric-icon">SMS</div></div>
           <div class="note mt">Antes de <strong>firmar una declaración</strong> o <strong>crear una solicitud de pago</strong>, Hacienda Conecta enviará un código nuevo a este número. El código no sustituye el acceso con Google: funciona como segundo factor.</div>
           <div class="actions mt"><button class="btn" id="mfaChallengeBtn">Enviar código SMS de prueba</button></div>`
        : `<div class="note warn mb">Este paso es obligatorio para completar el Registro Tributario, firmar y autorizar pagos.</div>
           <div class="field"><label>Número celular</label><input class="input" id="phoneMfaInput" value="${esc(suggestedPhone)}" placeholder="+573001234567" autocomplete="tel"><span class="hint">Formato internacional Colombia: +57 seguido del número, sin espacios.</span></div>
           <div class="actions mt"><button class="btn" id="phoneEnrollBtn">Enviar código SMS</button></div>`}
      <div id="mfaBox" class="mt"></div>
    </section>
    <section class="card"><h2>Cómo queda la seguridad</h2>
      <div class="timeline">
        <div class="timeline-item"><span class="timeline-dot"></span><div><strong>1. Ingreso</strong><br><small>Google o correo/contraseña identifican la cuenta.</small></div></div>
        <div class="timeline-item"><span class="timeline-dot"></span><div><strong>2. Celular verificado</strong><br><small>El número queda enrolado como factor MFA de teléfono.</small></div></div>
        <div class="timeline-item"><span class="timeline-dot"></span><div><strong>3. Firma</strong><br><small>Se envía un SMS nuevo, se valida AAL2 y se firma el hash SHA-256 del documento.</small></div></div>
        <div class="timeline-item"><span class="timeline-dot"></span><div><strong>4. Pago</strong><br><small>Antes de generar la referencia de recaudo se exige otra validación SMS reciente.</small></div></div>
      </div>
    </section>
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
async function requestPayment(id:string){
  try{
    await withFreshPhoneMfa("Autorizar solicitud de pago",async()=>{
      const paymentId=await api<string>(supabase.rpc("request_payment",{p_declaration_id:id}));
      toast("Identidad confirmada. Referencia de pago generada.");
      location.hash="payments";
      render();
    });
  }catch(e:any){toast(e.message||"No fue posible iniciar el pago.","error");}
}
async function signDeclaration(id:string){
  try{
    await withFreshPhoneMfa("Firmar declaración",async()=>{
      const {data:d,error}=await supabase.from("declarations").select("*").eq("id",id).single(); if(error)throw error;
      const canonical=JSON.stringify({id:d.id,tax_type:d.tax_type,tax_year:d.tax_year,period:d.period,payload:d.payload,calculation:d.calculation,balance_due_cop:d.balance_due_cop});
      const hash=await sha256(canonical);
      const status=await api(supabase.rpc("sign_declaration",{p_declaration_id:id,p_document_sha256:hash,p_auth_method:"PHONE_SMS_MFA_AAL2"}));
      toast("Código validado y declaración firmada. Estado: "+humanStatus(status));
      render();
    });
  }catch(e:any){toast(e.message||"No fue posible firmar.","error");}
}
async function sha256(text:string){const bytes=new TextEncoder().encode(text);const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");}

function bindSecurity(){
  document.querySelector("#phoneEnrollBtn")?.addEventListener("click",async()=>{
    const phone=(document.querySelector<HTMLInputElement>("#phoneMfaInput")?.value||"").replace(/\s+/g,"").trim();
    if(!/^\+57\d{10}$/.test(phone)){toast("Usa el formato +57 seguido de 10 dígitos.","warn");return;}
    const box=document.querySelector("#mfaBox")!;
    box.innerHTML=spinner("Enviando código SMS");
    try{
      const factor=await supabase.auth.mfa.enroll({factorType:"phone",phone,friendlyName:"Celular Hacienda Conecta"});
      if(factor.error) throw factor.error;
      const challenge=await supabase.auth.mfa.challenge({factorId:factor.data.id});
      if(challenge.error) throw challenge.error;
      renderPhoneCodeBox(box,factor.data.id,challenge.data.id,phone,async()=>{
        toast("Celular verificado. Ya puedes completar el Registro Tributario.");
        await supabase.auth.refreshSession();
        await loadProfile();
        location.hash="registry";
      });
    }catch(e:any){
      box.innerHTML=`<div class="note danger"><strong>No fue posible enviar el SMS.</strong><br>${esc(e.message||e)}</div>`;
    }
  });

  document.querySelector("#mfaChallengeBtn")?.addEventListener("click",async()=>{
    try{
      const factor=await getVerifiedPhoneFactor();
      if(!factor){toast("No existe un celular verificado.","warn");return;}
      const challenge=await supabase.auth.mfa.challenge({factorId:factor.id});
      if(challenge.error) throw challenge.error;
      const box=document.querySelector("#mfaBox")!;
      renderPhoneCodeBox(box,factor.id,challenge.data.id,factor.phone||"",async()=>{
        await supabase.auth.refreshSession();
        toast("Código correcto. Sesión reforzada AAL2.");
        render();
      });
    }catch(e:any){toast(e.message||"No fue posible enviar el código.","error");}
  });
}

function renderPhoneCodeBox(box:Element,factorId:string,challengeId:string,phone:string,onSuccess:()=>Promise<void>|void){
  box.innerHTML=`<div class="stack"><div class="note"><strong>Código enviado a ${esc(maskPhone(phone))}</strong><br>Escribe el código recibido por SMS para verificar este dispositivo.</div><div class="searchbox"><input class="input" id="mfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Código SMS"><button class="btn" id="mfaVerifyPhone">Verificar</button></div></div>`;
  document.querySelector("#mfaVerifyPhone")?.addEventListener("click",async()=>{
    const code=(document.querySelector<HTMLInputElement>("#mfaCode")?.value||"").trim();
    if(!/^\d{6,8}$/.test(code)){toast("Ingresa el código recibido por SMS.","warn");return;}
    try{
      const verify=await supabase.auth.mfa.verify({factorId,challengeId,code});
      if(verify.error) throw verify.error;
      await supabase.auth.refreshSession();
      await onSuccess();
    }catch(e:any){toast(e.message||"Código inválido o vencido.","error");}
  });
}

async function withFreshPhoneMfa(actionLabel:string,onVerified:()=>Promise<void>){
  const factor=await getVerifiedPhoneFactor();
  if(!factor){
    toast("Primero debes verificar tu celular.","warn");
    location.hash="security";
    return;
  }
  const challenge=await supabase.auth.mfa.challenge({factorId:factor.id});
  if(challenge.error) throw challenge.error;
  const overlay=document.createElement("div");
  overlay.className="modal-backdrop";
  overlay.innerHTML=`<div class="modal"><div class="kicker">Confirmación de identidad</div><h2>${esc(actionLabel)}</h2><p class="muted">Enviamos un código SMS a ${esc(maskPhone(factor.phone||""))}. Esta validación es independiente del ingreso con Google.</p><div class="field"><label>Código SMS</label><input class="input" id="sensitiveMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" autofocus></div><div class="actions mt"><button class="btn" id="confirmSensitiveMfa">Confirmar</button><button class="btn ghost" id="cancelSensitiveMfa">Cancelar</button></div></div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector("#cancelSensitiveMfa")?.addEventListener("click",close);
  overlay.querySelector("#confirmSensitiveMfa")?.addEventListener("click",async()=>{
    const code=(overlay.querySelector<HTMLInputElement>("#sensitiveMfaCode")?.value||"").trim();
    if(!/^\d{6,8}$/.test(code)){toast("Ingresa el código SMS.","warn");return;}
    try{
      const verified=await supabase.auth.mfa.verify({factorId:factor.id,challengeId:challenge.data.id,code});
      if(verified.error) throw verified.error;
      await supabase.auth.refreshSession();
      close();
      await onVerified();
    }catch(e:any){toast(e.message||"Código inválido o vencido.","error");}
  });
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
  const basePath=location.pathname.endsWith("/")?location.pathname:location.pathname.replace(/[^/]*$/,"");
  const verifyUrl=location.origin+basePath+"?certificate="+encodeURIComponent(cert.verificationToken)+"#certificates";
  const qrData=await QRCode.toDataURL(verifyUrl,{margin:1,width:220,errorCorrectionLevel:"M"});
  const qrBase64=qrData.split(",")[1] ?? ""; if(!qrBase64) throw new Error("No fue posible generar el código QR.");
  const qrBytes=Uint8Array.from(atob(qrBase64),c=>c.charCodeAt(0)); const qr=await pdf.embedPng(qrBytes);
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
