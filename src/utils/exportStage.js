// Export the stage SVG as a standalone .svg or a 2x .png. Hit layers
// (data-hit) are stripped and CSS custom properties are inlined so the file
// renders outside the app.

const VAR_RE = /var\((--[a-z0-9-]+)\)/g;

function inlineVars(svg) {
  const cs = getComputedStyle(document.documentElement);
  const resolve = (v) => v.replace(VAR_RE, (_, name) => cs.getPropertyValue(name).trim() || "#888");
  for (const el of svg.querySelectorAll("*")) {
    for (const attr of ["fill", "stroke"]) {
      const v = el.getAttribute(attr);
      if (v && v.includes("var(")) el.setAttribute(attr, resolve(v));
    }
    if (el.classList.contains("ap-plane-tag")) { el.setAttribute("fill", resolve("var(--faint)")); el.setAttribute("font-size", "10"); }
    if (el.classList.contains("ap-chip-text")) { el.setAttribute("fill", resolve("var(--ink)")); el.setAttribute("font-size", "11"); el.setAttribute("text-anchor", "middle"); el.setAttribute("font-weight", "600"); }
    if (el.classList.contains("ap-gonio-text")) { el.setAttribute("fill", resolve("var(--ink)")); el.setAttribute("font-size", "12"); el.setAttribute("font-weight", "600"); }
    if (el.classList.contains("ap-gonio-sub")) { el.setAttribute("fill", resolve("var(--norm)")); el.setAttribute("font-size", "9"); }
    el.removeAttribute("class"); el.removeAttribute("tabindex"); el.removeAttribute("style");
    for (const a of [...el.attributes]) if (a.name.startsWith("aria-") || a.name === "role") el.removeAttribute(a.name);
  }
}

export function stageSvgString(svgEl) {
  const clone = svgEl.cloneNode(true);
  clone.querySelectorAll("[data-hit]").forEach((n) => n.remove());
  inlineVars(clone);
  const vb = (svgEl.getAttribute("viewBox") || "0 0 420 640").split(/\s+/).map(Number);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(vb[2])); clone.setAttribute("height", String(vb[3]));
  clone.setAttribute("font-family", "IBM Plex Sans, system-ui, sans-serif");
  return new XMLSerializer().serializeToString(clone);
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSvg(svgEl, name = "anatomy-poser.svg") {
  download(new Blob([stageSvgString(svgEl)], { type: "image/svg+xml;charset=utf-8" }), name);
}

export function exportPng(svgEl, name = "anatomy-poser.png", scale = 2) {
  const str = stageSvgString(svgEl);
  const vb = (svgEl.getAttribute("viewBox") || "0 0 420 640").split(/\s+/).map(Number);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = vb[2] * scale; canvas.height = vb[3] * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0f1417";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => { if (!blob) return reject(new Error("PNG encode failed")); download(blob, name); resolve(); }, "image/png");
    };
    img.onerror = () => reject(new Error("SVG rasterize failed"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(str);
  });
}
