
(function(global){
  const cfg = global.EZAM_CONFIG || {};
  const backendConfigured = Boolean(
    cfg.supabaseUrl &&
    cfg.supabasePublishableKey &&
    /^https:\/\/.+\.supabase\.co$/i.test(cfg.supabaseUrl) &&
    !/YOUR_|example/i.test(cfg.supabaseUrl)
  );

  const client = backendConfigured && global.supabase?.createClient
    ? global.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const KEYS = {
    packages: "ezam_v8_packages",
    leads: "ezam_v8_leads",
    profiles: "ezam_v8_profiles",
    settings: "ezam_v8_settings",
    demoSession: "ezam_v8_demo_session"
  };

  const PHOTO_PRESETS = {
    palawan: { label:"Palawan", image:"assets/images/card-philippines.webp", fallback:"assets/images/card-philippines.webp" },
    japan: { label:"Japan", image:"assets/images/card-japan.webp", fallback:"assets/images/card-japan.webp" },
    korea: { label:"South Korea", image:"assets/images/card-south-korea.webp", fallback:"assets/images/card-south-korea.webp" },
    singapore: { label:"Singapore", image:"assets/images/card-singapore.webp", fallback:"assets/images/card-singapore.webp" },
    bali: { label:"Indonesia / Bali", image:"assets/images/card-bali.webp", fallback:"assets/images/card-bali.webp" },
    europe: { label:"France / Europe", image:"assets/images/place-europe.webp", fallback:"assets/images/place-europe.webp" },
    switzerland: { label:"Switzerland", image:"assets/images/fallback-switzerland.webp", fallback:"assets/images/fallback-switzerland.webp" },
    hawaii: { label:"USA / Hawaii", image:"assets/images/hero-hawaii-hq.webp", fallback:"assets/images/hero-hawaii-hq.webp" }
  };
  const SEED_PROFILES = [
    { id:"demo-owner", email:cfg.ownerEmail || "ezamtourstravelservices01@gmail.com", display_name:"Iza", role:"owner", is_active:true },
    { id:"demo-admin-1", email:"admin1@ezam.local", display_name:"Travel Admin 1", role:"admin", is_active:true },
    { id:"demo-admin-2", email:"admin2@ezam.local", display_name:"Travel Admin 2", role:"admin", is_active:true }
  ];

  const SEED_PACKAGES = [
    {
      id:"pkg-japan", title:"Best of Japan", country:"Japan", destination:"Tokyo · Kyoto · Osaka",
      duration:"7 Days / 6 Nights", travel_dates:"Flexible departures", price_label:"₱88,000",
      summary:"A balanced first Japan journey with iconic cities, culture, food, and time to explore.",
      tags:["Culture","Food","City"], image_url:PHOTO_PRESETS.japan.image, fallback_url:PHOTO_PRESETS.japan.fallback,
      published:true, featured:true
    },
    {
      id:"pkg-korea", title:"Korea Discovery", country:"South Korea", destination:"Seoul · Nami · Everland",
      duration:"5 Days / 4 Nights", travel_dates:"Selected departures", price_label:"₱42,000",
      summary:"Seoul highlights, Korean culture, shopping, food, and memorable attractions.",
      tags:["Culture","Shopping","Food"], image_url:PHOTO_PRESETS.korea.image, fallback_url:PHOTO_PRESETS.korea.fallback,
      published:true, featured:true
    },
    {
      id:"pkg-bali", title:"Bali Escape", country:"Indonesia", destination:"Ubud · Bedugul · Coast",
      duration:"5 Days / 4 Nights", travel_dates:"Flexible departures", price_label:"₱38,000",
      summary:"Temples, landscapes, relaxed pacing, and restorative island experiences.",
      tags:["Nature","Culture","Relax"], image_url:PHOTO_PRESETS.bali.image, fallback_url:PHOTO_PRESETS.bali.fallback,
      published:true, featured:false
    },
    {
      id:"pkg-singapore", title:"Singapore City Escape", country:"Singapore", destination:"Marina Bay · Sentosa · City",
      duration:"4 Days / 3 Nights", travel_dates:"Flexible departures", price_label:"Request current rate",
      summary:"A compact city break with food, attractions, architecture, and easy transport.",
      tags:["City","Food","Family"], image_url:PHOTO_PRESETS.singapore.image, fallback_url:PHOTO_PRESETS.singapore.fallback,
      published:true, featured:false
    }
  ];

  const SEED_SETTINGS = {
    business_email: "ezamtours@gmail.com",
    phone: "",
    facebook_url: "",
    instagram_url: "",
    tiktok_url: ""
  };

  function read(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }
  function write(key, value){
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("ezam-data-change", {detail:{key}}));
    return value;
  }
  function ensureDemo(){
    if(!read(KEYS.packages, null)) write(KEYS.packages, SEED_PACKAGES);
    if(!read(KEYS.profiles, null)) write(KEYS.profiles, SEED_PROFILES);
    if(!read(KEYS.leads, null)) write(KEYS.leads, []);
    if(!read(KEYS.settings, null)) write(KEYS.settings, SEED_SETTINGS);
  }
  ensureDemo();

  function migrateDemoPackageImages(){
    if(client) return;
    const rows=read(KEYS.packages,SEED_PACKAGES);
    let changed=false;
    const pick=(p)=>{
      const s=[p.title,p.country,p.destination].join(" ").toLowerCase();
      if(s.includes("japan")||s.includes("tokyo")||s.includes("kyoto")) return PHOTO_PRESETS.japan;
      if(s.includes("korea")||s.includes("seoul")) return PHOTO_PRESETS.korea;
      if(s.includes("singapore")||s.includes("marina")) return PHOTO_PRESETS.singapore;
      if(s.includes("bali")||s.includes("indonesia")) return PHOTO_PRESETS.bali;
      if(s.includes("palawan")||s.includes("philippines")||s.includes("el nido")) return PHOTO_PRESETS.palawan;
      return null;
    };
    rows.forEach(p=>{
      const preset=pick(p);
      if(!preset) return;
      // Always refresh stale/legacy demo paths so previews never show missing package photos.
      if(!p.fallback_url || /fallback-|place-|hero-|travel-|data:image/i.test(String(p.fallback_url))===false){
        p.fallback_url=preset.fallback; changed=true;
      }
      if(!p.image_url || /fallback-|hero-|travel-/i.test(String(p.image_url))){
        p.image_url=preset.image; changed=true;
      }
    });
    if(changed) write(KEYS.packages,rows);
  }
  migrateDemoPackageImages();


  function makeId(prefix){
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  }

  async function login(email, password){
    if(client){
      const {data,error} = await client.auth.signInWithPassword({email,password});
      if(error) throw error;
      const profile = await getCurrentProfile();
      if(!profile || !profile.is_active || !["owner","admin"].includes(profile.role)){
        await client.auth.signOut();
        throw new Error("This account is not an active EZAM admin account.");
      }
      return profile;
    }
    throw new Error("Secure backend is not configured yet. Use the preview buttons in demo mode.");
  }

  async function demoLogin(role="owner"){
    if(!cfg.demoMode) throw new Error("Demo mode is disabled.");
    const profiles = read(KEYS.profiles, SEED_PROFILES);
    const profile = role === "owner"
      ? profiles.find(p=>p.role==="owner")
      : profiles.find(p=>p.role==="admin");
    sessionStorage.setItem(KEYS.demoSession, JSON.stringify(profile));
    return profile;
  }

  async function logout(){
    if(client) await client.auth.signOut();
    sessionStorage.removeItem(KEYS.demoSession);
  }

  async function getCurrentProfile(){
    if(client){
      const {data:{user}, error} = await client.auth.getUser();
      if(error || !user) return null;
      const {data,error:profileError} = await client.from("profiles")
        .select("id,email,display_name,role,is_active")
        .eq("id", user.id).maybeSingle();
      if(profileError) throw profileError;
      return data;
    }
    try { return JSON.parse(sessionStorage.getItem(KEYS.demoSession) || "null"); }
    catch(_) { return null; }
  }

  async function listPackages({publicOnly=false}={}){
    if(client){
      let q = client.from("packages").select("*").order("featured",{ascending:false}).order("updated_at",{ascending:false});
      if(publicOnly) q = q.eq("published",true);
      const {data,error}=await q;
      if(error) throw error;
      return data || [];
    }
    const rows = read(KEYS.packages, SEED_PACKAGES);
    return publicOnly ? rows.filter(p=>p.published) : rows;
  }

  async function savePackage(item){
    if(client){
      const payload = {
        title:item.title, country:item.country, destination:item.destination, duration:item.duration,
        travel_dates:item.travel_dates, price_label:item.price_label, summary:item.summary,
        tags:item.tags || [], image_url:item.image_url, fallback_url:item.fallback_url || null,
        published:!!item.published, featured:!!item.featured
      };
      if(item.id){
        const {data,error}=await client.from("packages").update(payload).eq("id",item.id).select().single();
        if(error) throw error; return data;
      }
      const {data,error}=await client.from("packages").insert(payload).select().single();
      if(error) throw error; return data;
    }
    const rows = read(KEYS.packages, SEED_PACKAGES);
    const normalized = {...item, id:item.id || makeId("pkg"), updated_at:new Date().toISOString()};
    const i=rows.findIndex(x=>x.id===normalized.id);
    if(i>=0) rows[i]=normalized; else rows.unshift(normalized);
    write(KEYS.packages, rows);
    return normalized;
  }

  async function deletePackage(id){
    if(client){
      const {error}=await client.from("packages").delete().eq("id",id);
      if(error) throw error; return;
    }
    write(KEYS.packages, read(KEYS.packages,SEED_PACKAGES).filter(x=>x.id!==id));
  }

  async function createLead(input){
    const payload = {
      inquiry_type:input.inquiry_type || "custom",
      package_id:input.package_id || null,
      trip_details:input.trip_details || "",
      name:input.name || "",
      email:input.email || "",
      phone:input.phone || "",
      preferred_contact:input.preferred_contact || "Email",
      message:input.message || "",
      source:input.source || "website"
    };
    if(client){
      // Anonymous website submissions intentionally do not request the inserted row back,
      // because public users have INSERT permission but no SELECT access to leads.
      const {data:{user}} = await client.auth.getUser();
      if(user){
        payload.stage = input.stage || "New";
        payload.temperature = input.temperature || "Warm";
        payload.owner_notes = input.owner_notes || "";
        payload.assigned_to = input.assigned_to === undefined ? user.id : (input.assigned_to || null);
        const {data,error}=await client.from("leads").insert(payload).select().single();
        if(error) throw error;
        return data;
      }
      const {error}=await client.from("leads").insert(payload);
      if(error) throw error;
      return {id:null,...payload};
    }
    const rows=read(KEYS.leads,[]);
    const lead = {
      id:makeId("lead"), ...payload,
      stage:input.stage || "New",
      temperature:input.temperature || "Warm",
      assigned_to:input.assigned_to || null,
      owner_notes:input.owner_notes || "",
      created_at:new Date().toISOString()
    };
    rows.unshift(lead); write(KEYS.leads,rows); return lead;
  }

  async function listLeads(profile){
    if(client){
      const {data,error}=await client.from("leads").select("*, package:packages(title), assignee:profiles!leads_assigned_to_fkey(id,email,display_name)")
        .order("created_at",{ascending:false});
      if(error) throw error; return data || [];
    }
    const rows=read(KEYS.leads,[]);
    if(profile?.role==="owner") return rows;
    return rows.filter(x=>x.assigned_to===profile?.id);
  }

  async function saveLead(id, patch){
    const allowed = {
      stage:patch.stage, temperature:patch.temperature, assigned_to:patch.assigned_to || null,
      owner_notes:patch.owner_notes ?? undefined
    };
    Object.keys(allowed).forEach(k=>allowed[k]===undefined && delete allowed[k]);
    if(client){
      const {data,error}=await client.from("leads").update(allowed).eq("id",id).select().single();
      if(error) throw error; return data;
    }
    const rows=read(KEYS.leads,[]);
    const i=rows.findIndex(x=>x.id===id);
    if(i>=0) rows[i]={...rows[i],...allowed,updated_at:new Date().toISOString()};
    write(KEYS.leads,rows); return rows[i];
  }

  async function deleteLead(id){
    if(client){
      const {error}=await client.from("leads").delete().eq("id",id);
      if(error) throw error; return;
    }
    write(KEYS.leads,read(KEYS.leads,[]).filter(x=>x.id!==id));
  }

  async function listAdmins(){
    if(client){
      const {data,error}=await client.from("profiles").select("id,email,display_name,role,is_active")
        .eq("role","admin").order("display_name");
      if(error) throw error; return data || [];
    }
    return read(KEYS.profiles,SEED_PROFILES).filter(p=>p.role==="admin");
  }

  async function listProfiles(){
    if(client){
      const {data,error}=await client.from("profiles").select("id,email,display_name,role,is_active").order("display_name");
      if(error) throw error; return data || [];
    }
    return read(KEYS.profiles,SEED_PROFILES);
  }

  async function inviteAdmin(email, displayName){
    if(client){
      const {data,error}=await client.functions.invoke("invite-admin",{body:{email,display_name:displayName}});
      if(error) throw error; return data;
    }
    const rows=read(KEYS.profiles,SEED_PROFILES);
    const admin={id:makeId("admin"),email,display_name:displayName,role:"admin",is_active:true};
    rows.push(admin); write(KEYS.profiles,rows); return admin;
  }

  async function setProfileActive(id, active){
    if(client){
      const {data,error}=await client.from("profiles").update({is_active:active}).eq("id",id).select().single();
      if(error) throw error; return data;
    }
    const rows=read(KEYS.profiles,SEED_PROFILES);
    const i=rows.findIndex(p=>p.id===id); if(i>=0) rows[i].is_active=active;
    write(KEYS.profiles,rows); return rows[i];
  }

  async function getSettings(){
    if(client){
      const {data,error}=await client.from("site_settings").select("*").eq("id","main").maybeSingle();
      if(error) throw error; return data || SEED_SETTINGS;
    }
    return read(KEYS.settings,SEED_SETTINGS);
  }

  async function saveSettings(settings){
    if(client){
      const payload={id:"main",...settings};
      const {data,error}=await client.from("site_settings").upsert(payload).select().single();
      if(error) throw error; return data;
    }
    return write(KEYS.settings,{...SEED_SETTINGS,...settings});
  }

  function subscribeLeads(callback){
    if(!client) return ()=>{};
    const channel=client.channel("ezam-leads")
      .on("postgres_changes",{event:"*",schema:"public",table:"leads"},callback)
      .subscribe();
    return ()=>client.removeChannel(channel);
  }

  global.EZAMData = {
    client, backendConfigured, demoMode:!!cfg.demoMode, ownerEmail:cfg.ownerEmail,
    PHOTO_PRESETS,
    login,demoLogin,logout,getCurrentProfile,
    listPackages,savePackage,deletePackage,
    createLead,listLeads,saveLead,deleteLead,
    listAdmins,listProfiles,inviteAdmin,setProfileActive,
    getSettings,saveSettings,subscribeLeads
  };
})(window);
