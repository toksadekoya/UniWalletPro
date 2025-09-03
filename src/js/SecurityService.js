// src/js/SecurityService.js
function escapeHtml(str) {
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

export const SecurityService = {
  sanitizeInput(input) {
    let s = String(input || "");
    // Strip javascript: and on* handlers
    s = s.replace(/javascript\s*:/gi, "");
    s = s.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
    return escapeHtml(s);
  }
};