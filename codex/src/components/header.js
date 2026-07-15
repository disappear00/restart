import { getLocale, t, toggleLocale } from "../i18n.js";
import { toggleTheme } from "../theme.js";
import { applyMagneticEffect, throttle } from "../utils.js";

const navItems = [
  { id: "home", href: "#/home", labelKey: "meta.home" },
  { id: "about", href: "#/about", labelKey: "meta.about" },
  { id: "projects", href: "#/projects", labelKey: "meta.projects" },
  { id: "contact", href: "#/contact", labelKey: "meta.contact" }
];

export function createHeader(root, onNavigate) {
  const render = (currentRoute = "home") => {
    const locale = getLocale();
    root.innerHTML = `
      <div class="nav-inner">
        <a class="nav-brand" href="#/home" data-route-link="home">
          <span class="nav-brand-mark">L</span>
          <span>Lin Portfolio Lab</span>
        </a>

        <nav class="nav-links" aria-label="${locale === "zh" ? "主导航" : "Primary"}">
          ${navItems
            .map(
              (item) => `
                <a href="${item.href}" data-route-link="${item.id}" aria-current="${currentRoute === item.id ? "page" : "false"}">
                  ${t(item.labelKey)}
                </a>
              `
            )
            .join("")}
        </nav>

        <div class="nav-actions">
          <button class="desktop-only" type="button" data-theme-toggle data-magnetic aria-label="${t("nav.theme")}">☼</button>
          <button class="desktop-only" type="button" data-locale-toggle data-magnetic aria-label="${t("nav.locale")}">${locale === "zh" ? "EN" : "中"}</button>
          <a class="primary-button desktop-only" href="#/projects" data-route-link="projects" data-magnetic>${t("nav.cta")}</a>
          <button class="hamburger icon-button" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="${t("nav.menu")}">
            <span class="hamburger-lines"></span>
          </button>
        </div>
      </div>
    `;

    root.querySelectorAll("[data-route-link]").forEach((link) => {
      link.addEventListener("click", () => {
        onNavigate(link.getAttribute("data-route-link"));
      });
    });

    root.querySelector("[data-theme-toggle]")?.addEventListener("click", toggleTheme);
    root.querySelector("[data-locale-toggle]")?.addEventListener("click", toggleLocale);
    applyMagneticEffect(root);
  };

  const updateScrolled = throttle(() => {
    root.classList.toggle("is-scrolled", window.scrollY > 20);
  }, 60);

  window.addEventListener("scroll", updateScrolled, { passive: true });
  updateScrolled();

  return { render };
}

export function createMobileMenu(root, navigateTo) {
  function render(currentRoute = "home") {
    const locale = getLocale();
    root.innerHTML = `
      ${navItems
        .map(
          (item) => `
            <a class="surface-card" href="${item.href}" data-mobile-route="${item.id}" aria-current="${currentRoute === item.id ? "page" : "false"}">
              ${t(item.labelKey)}
            </a>
          `
        )
        .join("")}
      <button class="surface-card ghost-button" type="button" data-mobile-theme>${t("nav.theme")}</button>
      <button class="surface-card ghost-button" type="button" data-mobile-locale>${t("nav.locale")}</button>
    `;

    root.querySelectorAll("[data-mobile-route]").forEach((link) => {
      link.addEventListener("click", () => {
        close();
        navigateTo(link.getAttribute("data-mobile-route"));
      });
    });

    root.querySelector("[data-mobile-theme]")?.addEventListener("click", toggleTheme);
    root.querySelector("[data-mobile-locale]")?.addEventListener("click", toggleLocale);
  }

  function open() {
    document.body.classList.add("menu-open");
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
  }

  function close() {
    document.body.classList.remove("menu-open");
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
  }

  return { render, open, close };
}
