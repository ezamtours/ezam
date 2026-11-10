
(async () => {
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const STAGES=["New","Contacted","Qualified","Quoted","Follow-up","Booked","Closed","Lost"];
  const SOURCES=["website","custom","package","facebook","instagram","tiktok","manual","referral","phone","email"];
  const TEMPS=["Hot","Warm","Cold"];

  let profile=null;
  let leads=[];
  let admins=[];
  let packages=[];
  let settings={};
  let unsubscribeRealtime=null;
  let uploadedPackageImage="";

  const COUNTRY_PRESET_MAP={
    philippines:"palawan",palawan:"palawan",
    japan:"japan",
    "south korea":"korea",korea:"korea",
    singapore:"singapore",
    indonesia:"bali",bali:"bali",
    france:"europe",italy:"europe",europe:"europe",
    switzerland:"switzerland",
    "united states":"hawaii",usa:"hawaii",hawaii:"hawaii"
  };

  const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // Branded interface icons use one consistent professional outlined style.
  const uiIcon=key=>{
    const shapes={
      pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
      money:'<circle cx="12" cy="12" r="9"/><path d="M8 7h5a3 3 0 0 1 0 6H9m4-6v11"/>',
      pencil:'<path d="M12 20h9M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5Z"/><path d="m13.5 7 3.5 3.5"/>',
      copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
      publish:'<path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
      trash:'<path d="M4 7h16M10 7V4h4v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
      lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
      unlock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0"/>'
    };
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[key]||''}</svg>`;
  };
  const niceSource=(v="")=>({
    website:"Website",custom:"Custom Trip",package:"Package",facebook:"Facebook",
    instagram:"Instagram",tiktok:"TikTok",manual:"Manual",referral:"Referral",phone:"Phone",email:"Email"
  }[v]||v||"Unknown");
  const niceDate=v=>{
    if(!v)return"";
    try{return new Intl.DateTimeFormat("en-PH",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));}
    catch{return v;}
  };
  const isOwner=()=>profile?.role==="owner" || String(profile?.email||"").toLowerCase()===String(EZAMData.ownerEmail||"").toLowerCase();

  function setOwnerVisibility(){
    $$("[data-owner-only]").forEach(el=>{
      if(isOwner()) el.removeAttribute("hidden");
      else el.setAttribute("hidden","");
    });
  }

  async function guard(){
    profile=await EZAMData.getCurrentProfile().catch(()=>null);
    if(!profile || !profile.is_active || !["owner","admin"].includes(profile.role)){
      location.replace("admin-login.html");
      return false;
    }
    if(isOwner()) profile.role="owner";
    $("#currentUserName").textContent=profile.display_name||profile.email||"Administrator";
    $("#currentUserRole").textContent=profile.role==="owner"?"Owner":"Admin";
    $("#adminAvatar").textContent=(profile.display_name||profile.email||"A").trim().charAt(0).toUpperCase();
    const firstName=(profile.display_name||"there").split(" ")[0];
    $("#welcomeHeading").innerHTML=`Welcome back, <em>${esc(firstName)}.</em>`;
    setOwnerVisibility();
    const status=document.getElementById("workspaceStatus");
    if(status){
      const demo=Boolean(EZAMData.demoMode && !EZAMData.backendConfigured);
      status.textContent=demo?"Preview data · Not live":"EZAM Workspace";
      status.classList.toggle("is-preview",demo);
      status.title=demo?"Sample records in local preview mode":"Authenticated workspace";
    }
    $("#adminShell").hidden=false;
    $("#adminLoading").hidden=true;
    return true;
  }

  function switchView(name){
    if(!isOwner() && ["packages","admins","reports","settings"].includes(name)) name="overview";
    const perform=()=>{
      $$(".admin-view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`));
      $$(".admin-nav [data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
      const labels={
        overview:["Overview","EZAM Workspace"],
        leads:["Lead Database",isOwner()?"All EZAM leads":"My Assigned Leads"],
        packages:["Tour Packages","Website Catalog"],
        admins:["Admin Accounts","Access & Assignment"],
        reports:["Reports & Insights","Performance"],
        followups:["Follow-ups","CRM / Priority Desk"],
        bookings:["Bookings","Operations / Converted Inquiries"],
        travelers:["Travelers","CRM / Contact Directory"],
        settings:["Website Settings","Contact & Social Channels"]
      };
      $("#viewTitle").textContent=labels[name]?.[0]||"Overview";
      $("#topbarKicker").textContent=labels[name]?.[1]||"EZAM Workspace";
      history.replaceState(null,"",`#${name}`);
    };
    if(document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches){
      document.startViewTransition(perform);
    }else perform();

    if(name==="leads") renderLeads();
    if(name==="packages") renderPackages();
    if(name==="admins") renderAdmins();
    if(name==="reports") renderReports();
    if(["followups","bookings","travelers"].includes(name)) renderOperations(name);
    if(name==="settings") renderSettings();
    if(name==="overview") renderOverview();
    const activeView=document.querySelector(`#view-${name}`);
    if(activeView && !matchMedia("(prefers-reduced-motion: reduce)").matches){
      activeView.classList.remove("ezam-v12-enter");
      void activeView.offsetWidth;
      activeView.classList.add("ezam-v12-enter");
    }
  }

  $$(".admin-nav [data-view]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));
  $$("[data-jump]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.jump)));


  const csvCell=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  function downloadCsv(filename,headers,rows){
    const csv=[headers.map(csvCell).join(","),...rows.map(row=>row.map(csvCell).join(","))].join("\r\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  function exportLeadsCsv(){
    downloadCsv("ezam-leads.csv",["Name","Email","Phone","Journey","Source","Priority","Stage","Assigned","Created"],
      leads.map(l=>[l.name,l.email,l.phone,l.trip_details||l.message,niceSource(l.source),l.temperature,l.stage,assigneeName(l.assigned_to),niceDate(l.created_at)]));
  }
  function exportPackagesCsv(){
    downloadCsv("ezam-packages.csv",["Title","Country","Destinations","Duration","Dates","Rate","Published","Featured"],
      packages.map(p=>[p.title,p.country,p.destination,p.duration,p.travel_dates,p.price_label,p.published?"Yes":"No",p.featured?"Yes":"No"]));
  }
  $$('[data-quick-action]').forEach(btn=>btn.addEventListener('click',()=>{
    const action=btn.dataset.quickAction;
    if(action==='lead') openLead();
    if(action==='package') openPackage();
    if(action==='export-leads') exportLeadsCsv();
  }));

  async function performLogout(){
    await EZAMData.logout();
    document.documentElement.classList.add("page-leaving");
    setTimeout(()=>location.replace("admin-login.html"),170);
  }
  
  // Appearance: Apple-style light/dark theme with system-aware default.
  const THEME_KEY="ezam_admin_theme";
  function applyTheme(theme){
    document.documentElement.dataset.theme=theme;
    try{ localStorage.setItem(THEME_KEY,theme); }catch(e){}
    const btn=document.getElementById("themeToggle");
    if(btn){
      const label=theme==="dark"?"Switch to light mode":"Switch to dark mode";
      btn.setAttribute("aria-label",label);
      btn.setAttribute("title",label);
    }
  }
  (function initTheme(){
    let saved=null;
    try{ saved=localStorage.getItem(THEME_KEY); }catch(e){}
    const preferred=saved || "light";
    applyTheme(preferred);
  })();
  document.getElementById("themeToggle")?.addEventListener("click",()=>{
    const next=document.documentElement.dataset.theme==="dark"?"light":"dark";
    applyTheme(next);
  });

$("#logoutBtn")?.addEventListener("click",performLogout);
  $("#mobileLogoutBtn")?.addEventListener("click",performLogout);

  async function refreshData(){
    const tasks=[
      EZAMData.listLeads(profile),
      isOwner()?EZAMData.listAdmins():Promise.resolve([]),
      isOwner()?EZAMData.listPackages({publicOnly:false}):EZAMData.listPackages({publicOnly:true}),
      EZAMData.getSettings()
    ];
    const results=await Promise.allSettled(tasks);
    leads=results[0].status==="fulfilled"?results[0].value:[];
    admins=results[1].status==="fulfilled"?results[1].value:[];
    packages=results[2].status==="fulfilled"?results[2].value:[];
    settings=results[3].status==="fulfilled"?results[3].value:{};
    $("#navLeadCount").textContent=leads.filter(l=>l.stage==="New").length||leads.length;
    renderOverview();
  }

  /* -------- Overview -------- */
  function renderOverview(){
    const total=leads.length;
    const newCount=leads.filter(l=>l.stage==="New").length;
    const bell=document.querySelector(".admin-notification");
    if(bell){
      const dot=bell.querySelector("i");
      if(dot)dot.hidden=newCount===0;
      bell.setAttribute("aria-label",newCount?`View ${newCount} new inquiries`:"View traveler inquiries");
    }
    const hot=leads.filter(l=>l.temperature==="Hot").length;
    const booked=leads.filter(l=>l.stage==="Booked").length;
    const unassigned=leads.filter(l=>!l.assigned_to).length;
    const activePackages=packages.filter(p=>p.published).length;
    $("#metricTotal") && ($("#metricTotal").textContent=total);
    $("#metricNew") && ($("#metricNew").textContent=newCount);
    $("#metricHot") && ($("#metricHot").textContent=hot);
    $("#metricBooked") && ($("#metricBooked").textContent=booked);
    $("#metricUnassigned") && ($("#metricUnassigned").textContent=unassigned);
    $("#metricPackages") && ($("#metricPackages").textContent=activePackages);

    const pipeline=$("#pipelineBars");
    if(pipeline){
      const activeStages=["New","Contacted","Qualified","Quoted","Follow-up","Booked"];
      const max=Math.max(1,...activeStages.map(stage=>leads.filter(l=>l.stage===stage).length));
      const colors={New:"blue",Contacted:"orange",Qualified:"green",Quoted:"cyan","Follow-up":"gold",Booked:"deep-green"};
      pipeline.innerHTML=activeStages.map(stage=>{
        const count=leads.filter(l=>l.stage===stage).length;
        const pct=Math.max(count?7:0,Math.round(count/max*100));
        return `<div class="mock-pipeline-row"><span>${esc(stage)}</span><div class="mock-pipeline-track"><i class="${colors[stage]||'blue'}" style="width:${pct}%"></i></div><strong>${count}</strong></div>`;
      }).join("");
    }

    const sources=$("#sourceBreakdown");
    if(sources){
      const counts={};
      leads.forEach(l=>counts[l.source||"website"]=(counts[l.source||"website"]||0)+1);
      const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
      const palette=["#ff8a1f","#009b68","#073b73","#34a9db","#bec8ce","#805ad5"];
      const sourceTotal=Math.max(1,entries.reduce((sum,[,count])=>sum+count,0));
      let cursor=0;
      const segments=entries.slice(0,6).map(([src,count],i)=>{
        const pct=count/sourceTotal*100;
        const seg=`${palette[i%palette.length]} ${cursor.toFixed(2)}% ${(cursor+pct).toFixed(2)}%`;
        cursor+=pct; return seg;
      });
      if(cursor<100)segments.push(`#e8edef ${cursor.toFixed(2)}% 100%`);
      const legend=entries.length?entries.slice(0,6).map(([src,count],i)=>{
        const pct=Math.round(count/sourceTotal*100);
        return `<div class="mock-source-legend-row"><i style="background:${palette[i%palette.length]}"></i><span>${esc(niceSource(src))}</span><strong>${pct}%</strong></div>`;
      }).join(""):`<div class="mock-source-legend-row"><i style="background:#d8e1e4"></i><span>No source data</span><strong>0%</strong></div>`;
      sources.innerHTML=`<div class="mock-donut" style="background:conic-gradient(${segments.join(',')})"><div><strong>${total}</strong><span>Total Leads</span></div></div><div class="mock-source-legend">${legend}</div>`;
    }

    const performance=$("#monthPerformance");
    if(performance){
      const icon=(kind)=>({inquiries:`<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM4 8l8 6 8-6"/></svg>`,bookings:`<svg viewBox="0 0 24 24"><path d="M5 5h14v14H5zM8 12l3 3 5-6"/></svg>`,value:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 7h5a3 3 0 0 1 0 6H9m4-6v11"/></svg>`}[kind]);
      performance.innerHTML=`
        <div class="performance-row"><span class="perf-icon blue">${icon('inquiries')}</span><div><small>Total inquiries</small><strong>${total}</strong></div><em>All visible leads</em></div>
        <div class="performance-row"><span class="perf-icon orange">${icon('bookings')}</span><div><small>Booked inquiries</small><strong>${booked}</strong></div><em>${total?Math.round(booked/total*100)+'% conversion':'No bookings yet'}</em></div>
        <div class="performance-row"><span class="perf-icon green">${icon('value')}</span><div><small>Published packages</small><strong>${activePackages}</strong></div><em>Current live catalog</em></div>`;
    }

    const recent=$("#recentLeads");
    if(recent){
      recent.innerHTML=leads.length?leads.slice(0,5).map(l=>`
        <div class="recent-lead" data-open-lead="${esc(l.id)}">
          <div><strong>${esc(l.name||"Unnamed traveler")}</strong><small>${esc(l.trip_details||l.message||"No trip details yet")}</small></div>
          <span class="stage-chip">${esc(l.stage||"New")}</span>
        </div>`).join(""):'<div class="empty-state">New traveler inquiries will appear here.</div>';
      $$('[data-open-lead]',recent).forEach(x=>x.addEventListener('click',()=>openLead(x.dataset.openLead)));
    }

    const team=$("#teamWorkload");
    if(team && isOwner()){
      team.innerHTML=admins.length?admins.map(a=>{
        const count=leads.filter(l=>l.assigned_to===a.id).length;
        return `<div class="workload-item"><span>${esc(a.display_name||a.email)}</span><strong>${count} lead${count===1?"":"s"}</strong></div>`;
      }).join(""):'<div class="empty-state">Invite admins to distribute leads.</div>';
    }

    const attention=$("#attentionList");
    if(attention && isOwner()){
      const items=[
        ["new","New inquiries",newCount,"Need a first response"],
        ["hot","Hot leads",leads.filter(l=>l.temperature==="Hot" && !["Booked","Closed","Lost"].includes(l.stage)).length,"Priority opportunities"],
        ["followup","Follow-ups",leads.filter(l=>l.stage==="Follow-up").length,"Ready for another touch"],
        ["unassigned","Unassigned",unassigned,"Need an admin owner"]
      ];
      attention.innerHTML=items.map(([key,label,count,meta])=>`<button type="button" class="attention-item" data-attention="${key}"><span><strong>${label}</strong><small>${meta}</small></span><b>${count}</b></button>`).join("");
      $$('[data-attention]',attention).forEach(btn=>btn.addEventListener('click',()=>{
        switchView('leads');
        ["stageFilter","temperatureFilter","sourceFilter","assigneeFilter"].forEach(id=>{const el=$("#"+id);if(el)el.value="";});
        if(btn.dataset.attention==='new') $("#stageFilter").value='New';
        if(btn.dataset.attention==='hot') $("#temperatureFilter").value='Hot';
        if(btn.dataset.attention==='followup') $("#stageFilter").value='Follow-up';
        if(btn.dataset.attention==='unassigned' && $("#assigneeFilter")) $("#assigneeFilter").value='unassigned';
        renderLeads();
      }));
    }

    const catalog=$("#catalogSnapshot");
    if(catalog && isOwner()){
      const published=packages.filter(p=>p.published).length;
      const draft=packages.length-published;
      const featured=packages.filter(p=>p.featured).length;
      const countries=new Set(packages.map(p=>p.country).filter(Boolean)).size;
      catalog.innerHTML=`<div class="catalog-stat"><span>Published</span><strong>${published}</strong></div><div class="catalog-stat"><span>Drafts</span><strong>${draft}</strong></div><div class="catalog-stat"><span>Featured</span><strong>${featured}</strong></div><div class="catalog-stat"><span>Countries</span><strong>${countries}</strong></div>`;
    }
  }

  /* -------- Leads -------- */
  function populateLeadSelects(){
    const stageFilter=$("#stageFilter"), sourceFilter=$("#sourceFilter"), assigneeFilter=$("#assigneeFilter");
    if(stageFilter && stageFilter.options.length===1) STAGES.forEach(v=>stageFilter.add(new Option(v,v)));
    if(sourceFilter && sourceFilter.options.length===1) SOURCES.forEach(v=>sourceFilter.add(new Option(niceSource(v),v)));
    if(assigneeFilter){
      const current=assigneeFilter.value;
      assigneeFilter.innerHTML='<option value="">All admins</option><option value="unassigned">Unassigned</option>';
      admins.forEach(a=>assigneeFilter.add(new Option(a.display_name||a.email,a.id)));
      assigneeFilter.value=current;
    }
    const leadStage=$("#leadStage"), leadSource=$("#leadSource"), assigned=$("#leadAssigned");
    if(leadStage){leadStage.innerHTML="";STAGES.forEach(v=>leadStage.add(new Option(v,v)));}
    if(leadSource){leadSource.innerHTML="";SOURCES.forEach(v=>leadSource.add(new Option(niceSource(v),v)));}
    if(assigned){
      assigned.innerHTML='<option value="">Unassigned</option>';
      admins.filter(a=>a.is_active).forEach(a=>assigned.add(new Option(a.display_name||a.email,a.id)));
    }
  }

  function filteredLeads(){
    const q=($("#leadSearch")?.value||"").trim().toLowerCase();
    const stage=$("#stageFilter")?.value||"";
    const temp=$("#temperatureFilter")?.value||"";
    const source=$("#sourceFilter")?.value||"";
    const assignee=$("#assigneeFilter")?.value||"";
    return leads.filter(l=>{
      const hay=[l.name,l.email,l.phone,l.trip_details,l.message,l.owner_notes,l.destination].join(" ").toLowerCase();
      return (!q||hay.includes(q))
        &&(!stage||l.stage===stage)
        &&(!temp||l.temperature===temp)
        &&(!source||l.source===source)
        &&(!assignee||(assignee==="unassigned"?!l.assigned_to:l.assigned_to===assignee));
    });
  }

  function assigneeName(id){
    return admins.find(a=>a.id===id)?.display_name || admins.find(a=>a.id===id)?.email || (id?"Assigned":"Unassigned");
  }

  function leadRow(l){
    return `<div class="lead-row" data-lead-row="${esc(l.id)}">
      <div class="lead-client"><strong>${esc(l.name||"Unnamed traveler")}</strong><small>${esc(l.email||l.phone||"No contact yet")}</small></div>
      <div class="lead-journey">${esc(l.trip_details||l.message||"General inquiry")}</div>
      <div><span class="source-chip">${esc(niceSource(l.source))}</span></div>
      <div><span class="temp-chip ${(l.temperature||"Warm").toLowerCase()}">${esc(l.temperature||"Warm")}</span></div>
      <div><span class="stage-chip">${esc(l.stage||"New")}</span></div>
      <div class="assignee" data-owner-only>${esc(assigneeName(l.assigned_to))}</div>
    </div>`;
  }

  function renderLeads(){
    populateLeadSelects();
    $("#leadScopeText").textContent=isOwner()
      ?"All website, package, social, referral, phone, and manually entered leads."
      :"Only inquiries assigned to your administrator account are visible.";
    const table=$("#leadTable");
    const rows=filteredLeads();
    table.innerHTML=rows.length?rows.map(leadRow).join(""):'<div class="empty-state">No leads match these filters.</div>';
    $$("[data-lead-row]",table).forEach(r=>r.addEventListener("click",()=>openLead(r.dataset.leadRow)));
    setOwnerVisibility();
  }

  ["leadSearch"].forEach(id=>$("#"+id)?.addEventListener("input",renderLeads));
  ["stageFilter","temperatureFilter","sourceFilter","assigneeFilter"].forEach(id=>$("#"+id)?.addEventListener("change",renderLeads));

  const leadModal=$("#leadModal");
  function openModal(el){el.classList.add("open");el.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";}
  function closeModal(el){el.classList.remove("open");el.setAttribute("aria-hidden","true");document.body.style.overflow="";}

  function openLead(id=null){
    populateLeadSelects();
    const l=id?leads.find(x=>String(x.id)===String(id)):null;
    $("#leadId").value=l?.id||"";
    $("#leadModalTitle").textContent=l?l.name||"Traveler inquiry":"Add a lead";
    $("#leadCreatedMeta").textContent=l?`${niceSource(l.source)} · ${niceDate(l.created_at)}`:"Add a traveler from phone, referral, Facebook, Instagram, TikTok, email, or another source.";
    $("#leadName").value=l?.name||"";
    $("#leadEmail").value=l?.email||"";
    $("#leadPhone").value=l?.phone||"";
    $("#leadSource").value=l?.source||"manual";
    $("#leadStage").value=l?.stage||"New";
    $("#leadTemperature").value=l?.temperature||"Warm";
    $("#leadAssigned").value=l?.assigned_to||"";
    $("#leadPreferredContact").value=l?.preferred_contact||"";
    $("#leadInquiryType").value=l?.inquiry_type||"manual";
    $("#leadTripDetails").value=l?.trip_details||"";
    $("#leadMessage").value=l?.message||"";
    $("#leadNotes").value=l?.owner_notes||"";
    $("#deleteLeadBtn").hidden=!l || !isOwner();

    const contacts=$("#leadContactActions");
    contacts.innerHTML="";
    if(l?.email) contacts.insertAdjacentHTML("beforeend",`<a href="mailto:${esc(l.email)}?subject=${encodeURIComponent("EZAM Travel Inquiry Follow-up")}">Email</a>`);
    if(l?.phone) contacts.insertAdjacentHTML("beforeend",`<a href="tel:${esc(l.phone)}">Call</a>`);
    if(l?.phone) contacts.insertAdjacentHTML("beforeend",`<a href="sms:${esc(l.phone)}">SMS</a>`);

    setOwnerVisibility();
    openModal(leadModal);
    setTimeout(()=>$("#leadName")?.focus(),80);
  }

  $("#addLeadBtn")?.addEventListener("click",()=>openLead());
  $("#overviewAddLead")?.addEventListener("click",()=>openLead());
  $$('[data-close-modal="lead"]').forEach(x=>x.addEventListener("click",()=>closeModal(leadModal)));

  $("#leadForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const id=$("#leadId").value||null;
    const base={
      inquiry_type:$("#leadInquiryType").value,
      name:$("#leadName").value.trim(),
      email:$("#leadEmail").value.trim(),
      phone:$("#leadPhone").value.trim(),
      preferred_contact:$("#leadPreferredContact").value.trim(),
      message:$("#leadMessage").value.trim(),
      trip_details:$("#leadTripDetails").value.trim(),
      source:$("#leadSource").value
    };
    try{
      if(id){
        const patch={
          stage:$("#leadStage").value,
          temperature:$("#leadTemperature").value,
          owner_notes:$("#leadNotes").value.trim()
        };
        if(isOwner()) patch.assigned_to=$("#leadAssigned").value||null;
        await EZAMData.saveLead(id,patch);
      }else{
        const createPayload={
          ...base,
          stage:$("#leadStage").value,
          temperature:$("#leadTemperature").value,
          owner_notes:$("#leadNotes").value.trim(),
          assigned_to:isOwner()?($("#leadAssigned").value||null):profile.id
        };
        const created=await EZAMData.createLead(createPayload);
        // In demo storage the record is already complete. In Supabase the authenticated
        // insert also carries stage/priority/assignment, avoiding an unassigned admin row.
        if(created?.id && isOwner()){
          await EZAMData.saveLead(created.id,{
            stage:createPayload.stage,
            temperature:createPayload.temperature,
            owner_notes:createPayload.owner_notes,
            assigned_to:createPayload.assigned_to
          });
        }
      }
      closeModal(leadModal);
      await refreshData(); renderLeads();
      const currentOp=location.hash.slice(1);if(["followups","bookings","travelers"].includes(currentOp))renderOperations(currentOp);
    }catch(err){alert(err.message||"Lead could not be saved.");}
  });

  $("#deleteLeadBtn")?.addEventListener("click",async()=>{
    const id=$("#leadId").value;if(!id||!isOwner())return;
    if(!confirm("Delete this lead permanently?"))return;
    try{await EZAMData.deleteLead(id);closeModal(leadModal);await refreshData();renderLeads();const currentOp=location.hash.slice(1);if(["followups","bookings","travelers"].includes(currentOp))renderOperations(currentOp);}
    catch(err){alert(err.message||"Lead could not be deleted.");}
  });

  /* -------- Packages -------- */
  const packageModal=$("#packageModal");

  function presetForCountry(country=""){
    const key=String(country).trim().toLowerCase();
    if(COUNTRY_PRESET_MAP[key]) return COUNTRY_PRESET_MAP[key];
    return Object.entries(COUNTRY_PRESET_MAP).find(([name])=>key.includes(name))?.[1] || "";
  }
  function presetOptions(){
    const select=$("#pkgPhotoPreset");
    if(!select) return;
    select.innerHTML='<option value="">Custom image / keep current</option>';
    Object.entries(EZAMData.PHOTO_PRESETS).forEach(([key,p])=>select.add(new Option(p.label,key)));
  }
  function packageImageData(p){
    const image=String(p?.image_url||"");
    const fallback=String(p?.fallback_url||"");
    const cleanDefaults={
      "31533423":"assets/images/card-philippines.webp",
      "33870376":"assets/images/card-japan.webp",
      "31414677":"assets/images/card-south-korea.webp",
      "35777156":"assets/images/card-singapore.webp",
      "29377726":"assets/images/card-bali.webp"
    };
    // Only replace known legacy preset images; NEVER overwrite owner-uploaded/custom photos.
    const presetId=Object.keys(cleanDefaults).find(id=>image.includes(`/photos/${id}/`));
    if(presetId) return {src:cleanDefaults[presetId],hq:""};
    const legacy=/^assets\/images\/(?:place-|hq-card-|fallback-)/.test(image||fallback);
    if(legacy){
      const country=String(p?.country||"").toLowerCase();
      const match=country.includes("japan")?"japan":country.includes("korea")?"south-korea":country.includes("singapore")?"singapore":country.includes("indonesia")||country.includes("bali")?"bali":country.includes("philippines")?"philippines":null;
      if(match) return {src:`assets/images/card-${match}.webp`,hq:""};
    }
    if(/^(data:image|blob:|assets\/)/i.test(image)) return {src:image||fallback,hq:""};
    if(/^https?:/i.test(image)) return {src:fallback||image,hq:image};
    return {src:image||fallback||"assets/images/card-japan.webp",hq:""};
  }
  function packageAdminCard(p){
    const image=packageImageData(p);
    const country=esc(p.country||"Destination");
    const place=esc(p.destination||p.country||"Journey");
    return `<article class="package-admin-card mock-package-card">
      <div class="package-admin-image">
        <img src="${esc(image.src)}" ${image.hq?`data-hq="${esc(image.hq)}"`:""} alt="${esc(p.title)}"/>
        <div class="package-image-shade"></div>
        <span class="mock-package-status ${p.published?'published':'draft'}">${p.published?'Published':'Draft'}</span>
        ${p.featured?'<span class="mock-package-featured">Featured</span>':''}
      </div>
      <div class="package-admin-body">
        <div class="package-location">${uiIcon('pin')} ${country}</div>
        <h3>${esc(p.title)}</h3>
        <p class="package-destination">${place}</p>
        <div class="mock-package-facts"><span>${uiIcon('clock')} ${esc(p.duration||'TBC')}</span><strong>${uiIcon('money')} ${esc(p.price_label||'Request rate')}</strong></div>
        <div class="mock-card-actions">
          <button class="mock-edit-package" data-edit-package="${esc(p.id)}">${uiIcon('pencil')} <span>Edit Package</span></button>
          <button aria-label="Duplicate ${esc(p.title)}" title="Duplicate" data-duplicate-package="${esc(p.id)}">${uiIcon('copy')}</button>
          <button aria-label="${p.published?'Unpublish':'Publish'} ${esc(p.title)}" title="${p.published?'Unpublish':'Publish'}" data-toggle-package="${esc(p.id)}">${uiIcon('publish')}</button>
          <button class="danger-action" aria-label="Delete ${esc(p.title)}" title="Delete" data-delete-package="${esc(p.id)}">${uiIcon('trash')}</button>
        </div>
      </div>
    </article>`;
  }
  function upgradeAdminImages(scope=document){
    $$("img[data-hq]",scope).forEach(img=>{
      const probe=new Image();
      probe.onload=()=>img.src=img.dataset.hq;
      probe.src=img.dataset.hq;
    });
  }
  function filteredPackages(){
    const q=($("#packageSearch")?.value||"").trim().toLowerCase();
    const status=$("#packageStatusFilter")?.value||"";
    const country=$("#packageCountryFilter")?.value||"";
    return packages.filter(p=>{
      const hay=[p.title,p.country,p.destination,p.summary,(p.tags||[]).join(" ")].join(" ").toLowerCase();
      return (!q||hay.includes(q))
        &&(!country||p.country===country)
        &&(!status||(status==='published'?p.published:status==='draft'?!p.published:status==='featured'?p.featured:true));
    });
  }
  function populatePackageFilters(){
    const select=$("#packageCountryFilter");if(!select)return;
    const current=select.value;
    const countries=[...new Set(packages.map(p=>p.country).filter(Boolean))].sort();
    select.innerHTML='<option value="">All countries</option>';
    countries.forEach(c=>select.add(new Option(c,c)));
    select.value=countries.includes(current)?current:"";
  }
  async function renderPackages(){
    if(!isOwner())return;
    packages=await EZAMData.listPackages({publicOnly:false}).catch(()=>[]);
    populatePackageFilters();
    const published=packages.filter(p=>p.published).length;
    if($("#pkgMetricTotal")) $("#pkgMetricTotal").textContent=packages.length;
    if($("#pkgMetricPublished")) $("#pkgMetricPublished").textContent=published;
    if($("#pkgMetricDraft")) $("#pkgMetricDraft").textContent=packages.length-published;
    if($("#pkgMetricFeatured")) $("#pkgMetricFeatured").textContent=packages.filter(p=>p.featured).length;
    const grid=$("#packageAdminGrid");
    const rows=filteredPackages();
    grid.innerHTML=rows.length?rows.map(packageAdminCard).join(""):'<div class="empty-state">No packages match these filters.</div>';
    upgradeAdminImages(grid);
    $$("[data-edit-package]",grid).forEach(b=>b.addEventListener("click",()=>openPackage(b.dataset.editPackage)));
    $$("[data-duplicate-package]",grid).forEach(b=>b.addEventListener("click",async()=>{
      const p=packages.find(x=>String(x.id)===String(b.dataset.duplicatePackage));if(!p)return;
      const clone={...p};delete clone.id;delete clone.created_at;delete clone.updated_at;
      clone.title=`${p.title} — Copy`;clone.published=false;clone.featured=false;
      await EZAMData.savePackage(clone);await renderPackages();
    }));
    $$("[data-toggle-package]",grid).forEach(b=>b.addEventListener("click",async()=>{
      const p=packages.find(x=>String(x.id)===String(b.dataset.togglePackage));if(!p)return;
      await EZAMData.savePackage({...p,published:!p.published});await renderPackages();
    }));
    $$("[data-delete-package]",grid).forEach(b=>b.addEventListener("click",async()=>{
      const p=packages.find(x=>String(x.id)===String(b.dataset.deletePackage));if(!p)return;
      if(confirm(`Delete "${p.title}"?`)){await EZAMData.deletePackage(p.id);await renderPackages();}
    }));
  }

  function renderImageChoices(recommended=""){
    const host=$("#pkgImageChoices");if(!host)return;
    const entries=Object.entries(EZAMData.PHOTO_PRESETS);
    entries.sort(([a],[b])=>(a===recommended?-1:b===recommended?1:0));
    host.innerHTML=entries.map(([key,p])=>`<button type="button" class="package-image-choice ${key===$("#pkgPhotoPreset")?.value?"selected":""} ${key===recommended?"recommended":""}" data-image-preset="${esc(key)}"><img src="${esc(p.fallback||p.image)}" alt="${esc(p.label)}"/><span>${esc(p.label)}</span>${key===recommended?'<b>Recommended</b>':''}</button>`).join("");
    $$('[data-image-preset]',host).forEach(btn=>btn.addEventListener('click',()=>{
      uploadedPackageImage="";
      if($("#pkgImageUpload")) $("#pkgImageUpload").value="";
      if($("#pkgImage")) $("#pkgImage").value="";
      $("#pkgPhotoPreset").value=btn.dataset.imagePreset;
      updatePackagePreview();
      renderImageChoices(presetForCountry($("#pkgCountry").value));
    }));
  }
  function updatePackagePreview(){
    const preset=$("#pkgPhotoPreset")?.value||"";
    const presetData=preset?EZAMData.PHOTO_PRESETS[preset]:null;
    const custom=$("#pkgImage")?.value.trim()||"";
    const preview=$("#pkgImagePreview");
    const fallback=uploadedPackageImage || presetData?.fallback || "assets/images/fallback-japan.webp";
    preview.src=fallback;
    const primary=uploadedPackageImage || custom || presetData?.image || "";
    if(primary && primary!==fallback){
      if(/^https?:/i.test(primary)){
        const probe=new Image();probe.onload=()=>preview.src=primary;probe.src=primary;
      }else preview.src=primary;
    }
    $("#pkgPreviewTitle").textContent=$("#pkgTitle").value.trim()||"Package preview";
    $("#pkgPreviewMeta").textContent=[$("#pkgCountry").value.trim(),$("#pkgDuration").value.trim(),$("#pkgPrice").value.trim()].filter(Boolean).join(" · ")||"Choose a country photo or upload your own image.";
    if($("#pkgPreviewCountry")) $("#pkgPreviewCountry").textContent=$("#pkgCountry").value.trim()||"Country";
    if($("#pkgPreviewStatus")) $("#pkgPreviewStatus").textContent=$("#pkgPublished").checked?"Published preview":"Draft preview";
  }
  function compressPackageUpload(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error("Could not read image."));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error("Unsupported image file."));
        img.onload=()=>{
          const maxW=1600,maxH=1100,scale=Math.min(1,maxW/img.width,maxH/img.height);
          const canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
          const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL("image/jpeg",.88));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function openPackage(id=null){
    presetOptions();
    const p=id?packages.find(x=>String(x.id)===String(id)):null;
    uploadedPackageImage=p?.image_url?.startsWith("data:image")?p.image_url:"";
    $("#packageModalTitle").textContent=p?"Edit package":"Create package";
    $("#pkgId").value=p?.id||"";
    $("#pkgTitle").value=p?.title||"";
    $("#pkgCountry").value=p?.country||"";
    $("#pkgDestination").value=p?.destination||"";
    $("#pkgDuration").value=p?.duration||"";
    $("#pkgDates").value=p?.travel_dates||"";
    $("#pkgPrice").value=p?.price_label||"";
    $("#pkgSummary").value=p?.summary||"";
    $("#pkgTags").value=(p?.tags||[]).join(", ");
    $("#pkgImage").value=p && !uploadedPackageImage ? (p.image_url||"") : "";
    $("#pkgPublished").checked=p?.published!==false;
    $("#pkgFeatured").checked=!!p?.featured;
    const match=Object.entries(EZAMData.PHOTO_PRESETS).find(([,v])=>v.image===p?.image_url || v.fallback===p?.fallback_url);
    const recommended=presetForCountry(p?.country||"");
    $("#pkgPhotoPreset").value=match?.[0]||recommended||"";
    renderImageChoices(recommended);
    updatePackagePreview();
    openModal(packageModal);
    setTimeout(()=>$("#pkgTitle")?.focus(),80);
  }

  $("#addPackageBtn")?.addEventListener("click",()=>openPackage());
  $("#catalogCreatePackage")?.addEventListener("click",()=>openPackage());
  $$('[data-close-modal="package"]').forEach(x=>x.addEventListener("click",()=>closeModal(packageModal)));
  ["pkgTitle","pkgDuration","pkgPrice","pkgImage"].forEach(id=>$("#"+id)?.addEventListener("input",updatePackagePreview));
  $("#pkgCountry")?.addEventListener("input",()=>{
    const recommended=presetForCountry($("#pkgCountry").value);
    if(recommended && !uploadedPackageImage && !$("#pkgImage").value.trim()) $("#pkgPhotoPreset").value=recommended;
    renderImageChoices(recommended);updatePackagePreview();
  });
  $("#pkgPhotoPreset")?.addEventListener("change",()=>{
    uploadedPackageImage="";if($("#pkgImageUpload")) $("#pkgImageUpload").value="";if($("#pkgImage")) $("#pkgImage").value="";
    renderImageChoices(presetForCountry($("#pkgCountry").value));updatePackagePreview();
  });
  $("#pkgImageUpload")?.addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>15*1024*1024){alert("Please choose an image under 15 MB.");e.target.value="";return;}
    try{uploadedPackageImage=await compressPackageUpload(file);$("#pkgImage").value="";$("#pkgPhotoPreset").value="";renderImageChoices("");updatePackagePreview();}
    catch(err){alert(err.message||"Could not process this image.");}
  });
  $("#resetPackageImage")?.addEventListener("click",()=>{
    uploadedPackageImage="";if($("#pkgImageUpload")) $("#pkgImageUpload").value="";if($("#pkgImage")) $("#pkgImage").value="";
    const recommended=presetForCountry($("#pkgCountry").value);$("#pkgPhotoPreset").value=recommended||"";renderImageChoices(recommended);updatePackagePreview();
  });
  $("#pkgPublished")?.addEventListener("change",updatePackagePreview);
  ["packageSearch"].forEach(id=>$("#"+id)?.addEventListener("input",renderPackages));
  ["packageStatusFilter","packageCountryFilter"].forEach(id=>$("#"+id)?.addEventListener("change",renderPackages));
  $("#exportPackagesBtn")?.addEventListener("click",exportPackagesCsv);

  $("#packageForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const preset=$("#pkgPhotoPreset").value;
    const presetData=preset?EZAMData.PHOTO_PRESETS[preset]:null;
    const custom=$("#pkgImage").value.trim();
    const chosenImage=uploadedPackageImage || custom || presetData?.image || "";
    const fallback=uploadedPackageImage || presetData?.fallback || (chosenImage.startsWith("assets/")?chosenImage:"assets/images/fallback-japan.webp");
    const item={
      id:$("#pkgId").value||undefined,title:$("#pkgTitle").value.trim(),country:$("#pkgCountry").value.trim(),
      destination:$("#pkgDestination").value.trim(),duration:$("#pkgDuration").value.trim(),travel_dates:$("#pkgDates").value.trim(),
      price_label:$("#pkgPrice").value.trim()||"Request current rate",summary:$("#pkgSummary").value.trim(),
      tags:$("#pkgTags").value.split(",").map(x=>x.trim()).filter(Boolean),image_url:chosenImage,fallback_url:fallback,
      published:$("#pkgPublished").checked,featured:$("#pkgFeatured").checked
    };
    try{await EZAMData.savePackage(item);uploadedPackageImage="";closeModal(packageModal);await renderPackages();renderOverview();renderReports();}
    catch(err){alert(err.message||"Package could not be saved.");}
  });

  /* -------- Admins -------- */
  const adminInviteModal=$("#adminInviteModal");
  function renderAdmins(){
    if(!isOwner())return;
    const q=($("#adminSearch")?.value||"").trim().toLowerCase();
    const status=$("#adminStatusFilter")?.value||"";
    const access=$("#adminAccessFilter")?.value||"";
    const filtered=admins.filter(a=>{
      const hay=[a.display_name,a.email].join(" ").toLowerCase();
      const activeStatus=a.is_active?"active":"inactive";
      return (!q||hay.includes(q))&&(!status||status===activeStatus)&&(!access||access==="admin");
    });
    const totalAssigned=leads.filter(l=>l.assigned_to).length;
    $("#adminMetricTotal") && ($("#adminMetricTotal").textContent=admins.length);
    $("#adminMetricActive") && ($("#adminMetricActive").textContent=admins.filter(a=>a.is_active).length);
    $("#adminMetricInactive") && ($("#adminMetricInactive").textContent=admins.filter(a=>!a.is_active).length);
    $("#adminMetricAssigned") && ($("#adminMetricAssigned").textContent=totalAssigned);
    const list=$("#adminList");
    list.innerHTML=filtered.length?filtered.map(a=>{
      const count=leads.filter(l=>l.assigned_to===a.id).length;
      const initials=(a.display_name||a.email||"A").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
      return `<div class="admin-account-row mock-admin-row">
        <div class="admin-person"><span class="admin-mini-avatar">${esc(initials)}</span><strong>${esc(a.display_name||"Admin")}</strong></div>
        <span>${esc(a.email)}</span>
        <span>Admin</span>
        <span>${count} lead${count===1?"":"s"}</span>
        <span><i class="mock-status-dot ${a.is_active?'on':'off'}"></i>${a.is_active?'Active':'Inactive'}</span>
        <div class="admin-row-actions"><button class="icon-admin-action" data-toggle-admin="${esc(a.id)}" title="${a.is_active?'Deactivate':'Activate'}">${uiIcon(a.is_active?'lock':'unlock')}</button></div>
      </div>`;
    }).join(""):'<div class="empty-state">No admin accounts match these filters.</div>';
    $$('[data-toggle-admin]',list).forEach(b=>b.addEventListener('click',async()=>{
      const a=admins.find(x=>x.id===b.dataset.toggleAdmin);if(!a)return;
      await EZAMData.setProfileActive(a.id,!a.is_active);
      admins=await EZAMData.listAdmins();renderAdmins();renderOverview();populateLeadSelects();
    }));
  }
  ["adminSearch"].forEach(id=>$("#"+id)?.addEventListener("input",renderAdmins));
  ["adminStatusFilter","adminAccessFilter"].forEach(id=>$("#"+id)?.addEventListener("change",renderAdmins));

  $("#inviteAdminBtn")?.addEventListener("click",()=>openModal(adminInviteModal));
  $$('[data-close-modal="adminInvite"]').forEach(x=>x.addEventListener("click",()=>closeModal(adminInviteModal)));
  $("#adminInviteForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      await EZAMData.inviteAdmin($("#inviteEmail").value.trim(),$("#inviteName").value.trim());
      e.target.reset();closeModal(adminInviteModal);
      admins=await EZAMData.listAdmins();renderAdmins();populateLeadSelects();
      alert(EZAMData.backendConfigured?"Admin invitation sent.":"Preview admin added to the local demo.");
    }catch(err){alert(err.message||"Admin could not be invited.");}
  });

  /* -------- Operations: follow-up, booked leads, traveler directory --------
     All lists reuse the server-scoped leads array; admins cannot see another team's leads. */
  function operationalIdentity(l){return [l.name,l.email,l.phone,l.trip_details,l.message].join(' ').toLowerCase();}
  function opsCount(label,value,description){
    return `<article class="ops-count"><span>${esc(label)}</span><strong>${value}</strong><small>${esc(description)}</small></article>`;
  }
  function opsLeadCard(l,detail){
    return `<article class="ops-record">
      <div class="ops-record-avatar" aria-hidden="true">${esc((l.name||'T').trim().charAt(0).toUpperCase())}</div>
      <div class="ops-record-main"><h3>${esc(l.name||'Unnamed traveler')}</h3><p>${esc(l.trip_details||l.message||'General travel inquiry')}</p><div class="ops-record-meta"><span>${esc(l.email||l.phone||'No contact')}</span><span>${esc(niceSource(l.source))}</span>${l.created_at?`<span>${esc(niceDate(l.created_at))}</span>`:''}</div></div>
      <div class="ops-record-side"><span class="ops-state ${String(l.temperature||'warm').toLowerCase()}">${esc(detail||l.stage||'New')}</span><button type="button" class="ops-open" data-ops-lead="${esc(l.id)}">Open lead</button></div>
    </article>`;
  }
  function travelerRecords(){
    const seen=new Map();
    leads.forEach(l=>{
      const key=l.email?.trim()?`email:${l.email.trim().toLowerCase()}`:l.phone?.trim()?`phone:${l.phone.trim()}`:`record:${l.id}`;
      if(!key)return;
      if(!seen.has(key))seen.set(key,[]);
      seen.get(key).push(l);
    });
    return [...seen.values()].map(group=>({
      first:group[0],latest:[...group].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0],count:group.length,
      booked:group.filter(l=>l.stage==='Booked').length
    })).sort((a,b)=>new Date(b.latest.created_at||0)-new Date(a.latest.created_at||0));
  }
  function renderOperations(name){
    if(name==='followups'){
      const query=($('#followupSearch')?.value||'').toLowerCase().trim();
      const priority=$('#followupPriority')?.value||'';
      const base=leads.filter(l=>['New','Contacted','Follow-up','Qualified','Quoted'].includes(l.stage)||
        (l.temperature==='Hot'&&!['Booked','Closed','Lost'].includes(l.stage)));
      const filtered=base.filter(l=>(!priority||l.temperature===priority)&&(!query||operationalIdentity(l).includes(query)))
        .sort((a,b)=>(b.temperature==='Hot')-(a.temperature==='Hot')||new Date(a.created_at||0)-new Date(b.created_at||0));
      $('#followupStats').innerHTML=opsCount('Open conversations',base.length,'not yet booked or closed')+
        opsCount('Hot leads',base.filter(l=>l.temperature==='Hot').length,'prioritize these')+
        opsCount('New inquiries',base.filter(l=>l.stage==='New').length,'awaiting first response');
      $('#followupList').innerHTML=filtered.map(l=>opsLeadCard(l)).join('')||'<div class="ops-empty">No open follow-ups match these filters.</div>';
    }
    if(name==='bookings'){
      const query=($('#bookingSearch')?.value||'').toLowerCase().trim();
      const base=leads.filter(l=>l.stage==='Booked');
      const filtered=base.filter(l=>!query||operationalIdentity(l).includes(query));
      $('#bookingsStats').innerHTML=opsCount('Booked inquiries',base.length,'marked Booked in CRM')+
        opsCount('With email',base.filter(l=>l.email).length,'reachable by email')+
        opsCount('With phone',base.filter(l=>l.phone).length,'reachable by phone');
      $('#bookingList').innerHTML=filtered.map(l=>opsLeadCard(l,'Booked')).join('')||'<div class="ops-empty">No booked inquiries match this search.</div>';
    }
    if(name==='travelers'){
      const rows=travelerRecords();
      const query=($('#travelerSearch')?.value||'').toLowerCase().trim();
      const filtered=rows.filter(g=>!query||operationalIdentity(g.latest).includes(query));
      $('#travelerStats').innerHTML=opsCount('Traveler contacts',rows.length,'unique by email or phone')+
        opsCount('Returning contacts',rows.filter(g=>g.count>1).length,'more than one inquiry')+
        opsCount('Converted travelers',rows.filter(g=>g.booked>0).length,'at least one booked inquiry');
      $('#travelerList').innerHTML=filtered.map(g=>opsLeadCard(g.latest,`${g.count} ${g.count===1?'inquiry':'inquiries'}`)).join('')||'<div class="ops-empty">No traveler contacts match this search.</div>';
    }
    $$('[data-ops-lead]', $('#view-'+name)).forEach(btn=>btn.addEventListener('click',()=>openLead(btn.dataset.opsLead)));
  }
  ['followupSearch','travelerSearch','bookingSearch'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{
    const v={followupSearch:'followups',travelerSearch:'travelers',bookingSearch:'bookings'}[id];renderOperations(v);
  }));
  $('#followupPriority')?.addEventListener('change',()=>renderOperations('followups'));
  $$('[data-ops-new-lead]').forEach(btn=>btn.addEventListener('click',()=>openLead()));
  $('#exportBookings')?.addEventListener('click',()=>{
    downloadCsv('ezam-booked-inquiries.csv',['Traveler','Email','Phone','Journey','Source','Created'],
      leads.filter(l=>l.stage==='Booked').map(l=>[l.name,l.email,l.phone,l.trip_details||l.message,niceSource(l.source),niceDate(l.created_at)]));
  });
  $('#exportTravelers')?.addEventListener('click',()=>{
    downloadCsv('ezam-traveler-contacts.csv',['Traveler','Email','Phone','Inquiries','Booked inquiries'],
      travelerRecords().map(g=>[g.latest.name,g.latest.email,g.latest.phone,g.count,g.booked]));
  });
  /* -------- Reports -------- */
  function reportVisibleLeads(){
    const period=Number($("#reportPeriod")?.value||0);
    if(!period)return leads;
    const cutoff=Date.now()-period*86400000;
    return leads.filter(l=>l.created_at&&new Date(l.created_at).getTime()>=cutoff);
  }
  const pct=(n,total)=>total?Math.round(n/total*100):0;
  const reportEmpty=(message)=>`<p class="report-empty">${esc(message)}</p>`;
  function reportBar(label,count,total,meta,color,action=""){
    const width=pct(count,total);
    return `<div class="report-stat-row">
      <div class="report-stat-main"><span class="report-stat-label">${esc(label)}</span><span class="report-stat-count">${count} <small>${esc(meta)}</small></span></div>
      <div class="report-progress" role="img" aria-label="${esc(label)}: ${count} of ${total} (${width}%)"><span style="--bar-width:${width}%;--bar-color:${color}"></span></div>
      ${action?`<button class="report-inline-action" type="button" data-report-jump="${esc(action)}">View records</button>`:""}
    </div>`;
  }
  function renderReports(){
    if(!isOwner())return;
    const rows=reportVisibleLeads(),total=rows.length;
    const booked=rows.filter(l=>l.stage==='Booked').length;
    const active=rows.filter(l=>['Qualified','Quoted','Follow-up'].includes(l.stage)).length;
    const sourceCounts={}; rows.forEach(l=>sourceCounts[l.source||'website']=(sourceCounts[l.source||'website']||0)+1);
    const topSource=Object.entries(sourceCounts).sort((a,b)=>b[1]-a[1])[0];
    $('#reportConversion').textContent=total?`${pct(booked,total)}%`:'0%';
    $('#reportPipeline').textContent=active;
    $('#reportPackages').textContent=packages.filter(p=>p.published).length;
    $('#reportTopSource').textContent=topSource?niceSource(topSource[0]):'—';
    $('#reportTopSourceMeta').textContent=topSource?`${topSource[1]} inquiries in selected period`:'No inquiry data for selected period';

    const sourceHost=$('#sourcePerformance');
    sourceHost.innerHTML=total?Object.entries(sourceCounts).sort((a,b)=>b[1]-a[1]).map(([src,count],i)=>{
      const wins=rows.filter(l=>(l.source||'website')===src&&l.stage==='Booked').length;
      const palette=['#f47a24','#129d70','#337dba','#7c68cb','#d9a122','#6d8c9b'];
      return reportBar(niceSource(src),count,total,`${pct(count,total)}% · ${wins} booked`,palette[i%palette.length]);
    }).join(''):reportEmpty('No inquiries in this date range. Try All time.');

    const teamHost=$('#teamPerformance');
    const assignments=admins.map(a=>({name:a.display_name||a.email,owned:rows.filter(l=>l.assigned_to===a.id)}));
    assignments.unshift({name:'Unassigned',owned:rows.filter(l=>!l.assigned_to)});
    teamHost.innerHTML=assignments.map((entry,i)=>{
      const wins=entry.owned.filter(l=>l.stage==='Booked').length;
      return reportBar(entry.name,entry.owned.length,total,`${wins} booked`,i===0?'#e7a031':'#328fbf');
    }).join('')||reportEmpty('No team accounts configured.');

    const packageHost=$('#packagePerformance');
    const totalPackages=packages.length,published=packages.filter(p=>p.published).length;
    const drafts=packages.filter(p=>!p.published).length,featured=packages.filter(p=>p.featured).length;
    packageHost.innerHTML=reportBar('Published',published,totalPackages,`${pct(published,totalPackages)}% of catalog`,'#129d70')+
      reportBar('Draft',drafts,totalPackages,`${pct(drafts,totalPackages)}% of catalog`,'#9aabb6')+
      reportBar('Featured',featured,totalPackages,'may also be published','#f47a24')+
      `<p class="report-footnote">${new Set(packages.map(p=>p.country).filter(Boolean)).size} countries or regions represented · live catalog totals are not affected by the date filter.</p>`;

    const priorityHost=$('#priorityPerformance');
    const palette={Hot:'#e95058',Warm:'#f2a72d',Cold:'#428cc8'};
    priorityHost.innerHTML=['Hot','Warm','Cold'].map(t=>{
      const matches=rows.filter(l=>l.temperature===t),wins=matches.filter(l=>l.stage==='Booked').length;
      return reportBar(`${t} leads`,matches.length,total,`${wins} booked`,palette[t],t==='Hot'?'followups':'');
    }).join('')+(total?'':reportEmpty('No priority records for this date range.'));
    $$('[data-report-jump]', $('#view-reports')).forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.reportJump)));
  }
  $('#reportPeriod')?.addEventListener('change',renderReports);
  $("#exportLeadsBtn")?.addEventListener("click",exportLeadsCsv);
  $("#exportReportBtn")?.addEventListener("click",()=>{
    const total=leads.length,booked=leads.filter(l=>l.stage==='Booked').length;
    downloadCsv('ezam-summary.csv',['Metric','Value'],[
      ['Total leads',total],['Booked leads',booked],['Conversion rate',total?`${Math.round(booked/total*100)}%`:'0%'],
      ['Published packages',packages.filter(p=>p.published).length],['Draft packages',packages.filter(p=>!p.published).length],['Unassigned leads',leads.filter(l=>!l.assigned_to).length]
    ]);
  });

  /* -------- Settings -------- */
  function renderSettings(){
    if(!isOwner())return;
    $("#settingEmail").value=settings.business_email||"";
    $("#settingPhone").value=settings.phone||"";
    $("#settingFacebook").value=settings.facebook_url||"";
    $("#settingInstagram").value=settings.instagram_url||"";
    $("#settingTikTok").value=settings.tiktok_url||"";
  }
  $("#settingsForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      settings=await EZAMData.saveSettings({
        business_email:$("#settingEmail").value.trim(),
        phone:$("#settingPhone").value.trim(),
        facebook_url:$("#settingFacebook").value.trim(),
        instagram_url:$("#settingInstagram").value.trim(),
        tiktok_url:$("#settingTikTok").value.trim()
      });
      alert("Website contact settings saved.");
    }catch(err){alert(err.message||"Settings could not be saved.");}
  });


  /* EZAM V8.16 — live clocks: IANA zones handle DST without manually offsetting UTC. */
  const CLOCK_FORMAT_KEY="ezam_clock_format";
  const clockTiles=[...document.querySelectorAll("[data-clock-zone]")];
  const formatButtons=[...document.querySelectorAll("[data-clock-format]")];
  const clockFormatters=new Map();
  let clockDisplayFormat="12";
  try{
    clockDisplayFormat=localStorage.getItem(CLOCK_FORMAT_KEY)==="24"?"24":"12";
  }catch(error){clockDisplayFormat="12";}

  function clockFormatter(zone,kind,format){
    const key=`${zone}|${kind}|${format}`;
    if(!clockFormatters.has(key)){
      const options=kind==="time"
        ? {timeZone:zone,hour:"2-digit",minute:"2-digit",second:"2-digit",...(format==="12"?{hour12:true}:{hourCycle:"h23"})}
        : kind==="date"
        ? {timeZone:zone,weekday:"short",month:"short",day:"numeric"}
        : {timeZone:zone,timeZoneName:"shortOffset"};
      clockFormatters.set(key,new Intl.DateTimeFormat(kind==="time"?"en-US":"en-GB",options));
    }
    return clockFormatters.get(key);
  }

  function renderWorldClocks(){
    if(!clockTiles.length)return;
    const now=new Date();
    for(const tile of clockTiles){
      const zone=tile.dataset.clockZone;
      try{
        const parts=clockFormatter(zone,"time",clockDisplayFormat).formatToParts(now);
        const getPart=type=>parts.find(part=>part.type===type)?.value||"";
        tile.querySelector("[data-clock-time]").textContent=`${getPart("hour")}:${getPart("minute")}:${getPart("second")}`;
        tile.querySelector("[data-clock-period]").textContent=clockDisplayFormat==="12"?getPart("dayPeriod"):"";
        tile.querySelector("[data-clock-date]").textContent=clockFormatter(zone,"date",clockDisplayFormat).format(now);
        try{
          const offset=clockFormatter(zone,"offset",clockDisplayFormat).formatToParts(now).find(part=>part.type==="timeZoneName")?.value||"";
          tile.querySelector("[data-clock-offset]").textContent=offset.replace(/^GMT/,"UTC");
        }catch(error){tile.querySelector("[data-clock-offset]").textContent="";}
        const hour24=Number(new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"numeric",hourCycle:"h23"}).format(now));
        tile.classList.toggle("is-night",hour24<6 || hour24>=18);
      }catch(error){
        tile.querySelector("[data-clock-time]").textContent="Time unavailable";
        tile.querySelector("[data-clock-period]").textContent="";
      }
    }
  }

  function applyClockFormat(next){
    clockDisplayFormat=next==="24"?"24":"12";
    try{localStorage.setItem(CLOCK_FORMAT_KEY,clockDisplayFormat)}catch(error){}
    formatButtons.forEach(button=>{
      const selected=button.dataset.clockFormat===clockDisplayFormat;
      button.classList.toggle("active",selected);
      button.setAttribute("aria-pressed",String(selected));
    });
    renderWorldClocks();
  }
  formatButtons.forEach(button=>button.addEventListener("click",()=>applyClockFormat(button.dataset.clockFormat)));
  applyClockFormat(clockDisplayFormat);
  const clockRefreshTimer=setInterval(()=>{
    if(!document.hidden)renderWorldClocks();
  },1000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderWorldClocks();});
  window.addEventListener("pagehide",()=>clearInterval(clockRefreshTimer),{once:true});

  /* -------- Init / Realtime -------- */
  if(!(await guard())) return;

  populateLeadSelects();
  await refreshData();
  populateLeadSelects();
  setOwnerVisibility();

  const hash=location.hash.replace("#","");
  switchView(["overview","leads","followups","bookings","travelers","packages","admins","reports","settings"].includes(hash)?hash:"overview");

  $("#navLeadCount").textContent=leads.filter(l=>l.stage==="New").length;

  if(EZAMData.backendConfigured){
    unsubscribeRealtime=EZAMData.subscribeLeads(async()=>{await refreshData();renderLeads();const currentOp=location.hash.slice(1);if(["followups","bookings","travelers"].includes(currentOp))renderOperations(currentOp);});
  }else{
    addEventListener("ezam-data-change",async()=>{await refreshData();renderLeads();renderPackages();renderAdmins();renderReports();["followups","bookings","travelers"].forEach(renderOperations);});
  }

  addEventListener("beforeunload",()=>unsubscribeRealtime?.());
})();
