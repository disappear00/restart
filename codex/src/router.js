import { getLocale, t } from "./i18n.js";
import { getRouteState, patchRouteState } from "./state.js";
import { sleep } from "./utils.js";

const routeLoaders = {
  home: () => import("./routes/home.js"),
  about: () => import("./routes/about.js"),
  projects: () => import("./routes/projects.js"),
  contact: () => import("./routes/contact.js")
};

const loadedStyles = new Set();

function parseRoute() {
  const route = window.location.hash.replace(/^#\/?/, "") || "home";
  return routeLoaders[route] ? route : "home";
}

async function ensureStyles(paths = []) {
  await Promise.all(
    paths.map((path) => {
      if (loadedStyles.has(path)) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = path;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.append(link);
        loadedStyles.add(path);
      });
    })
  );
}

export function createRouter({ appRoot, modalController, toastManager, chatbotRoot, onRouteChange }) {
  const stage = document.createElement("div");
  stage.className = "route-stage";
  appRoot.replaceChildren(stage);

  let current = null;
  let navigationToken = 0;

  async function renderRoute({ force = false } = {}) {
    const nextRouteId = parseRoute();

    if (!force && current?.id === nextRouteId) {
      return;
    }

    if (current) {
      patchRouteState(current.id, {
        ...(current.instance.captureState?.() ?? {}),
        scrollY: window.scrollY
      });
    }

    const token = ++navigationToken;
    const routeModule = await routeLoaders[nextRouteId]();
    await ensureStyles(routeModule.meta?.css);

    if (token !== navigationToken) {
      return;
    }

    const routeState = getRouteState(nextRouteId);

    // Each route is lazy-loaded as an ES module and can inject its own behavior,
    // while the router keeps cross-route concerns like scroll restoration centralized.
    const instance = routeModule.default({
      locale: getLocale(),
      t,
      modalController,
      toastManager,
      chatbotRoot,
      state: routeState,
      patchState: (nextState) => patchRouteState(nextRouteId, nextState)
    });

    const view = document.createElement("div");
    view.className = "route-view is-entering";
    view.dataset.route = nextRouteId;
    view.append(instance.el);
    stage.append(view);

    requestAnimationFrame(() => {
      view.classList.remove("is-entering");
      view.classList.add("is-visible");
    });

    instance.onMount?.();

    const previous = current;
    current = { id: nextRouteId, instance, view };
    onRouteChange?.(nextRouteId);

    window.scrollTo({ top: routeState.scrollY ?? 0, behavior: "auto" });
    document.title = `${t(`meta.${nextRouteId}`)} · ${t("meta.title")}`;

    if (previous) {
      previous.instance.onUnmount?.();
      previous.view.classList.add("is-leaving");
      await sleep(360);
      previous.view.remove();
    }
  }

  window.addEventListener("hashchange", () => {
    renderRoute();
  });

  return {
    async start() {
      if (!window.location.hash) {
        window.location.hash = "#/home";
        return;
      }

      await renderRoute({ force: true });
    },
    navigateTo(routeId) {
      const hash = `#/${routeId}`;
      if (window.location.hash === hash) {
        renderRoute({ force: true });
        return;
      }

      window.location.hash = hash;
    },
    rerenderCurrent() {
      renderRoute({ force: true });
    },
    getCurrentRoute() {
      return current?.id ?? parseRoute();
    }
  };
}
