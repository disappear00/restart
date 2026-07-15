import { initializeLazyMedia } from "../components/lazyMedia.js";
import { getProjects } from "../data/projects.js";
import { applyMagneticEffect, createElementFromHTML, debounce, updateLiveRegion, waitForAnimationFrame } from "../utils.js";

const copyByLocale = {
  zh: {
    eyebrow: "Selected Work",
    title: "把系统能力做得可感知，也把细节做得值得停留。",
    body: "这里的项目覆盖前端体验、后台系统、设计系统与品牌叙事工具。筛选与搜索都带状态保存，返回这个页面时会恢复你之前的浏览位置与筛选条件。",
    filters: {
      all: "全部",
      frontend: "前端",
      backend: "后端",
      design: "设计"
    },
    search: "搜索项目、技术或关键词",
    empty: "没有匹配结果，试试切换分类或清空关键词。",
    stack: "详细技术栈",
    challenge: "技术挑战",
    highlights: "关键亮点"
  },
  en: {
    eyebrow: "Selected Work",
    title: "Making systems feel legible while keeping the details worth staying for.",
    body: "These projects span front-end experiences, back-office systems, design systems, and storytelling tools. Filter and search state are preserved when you leave and return.",
    filters: {
      all: "All",
      frontend: "Front-end",
      backend: "Back-end",
      design: "Design"
    },
    search: "Search projects, tech, or keywords",
    empty: "No results matched. Try another category or clear the query.",
    stack: "Detailed stack",
    challenge: "Technical challenge",
    highlights: "Highlights"
  }
};

export const meta = {
  css: ["./styles/routes/projects.css"]
};

function createProjectCard(project, copy) {
  const card = createElementFromHTML(`
    <article class="surface-card project-card" data-project-id="${project.id}" data-category="${project.category}">
      <div class="project-media lazy-media" data-lazy-media>
        <img data-src="${project.images[0]}" alt="${project.title}" />
      </div>
      <div class="project-overlay">
        <strong>${copy.stack}</strong>
        <p>${project.tech.join(" · ")}</p>
      </div>
      <div class="project-body">
        <div class="project-tags">
          ${project.tech.map((tag) => `<span class="pill-label">${tag}</span>`).join("")}
        </div>
        <div>
          <h4>${project.title}</h4>
          <p>${project.blurb}</p>
        </div>
        <div class="project-actions">
          <button class="primary-button" type="button" data-open-details>${copy.highlights}</button>
          <a class="ghost-button inline-link" href="${project.links.demo}" target="_blank" rel="noreferrer noopener">${copy.filters.all === "全部" ? "演示链接" : "Live Demo"}</a>
        </div>
      </div>
    </article>
  `);

  return card;
}

export default function createProjectsRoute({ locale, state, patchState, modalController, t }) {
  const copy = copyByLocale[locale];
  const projects = getProjects(locale);
  const currentState = {
    filter: state.filter ?? "all",
    query: state.query ?? ""
  };

  const element = document.createElement("div");
  element.innerHTML = `
    <section class="page-section">
      <div class="page-section">
        <div class="projects-hero">
          <span class="section-eyebrow">${copy.eyebrow}</span>
          <h2>${copy.title}</h2>
          <p>${copy.body}</p>
        </div>

        <div class="projects-toolbar">
          <div class="filters" role="toolbar" aria-label="${copy.eyebrow}">
            ${Object.entries(copy.filters)
              .map(
                ([key, label]) => `
                  <button class="filter-chip" type="button" data-filter="${key}" aria-pressed="${currentState.filter === key}">
                    ${label}
                  </button>
                `
              )
              .join("")}
          </div>

          <div class="projects-search">
            <label class="sr-only" for="project-search">${copy.search}</label>
            <input class="search-input" id="project-search" type="search" value="${currentState.query}" placeholder="${copy.search}" />
          </div>
        </div>

        <div class="masonry-grid" data-project-grid></div>
        <div class="surface-card project-empty" data-empty-state hidden>${copy.empty}</div>
      </div>
    </section>
  `;

  const grid = element.querySelector("[data-project-grid]");
  const emptyState = element.querySelector("[data-empty-state]");
  const cardMap = new Map();
  let cleanupLazy = () => {};
  let filterTicket = 0;

  function matches(project) {
    const query = currentState.query.trim().toLowerCase();
    const inCategory = currentState.filter === "all" || project.category === currentState.filter;
    const inSearch =
      !query ||
      [project.title, project.blurb, project.summary, project.challenge, project.tech.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return inCategory && inSearch;
  }

  function openProjectModal(project) {
    const modalContent = document.createElement("div");
    modalContent.className = "modal-project-grid";
    modalContent.innerHTML = `
      <div>
        <div class="carousel">
          <div class="carousel-track">
            ${project.images
              .map(
                (image, index) => `
                  <div class="carousel-slide">
                    <img src="${image}" alt="${project.title} ${index + 1}" />
                  </div>
                `
              )
              .join("")}
          </div>
          <div class="carousel-controls">
            <button class="icon-button" type="button" data-carousel-prev aria-label="${t("common.previous")}">←</button>
            <button class="icon-button" type="button" data-carousel-next aria-label="${t("common.next")}">→</button>
          </div>
        </div>
        <div class="carousel-dots">
          ${project.images
            .map(
              (_, index) => `
                <button class="carousel-dot ${index === 0 ? "is-active" : ""}" type="button" data-carousel-dot="${index}" aria-label="${index + 1}"></button>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="detail-list">
        <article class="surface-card">
          <h4>${copy.challenge}</h4>
          <p>${project.challenge}</p>
        </article>
        <article class="surface-card">
          <h4>${copy.highlights}</h4>
          <p>${project.summary}</p>
          <div class="tag-row" style="margin-top: 1rem;">
            ${project.details.map((item) => `<span class="chip">${item}</span>`).join("")}
          </div>
        </article>
        <div class="button-row">
          <a class="primary-button" href="${project.links.demo}" target="_blank" rel="noreferrer noopener">${t("common.demo")}</a>
          <a class="ghost-button" href="${project.links.github}" target="_blank" rel="noreferrer noopener">${t("common.source")}</a>
        </div>
      </div>
    `;

    modalController.openModal({
      title: project.title,
      content: modalContent,
      onMount() {
        const track = modalContent.querySelector(".carousel-track");
        const dots = [...modalContent.querySelectorAll("[data-carousel-dot]")];
        let activeIndex = 0;

        const renderSlide = (index) => {
          activeIndex = (index + project.images.length) % project.images.length;
          track.style.transform = `translateX(-${activeIndex * 100}%)`;
          dots.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === activeIndex));
        };

        modalContent.querySelector("[data-carousel-prev]").addEventListener("click", () => renderSlide(activeIndex - 1));
        modalContent.querySelector("[data-carousel-next]").addEventListener("click", () => renderSlide(activeIndex + 1));
        dots.forEach((dot) => {
          dot.addEventListener("click", () => renderSlide(Number(dot.dataset.carouselDot)));
        });
      }
    });
  }

  projects.forEach((project) => {
    const card = createProjectCard(project, copy);
    cardMap.set(project.id, card);
    grid.append(card);

    card.querySelector("[data-open-details]").addEventListener("click", () => openProjectModal(project));
  });

  async function applyFilters({ initial = false } = {}) {
    const ticket = ++filterTicket;
    const firstRects = new Map(
      [...cardMap.entries()].map(([id, card]) => [id, card.classList.contains("is-hidden") ? null : card.getBoundingClientRect()])
    );

    const visibleIds = [];
    const hiddenIds = [];

    projects.forEach((project) => {
      if (matches(project)) {
        visibleIds.push(project.id);
      } else {
        hiddenIds.push(project.id);
      }
    });

    if (initial) {
      cardMap.forEach((card, id) => card.classList.toggle("is-hidden", hiddenIds.includes(id)));
      emptyState.hidden = visibleIds.length !== 0;
      cleanupLazy();
      cleanupLazy = initializeLazyMedia(element);
      return;
    }

    // FLIP strategy:
    // 1. capture the old card positions,
    // 2. hide the filtered-out cards,
    // 3. let the grid settle,
    // 4. animate remaining cards from their old positions to the new ones.
    await Promise.all(
      hiddenIds.map(async (id) => {
        const card = cardMap.get(id);
        if (!card || card.classList.contains("is-hidden")) {
          return;
        }

        await card.animate(
          [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(0.92)" }
          ],
          { duration: 220, easing: "ease", fill: "forwards" }
        ).finished;
        card.classList.add("is-hidden");
      })
    );

    if (ticket !== filterTicket) {
      return;
    }

    visibleIds.forEach((id) => cardMap.get(id)?.classList.remove("is-hidden"));
    emptyState.hidden = visibleIds.length !== 0;

    await waitForAnimationFrame();
    await waitForAnimationFrame();

    visibleIds.forEach((id) => {
      const card = cardMap.get(id);
      const first = firstRects.get(id);
      const last = card.getBoundingClientRect();

      if (!first) {
        card.animate(
          [
            { opacity: 0, transform: "scale(0.92)" },
            { opacity: 1, transform: "scale(1)" }
          ],
          { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
        return;
      }

      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;

      card.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0, 0)" }
        ],
        { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    });

    cleanupLazy();
    cleanupLazy = initializeLazyMedia(element);
    updateLiveRegion(`${visibleIds.length} ${locale === "zh" ? "个项目可见" : "projects visible"}`);
  }

  const debouncedSearch = debounce((value) => {
    currentState.query = value;
    patchState(currentState);
    applyFilters();
  }, 300);

  return {
    el: element,
    onMount() {
      applyFilters({ initial: true });
      applyMagneticEffect(element);

      element.querySelectorAll("[data-filter]").forEach((button) => {
        button.addEventListener("click", () => {
          currentState.filter = button.dataset.filter;
          patchState(currentState);
          element.querySelectorAll("[data-filter]").forEach((chip) => {
            chip.setAttribute("aria-pressed", String(chip === button));
          });
          applyFilters();
        });
      });

      element.querySelector("#project-search").addEventListener("input", (event) => {
        debouncedSearch(event.target.value);
      });
    },
    onUnmount() {
      cleanupLazy();
    },
    captureState() {
      return currentState;
    }
  };
}
