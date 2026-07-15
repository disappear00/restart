import { createBackToTop } from "./components/backToTop.js";
import { createCursor } from "./components/cursor.js";
import { createHeader, createMobileMenu } from "./components/header.js";
import { createModalController } from "./components/modal.js";
import { createToastManager } from "./components/toast.js";
import { initializeI18n, onLocaleChange, t } from "./i18n.js";
import { createRouter } from "./router.js";
import { initializeTheme } from "./theme.js";

const headerRoot = document.getElementById("site-header");
const mobileMenuRoot = document.getElementById("mobile-menu");
const appRoot = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-region");
const chatbotRoot = document.getElementById("chatbot-root");

async function bootstrap() {
  await initializeI18n();
  initializeTheme();

  const toastManager = createToastManager(toastRoot);
  const modalController = createModalController(modalRoot, t);
  const header = createHeader(headerRoot, () => {
    mobileMenu.close();
  });
  const mobileMenu = createMobileMenu(mobileMenuRoot, (routeId) => router.navigateTo(routeId));
  const router = createRouter({
    appRoot,
    modalController,
    toastManager,
    chatbotRoot,
    onRouteChange(routeId) {
      renderChrome(routeId);
    }
  });

  function renderChrome(routeId) {
    header.render(routeId);
    mobileMenu.render(routeId);
    document.querySelector("[data-i18n='footer.note']").textContent = t("footer.note");
    document.getElementById("footer-year").textContent = new Date().getFullYear();

    const hamburger = headerRoot.querySelector(".hamburger");
    hamburger?.addEventListener("click", () => {
      const expanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!expanded));

      if (expanded) {
        mobileMenu.close();
      } else {
        mobileMenu.open();
      }
    });
  }

  createBackToTop(document.getElementById("back-to-top"));
  createCursor();

  onLocaleChange(() => {
    renderChrome(router.getCurrentRoute());
    router.rerenderCurrent();
  });

  await router.start();
  renderChrome(router.getCurrentRoute());

  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* Service worker is progressive enhancement only. */
    });
  }
}

bootstrap();
