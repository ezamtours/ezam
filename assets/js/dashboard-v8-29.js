/* EZAM V8.29 — account preferences and owner CRM command center.
   Uses the current authenticated EZAMData session; does not introduce a second backend. */
(() => {
  "use strict";
  const $ = (query, root=document) => root.querySelector(query);
  const $$ = (query, root=document) => [...root.querySelectorAll(query)];
  const PREF_KEY = "ezam_workspace_prefs_v829";
  const FALLBACK = {theme:"light", density:"balanced", size:"standard", autoRefresh:true};
  const ACTIVE_STAGES = new Set(["New","Contacted","Qualified","Quoted","Follow-up"]);
  let preferences={...FALLBACK};
  let refreshBusy=false;
  let lastRefreshAt=null;

  function safeText(value) {return String(value??"");}
  function savePreferences() {
    try {localStorage.setItem(PREF_KEY,JSON.stringify(preferences));}catch(_){}
    const status=$("#ezamPrefsSaved");
    if(status)status.textContent="Saved on this device";
  }
  function readPreferences(){
    try{
      const saved=JSON.parse(localStorage.getItem(PREF_KEY)||"null");
      if(saved && typeof saved==="object"){
        if(["light","dark","system"].includes(saved.theme))preferences.theme=saved.theme;
        if(["compact","balanced","comfortable"].includes(saved.density))preferences.density=saved.density;
        if(["standard","large"].includes(saved.size))preferences.size=saved.size;
        if(typeof saved.autoRefresh==="boolean")preferences.autoRefresh=saved.autoRefresh;
      }else{
        const old=localStorage.getItem("ezam_admin_theme");
        if(["light","dark"].includes(old))preferences.theme=old;
      }
    }catch(_){}
  }
  const systemPref=window.matchMedia?.("(prefers-color-scheme: dark)");
  function resolvedTheme(){return preferences.theme==="system"?(systemPref?.matches?"dark":"light"):preferences.theme;}
  function applyPreferences(){
    const theme=resolvedTheme();
    document.documentElement.dataset.theme=theme;
    document.documentElement.dataset.density=preferences.density;
    document.documentElement.dataset.textSize=preferences.size;
    try{localStorage.setItem("ezam_admin_theme",theme);}catch(_){}
    $$("[data-pref-theme]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.prefTheme===preferences.theme)));
    $$("[data-pref-density]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.prefDensity===preferences.density)));
    $$("[data-pref-size]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.prefSize===preferences.size)));
    if($("#ezamAutoRefresh"))$("#ezamAutoRefresh").checked=preferences.autoRefresh;
    const btn=$("#themeToggle");
    if(btn){const name=theme==="dark"?"Switch to light mode":"Switch to dark mode";btn.setAttribute("title",name);btn.setAttribute("aria-label",name);}
  }
  readPreferences();
  applyPreferences();
  systemPref?.addEventListener?.("change",()=>{if(preferences.theme==="system")applyPreferences()});

  function changePreference(key,val){preferences[key]=val;applyPreferences();savePreferences();}
  $$("[data-pref-theme]").forEach(b=>b.addEventListener("click",()=>changePreference("theme",b.dataset.prefTheme)));
  $$("[data-pref-density]").forEach(b=>b.addEventListener("click",()=>changePreference("density",b.dataset.prefDensity)));
  $$("[data-pref-size]").forEach(b=>b.addEventListener("click",()=>changePreference("size",b.dataset.prefSize)));
  $("#ezamAutoRefresh")?.addEventListener("change",e=>changePreference("autoRefresh",e.target.checked));
  $("#ezamResetPrefs")?.addEventListener("click",()=>{preferences={...FALLBACK};applyPreferences();savePreferences()});
  $("#themeToggle")?.addEventListener("click",()=>{
    // Original dashboard listener runs first and toggles data-theme. Sync the new settings UI.
    preferences.theme=document.documentElement.dataset.theme==="dark"?"dark":"light";
    applyPreferences();savePreferences();
  });

  function api(){return window.EZAMDashboard || null;}
  function snap(){return api()?.snapshot?.()||{profile:null,leads:[],admins:[],packages:[]};}
  function setStatus(id,message,isError=false){
    const el=$(id);if(!el)return;
    el.textContent=message;el.classList.toggle("is-error",isError);el.classList.toggle("is-ok",!isError&&!!message);
  }

  function profileInit(){
    const data=snap();const p=data.profile;
    if(!p)return;
    const name=$("#ezamProfileName"),email=$("#ezamProfileEmail"),role=$("#ezamProfileRole");
    if(name && document.activeElement!==name)name.value=safeText(p.display_name||"");
    if(email)email.value=safeText(p.email||"");
    if(role)role.value=p.role==="owner"?"Owner":"Administrator";
    const isOwner=p.role==="owner";
    if(name)name.readOnly=!isOwner;
    if($("#ezamSaveProfile"))$("#ezamSaveProfile").disabled=!isOwner;
    if($("#ezamProfileHint"))$("#ezamProfileHint").textContent=isOwner
      ?"Your display name is stored in the secure Supabase profile." 
      :"An owner can update administrator display names. Your password can still be changed below.";
    if($("#ezamBackendStatus"))$("#ezamBackendStatus").textContent=window.EZAMData?.backendConfigured&&window.EZAMData?.client?"Supabase connected":"Backend not configured";
    if($("#ezamAccessStatus"))$("#ezamAccessStatus").textContent=p.is_active?"Active account":"Inactive";
  }
  $("#ezamSaveProfile")?.addEventListener("click",async e=>{
    const p=snap().profile;
    if(p?.role!=="owner")return setStatus("#ezamProfileStatus","Only the owner can edit this profile.",true);
    const client=window.EZAMData?.client;
    if(!client)return setStatus("#ezamProfileStatus","A live Supabase session is required.",true);
    const displayName=$("#ezamProfileName").value.trim();
    if(displayName.length<2 || displayName.length>80)return setStatus("#ezamProfileStatus","Enter a name between 2 and 80 characters.",true);
    e.currentTarget.disabled=true;
    setStatus("#ezamProfileStatus","Saving…");
    try{
      const {data,error}=await client.from("profiles").update({display_name:displayName}).eq("id",p.id).select("display_name").single();
      if(error)throw error;
      if(!data)throw new Error("Profile update was not confirmed.");
      const header=$("#currentUserName"),avatar=$("#adminAvatar");
      if(header)header.textContent=displayName;
      if(avatar)avatar.textContent=displayName[0].toUpperCase();
      setStatus("#ezamProfileStatus","Saved. Your updated name will be used next time you sign in.");
    }catch(error){setStatus("#ezamProfileStatus",error?.message||"Could not update your profile.",true)}
    finally{e.currentTarget.disabled=false;}
  });

  $("#ezamPasswordForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const client=window.EZAMData?.client;
    if(!client)return setStatus("#ezamPasswordStatus","Live Supabase sign-in is required.",true);
    const newPass=$("#ezamNewPassword").value,confirmPass=$("#ezamConfirmPassword").value;
    if(newPass.length<12)return setStatus("#ezamPasswordStatus","Use at least 12 characters.",true);
    if(newPass!==confirmPass)return setStatus("#ezamPasswordStatus","Passwords do not match.",true);
    const button=$('button[type="submit"]',e.currentTarget);button.disabled=true;
    setStatus("#ezamPasswordStatus","Updating…");
    try{
      const {error}=await client.auth.updateUser({password:newPass});
      if(error)throw error;
      e.currentTarget.reset();
      setStatus("#ezamPasswordStatus","Password updated. Keep it somewhere secure.");
    }catch(error){setStatus("#ezamPasswordStatus",error?.message||"Could not update password.",true)}
    finally{button.disabled=false;}
  });
  $("#ezamOpenWebsite")?.addEventListener("click",()=>{window.location.href="index.html"});

  const agoMs=(v)=>{const parsed=Date.parse(v||"");return Number.isFinite(parsed)?Math.max(0,Date.now()-parsed):null};
  const closed=new Set(["Booked","Closed","Lost"]);
  function isOpen(l){return !closed.has(l.stage||"New")};
  function isReview(l){const age=agoMs(l.created_at);return age!==null && age>48*3600000 && ["New","Follow-up"].includes(l.stage||"New")};
  function safeNode(tag, cls, text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=safeText(text);return el;}

  function updateCommandCenter(){
    const d=snap();if(!d.profile)return;
    const leads=Array.isArray(d.leads)?d.leads:[];
    const set=(id,n)=>{if($(id))$(id).textContent=String(n)};
    set("#ezamNew24",leads.filter(l=>l.stage==="New" && (agoMs(l.created_at)??Infinity)<=24*3600000).length);
    set("#ezamUnassigned",leads.filter(l=>isOpen(l)&&!l.assigned_to).length);
    set("#ezamHotOpen",leads.filter(l=>isOpen(l)&&l.temperature==="Hot").length);
    set("#ezamAging",leads.filter(isReview).length);
    const queue=$("#ezamLeadQueue");if(!queue)return;
    queue.replaceChildren();
    const priority=leads.filter(isOpen).slice().sort((a,b)=>{
      const score=l=>(isReview(l)?8:0)+(l.temperature==="Hot"?6:0)+(l.stage==="New"?2:0)+(!l.assigned_to?1:0);
      return score(b)-score(a) || (Date.parse(a.created_at||"")||0)-(Date.parse(b.created_at||"")||0);
    }).slice(0,6);
    if(priority.length===0){queue.append(safeNode("div","ezam-queue-empty","No open inquiries require attention right now."));return}
    for(const lead of priority){
      const button=safeNode("button","ezam-queue-item");button.type="button";
      button.setAttribute("aria-label",`Open ${safeText(lead.name||"traveler")} inquiry`);
      const left=safeNode("span");left.append(safeNode("strong",null,lead.name||"Unnamed traveler"));
      const meta=[lead.stage||"New",lead.trip_details||lead.message||"General inquiry"].filter(Boolean).join(" · ");
      left.append(safeNode("small",null,meta));button.append(left);
      const status=isReview(lead)?"Review 48h+":(lead.temperature==="Hot"?"Hot lead":(!lead.assigned_to?"Unassigned":(lead.stage||"New")));
      button.append(safeNode("span","ezam-queue-label "+(isReview(lead)?"review":(lead.temperature==="Hot"?"hot":"")),status));
      button.addEventListener("click",()=>api()?.openLead?.(lead.id));queue.append(button);
    }
  }
  function recordRefresh(){lastRefreshAt=new Date();const el=$("#leadLastSync");if(el)el.textContent="Checked "+lastRefreshAt.toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit"});}
  window.addEventListener("ezam:data-refreshed",e=>{
    profileInit();updateCommandCenter();
    if(e.detail?.ok===false){
      const label=$("#leadLastSync");if(label)label.textContent="Some data could not be refreshed";
    }else recordRefresh();
  });
  // Account for fast cached sessions where the initial data event fires before this file executes.
  let bootTries=0;
  function bootFromCurrentData(){
    if(snap().profile){profileInit();updateCommandCenter();recordRefresh();return;}
    if(++bootTries<25)window.setTimeout(bootFromCurrentData,160);
  }
  window.setTimeout(bootFromCurrentData,0);
  window.addEventListener("ezam:view-changed",e=>{if(e.detail?.view==="profile")profileInit();if(e.detail?.view==="overview")updateCommandCenter()});

  async function refreshNow(){
    if(refreshBusy||!api())return;
    refreshBusy=true;
    const button=$("#leadRefreshNow");if(button)button.disabled=true;
    try{await api().refresh()}catch(err){const el=$("#leadLastSync");if(el)el.textContent="Refresh failed: "+safeText(err?.message||"check connection")}
    finally{refreshBusy=false;if(button)button.disabled=false}
  }
  $("#leadRefreshNow")?.addEventListener("click",refreshNow);
  $("#allLeadQueue")?.addEventListener("click",()=>api()?.showView?.("leads"));
  $$("[data-lead-filter]").forEach(button=>button.addEventListener("click",()=>{
    const which=button.dataset.leadFilter;
    if(which==="new")return api()?.openLeads?.({quick:"new24"});
    if(which==="unassigned")return api()?.openLeads?.({quick:"unassignedOpen"});
    if(which==="hot")return api()?.openLeads?.({quick:"hotOpen"});
    // Aging uses created_at, not a promised service-level deadline.
    if(which==="review")return api()?.openLeads?.({quick:"review48"});
  }));

  // Realtime subscriptions already exist in admin.js. This periodic check is optional.
  const checkTimer=window.setInterval(()=>{
    if(preferences.autoRefresh && !document.hidden && api()?.snapshot()?.profile) refreshNow();
  },90000);
  window.addEventListener("pagehide",()=>window.clearInterval(checkTimer),{once:true});

  // Keep interactive availability honest if Supabase login has not succeeded.
  document.addEventListener("DOMContentLoaded",()=>{applyPreferences()});
})();
