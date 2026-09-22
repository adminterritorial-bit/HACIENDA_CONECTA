import { createClient, type Session, type User } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

const SUPABASE_URL = "https://jppykxqsxayzypzdbnqd.supabase.co";
const SUPABASE_KEY = "sb_publishable_CH1hn5LpS3zWPdDWqiM4jg_F7OuK7Ry";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
});

type Profile = { user_id:string; full_name:string; email:string; phone_e164:string; role:string; identity_verified_at:string|null };
type AnyRow = Record<string, any>;
type PublicReference = { taxYear:number; uvtCop:number; uvtLegalReference:string; ciiuCount:number };
type A11yPrefs = { fontScale:number; highContrast:boolean };

const A11Y_STORAGE_KEY = "hc:a11y:v1";
const defaultA11yPrefs:A11yPrefs = { fontScale:1, highContrast:false };
let a11yPrefs:A11yPrefs = (() => {
  try{
    const raw=localStorage.getItem(A11Y_STORAGE_KEY);
    if(!raw) return {...defaultA11yPrefs};
    const parsed=JSON.parse(raw);
    return {
      fontScale:[1,1.125,1.25].includes(Number(parsed.fontScale)) ? Number(parsed.fontScale) : 1,
      highContrast:Boolean(parsed.highContrast)
    };
  }catch{return {...defaultA11yPrefs};}
})();
function applyA11yPrefs(){
  document.documentElement.setAttribute("data-font-scale",String(a11yPrefs.fontScale));
  document.documentElement.toggleAttribute("data-high-contrast",a11yPrefs.highContrast);
}
function saveA11yPrefs(){
  localStorage.setItem(A11Y_STORAGE_KEY,JSON.stringify(a11yPrefs));
  applyA11yPrefs();
}
function changeFontScale(delta:number){
  const scales=[1,1.125,1.25];
  const current=Math.max(0,scales.indexOf(a11yPrefs.fontScale));
  a11yPrefs.fontScale=scales[Math.max(0,Math.min(scales.length-1,current+delta))] ?? 1;
  saveA11yPrefs();
}
applyA11yPrefs();

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
let publicReference:PublicReference = {
  taxYear:2026,
  uvtCop:52374,
  uvtLegalReference:"Resolución DIAN 000238 de 2025",
  ciiuCount:324
};

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
const safeUrl = (v:any) => {
  try{
    const u=new URL(String(v||""),location.origin);
    return ["http:","https:"].includes(u.protocol) ? esc(u.href) : "#";
  }catch{return "#";}
};
const money = (v:any) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(v||0));
const copCompact = (v:any) => "$"+new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(Number(v||0));
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
  const {data}=await supabase.from("hc_profiles").select("user_id,full_name,email,phone_e164,role,identity_verified_at").eq("user_id",session.user.id).maybeSingle();
  profile=data as Profile|null;
}
async function loadPublicReference(){
  try{
    const [{data:uvt},{count}]=await Promise.all([
      supabase.from("hc_tax_parameters")
        .select("tax_year,numeric_value,legal_reference")
        .eq("key","UVT_COP")
        .eq("status","ACTIVE_VALIDATED")
        .order("tax_year",{ascending:false})
        .limit(1)
        .maybeSingle(),
      supabase.from("hc_ica_tariffs")
        .select("id",{count:"exact",head:true})
        .in("status",["BASE_VALIDATED","ACTIVE_VALIDATED"])
    ]);
    if(uvt?.numeric_value){
      publicReference={
        taxYear:Number(uvt.tax_year)||2026,
        uvtCop:Number(uvt.numeric_value)||52374,
        uvtLegalReference:String(uvt.legal_reference||"Fuente normativa registrada"),
        ciiuCount:count ?? publicReference.ciiuCount
      };
    }else if(count!==null){
      publicReference={...publicReference,ciiuCount:count};
    }
  }catch{
    // La interfaz conserva una referencia segura de respaldo si el catálogo público no responde.
  }
}
async function bootstrap(){
  const {data}=await supabase.auth.getSession(); session=data.session;
  await Promise.all([loadProfile(),loadPublicReference()]);
  if(session && route==="dashboard" && await needsPhoneOnboarding()){route="security";location.hash="security";}
  supabase.auth.onAuthStateChange(async (_event,newSession)=>{
    session=newSession;
    await loadProfile();
    if(session && route==="dashboard" && await needsPhoneOnboarding()){route="security";location.hash="security";}
    render();
  });
  addEventListener("hashchange",()=>{route=location.hash.replace("#","")||"dashboard";void render().then(()=>requestAnimationFrame(()=>document.querySelector<HTMLElement>("#main-content")?.focus({preventScroll:true})));});
  render();
}

function navItem(id:string,iconName:string,label:string){
  return `<button data-route="${id}" class="${route===id?"active":""}" ${route===id?'aria-current="page"':""}>
    <span class="nav-icon">${icon(iconName)}</span>
    <span class="nav-label">${label}</span>
    <span class="nav-arrow">${icon("arrow")}</span>
  </button>`;
}
function shell(content:string){
  const official=profile && profile.role!=="citizen";
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar" aria-label="Navegación principal">
      <div class="brand">
        <div class="brand-badge"><span>HC</span></div>
        <div class="brand-copy"><strong>Hacienda Conecta</strong><small>San Pedro · Valle del Cauca</small></div>
      </div>
      <div class="sidebar-context">
        <span class="live-dot"></span>
        <div><strong>Servicios tributarios</strong><small>Plataforma municipal segura</small></div>
      </div>
      <nav class="nav" aria-label="Servicios tributarios">
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
        <div class="side-stats"><span><b>${copCompact(publicReference.uvtCop)}</b>UVT</span><span><b>${publicReference.ciiuCount}</b>CIIU</span></div>
      </div>
    </aside>
    <section class="content">
      <div class="gov-strip"><span>Municipio de San Pedro · Secretaría de Hacienda</span><span class="gov-strip-right">Portal oficial de servicios tributarios</span></div>
      <header class="topbar">
        <div class="top-left">
          <button class="icon-button mobile-menu" id="menuBtn" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded="false">☰</button>
          <div><span class="top-title">${route==="dashboard"?"Resumen tributario":"Hacienda Conecta"}</span><span class="top-sub">Gestión segura, trazable y digital</span></div>
        </div>
        <div class="top-actions">
          <div class="a11y-controls" role="group" aria-label="Controles de accesibilidad">
            <button class="a11y-button" id="fontDownBtn" type="button" aria-label="Reducir tamaño de texto" title="Reducir tamaño de texto">A−</button>
            <button class="a11y-button" id="fontUpBtn" type="button" aria-label="Aumentar tamaño de texto" title="Aumentar tamaño de texto">A+</button>
            <button class="a11y-button contrast" id="contrastBtn" type="button" aria-pressed="${a11yPrefs.highContrast}" aria-label="Alternar alto contraste" title="Alternar alto contraste">◐<span class="a11y-label">Contraste</span></button>
          </div>
          <span class="secure-pill"><span class="secure-dot"></span>Conexión segura</span>
          ${session?`<div class="user-chip"><span class="avatar">${esc(userInitials())}</span><div class="user-copy"><strong>${esc(profile?.full_name||session.user.email||"Usuario")}</strong><small>${esc(profile?.role==="citizen"?"Contribuyente":profile?.role||"Usuario")}</small></div></div><button class="btn ghost small" id="logoutBtn">Salir</button>`:`<button class="btn small" data-action="login">Ingresar</button>`}
        </div>
      </header>
      <main class="main" id="main-content" tabindex="-1">${content}</main>
    </section>
  </div>`;
}

function bindShell(){
  document.querySelectorAll<HTMLElement>("[data-route]").forEach(b=>b.onclick=()=>{document.querySelector("#sidebar")?.classList.remove("open");location.hash=b.dataset.route!;});
  document.querySelector("#menuBtn")?.addEventListener("click",(e)=>{
    const sidebar=document.querySelector("#sidebar");
    const open=sidebar?.classList.toggle("open")||false;
    (e.currentTarget as HTMLButtonElement).setAttribute("aria-expanded",String(open));
  });
  document.querySelector("#fontDownBtn")?.addEventListener("click",()=>{changeFontScale(-1);});
  document.querySelector("#fontUpBtn")?.addEventListener("click",()=>{changeFontScale(1);});
  document.querySelector("#contrastBtn")?.addEventListener("click",(e)=>{
    a11yPrefs.highContrast=!a11yPrefs.highContrast;
    saveA11yPrefs();
    (e.currentTarget as HTMLButtonElement).setAttribute("aria-pressed",String(a11yPrefs.highContrast));
  });
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
      <div class="auth-trust"><span>UVT ${publicReference.taxYear} · ${copCompact(publicReference.uvtCop)}</span><span>${publicReference.ciiuCount} actividades ICA</span><span>RLS + MFA</span></div>
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
  if(session){try{summary=await api(supabase.rpc("hc_dashboard_summary"));}catch{}}
  const {data:catalog}=await supabase.from("hc_revenue_catalog").select("code,name,implementation_phase,implementation_status").order("implementation_phase").limit(6);
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
      <div class="hero-stat"><div><small>UVT vigente</small><strong>${copCompact(publicReference.uvtCop)}</strong></div><span class="hero-stat-icon">UVT</span></div>
      <div class="hero-stat"><div><small>Catálogo ICA</small><strong>${publicReference.ciiuCount} actividades</strong></div><span class="hero-stat-icon">CIIU</span></div>
      <div class="hero-law">${esc(publicReference.uvtLegalReference)}</div>
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
    supabase.from("hc_taxpayer_registrations").select("*").eq("user_id",session!.user.id).maybeSingle(),
    supabase.from("hc_taxpayer_relationships").select("relation_type,related_name,related_email,professional_card").order("created_at",{ascending:false})
  ]);
  const {data:acts}=reg?await supabase.from("hc_taxpayer_activities").select("ciiu,is_primary").eq("registration_id",reg.id):{data:null};
  if(acts){
    const codes=(acts as any[]).map(a=>a.ciiu);
    const {data:catalog}=codes.length?await supabase.from("hc_ica_tariffs").select("ciiu,activity").in("ciiu",codes):{data:[] as any[]};
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
  return `<div class="page-head"><div><div class="kicker">Industria y Comercio</div><h1>Liquidación ICA 2026</h1><p>Construye la liquidación por actividades económicas. Hacienda Conecta consulta la tarifa CIIU, aplica mínimo tributario y calcula Avisos y Tableros cuando corresponda.</p></div><div class="head-badges"><span class="status ok">${icon("check")} Motor activo</span><span class="pill">UVT ${copCompact(publicReference.uvtCop)}</span></div></div>
  <div class="calculator-layout">
    <section class="calculator-card">
      <div class="calculator-head"><div><span class="kicker">Paso 1</span><h2>Ingresos gravables por actividad</h2><p>Agrega todas las actividades realizadas en jurisdicción de San Pedro.</p></div><span class="calc-badge">Vigencia 2026</span></div>
      <div id="icaRows" class="calc-rows">
        <article class="calc-row ica-row"><span class="row-number">1</span><div class="field"><label>Código CIIU</label><input class="input" data-ciiu maxlength="4" value="1011" inputmode="numeric"><span class="hint">Código de 4 dígitos.</span></div><div class="field grow"><label>Ingreso gravable en San Pedro</label><div class="money-input"><span>$</span><input class="input" data-income type="number" min="0" value="100000000"></div></div></article>
      </div>
      <button class="add-row-btn" type="button" id="addIcaRow">+ Agregar otra actividad</button>
      <div class="calc-option"><label class="switch"><input id="icaNotices" type="checkbox"><span class="switch-ui"></span></label><div><strong>Avisos y Tableros</strong><small>Actívalo cuando el contribuyente tenga obligación del complementario.</small></div></div>
      <div class="calc-actions"><button class="btn" id="calculateIca">Calcular liquidación</button><button class="btn secondary" id="saveIca" disabled>Guardar como declaración</button></div>
    </section>
    <aside class="result-card">
      <div class="result-card-head"><span class="result-icon">${icon("ica")}</span><div><span class="kicker">Resultado</span><h2>Resumen de liquidación</h2></div></div>
      <div id="icaResult">${lastIcaCalculation?renderIcaResult(lastIcaCalculation):'<div class="result-empty"><span>Σ</span><strong>Sin cálculo todavía</strong><p>Completa tus actividades y presiona “Calcular liquidación”.</p></div>'}</div>
      <div class="legal-mini"><span>${icon("legal")}</span><div><strong>Motor de reglas versionado</strong><small>Si el CIIU no tiene una tarifa validada, el cálculo se bloquea.</small></div></div>
    </aside>
  </div>
  <div class="info-strip mt"><div><span class="info-strip-icon">${icon("check")}</span><p><strong>Sin doble cobro del mínimo.</strong> El mínimo ICA se aplica al total cuando corresponde, evitando volver a cargar Avisos y Tableros sobre ese mínimo.</p></div><div><span class="info-strip-icon">${icon("legal")}</span><p><strong>Trazabilidad.</strong> Cada cálculo conserva vigencia, parámetros y valores usados para su posterior auditoría.</p></div></div>`;
}
function renderIcaResult(r:any){
  return `<div class="result-total"><small>Total antes de retenciones / anticipos</small><strong>${money(r.totalBeforeCreditsCop)}</strong><span class="status ok">Calculado</span></div>
  <div class="result-breakdown">
    <div><span>ICA por actividades</span><strong>${money(r.subtotalIcaCop)}</strong></div>
    <div><span>Avisos y Tableros</span><strong>${money(r.noticesAndBoardsCop)}</strong></div>
    <div><span>Mínimo 2 UVT</span><strong>${money(r.minimumTaxCop)}</strong></div>
    <div><span>Ajuste al mínimo</span><strong>${money(r.minimumAdjustmentCop)}</strong></div>
  </div>
  <div class="result-meta"><span>UVT aplicada <b>${money(r.uvtValueCop)}</b></span><span>Vigencia <b>${r.taxYear}</b></span></div>
  ${r.lines?.length?`<div class="mini-lines">${r.lines.map((x:any)=>`<div><span><b>${esc(x.ciiu)}</b> ${esc(x.activity||"Actividad")}</span><strong>${money(x.taxCop)}</strong></div>`).join("")}</div>`:""}`;
}

async function viewReteica(){
  return `<div class="page-head"><div><div class="kicker">Retención de ICA</div><h1>Calculadora RETEICA</h1><p>Registra operaciones sujetas a retención. El motor compara la base con el umbral en UVT y aplica la tarifa CIIU correspondiente.</p></div><div class="head-badges"><span class="status ok">${icon("check")} Cálculo disponible</span><span class="status warn">Periodicidad por validar</span></div></div>
  <div class="calculator-layout">
    <section class="calculator-card">
      <div class="calculator-head"><div><span class="kicker">Operaciones</span><h2>Base y concepto de retención</h2><p>Agrega compras o servicios realizados con cada actividad económica.</p></div><span class="calc-badge">UVT ${copCompact(publicReference.uvtCop)}</span></div>
      <div id="reteRows" class="calc-rows">
        <article class="calc-row rete-row"><span class="row-number">1</span><div class="field"><label>CIIU</label><input class="input" data-ciiu maxlength="4" value="1011" inputmode="numeric"></div><div class="field"><label>Concepto</label><select class="select" data-concept><option value="services">Servicios</option><option value="goods">Compras / bienes</option></select></div><div class="field grow"><label>Base de la operación</label><div class="money-input"><span>$</span><input class="input" data-base type="number" min="0" value="500000"></div></div></article>
      </div>
      <button class="add-row-btn" type="button" id="addReteRow">+ Agregar otra operación</button>
      <div class="calc-actions"><button class="btn" id="calculateRete">Calcular RETEICA</button><button class="btn secondary" id="saveRete" disabled>Guardar borrador</button></div>
      <div class="normative-lock"><span>${icon("security")}</span><div><strong>Control normativo activo</strong><p>La app calcula la retención, pero no inventa la periodicidad de presentación 2026 mientras exista la diferencia mensual/bimestral en las fuentes revisadas.</p></div></div>
    </section>
    <aside class="result-card">
      <div class="result-card-head"><span class="result-icon">${icon("reteica")}</span><div><span class="kicker">Resultado</span><h2>Retención calculada</h2></div></div>
      <div id="reteResult">${lastReteicaCalculation?renderReteResult(lastReteicaCalculation):'<div class="result-empty"><span>⇄</span><strong>Sin operaciones calculadas</strong><p>Agrega una base y el concepto para determinar si supera el umbral.</p></div>'}</div>
    </aside>
  </div>`;
}
function renderReteResult(r:any){
  return `<div class="result-total"><small>Total RETEICA</small><strong>${money(r.totalWithheldCop)}</strong><span class="status ok">Calculado</span></div>
  <div class="result-meta"><span>UVT aplicada <b>${money(r.uvtValueCop)}</b></span><span>Vigencia <b>${r.taxYear}</b></span></div>
  <div class="mini-lines">${(r.lines||[]).map((x:any)=>`<div class="rete-line"><span><b>${esc(x.ciiu)}</b> · ${esc(x.concept==="goods"?"Compras":"Servicios")}<small>Base ${money(x.baseCop)} · Umbral ${money(x.thresholdCop)} · ${x.ratePerThousand}‰</small></span><strong>${money(x.withheldCop)}</strong></div>`).join("")}</div>`;
}

async function viewDeclarations(){
  if(!requireSession())return "";
  const {data}=await supabase.from("hc_declarations").select("*").order("created_at",{ascending:false});
  const rows=data||[];
  const drafts=rows.filter((x:any)=>["DRAFT","IDENTITY_VERIFIED"].includes(x.status)).length;
  const signing=rows.filter((x:any)=>x.status==="READY_TO_SIGN").length;
  const paying=rows.filter((x:any)=>x.status==="PAYMENT_PENDING").length;
  const filed=rows.filter((x:any)=>["FILED","CERTIFICATE_AVAILABLE"].includes(x.status)).length;
  return `<div class="page-head"><div><div class="kicker">Obligaciones</div><h1>Mis declaraciones</h1><p>Continúa borradores, firma electrónicamente, autoriza pagos y descarga documentos de tus obligaciones tributarias.</p></div><div class="actions"><button class="btn" data-route="ica">+ Nueva ICA</button><button class="btn secondary" data-route="reteica">+ Nueva RETEICA</button></div></div>
  <div class="declaration-summary mb">
    <article><span class="summary-icon draft">${icon("declarations")}</span><div><strong>${drafts}</strong><small>Borradores</small></div></article>
    <article><span class="summary-icon signing">${icon("security")}</span><div><strong>${signing}</strong><small>Por firmar</small></div></article>
    <article><span class="summary-icon paying">${icon("payments")}</span><div><strong>${paying}</strong><small>Por pagar</small></div></article>
    <article><span class="summary-icon filed">${icon("check")}</span><div><strong>${filed}</strong><small>Radicadas</small></div></article>
  </div>
  <section class="card">
    <div class="section-title"><div><div class="kicker">Historial</div><h2>Declaraciones tributarias</h2></div><span class="pill">${rows.length} registros</span></div>
    ${rows.length?`<div class="declaration-list">${rows.map((d:any)=>`<article class="declaration-item"><div class="declaration-type"><span class="module-icon">${icon(d.tax_type==="RETEICA"?"reteica":"ica")}</span><div><strong>${esc(d.tax_type)}</strong><small>${d.tax_year} · ${esc(d.period)}</small></div></div><div class="declaration-state"><span class="status ${statusClass(d.status)}">${esc(humanStatus(d.status))}</span><small>Creada ${date(d.created_at)}</small></div><div class="declaration-amount"><small>Saldo</small><strong>${money(d.balance_due_cop)}</strong></div><div class="declaration-action">${declarationActions(d)}</div></article>`).join("")}</div>`:'<div class="empty-state"><span class="empty-state-icon">${icon("declarations")}</span><h3>Aún no tienes declaraciones</h3><p>Empieza una liquidación ICA o RETEICA para crear tu primer borrador.</p><div class="actions"><button class="btn" data-route="ica">Crear ICA</button><button class="btn secondary" data-route="reteica">Crear RETEICA</button></div></div>'}
  </section>`;
}

function declarationActions(d:any){
  if(d.status==="DRAFT"||d.status==="IDENTITY_VERIFIED") return `<button class="btn small" data-prepare="${d.id}">Preparar firma</button>`;
  if(d.status==="READY_TO_SIGN") return `<button class="btn small" data-sign="${d.id}">Firmar con SMS</button>`;
  if(d.status==="PAYMENT_PENDING") return `<button class="btn small" data-pay="${d.id}">Autorizar pago</button>`;
  return `<button class="btn ghost small" data-pdf="${d.id}">Descargar PDF</button>`;
}

async function viewPayments(){
  if(!requireSession())return "";
  const [{data:reqs},{data:paid},{data:decls}]=await Promise.all([
    supabase.from("hc_payment_requests").select("*,hc_declarations(tax_type,tax_year,period)").order("created_at",{ascending:false}),
    supabase.from("hc_payments").select("*,hc_declarations(tax_type,tax_year,period)").order("created_at",{ascending:false}),
    supabase.from("hc_declarations").select("id,tax_type,tax_year,period,balance_due_cop,status").eq("status","PAYMENT_PENDING")
  ]);
  return `<div class="page-head"><div><div class="kicker">Recaudo</div><h1>Pagos y conciliación</h1><p>La plataforma separa autorización del ciudadano, creación de referencia y confirmación bancaria. Un retorno del navegador nunca cambia por sí solo una obligación a “pagada”.</p></div><span class="status info">Control server-to-server</span></div>
  <section class="payment-flow mb">
    <div class="payment-flow-step done"><span>${icon("declarations")}</span><div><strong>Declaración</strong><small>Liquidación guardada</small></div></div>
    <span class="flow-line"></span>
    <div class="payment-flow-step active"><span>${icon("security")}</span><div><strong>Autorización SMS</strong><small>Segundo factor reciente</small></div></div>
    <span class="flow-line"></span>
    <div class="payment-flow-step"><span>${icon("payments")}</span><div><strong>Pasarela</strong><small>PSE / tarjetas</small></div></div>
    <span class="flow-line"></span>
    <div class="payment-flow-step"><span>${icon("check")}</span><div><strong>Confirmación</strong><small>Webhook + conciliación</small></div></div>
  </section>
  <div class="integration-banner mb"><span class="integration-banner-icon">${icon("payments")}</span><div><strong>El flujo de recaudo está preparado; faltan credenciales bancarias.</strong><p>Hacienda Conecta ya genera referencias y exige SMS antes del pago. La transacción monetaria real se habilita cuando el Municipio conecte la pasarela y entregue sus credenciales/webhook.</p></div><span class="status warn">Conexión externa</span></div>
  ${decls?.length?`<section class="card mb"><div class="section-title"><div><div class="kicker">Acción requerida</div><h2>Declaraciones listas para pagar</h2></div></div><div class="payable-grid">${decls.map((d:any)=>`<article class="payable-card"><span class="module-icon">${icon("payments")}</span><div><small>${esc(d.tax_type)} · ${esc(d.period)}</small><strong>${money(d.balance_due_cop)}</strong><span>Vigencia ${d.tax_year}</span></div><button class="btn small" data-pay="${d.id}">Autorizar pago</button></article>`).join("")}</div></section>`:""}
  <div class="grid cols-2">
    <section class="card"><div class="section-title"><div><div class="kicker">Referencias</div><h2>Solicitudes de pago</h2></div><span class="pill">${reqs?.length||0}</span></div>${reqs?.length?tableRows(reqs.map((p:any)=>[`<strong>${esc(p.reference)}</strong>`,esc(p.hc_declarations?.tax_type||""),money(p.amount_cop),`<span class="status ${statusClass(p.status)}">${humanStatus(p.status)}</span>`,date(p.created_at)]),["Referencia","Tributo","Valor","Estado","Fecha"]):'<div class="empty">Aún no has generado referencias de pago.</div>'}</section>
    <section class="card"><div class="section-title"><div><div class="kicker">Conciliación</div><h2>Pagos confirmados</h2></div><span class="pill">${paid?.length||0}</span></div>${paid?.length?tableRows(paid.map((p:any)=>[esc(p.reference),money(p.amount_cop),`<span class="status ok">${p.status}</span>`,date(p.verified_at)]),["Referencia","Valor","Estado","Verificado"]):'<div class="empty">Todavía no existen pagos confirmados por la pasarela.</div>'}</section>
  </div>`;
}

async function viewSecurity(){
  if(!requireSession())return "";
  const [aal,factors]=await Promise.all([supabase.auth.mfa.getAuthenticatorAssuranceLevel(),supabase.auth.mfa.listFactors()]);
  const current=aal.data?.currentLevel||"aal1";
  const phone=((factors.data?.phone||[]) as any[]).find((f:any)=>f.status==="verified");
  const pendingPhone=((factors.data?.phone||[]) as any[]).find((f:any)=>f.status!=="verified");
  const suggestedPhone=phone?.phone || pendingPhone?.phone || profile?.phone_e164 || session?.user.user_metadata?.phone || "";
  const provider=session?.user.app_metadata?.provider||"email";
  return `<div class="page-head"><div><div class="kicker">Identidad digital</div><h1>Seguridad, celular y firma</h1><p>El acceso y la autorización de operaciones sensibles se separan. Puedes entrar con Google o correo; firma y pagos requieren una validación adicional del celular.</p></div><div class="head-badges"><span class="status ${phone?"ok":"warn"}">${phone?icon("check")+" Celular verificado":"Celular pendiente"}</span><span class="pill">Sesión ${current.toUpperCase()}</span></div></div>
  <div class="security-overview mb">
    <article><span class="security-step-icon">${icon("registry")}</span><div><small>Primer factor</small><strong>${provider==="google"?"Google":"Correo / contraseña"}</strong><span>${esc(session?.user.email||"Cuenta autenticada")}</span></div><span class="status ok">Activo</span></article>
    <article><span class="security-step-icon">${icon("security")}</span><div><small>Segundo factor</small><strong>${phone?"SMS al celular":"Pendiente de vincular"}</strong><span>${phone?esc(maskPhone(phone.phone||"")):"Necesario para operar"}</span></div><span class="status ${phone?"ok":"warn"}">${phone?"Verificado":"Pendiente"}</span></article>
    <article><span class="security-step-icon">${icon("certificates")}</span><div><small>Firma documental</small><strong>SHA-256 + AAL2</strong><span>Evidencia vinculada al documento</span></div><span class="status info">Preparado</span></article>
  </div>
  <div class="security-layout">
    <section class="card security-action-card">
      <div class="section-title"><div><div class="kicker">Segundo factor</div><h2>${phone?"Celular protegido":"Vincula tu celular"}</h2></div><span class="security-phone-icon">SMS</span></div>
      ${phone
        ? `<div class="verified-phone"><span>${icon("check")}</span><div><small>Número verificado</small><strong>${esc(maskPhone(phone.phone||""))}</strong></div></div><p class="security-copy">Antes de firmar o generar una referencia de pago te enviaremos un código nuevo. El código dura pocos minutos y eleva la sesión a AAL2.</p><button class="btn" id="mfaChallengeBtn">Enviar código de prueba</button>`
        : `<div class="note warn mb"><strong>Necesario para continuar.</strong> El Registro Tributario, la firma y el pago quedan bloqueados mientras no exista un teléfono verificado.</div><div class="field"><label>Número celular</label><input class="input" id="phoneMfaInput" value="${esc(suggestedPhone)}" placeholder="+573001234567" autocomplete="tel"><span class="hint">Formato Colombia: +57 seguido de 10 dígitos, sin espacios.</span></div><button class="btn mt" id="phoneEnrollBtn">Enviar código SMS</button>`}
      <div id="mfaBox" class="mt"></div>
    </section>
    <section class="card"><div class="section-title"><div><div class="kicker">Cómo te protegemos</div><h2>Flujo de autorización</h2></div></div>
      <div class="security-timeline">
        <div><span class="timeline-index">1</span><div><strong>Acceso a la cuenta</strong><p>Google o correo identifican al usuario y crean la sesión inicial.</p></div></div>
        <div><span class="timeline-index">2</span><div><strong>Celular verificado</strong><p>El número queda enrolado como factor MFA asociado a la cuenta.</p></div></div>
        <div><span class="timeline-index">3</span><div><strong>Documento congelado</strong><p>Antes de firmar se calcula la huella SHA-256 de la declaración.</p></div></div>
        <div><span class="timeline-index">4</span><div><strong>SMS de un solo uso</strong><p>Un código reciente eleva la sesión a AAL2 y autoriza la operación concreta.</p></div></div>
      </div>
    </section>
  </div>`;
}

async function viewCertificates(){
  const publicVerify=`<section class="verification-card"><div class="verification-graphic"><span>${icon("certificates")}</span></div><div class="verification-body"><div class="kicker">Consulta pública</div><h2>Verifica un documento</h2><p>Ingresa el token impreso o usa el QR del certificado para comprobar su estado, serial y huella documental.</p><form id="verifyCertForm" class="verification-form"><input class="input" name="token" placeholder="Token de verificación" required><button class="btn">Verificar</button></form><div id="verifyCertResult" class="mt"></div></div></section>`;
  if(!session)return `<div class="page-head"><div><div class="kicker">Documentos verificables</div><h1>Certificados Hacienda</h1><p>Comprueba la autenticidad de documentos emitidos digitalmente por Hacienda Conecta.</p></div></div>${publicVerify}`;
  const [{data:requests},{data:certs},{data:decls}]=await Promise.all([
    supabase.from("hc_certificate_requests").select("*").order("submitted_at",{ascending:false}),
    supabase.from("hc_certificates").select("*,hc_declarations(tax_type,tax_year,period)").order("issued_at",{ascending:false}),
    supabase.from("hc_declarations").select("id,tax_type,tax_year,period,status").in("status",["FILED","CERTIFICATE_AVAILABLE","PAID"])
  ]);
  const issueable=(decls||[]).filter((d:any)=>["FILED","CERTIFICATE_AVAILABLE"].includes(d.status));
  return `<div class="page-head"><div><div class="kicker">Documentos</div><h1>Certificados y constancias</h1><p>Solicita documentos, emite constancias disponibles y verifica certificados mediante serial, token y QR.</p></div><span class="status ok">${icon("check")} Verificación pública activa</span></div>
  <div class="certificate-layout mb">
    <section class="card">
      <div class="section-title"><div><div class="kicker">Nueva solicitud</div><h2>Solicitar documento</h2></div></div>
      <form id="certRequestForm" class="stack">
        <div class="field"><label>Tipo de documento</label><select class="select" name="type"><option value="DECLARACION_PRESENTADA">Constancia de declaración presentada</option><option value="PAZ_Y_SALVO">Paz y salvo tributario</option><option value="CERTIFICADO_RETENCION">Certificado de retención</option></select></div>
        <div class="field"><label>Declaración relacionada</label><select class="select" name="declarationId"><option value="">Sin declaración asociada</option>${(decls||[]).map((d:any)=>`<option value="${d.id}">${d.tax_type} ${d.tax_year} · ${esc(d.period)}</option>`).join("")}</select></div>
        <button class="btn">Radicar solicitud</button>
      </form>
      ${issueable.length?`<div class="instant-issue"><div><strong>Emisión automática disponible</strong><small>Constancias para declaraciones ya radicadas.</small></div><div class="actions">${issueable.map((d:any)=>`<button class="btn ghost small" data-issue-cert="${d.id}">${d.tax_type} · ${esc(d.period)}</button>`).join("")}</div></div>`:""}
    </section>
    ${publicVerify}
  </div>
  <div class="grid cols-2">
    <section class="card"><div class="section-title"><div><div class="kicker">Seguimiento</div><h2>Mis solicitudes</h2></div><span class="pill">${requests?.length||0}</span></div>${requests?.length?tableRows(requests.map((r:any)=>[esc(r.certificate_type),`<span class="status ${statusClass(r.status)}">${humanStatus(r.status)}</span>`,date(r.submitted_at)]),["Tipo","Estado","Fecha"]):'<div class="empty">No has radicado solicitudes de certificados.</div>'}</section>
    <section class="card"><div class="section-title"><div><div class="kicker">Emitidos</div><h2>Documentos verificables</h2></div><span class="pill">${certs?.length||0}</span></div>${certs?.length?tableRows(certs.map((c:any)=>[esc(c.serial),esc(c.type),date(c.issued_at),c.revoked_at?'<span class="status danger">Revocado</span>':'<span class="status ok">Vigente</span>']),["Serial","Tipo","Emisión","Estado"]):'<div class="empty">Aún no hay certificados emitidos.</div>'}</section>
  </div>`;
}
async function viewPredial(){
  if(!requireSession())return "";
  const [{data:props},{data:reqs}]=await Promise.all([
    supabase.from("hc_property_accounts").select("*").order("tax_year",{ascending:false}),
    supabase.from("hc_paz_y_salvo_requests").select("*").order("submitted_at",{ascending:false})
  ]);
  return `<div class="page-head"><div><div class="kicker">Impuesto Predial</div><h1>Predial y paz y salvo</h1><p>Consulta cuentas prediales asociadas a tu identificación y radica solicitudes de paz y salvo cuando la fuente maestra municipal esté conectada.</p></div><span class="status warn">Fuente catastral por integrar</span></div>
  <div class="module-hero compact mb"><span class="module-hero-icon">${icon("predial")}</span><div><h2>Integración preparada</h2><p>La estructura de cuentas, saldos, sobretasa ambiental, sobretasa bomberil y solicitudes ya está en Supabase. No se muestran predios ficticios: el módulo espera la fuente oficial.</p></div><div class="module-hero-stat"><small>Cuentas asociadas</small><strong>${props?.length||0}</strong></div></div>
  <div class="grid cols-2">
    <section class="card"><div class="section-title"><div><div class="kicker">Patrimonio</div><h2>Mis predios</h2></div></div>${props?.length?`<div class="property-grid">${props.map((p:any)=>`<article class="property-card"><div class="property-head"><span class="module-icon">${icon("predial")}</span><div><strong>${esc(p.address)}</strong><small>Cuenta ${esc(p.property_number)}</small></div></div><div class="property-values"><div><span>Vigencia</span><b>${p.tax_year}</b></div><div><span>Saldo</span><b>${money(p.tax_balance_cop)}</b></div></div><button class="btn secondary small" data-paz="${p.id}">Solicitar paz y salvo</button></article>`).join("")}</div>`:'<div class="empty-state"><span class="empty-state-icon">${icon("predial")}</span><h3>Sin predios vinculados</h3><p>Cuando se conecte la fuente catastral municipal, tus cuentas aparecerán aquí automáticamente.</p></div>'}</section>
    <section class="card"><div class="section-title"><div><div class="kicker">Documentos</div><h2>Solicitudes de paz y salvo</h2></div><span class="pill">${reqs?.length||0}</span></div>${reqs?.length?tableRows(reqs.map((r:any)=>[esc(r.request_type),`<span class="status ${statusClass(r.status)}">${humanStatus(r.status)}</span>`,date(r.submitted_at)]),["Tipo","Estado","Radicación"]):'<div class="empty">No hay solicitudes de paz y salvo.</div>'}</section>
  </div>`;
}
async function viewAgreements(){
  if(!requireSession())return "";
  const {data}=await supabase.from("hc_payment_agreements").select("*").order("created_at",{ascending:false});
  return `<div class="page-head"><div><div class="kicker">Cartera</div><h1>Acuerdos de pago</h1><p>Radica solicitudes de facilidad de pago y consulta su estado. El cálculo oficial de intereses y plan de cuotas se habilita cuando Hacienda cargue el reglamento vigente.</p></div></div>
  <div class="request-layout">
    <section class="card request-form-card"><div class="panel-heading"><span class="panel-icon">${icon("agreements")}</span><div><h2>Nueva solicitud</h2><p>Indica la deuda y el plazo solicitado.</p></div></div><form id="agreementForm" class="stack"><div class="field"><label>Tipo de deuda</label><select class="select" name="debt"><option value="PREDIAL">Predial</option><option value="ICA">ICA</option><option value="RETEICA">RETEICA</option><option value="OTRA_RENTA">Otra renta</option></select></div><div class="field"><label>Capital adeudado</label><div class="money-input"><span>$</span><input class="input" type="number" min="1" name="principal" required placeholder="0"></div></div><div class="field"><label>Número de cuotas solicitadas</label><input class="input" type="number" min="1" max="120" name="installments" value="12" required></div><button class="btn">Radicar solicitud</button></form><div class="normative-lock mt"><span>${icon("legal")}</span><div><strong>Simulación oficial protegida</strong><p>No se calculan intereses o garantías hasta parametrizar el reglamento de cartera vigente.</p></div></div></section>
    <section class="card"><div class="section-title"><div><div class="kicker">Seguimiento</div><h2>Mis solicitudes</h2></div><span class="pill">${data?.length||0}</span></div>${data?.length?tableRows(data.map((x:any)=>[esc(x.debt_type),money(x.principal_cop),String(x.requested_installments),`<span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span>`]),["Deuda","Capital","Cuotas","Estado"]):'<div class="empty-state"><span class="empty-state-icon">${icon("agreements")}</span><h3>Sin acuerdos radicados</h3><p>Completa el formulario para iniciar una solicitud.</p></div>'}</section>
  </div>`;
}
async function viewRefunds(){
  if(!requireSession())return "";
  const {data}=await supabase.from("hc_refund_requests").select("*").order("created_at",{ascending:false});
  return `<div class="page-head"><div><div class="kicker">Devoluciones y compensaciones</div><h1>Saldos a favor</h1><p>Radica una solicitud electrónica, conserva soportes y sigue el expediente hasta la decisión de Hacienda.</p></div></div>
  <div class="request-layout">
    <section class="card request-form-card"><div class="panel-heading"><span class="panel-icon">${icon("refunds")}</span><div><h2>Nueva solicitud</h2><p>Describe el saldo y el fundamento de la petición.</p></div></div><form id="refundForm" class="stack"><div class="form-grid"><div class="field"><label>Tributo</label><select class="select" name="tax"><option>ICA</option><option>RETEICA</option><option>PREDIAL</option><option>OTRO</option></select></div><div class="field"><label>Vigencia</label><input class="input" name="year" type="number" value="2026" min="2021"></div></div><div class="field"><label>Valor solicitado</label><div class="money-input"><span>$</span><input class="input" name="amount" type="number" min="1" required placeholder="0"></div></div><div class="field"><label>Fundamento</label><textarea class="textarea" name="reason" minlength="20" maxlength="4000" placeholder="Explica el origen del saldo a favor y la solicitud" required></textarea></div><button class="btn">Guardar y radicar</button></form></section>
    <section class="card"><div class="section-title"><div><div class="kicker">Expedientes</div><h2>Mis solicitudes</h2></div><span class="pill">${data?.length||0}</span></div>${data?.length?tableRows(data.map((x:any)=>[esc(x.tax_type),money(x.amount_cop),`<span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span>`,date(x.created_at)]),["Tributo","Valor","Estado","Fecha"]):'<div class="empty-state"><span class="empty-state-icon">${icon("refunds")}</span><h3>Sin solicitudes</h3><p>Las devoluciones o compensaciones que radiques aparecerán aquí.</p></div>'}</section>
  </div>`;
}
async function viewAudit(){
  if(!requireSession())return "";
  const {data}=await supabase.from("hc_audit_cases").select("*").order("opened_at",{ascending:false});
  return `<div class="page-head"><div><div class="kicker">Fiscalización</div><h1>Expedientes y actuaciones</h1><p>Consulta actuaciones asociadas a tu identificación tributaria. La información se presenta dentro de un entorno sujeto a reserva y control de acceso.</p></div><span class="status info">${icon("security")} Información reservada</span></div>
  <section class="module-hero compact mb"><span class="module-hero-icon">${icon("audit")}</span><div><h2>Expediente tributario digital</h2><p>Requerimientos, pruebas, respuestas y decisiones se organizan por caso para mantener trazabilidad cronológica.</p></div><div class="module-hero-stat"><small>Casos abiertos</small><strong>${(data||[]).filter((x:any)=>x.status!=="CLOSED").length}</strong></div></section>
  <section class="card"><div class="section-title"><div><div class="kicker">Actuaciones</div><h2>Mis expedientes</h2></div><span class="pill">${data?.length||0}</span></div>${data?.length?tableRows(data.map((x:any)=>[esc(x.case_number),esc(x.tax_type),esc(x.current_stage),`<span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span>`,date(x.opened_at)]),["Expediente","Tributo","Etapa","Estado","Apertura"]):'<div class="empty-state"><span class="empty-state-icon">${icon("audit")}</span><h3>Sin actuaciones vigentes</h3><p>No existen expedientes de fiscalización asociados a tu cuenta.</p></div>'}</section>`;
}
async function viewRevenues(){
  const {data}=await supabase.from("hc_revenue_catalog").select("*").order("implementation_phase").order("name");
  const items=data||[];
  return `<div class="page-head"><div><div class="kicker">Catálogo municipal</div><h1>Rentas y servicios de Hacienda</h1><p>Inventario funcional de impuestos, tasas, sobretasas, contribuciones y estampillas contempladas por el marco municipal.</p></div><span class="pill">${items.length} conceptos catalogados</span></div>
  <div class="revenue-summary mb"><div><strong>${items.filter((x:any)=>x.implementation_phase===1).length}</strong><span>Fase 1</span></div><div><strong>${items.filter((x:any)=>x.implementation_phase===2).length}</strong><span>Fase 2</span></div><div><strong>${items.filter((x:any)=>x.implementation_phase>=3).length}</strong><span>Catalogadas</span></div></div>
  <section class="card"><div class="revenue-grid">${items.map((x:any)=>`<article class="revenue-card"><span class="revenue-icon">${icon(["IMPUESTO","RETENCION"].includes(x.category)?"ica":"revenues")}</span><div><small>${esc(x.category)}</small><strong>${esc(x.name)}</strong><span>Fase ${x.implementation_phase}</span></div><span class="status ${statusClass(x.implementation_status)}">${esc(humanStatus(x.implementation_status))}</span></article>`).join("")}</div></section>`;
}
async function viewLegal(){
  const [{data:sources},{data:params},{data:calendar}]=await Promise.all([
    supabase.from("hc_legal_sources").select("*").order("norm_year",{ascending:false}),
    supabase.from("hc_tax_parameters").select("*").eq("tax_year",2026).order("key"),
    supabase.from("hc_filing_calendar").select("*").eq("tax_year",2026)
  ]);
  return `<div class="page-head"><div><div class="kicker">Gobernanza tributaria</div><h1>Normativa y parámetros 2026</h1><p>Cada cálculo automático se apoya en parámetros versionados. Hacienda Conecta distingue fuentes localizadas, reglas validadas y bloqueos pendientes.</p></div><span class="status ok">${icon("check")} Motor auditable</span></div>
  <div class="legal-hero mb"><span class="legal-hero-icon">${icon("legal")}</span><div><h2>Reglas antes que supuestos</h2><p>Una tarifa, vencimiento o beneficio solo pasa al motor cuando su fuente, vigencia y estado están registrados. Las diferencias normativas permanecen visibles en vez de resolverse por inferencia.</p></div><div class="legal-hero-param"><small>UVT ${publicReference.taxYear}</small><strong>${copCompact(publicReference.uvtCop)}</strong><span>Res. DIAN 000238/2025</span></div></div>
  <div class="grid cols-2 mb">
    <section class="card"><div class="section-title"><div><div class="kicker">Motor</div><h2>Parámetros de la vigencia</h2></div></div>${tableRows((params||[]).map((x:any)=>[esc(x.key),x.numeric_value!==null?esc(x.numeric_value):esc(x.text_value),`<span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span>`,esc(x.legal_reference)]),["Parámetro","Valor","Estado","Fuente"])}</section>
    <section class="card"><div class="section-title"><div><div class="kicker">Vencimientos</div><h2>Calendario tributario 2026</h2></div></div>${calendar?.length?tableRows(calendar.map((x:any)=>[esc(x.tax_type),esc(x.period),date(x.due_date),esc(x.legal_reference)]),["Tributo","Período","Vence","Fuente"]):'<div class="normative-lock"><span>'+icon("security")+'</span><div><strong>Calendario pendiente de fuente oficial</strong><p>La plataforma no inventará fechas de vencimiento usando calendarios de otra vigencia.</p></div></div>'}</section>
  </div>
  <section class="card"><div class="section-title"><div><div class="kicker">Fuentes</div><h2>Registro jurídico</h2></div><span class="pill">${sources?.length||0} fuentes</span></div><div class="legal-source-grid">${(sources||[]).map((x:any)=>`<article class="legal-source"><span class="legal-source-year">${x.norm_year||"—"}</span><div><small>${esc(x.norm_type)} ${esc(x.norm_number||"")}</small><strong>${esc(x.title)}</strong><span class="status ${statusClass(x.status)}">${humanStatus(x.status)}</span></div>${x.source_url?`<a class="source-link" href="${safeUrl(x.source_url)}" target="_blank" rel="noopener noreferrer">Ver fuente ↗</a>`:'<span class="source-link muted">Fuente suministrada</span>'}</article>`).join("")}</div></section>`;
}
async function viewStaff(){
  if(!profile||profile.role==="citizen")return '<div class="note danger">Esta sección requiere rol autorizado de la Secretaría de Hacienda.</div>';
  const [{data:regs},{data:decls},{data:agreements},{data:refunds},{data:integrations}]=await Promise.all([
    supabase.from("hc_taxpayer_registrations").select("id,business_name,person_type,status,created_at").order("created_at",{ascending:false}).limit(50),
    supabase.from("hc_declarations").select("id,tax_type,tax_year,period,status,balance_due_cop,created_at").order("created_at",{ascending:false}).limit(50),
    supabase.from("hc_payment_agreements").select("*").order("created_at",{ascending:false}).limit(30),
    supabase.from("hc_refund_requests").select("*").order("created_at",{ascending:false}).limit(30),
    supabase.from("hc_system_integrations").select("*").order("code")
  ]);
  return `<div class="page-head"><div><div class="kicker">Consola interna</div><h1>Gestión operativa de Hacienda</h1><p>Bandejas de consulta con segregación por rol, trazabilidad y acceso a estados del contribuyente.</p></div><span class="status info">${esc(humanStatus(profile.role))}</span></div>
  <div class="metric-grid mb">
    ${metric("registry",regs?.length||0,"Registros recientes","Últimos perfiles consultables")}
    ${metric("declarations",decls?.length||0,"Declaraciones","Actividad reciente")}
    ${metric("agreements",agreements?.length||0,"Acuerdos","Solicitudes en base")}
    ${metric("refunds",refunds?.length||0,"Devoluciones","Expedientes registrados")}
  </div>
  <section class="card mb"><div class="section-title"><div><div class="kicker">Infraestructura</div><h2>Estado de integraciones</h2><p class="section-desc">Visibilidad operativa de servicios que dependen de proveedores externos.</p></div></div>
    <div class="integration-grid">${(integrations||[]).map((x:any)=>`<article class="integration-card"><span class="integration-dot ${x.status==="ACTIVE"?"active":"pending"}"></span><div><strong>${esc(x.display_name)}</strong><small>${esc(x.provider||"Servicio")}</small><p>${esc(x.notes||"")}</p></div><span class="status ${x.status==="ACTIVE"?"ok":"warn"}">${esc(humanStatus(x.status))}</span></article>`).join("")}</div>
  </section>
  <section class="card"><div class="section-title"><div><div class="kicker">Operación</div><h2>Declaraciones recientes</h2></div></div>${tableRows((decls||[]).map((d:any)=>[esc(d.tax_type),`${d.tax_year} · ${esc(d.period)}`,money(d.balance_due_cop),`<span class="status ${statusClass(d.status)}">${humanStatus(d.status)}</span>`,date(d.created_at)]),["Tipo","Período","Saldo","Estado","Fecha"])}</section>`;
}

function tableRows(rows:string[][],headers:string[]){
  return `<div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function bindView(which:string){
  document.querySelectorAll<HTMLElement>("[data-route]").forEach(b=>b.onclick=()=>{document.querySelector("#sidebar")?.classList.remove("open");location.hash=b.dataset.route!;});
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
  const form=document.querySelector<HTMLFormElement>("#registryForm");
  if(!form) return;

  const updateWizard=(step:number)=>{
    registryStep=Math.max(1,Math.min(4,step));
    form.querySelectorAll<HTMLElement>("[data-reg-panel]").forEach(panel=>panel.classList.toggle("active",Number(panel.dataset.regPanel)===registryStep));
    form.querySelectorAll<HTMLElement>("[data-reg-step]").forEach(btn=>{
      const n=Number(btn.dataset.regStep);
      btn.classList.toggle("active",n===registryStep);
      btn.classList.toggle("done",n<registryStep);
      const badge=btn.querySelector(":scope > span");
      if(badge) badge.innerHTML=n<registryStep?icon("check"):String(n);
    });
    form.querySelectorAll<HTMLElement>(".wizard-line").forEach((line,i)=>line.classList.toggle("done",i<registryStep-1));
    if(registryStep===4) renderRegistryReview(form);
    form.scrollIntoView({behavior:"smooth",block:"start"});
  };

  const validateStep=(step:number)=>{
    const panel=form.querySelector<HTMLElement>(`[data-reg-panel="${step}"]`);
    if(!panel) return true;
    const controls=[...panel.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>("input,select,textarea")].filter(x=>!x.disabled);
    for(const control of controls){
      if(!control.checkValidity()){control.reportValidity();return false;}
    }
    if(step===2){
      if(!selectedRegistryActivities.length){toast("Selecciona al menos una actividad económica.","warn");return false;}
      if(selectedRegistryActivities.filter(a=>a.primary).length!==1){toast("Debe existir exactamente una actividad económica principal.","warn");return false;}
    }
    if(step===3){
      const personType=(form.elements.namedItem("personType") as HTMLSelectElement)?.value;
      const repName=(form.elements.namedItem("repName") as HTMLInputElement)?.value.trim();
      const repDoc=(form.elements.namedItem("repDoc") as HTMLInputElement)?.value.trim();
      const repEmail=(form.elements.namedItem("repEmail") as HTMLInputElement)?.value.trim();
      if(personType==="JURIDICA" && (!repName||!repDoc||!repEmail)){
        toast("Para persona jurídica completa representante legal, documento y correo.","warn");
        return false;
      }
    }
    return true;
  };

  form.querySelectorAll<HTMLElement>("[data-reg-step]").forEach(btn=>btn.addEventListener("click",()=>{
    const target=Number(btn.dataset.regStep);
    if(target<=registryStep || validateStep(registryStep)) updateWizard(target);
  }));
  form.querySelectorAll<HTMLElement>("[data-reg-next]").forEach(btn=>btn.addEventListener("click",()=>{if(validateStep(registryStep))updateWizard(registryStep+1);}));
  form.querySelectorAll<HTMLElement>("[data-reg-prev]").forEach(btn=>btn.addEventListener("click",()=>updateWizard(registryStep-1)));

  const search=async()=>{
    const q=(document.querySelector<HTMLInputElement>("#ciiuSearch")?.value||"").trim();
    if(q.length<2){toast("Escribe al menos 2 caracteres para buscar.","warn");return;}
    const {data,error}=await supabase.from("hc_ica_tariffs").select("ciiu,activity,rate_per_thousand").or(`ciiu.eq.${q},activity.ilike.%${q}%`).limit(20);
    if(error){toast(error.message,"error");return;}
    const box=document.querySelector("#ciiuResults")!;
    box.innerHTML=`<div class="ciiu-results">${(data||[]).map((x:any)=>`<button type="button" class="ciiu-item" data-ciiu-add="${x.ciiu}" data-activity="${esc(x.activity)}"><span class="ciiu-code">${x.ciiu}</span><span class="ciiu-copy"><strong>${esc(x.activity)}</strong><small>Tarifa ${x.rate_per_thousand}‰</small></span><span class="ciiu-add">+</span></button>`).join("")||'<div class="empty">No encontramos actividades con ese criterio.</div>'}</div>`;
    box.querySelectorAll<HTMLElement>("[data-ciiu-add]").forEach(el=>el.onclick=()=>{
      if(!selectedRegistryActivities.some(a=>a.ciiu===el.dataset.ciiu)){
        selectedRegistryActivities.push({ciiu:el.dataset.ciiu!,activity:el.dataset.activity||"",primary:selectedRegistryActivities.length===0});
        refreshActivities();
        toast("Actividad agregada.");
      }else toast("La actividad ya está seleccionada.","warn");
    });
  };
  document.querySelector("#ciiuSearchBtn")?.addEventListener("click",search);
  document.querySelector<HTMLInputElement>("#ciiuSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();search();}});
  refreshActivities();
  updateWizard(registryStep);

  form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    if(!validateStep(1)||!validateStep(2)||!validateStep(3)||!validateStep(4)){return;}
    const fd=new FormData(form);
    const personType=String(fd.get("personType")||"NATURAL");
    const payload:any={
      personType,
      documentType:String(fd.get("documentType")||""),
      documentNumber:String(fd.get("documentNumber")||""),
      fullNameOrBusinessName:String(fd.get("name")||""),
      email:String(fd.get("email")||""),
      phoneE164:String(fd.get("phone")||""),
      fiscalAddress:String(fd.get("address")||""),
      municipality:"San Pedro",
      department:"Valle del Cauca",
      economicActivities:selectedRegistryActivities.map(a=>({ciiu:a.ciiu,primary:a.primary})),
      dataPolicyAccepted:fd.get("policy")==="on",
      dataPolicyVersion:"2026-01"
    };
    if(fd.get("repName")) payload.representative={
      documentType:"CC",
      documentNumber:String(fd.get("repDoc")||""),
      fullName:String(fd.get("repName")||""),
      email:String(fd.get("repEmail")||"")
    };
    if(fd.get("accName")) payload.accountant={
      documentNumber:String(fd.get("accDoc")||""),
      fullName:String(fd.get("accName")||""),
      professionalCard:String(fd.get("accCard")||"")
    };
    const submit=form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if(submit){submit.disabled=true;submit.textContent="Guardando…";}
    try{
      await api(supabase.rpc("hc_register_taxpayer",{p_data:payload}));
      toast("Registro Tributario guardado correctamente.");
      registryStep=1;
      await loadProfile();
      render();
    }catch(err:any){
      toast(err.message||"No fue posible guardar el registro.","error");
      if(submit){submit.disabled=false;submit.textContent="Guardar Registro Tributario";}
    }
  });
}

function renderRegistryReview(form:HTMLFormElement){
  const fd=new FormData(form);
  const main=selectedRegistryActivities.find(a=>a.primary);
  const box=document.querySelector("#registryReview");
  if(!box)return;
  const person=String(fd.get("personType")||"NATURAL")==="JURIDICA"?"Persona jurídica":"Persona natural";
  box.innerHTML=`
    <article class="review-card"><span class="review-icon">${icon("registry")}</span><div><small>Contribuyente</small><strong>${esc(String(fd.get("name")||"Sin nombre"))}</strong><span>${esc(person)} · ${esc(String(fd.get("documentType")||""))}</span></div></article>
    <article class="review-card"><span class="review-icon">${icon("ica")}</span><div><small>Actividad principal</small><strong>${main?esc(main.ciiu):"—"}</strong><span>${main?esc(main.activity):"Sin actividad principal"}</span></div></article>
    <article class="review-card"><span class="review-icon">${icon("security")}</span><div><small>Contacto verificado</small><strong>${esc(maskPhone(String(fd.get("phone")||"")))}</strong><span>${esc(String(fd.get("email")||""))}</span></div></article>
    <article class="review-card"><span class="review-icon">${icon("staff")}</span><div><small>Responsables</small><strong>${fd.get("repName")?esc(String(fd.get("repName"))):"Sin representante adicional"}</strong><span>${fd.get("accName")?"Contador: "+esc(String(fd.get("accName"))):"Sin contador registrado"}</span></div></article>
  `;
}

function refreshActivities(){
  const box=document.querySelector("#selectedActivities"); if(!box)return; box.innerHTML=renderSelectedActivities(false);
  box.querySelectorAll<HTMLElement>("[data-remove-act]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.removeAct);selectedRegistryActivities.splice(i,1);if(selectedRegistryActivities.length&&!selectedRegistryActivities.some(x=>x.primary)){const first=selectedRegistryActivities[0];if(first)first.primary=true;}refreshActivities();});
  box.querySelectorAll<HTMLElement>("[data-primary]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.primary);selectedRegistryActivities=selectedRegistryActivities.map((a,j)=>({...a,primary:i===j}));refreshActivities();});
}

function bindIca(){
  document.querySelector("#addIcaRow")?.addEventListener("click",()=>{
    const count=document.querySelectorAll(".ica-row").length+1;
    document.querySelector("#icaRows")?.insertAdjacentHTML("beforeend",`<article class="calc-row ica-row"><span class="row-number">${count}</span><div class="field"><label>Código CIIU</label><input class="input" data-ciiu maxlength="4" inputmode="numeric"></div><div class="field grow"><label>Ingreso gravable en San Pedro</label><div class="money-input"><span>$</span><input class="input" data-income type="number" min="0"></div></div></article>`);
  });
  document.querySelector("#calculateIca")?.addEventListener("click",async()=>{
    const activities=[...document.querySelectorAll<HTMLElement>(".ica-row")].map(r=>({ciiu:(r.querySelector<HTMLInputElement>("[data-ciiu]")?.value||"").trim(),taxableIncomeCop:Number(r.querySelector<HTMLInputElement>("[data-income]")?.value||0)})).filter(x=>x.ciiu);
    try{lastIcaCalculation=await api(supabase.rpc("hc_calculate_ica",{p_activities:activities,p_apply_notices:(document.querySelector<HTMLInputElement>("#icaNotices")?.checked||false),p_tax_year:2026}));document.querySelector("#icaResult")!.innerHTML=renderIcaResult(lastIcaCalculation);(document.querySelector<HTMLButtonElement>("#saveIca")!).disabled=false;toast("Liquidación calculada.");}catch(err:any){toast(err.message,"error");}
  });
  document.querySelector("#saveIca")?.addEventListener("click",async()=>{
    if(!session){renderAuth();return;} if(!lastIcaCalculation)return;
    try{const id=await api<string>(supabase.rpc("hc_create_declaration",{p_tax_type:"ICA",p_period:"ANUAL",p_payload:{source:"web",activities:lastIcaCalculation.lines},p_calculation:lastIcaCalculation,p_balance_due_cop:lastIcaCalculation.totalBeforeCreditsCop,p_tax_year:2026}));toast("Declaración ICA guardada.");location.hash="declarations";}catch(err:any){toast(err.message,"error");}
  });
}
function bindReteica(){
  document.querySelector("#addReteRow")?.addEventListener("click",()=>{
    const count=document.querySelectorAll(".rete-row").length+1;
    document.querySelector("#reteRows")?.insertAdjacentHTML("beforeend",`<article class="calc-row rete-row"><span class="row-number">${count}</span><div class="field"><label>CIIU</label><input class="input" data-ciiu maxlength="4" inputmode="numeric"></div><div class="field"><label>Concepto</label><select class="select" data-concept><option value="services">Servicios</option><option value="goods">Compras / bienes</option></select></div><div class="field grow"><label>Base de la operación</label><div class="money-input"><span>$</span><input class="input" data-base type="number" min="0"></div></div></article>`);
  });
  document.querySelector("#calculateRete")?.addEventListener("click",async()=>{
    const transactions=[...document.querySelectorAll<HTMLElement>(".rete-row")].map(r=>({ciiu:(r.querySelector<HTMLInputElement>("[data-ciiu]")?.value||"").trim(),concept:(r.querySelector<HTMLSelectElement>("[data-concept]")?.value||"services"),baseCop:Number(r.querySelector<HTMLInputElement>("[data-base]")?.value||0)})).filter(x=>x.ciiu);
    try{lastReteicaCalculation=await api(supabase.rpc("hc_calculate_reteica",{p_transactions:transactions,p_tax_year:2026}));document.querySelector("#reteResult")!.innerHTML=renderReteResult(lastReteicaCalculation);(document.querySelector<HTMLButtonElement>("#saveRete")!).disabled=false;toast("RETEICA calculado.");}catch(err:any){toast(err.message,"error");}
  });
  document.querySelector("#saveRete")?.addEventListener("click",async()=>{if(!session){renderAuth();return;}if(!lastReteicaCalculation)return;try{await api(supabase.rpc("hc_create_declaration",{p_tax_type:"RETEICA",p_period:"PENDIENTE_DEFINICION_NORMATIVA",p_payload:{source:"web",transactions:lastReteicaCalculation.lines},p_calculation:lastReteicaCalculation,p_balance_due_cop:lastReteicaCalculation.totalWithheldCop,p_tax_year:2026}));toast("Borrador RETEICA guardado.");location.hash="declarations";}catch(err:any){toast(err.message,"error");}});
}
function bindDeclarations(){
  document.querySelectorAll<HTMLElement>("[data-prepare]").forEach(b=>b.onclick=async()=>{try{await api(supabase.rpc("hc_prepare_declaration_for_signature",{p_declaration_id:b.dataset.prepare}));toast("Documento listo para firma.");render();}catch(e:any){toast(e.message,"error");}});
  document.querySelectorAll<HTMLElement>("[data-sign]").forEach(b=>b.onclick=()=>signDeclaration(b.dataset.sign!));
  document.querySelectorAll<HTMLElement>("[data-pay]").forEach(b=>b.onclick=()=>requestPayment(b.dataset.pay!));
  document.querySelectorAll<HTMLElement>("[data-pdf]").forEach(b=>b.onclick=()=>downloadDeclarationPdf(b.dataset.pdf!));
}
function bindPayments(){document.querySelectorAll<HTMLElement>("[data-pay]").forEach(b=>b.onclick=()=>requestPayment(b.dataset.pay!));}
async function requestPayment(id:string){
  try{
    await withFreshPhoneMfa("Autorizar solicitud de pago",async()=>{
      const paymentId=await api<string>(supabase.rpc("hc_request_payment",{p_declaration_id:id}));
      toast("Identidad confirmada. Referencia de pago generada.");
      location.hash="payments";
      render();
    });
  }catch(e:any){toast(e.message||"No fue posible iniciar el pago.","error");}
}
async function signDeclaration(id:string){
  try{
    await withFreshPhoneMfa("Firmar declaración",async()=>{
      const {data:d,error}=await supabase.from("hc_declarations").select("*").eq("id",id).single(); if(error)throw error;
      const canonical=JSON.stringify({id:d.id,tax_type:d.tax_type,tax_year:d.tax_year,period:d.period,payload:d.payload,calculation:d.calculation,balance_due_cop:d.balance_due_cop});
      const hash=await sha256(canonical);
      const status=await api(supabase.rpc("hc_sign_declaration",{p_declaration_id:id,p_document_sha256:hash,p_auth_method:"PHONE_SMS_MFA_AAL2"}));
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
  document.querySelector("#certRequestForm")?.addEventListener("submit",async(e)=>{e.preventDefault();if(!session)return;const fd=new FormData(e.currentTarget as HTMLFormElement);try{const {error}=await supabase.rpc("hc_submit_certificate_request",{p_certificate_type:String(fd.get("type")),p_declaration_id:String(fd.get("declarationId")||"")||null});if(error)throw error;toast("Solicitud de certificado radicada.");render();}catch(err:any){toast(err.message,"error");}});
  const verify=async(token:string)=>{const box=document.querySelector("#verifyCertResult")!;try{const {data,error}=await supabase.functions.invoke("hc-verify-certificate",{body:{token}});if(error)throw error;box.innerHTML=data?.serial?`<div class="note"><strong>${data.valid?"Certificado válido":"Certificado revocado"}</strong><br>Serial: ${esc(data.serial)} · Tipo: ${esc(data.type)} · Emitido: ${date(data.issuedAt)} ${data.revoked?'<br><span class="status danger">REVOCADO</span>':'<br><span class="status ok">VIGENTE</span>'}</div>`:'<div class="note danger">No se encontró un certificado válido con ese token.</div>';}catch(err:any){box.innerHTML=`<div class="note danger">No se encontró un certificado válido o el servicio no respondió.</div>`;}};
  document.querySelector("#verifyCertForm")?.addEventListener("submit",async(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget as HTMLFormElement);await verify(String(fd.get("token")||"").trim());});
  const queryToken=new URLSearchParams(location.search).get("certificate"); if(queryToken) verify(queryToken);
  document.querySelectorAll<HTMLElement>("[data-issue-cert]").forEach(b=>b.onclick=async()=>{try{const cert=await api<any>(supabase.rpc("hc_issue_filing_certificate",{p_declaration_id:b.dataset.issueCert}));toast("Constancia emitida con serial "+cert.serial);await downloadCertificatePdf(cert);history.replaceState({},document.title,location.pathname+"#certificates");render();}catch(err:any){toast(err.message,"error");}});
}
function bindPredial(){document.querySelectorAll<HTMLElement>("[data-paz]").forEach(b=>b.onclick=async()=>{if(!session)return;try{const {error}=await supabase.rpc("hc_submit_paz_y_salvo",{p_property_account_id:b.dataset.paz,p_request_type:"PREDIAL"});if(error)throw error;toast("Solicitud de paz y salvo radicada.");render();}catch(e:any){toast(e.message,"error");}});}
function bindAgreements(){document.querySelector("#agreementForm")?.addEventListener("submit",async(e)=>{e.preventDefault();if(!session)return;const fd=new FormData(e.currentTarget as HTMLFormElement);const {error}=await supabase.rpc("hc_submit_payment_agreement",{p_debt_type:String(fd.get("debt")),p_principal_cop:Number(fd.get("principal")),p_requested_installments:Number(fd.get("installments"))});if(error)toast(error.message,"error");else{toast("Solicitud radicada.");render();}});}
function bindRefunds(){document.querySelector("#refundForm")?.addEventListener("submit",async(e)=>{e.preventDefault();if(!session)return;const fd=new FormData(e.currentTarget as HTMLFormElement);const {error}=await supabase.rpc("hc_submit_refund_request",{p_tax_type:String(fd.get("tax")),p_tax_year:Number(fd.get("year")),p_amount_cop:Number(fd.get("amount")),p_reason:String(fd.get("reason"))});if(error)toast(error.message,"error");else{toast("Solicitud radicada.");render();}});}

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
    const {data:d,error}=await supabase.from("hc_declarations").select("*").eq("id",id).single(); if(error)throw error;
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
