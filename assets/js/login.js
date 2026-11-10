
(async () => {
  const $ = s => document.querySelector(s);
  const errorEl = $("#loginError");
  const form = $("#loginForm");
  const notice = $("#backendNotice");
  const demo = $("#demoLogin");

  const existing = await EZAMData.getCurrentProfile().catch(()=>null);
  if(existing?.is_active && ["owner","admin"].includes(existing.role)){
    location.replace("owner.html");
    return;
  }

  if(!EZAMData.backendConfigured){
    notice.hidden = false;
    demo.hidden = !EZAMData.demoMode;
    form.querySelectorAll("input, button[type=submit], #forgotPassword").forEach(el => el.disabled = true);
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    errorEl.textContent = "";
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = "Signing in…";
    try{
      await EZAMData.login($("#loginEmail").value.trim(), $("#loginPassword").value);
      document.documentElement.classList.add("page-leaving");
      setTimeout(()=>location.href="owner.html",180);
    }catch(err){
      errorEl.textContent = err.message || "Unable to sign in.";
    }finally{
      btn.disabled=false; btn.textContent="Sign in →";
    }
  });

  $("#forgotPassword")?.addEventListener("click", async () => {
    const email=$("#loginEmail").value.trim();
    if(!email) return errorEl.textContent="Enter your email address first.";
    if(!EZAMData.client) return errorEl.textContent="Password recovery requires the Supabase backend.";
    const {error}=await EZAMData.client.auth.resetPasswordForEmail(email,{redirectTo:new URL("admin-login.html",location.href).href});
    errorEl.textContent=error ? error.message : "Password recovery email sent.";
  });

  document.querySelectorAll("[data-demo-role]").forEach(btn => btn.addEventListener("click", async () => {
    await EZAMData.demoLogin(btn.dataset.demoRole);
    document.documentElement.classList.add("page-leaving");
    setTimeout(()=>location.href="owner.html",180);
  }));
})();

(function(){
  const btn=document.getElementById("loginThemeToggle");
  if(!btn) return;
  btn.addEventListener("click",()=>{
    const next=document.documentElement.dataset.theme==="dark"?"light":"dark";
    document.documentElement.dataset.theme=next;
    try{localStorage.setItem("ezam_admin_theme",next);}catch(e){}
  });
})();
