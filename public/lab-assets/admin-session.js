(() => {
  let pending = false;
  async function checkSession() {
    if (pending || document.visibilityState === "hidden") return;
    pending = true;
    try {
      const response = await fetch("/api/lab-auth/session", { cache: "no-store", credentials: "same-origin" });
      if (response.status === 401) location.replace("/admin/login?next=%2Flab");
    } catch { /* Keep local records intact while the connection is unavailable. */ }
    finally { pending = false; }
  }
  addEventListener("pageshow", checkSession);
  document.addEventListener("visibilitychange", checkSession);
  setInterval(checkSession, 60_000);
})();
