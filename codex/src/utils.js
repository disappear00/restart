export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function throttle(callback, delay = 120) {
  let isWaiting = false;
  let trailingArgs = null;

  return (...args) => {
    if (isWaiting) {
      trailingArgs = args;
      return;
    }

    callback(...args);
    isWaiting = true;

    window.setTimeout(() => {
      isWaiting = false;
      if (trailingArgs) {
        const pending = trailingArgs;
        trailingArgs = null;
        callback(...pending);
      }
    }, delay);
  };
}

export function debounce(callback, delay = 300) {
  let timeoutId = 0;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };
}

export function createSvgPlaceholder({
  title,
  subtitle,
  palette = ["#1f6f78", "#f08a5d"],
  ratio = "800 600",
  accent = "dot-grid"
}) {
  const [width, height] = ratio.split(" ").map(Number);
  const encoded = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
        <pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2" fill="rgba(255,255,255,0.14)"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" rx="42" fill="url(#g)"/>
      <rect width="${width}" height="${height}" fill="${accent === "dot-grid" ? "url(#p)" : "transparent"}"/>
      <g fill="#ffffff">
        <circle cx="${width - 90}" cy="94" r="28" opacity="0.14"/>
        <circle cx="${width - 160}" cy="140" r="18" opacity="0.12"/>
      </g>
      <text x="56" y="${height - 126}" font-family="Inter, Arial, sans-serif" font-size="46" font-weight="700" fill="#ffffff">
        ${title}
      </text>
      <text x="56" y="${height - 72}" font-family="Inter, Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.82)">
        ${subtitle}
      </text>
    </svg>
  `);

  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

export function createAvatarPlaceholder(locale = "zh") {
  return createSvgPlaceholder({
    title: locale === "zh" ? "Lin" : "Lin",
    subtitle: locale === "zh" ? "Creative Engineer" : "Creative Engineer",
    palette: ["#ef8354", "#1d5c63"],
    ratio: "860 960"
  });
}

export function createPhotoPlaceholder(locale = "zh") {
  return createSvgPlaceholder({
    title: locale === "zh" ? "Field Notes" : "Field Notes",
    subtitle: locale === "zh" ? "Design + Code + Product" : "Design + Code + Product",
    palette: ["#264653", "#2a9d8f"],
    ratio: "900 1080"
  });
}

export function waitForAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createElementFromHTML(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function updateLiveRegion(message, region = document.getElementById("live-region")) {
  if (!region) {
    return;
  }

  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = message;
  }, 40);
}

export function applyMagneticEffect(root = document) {
  const buttons = root.querySelectorAll("[data-magnetic]");

  buttons.forEach((button) => {
    const handleMove = (event) => {
      const rect = button.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${offsetX * 0.12}px, ${offsetY * 0.12}px)`;
    };

    const reset = () => {
      button.style.transform = "";
    };

    button.addEventListener("mousemove", handleMove);
    button.addEventListener("mouseleave", reset);
    button.addEventListener("blur", reset);
  });
}
