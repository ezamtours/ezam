
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header and mobile navigation
  const header = $(".site-header");
  const menuBtn = $("#menuBtn");
  const mobileMenu = $("#mobileMenu");
  addEventListener("scroll", () => header?.classList.toggle("scrolled", scrollY > 20), {passive:true});
  menuBtn?.addEventListener("click", () => {
    const open = mobileMenu.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("#mobileMenu a").forEach(a => a.addEventListener("click", () => {
    mobileMenu?.classList.remove("open");
    menuBtn?.setAttribute("aria-expanded", "false");
  }));


  // If a high-resolution network photograph fails, use the bundled local fallback.
  $$("img[data-fallback]").forEach(img => {
    img.addEventListener("error", () => {
      const fallback = img.dataset.fallback;
      if(fallback && img.src !== fallback){
        img.removeAttribute("srcset");
        img.src = fallback;
      }
    }, {once:true});
  });

  // Upgrade local images to the high-resolution source only after that source loads.
  function upgradeImages(scope=document){
    $$("img[data-hq]", scope).forEach(img => {
      if(img.dataset.hqTried) return;
      img.dataset.hqTried = "1";
      const candidate = new Image();
      candidate.decoding = "async";
      candidate.onload = () => {
        img.src = img.dataset.hq;
        img.dataset.quality = "hq";
      };
      candidate.onerror = () => {
        img.dataset.quality = "local";
      };
      candidate.src = img.dataset.hq;
    });
  }
  upgradeImages();

  // Automatic hero carousel — independent from scrolling.
  const heroSlides = $$(".hero-v7-slide");
  const heroDots = $$(".hero-v7-controls button");
  const heroPlace = $("#heroV7Place");
  const heroCountry = $("#heroV7Country");
  const heroCount = $("#heroV7Count");
  const heroLabels = [
    ["El Nido, Palawan","PHILIPPINES"],
    ["Mount Fuji","JAPAN"],
    ["Seoul","SOUTH KOREA"],
    ["Marina Bay","SINGAPORE"],
    ["Lake Beratan, Bali","INDONESIA"]
  ];
  let heroIndex = 0;
  let heroTimer = null;

  function setHero(index, userInitiated=false){
    if(!heroSlides.length) return;
    heroIndex = (index + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide,i) => slide.classList.toggle("is-active", i===heroIndex));
    heroDots.forEach((dot,i) => {
      dot.classList.toggle("is-active", i===heroIndex);
      dot.setAttribute("aria-current", i===heroIndex ? "true" : "false");
    });
    const label = heroLabels[heroIndex] || heroLabels[0];
    if(heroPlace) heroPlace.textContent = label[0];
    if(heroCountry) heroCountry.textContent = label[1];
    if(heroCount) heroCount.textContent = `${String(heroIndex+1).padStart(2,"0")} / ${String(heroSlides.length).padStart(2,"0")}`;
    if(userInitiated) restartHero();
  }
  function startHero(){
    if(reduceMotion || heroSlides.length < 2) return;
    clearInterval(heroTimer);
    heroTimer = setInterval(() => setHero(heroIndex+1), 5600);
  }
  function restartHero(){ clearInterval(heroTimer); startHero(); }
  heroDots.forEach(btn => btn.addEventListener("click", () => setHero(Number(btn.dataset.heroIndex || 0), true)));
  const heroSection = $(".hero-v7");
  heroSection?.addEventListener("mouseenter", () => clearInterval(heroTimer));
  heroSection?.addEventListener("mouseleave", startHero);

  let heroTouchX = null;
  heroSection?.addEventListener("touchstart", e => {
    heroTouchX = e.changedTouches?.[0]?.clientX ?? null;
    clearInterval(heroTimer);
  }, {passive:true});
  heroSection?.addEventListener("touchend", e => {
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if(heroTouchX !== null && endX !== null){
      const dx = endX - heroTouchX;
      if(Math.abs(dx) > 48) setHero(heroIndex + (dx < 0 ? 1 : -1), true);
      else startHero();
    } else startHero();
    heroTouchX = null;
  }, {passive:true});

  setHero(0);
  startHero();

  // Editorial scroll motion: animate text and cards independently while keeping photography crisp.
  let scrollRevealObserver = null;
  if("IntersectionObserver" in window && !reduceMotion){
    scrollRevealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add("in-view");
          scrollRevealObserver.unobserve(entry.target);
        }
      });
    }, {threshold:.10, rootMargin:"0px 0px -8% 0px"});
  }

  function registerMotion(elements){
    const unique=[...new Set(elements.filter(Boolean))];
    unique.forEach(el => {
      if(!el.classList.contains("motion-text") && !el.classList.contains("motion-card") && !el.classList.contains("about-philosophy")){
        el.classList.add(el.matches("h1,h2,h3,p,.eyebrow") ? "motion-text" : "motion-card");
      }
      const siblings = el.parentElement ? [...el.parentElement.children] : [];
      const siblingIndex = Math.max(0, siblings.indexOf(el));
      el.style.setProperty("--delay", `${Math.min(siblingIndex * 75, 300)}ms`);
      if(scrollRevealObserver) scrollRevealObserver.observe(el);
      else el.classList.add("in-view");
    });
  }

  registerMotion([
    ...$$(".motion-text"),
    ...$$(".motion-card"),
    ...$$(".about-philosophy"),
    ...$$(".travel-path"),
    ...$$(".dest-card"),
    ...$$(".trust-item"),
    ...$$(".journey-step-card"),
    ...$$(".story-card")
  ]);

  // Traveler selector
  const travelerState = {adults:2, children:0, infants:0};
  const travelersToggle = $("#travelersToggle");
  const travelersPopover = $("#travelersPopover");
  const travelersSummary = $("#travelersSummary");
  function tLabel(n,s,p){ return `${n} ${n===1?s:p}`; }
  function updateTravelers(){
    $("#adultsCount") && ($("#adultsCount").textContent = travelerState.adults);
    $("#childrenCount") && ($("#childrenCount").textContent = travelerState.children);
    $("#infantsCount") && ($("#infantsCount").textContent = travelerState.infants);
    const parts=[tLabel(travelerState.adults,"Adult","Adults")];
    if(travelerState.children) parts.push(tLabel(travelerState.children,"Child","Children"));
    if(travelerState.infants) parts.push(tLabel(travelerState.infants,"Infant","Infants"));
    if(travelersSummary) travelersSummary.textContent=parts.join(" · ");
  }
  travelersToggle?.addEventListener("click", () => {
    const open = travelersPopover?.hasAttribute("hidden");
    travelersPopover?.toggleAttribute("hidden", !open);
    travelersToggle.setAttribute("aria-expanded", String(open));
  });
  $$(".stepper button").forEach(btn => btn.addEventListener("click", () => {
    const key=btn.dataset.traveler, step=Number(btn.dataset.step||0);
    const min=key==="adults"?1:0, max=key==="adults"?12:8;
    travelerState[key]=Math.min(max,Math.max(min,travelerState[key]+step));
    updateTravelers();
  }));
  $("#travelersDone")?.addEventListener("click", () => {
    travelersPopover?.setAttribute("hidden","");
    travelersToggle?.setAttribute("aria-expanded","false");
  });
  document.addEventListener("click", e => {
    if(!travelersPopover || travelersPopover.hasAttribute("hidden")) return;
    if(!travelersPopover.contains(e.target) && !travelersToggle?.contains(e.target)){
      travelersPopover.setAttribute("hidden","");
      travelersToggle?.setAttribute("aria-expanded","false");
    }
  });
  updateTravelers();

  // Date logic
  const checkIn=$("#checkIn"), checkOut=$("#checkOut");
  const today=new Date();
  const todayISO=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().split("T")[0];
  if(checkIn) checkIn.min=todayISO;
  if(checkOut) checkOut.min=todayISO;
  checkIn?.addEventListener("change", () => {
    if(!checkOut) return;
    checkOut.min=checkIn.value||todayISO;
    if(checkOut.value && checkIn.value && checkOut.value<checkIn.value) checkOut.value="";
  });

  // Inquiry modal
  const modal=$("#inquiryModal"), inquiryForm=$("#inquiryForm");
  function openInquiry({type="custom",packageId="",title="",details="",source="website"}={}){
    if(!modal) return;
    $("#inquiryType").value=type;
    $("#inquiryPackageId").value=packageId||"";
    $("#inquiryTripDetails").value=details||"";
    modal.dataset.source=source;
    $("#inquiryTitle").textContent = type==="package" ? `Inquire about ${title}` : "Tell us how we can help.";
    $("#inquiryContext").textContent = type==="package"
      ? "Your package selection is already attached. Add your contact details and any questions."
      : "Your trip-builder details are attached. Add your contact details and anything else EZAM should know.";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("inquiry-open");
    setTimeout(()=>$("#inqName")?.focus(),80);
  }
  function closeInquiry(){
    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden","true");
    document.body.classList.remove("inquiry-open");
  }
  $$("[data-close-inquiry]").forEach(x=>x.addEventListener("click",closeInquiry));
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeInquiry(); });

  $("#plannerForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const fromCountry=$("#originCountry")?.value||"Not specified";
    const fromPlace=$("#originPlace")?.value||"Not specified";
    const destCountry=$("#destinationCountry")?.value||"Not specified";
    const destPlace=$("#destinationPlace")?.value||"Not specified";
    const start=checkIn?.value||"Flexible / not specified";
    const end=checkOut?.value||"Flexible / not specified";
    const party=travelersSummary?.textContent||"2 Adults";
    const details=[
      `From: ${fromPlace}, ${fromCountry}`,
      `Destination: ${destPlace || destCountry}${destPlace&&destCountry?`, ${destCountry}`:""}`,
      `Travel dates: ${start} to ${end}`,
      `Travel party: ${party}`
    ].join("\n");
    openInquiry({type:"custom",details});
  });

  inquiryForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const submit = inquiryForm.querySelector('button[type="submit"]');
    submit.disabled=true; submit.textContent="Sending…";
    try {
      await EZAMData.createLead({
        inquiry_type:$("#inquiryType").value,
        package_id:$("#inquiryPackageId").value||null,
        trip_details:$("#inquiryTripDetails").value||"",
        name:$("#inqName").value.trim(),
        email:$("#inqEmail").value.trim(),
        phone:$("#inqPhone").value.trim(),
        preferred_contact:$("#inqPreferred").value,
        message:$("#inqMessage").value.trim(),
        source:modal?.dataset.source || "website"
      });
      inquiryForm.reset(); closeInquiry();
      const toast=$("#toast");
      if(toast){
        toast.textContent="Thank you — EZAM received your inquiry.";
        toast.classList.add("show"); setTimeout(()=>toast.classList.remove("show"),3300);
      }
    } catch(err){
      alert(err.message || "We could not send the inquiry. Please try again.");
    } finally {
      submit.disabled=false; submit.textContent="Send Inquiry →";
    }
  });

  // Dynamic package section.
  function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function packageCard(p){
    const tags=(p.tags||[]).slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join("");
    const image=String(p.image_url||"");
    const fallback=p.fallback_url || "assets/images/fallback-palawan.webp";
    const direct=/^(data:image|blob:|assets\/)/i.test(image) ? image : "";
    const hq=image && /^https?:/i.test(image) ? image : "";
    const src=direct || fallback || image;
    return `<article class="package motion-card" data-package-id="${esc(p.id)}">
      <div class="package-img"><img loading="lazy" decoding="async" src="${esc(src)}" ${hq?`data-hq="${esc(hq)}"`:""} alt="${esc(p.title)}"/></div>
      <div class="package-body">
        <div class="package-kicker"><span class="ready-badge">${p.featured?"FEATURED":"EZAM PACKAGE"}</span> · ${esc(p.duration||"")}</div>
        <h3>${esc(p.title)}</h3>
        <div class="package-destination">${esc(p.destination||p.country||"")}</div>
        <p class="package-summary">${esc(p.summary||"")}</p>
        <div class="tags">${tags}</div>
        <div class="package-actions">
          <div><small>${esc(p.travel_dates||"")}</small><div class="package-price">${esc(p.price_label||"Request current rate")}</div></div>
          <button class="package-inquire" type="button" data-inquire-package="${esc(p.id)}">Inquire →</button>
        </div>
      </div>
    </article>`;
  }
  async function renderPackages(){
    const grid=$("#publicPackageGrid"); if(!grid) return;
    try{
      const packages=await EZAMData.listPackages({publicOnly:true});
      grid.innerHTML=packages.length ? packages.map(packageCard).join("") :
        '<div class="package-empty">No packages are published right now. Ask EZAM to customize a journey.</div>';
      upgradeImages(grid);
      registerMotion($$(".package",grid));
      $$("[data-inquire-package]",grid).forEach(btn=>btn.addEventListener("click",async()=>{
        const packages=await EZAMData.listPackages({publicOnly:true});
        const p=packages.find(x=>String(x.id)===String(btn.dataset.inquirePackage)); if(!p) return;
        openInquiry({
          type:"package", packageId:p.id, title:p.title,
          details:`Package: ${p.title}\nDestination: ${p.destination||p.country||""}\nDuration: ${p.duration||""}\nDates: ${p.travel_dates||""}\nRate: ${p.price_label||"Request current rate"}`
        });
      }));
    } catch(err){
      grid.innerHTML='<div class="package-empty">Packages are temporarily unavailable. Please contact EZAM directly.</div>';
    }
  }
  renderPackages();

  // Social messaging links controlled from owner settings.
  async function renderSocial(){
    try{
      const settings=await EZAMData.getSettings();
      const map={facebook:settings.facebook_url,instagram:settings.instagram_url,tiktok:settings.tiktok_url};
      Object.entries(map).forEach(([key,url])=>{
        const a=$(`[data-social="${key}"]`);
        if(!a) return;
        if(url){
          a.href=url; a.target="_blank"; a.rel="noopener";
          a.classList.remove("is-unconfigured"); a.removeAttribute("aria-disabled");
        } else {
          a.href="#"; a.classList.add("is-unconfigured"); a.setAttribute("aria-disabled","true");
          a.title="Social account link can be added in the EZAM admin dashboard.";
        }
      });
    }catch(_){}
  }
  renderSocial();
  $$(".social-btn").forEach(a=>a.addEventListener("click",e=>{
    if(a.classList.contains("is-unconfigured")){
      e.preventDefault();
      alert("This social channel has not been configured yet. EZAM can add its official link in the admin dashboard.");
    }
  }));


  // Contextual helper placeholders for the trip planner (selection remains optional).
  const destinationCountrySelect = document.querySelector("#destinationCountry");
  const destinationPlaceInput = document.querySelector("#destinationPlace");
  const destinationHints = {
    "Philippines": "e.g., Palawan, Cebu, Bohol",
    "Japan": "e.g., Tokyo, Osaka, Kyoto",
    "South Korea": "e.g., Seoul, Busan, Jeju",
    "Singapore": "e.g., Marina Bay, Sentosa",
    "Indonesia": "e.g., Bali, Jakarta, Lombok",
    "Thailand": "e.g., Bangkok, Phuket, Chiang Mai",
    "Vietnam": "e.g., Da Nang, Hoi An, Hanoi",
    "Taiwan": "e.g., Taipei, Taichung",
    "Hong Kong": "e.g., Kowloon, Hong Kong Island",
    "Europe / Multi-country": "e.g., Paris, Rome, Zurich",
    "Other": "Enter your preferred destination"
  };
  function updateDestinationHint() {
    if(!destinationPlaceInput) return;
    destinationPlaceInput.placeholder = destinationHints[destinationCountrySelect?.value] || "e.g., Tokyo or Palawan";
  }
  destinationCountrySelect?.addEventListener("change",updateDestinationHint);
  updateDestinationHint();

  // Destination click pre-fills the planner.
  $$(".dest-card").forEach(card=>card.addEventListener("click",()=>{
    const title=card.querySelector("h3")?.textContent?.trim()||"";
    const countryMap={"Philippines":"Philippines","Japan":"Japan","South Korea":"South Korea","Singapore":"Singapore","Bali, Indonesia":"Indonesia"};
    const select=$("#destinationCountry"); if(select&&countryMap[title]) { select.value=countryMap[title]; updateDestinationHint(); }
    const place=$("#destinationPlace"); if(place) place.value=title==="Bali, Indonesia"?"Bali":title;
  }));

  // Update page if data changes in demo mode; Supabase Realtime is handled separately by the dashboard.
  addEventListener("ezam-data-change", e=>{
    if(e.detail?.key==="ezam_v7_packages") renderPackages();
    if(e.detail?.key==="ezam_v7_settings") renderSocial();
  });
})();
