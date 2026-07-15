import { initializeLazyMedia } from "../components/lazyMedia.js";
import { createPhotoPlaceholder, throttle } from "../utils.js";

const contentByLocale = {
  zh: {
    eyebrow: "About",
    title: "把设计、工程和产品沟通放到同一张桌子上。",
    intro: "我习惯在项目早期把愿景、风险和体验语言一起梳理清楚。这样后面的每个选择，无论是视觉风格、信息架构还是实现路径，都会更稳。",
    overlay: "偏好在复杂约束中找清晰表达。",
    accordion: [
      {
        id: "principles",
        title: "工作原则",
        body: "我会优先把问题建模清楚，再决定页面结构和实现颗粒度。好的界面不是展示能力，而是降低理解成本。"
      },
      {
        id: "collaboration",
        title: "协作方式",
        body: "偏好与产品、设计、研发并行工作，而不是等上游全部完成再接手。这样可以更早发现风险，也更容易让方案真正落地。"
      },
      {
        id: "craft",
        title: "交付标准",
        body: "我会同时关注感知性能、无障碍、边界状态和后续维护。如果一个方案只在演示里成立，我不会把它当作完成。"
      }
    ],
    timelineTitle: "经历时间线",
    timeline: [
      { period: "2016 - 2019", title: "交互设计师", org: "产品设计咨询团队", body: "负责企业产品的流程梳理、后台体验和设计规范建设。" },
      { period: "2019 - 2022", title: "资深产品设计", org: "数据平台团队", body: "推动复杂分析平台的界面重构，并把设计系统推进到研发流程。" },
      { period: "2022 - 2024", title: "创意工程方向独立合作", org: "跨行业客户", body: "同时处理品牌叙事、动态体验与前端实现，交付高保真原型与正式网站。" },
      { period: "2024 - 至今", title: "体验系统负责人", org: "AI 产品与体验实验室", body: "聚焦原生 Web 交互、系统级视觉语言与更高效的设计工程协作模式。" }
    ],
    skillsTitle: "能力图谱",
    skillsBody: "我把“会做什么”拆成几类能力：系统思考、视觉语言、前端实现、协作推进和内容表达。对我来说，真正重要的是这些能力如何组合，而不是单点技术分数。",
    skills: [
      { label: "Interaction Design", level: 0.94 },
      { label: "Front-end Craft", level: 0.88 },
      { label: "Design Systems", level: 0.9 },
      { label: "Product Framing", level: 0.86 },
      { label: "Narrative Visuals", level: 0.82 }
    ]
  },
  en: {
    eyebrow: "About",
    title: "Bringing design, engineering, and product thinking into the same room.",
    intro: "I prefer to clarify vision, risks, and interface language early. That makes later decisions around style, information architecture, and implementation much steadier.",
    overlay: "I like finding clarity inside complex constraints.",
    accordion: [
      {
        id: "principles",
        title: "Working principles",
        body: "I model the problem first, then shape the interface and implementation grain. A strong interface should reduce interpretation cost, not showcase decorative cleverness."
      },
      {
        id: "collaboration",
        title: "Collaboration style",
        body: "I work best alongside product, design, and engineering instead of waiting for upstream handoff. That exposes risks earlier and improves delivery quality."
      },
      {
        id: "craft",
        title: "Delivery bar",
        body: "I pay attention to perceived performance, accessibility, boundary states, and long-term maintainability. If an idea only works in the demo, I do not consider it done."
      }
    ],
    timelineTitle: "Timeline",
    timeline: [
      { period: "2016 - 2019", title: "Interaction Designer", org: "Product Design Consultancy", body: "Focused on enterprise workflows, back-office UX, and the foundations of reusable design systems." },
      { period: "2019 - 2022", title: "Senior Product Designer", org: "Data Platform Team", body: "Led interface restructuring for analytics products and pushed system thinking into implementation workflows." },
      { period: "2022 - 2024", title: "Independent Creative Engineer", org: "Cross-industry clients", body: "Delivered brand storytelling, motion-led interfaces, and production-grade front-end builds." },
      { period: "2024 - Now", title: "Experience Systems Lead", org: "AI Product Studio", body: "Exploring native web interaction, visual systems, and tighter collaboration between design and engineering." }
    ],
    skillsTitle: "Capability map",
    skillsBody: "I break capability into systems thinking, visual language, front-end craft, collaboration, and narrative. What matters is how these capabilities work together, not isolated scores.",
    skills: [
      { label: "Interaction Design", level: 0.94 },
      { label: "Front-end Craft", level: 0.88 },
      { label: "Design Systems", level: 0.9 },
      { label: "Product Framing", level: 0.86 },
      { label: "Narrative Visuals", level: 0.82 }
    ]
  }
};

export const meta = {
  css: ["./styles/routes/about.css"]
};

export default function createAboutRoute({ locale, state, patchState }) {
  const copy = contentByLocale[locale];
  const openAccordions = new Set(state.openAccordions ?? ["principles"]);
  const element = document.createElement("div");
  element.innerHTML = `
    <section class="page-section">
      <div class="page-section">
        <span class="section-eyebrow">${copy.eyebrow}</span>
        <h2>${copy.title}</h2>
        <p>${copy.intro}</p>

        <div class="about-intro">
          <article class="surface-card parallax-photo" data-parallax-shell>
            <div class="lazy-media" data-lazy-media>
              <img data-src="${createPhotoPlaceholder(locale)}" alt="${locale === "zh" ? "个人工作照占位图，展示设计与代码融合的工作氛围" : "Placeholder portrait illustrating a hybrid design and code workflow"}" />
            </div>
            <div class="parallax-overlay">${copy.overlay}</div>
          </article>

          <div class="accordion-grid">
            ${copy.accordion
              .map(
                (item) => `
                  <article class="surface-card accordion-item ${openAccordions.has(item.id) ? "is-open" : ""}" data-accordion-item="${item.id}">
                    <button class="accordion-trigger" type="button" aria-expanded="${openAccordions.has(item.id)}" aria-controls="panel-${item.id}">
                      <span>${item.title}</span>
                      <span aria-hidden="true">${openAccordions.has(item.id) ? "−" : "+"}</span>
                    </button>
                    <div class="accordion-panel" id="panel-${item.id}">
                      <div><p>${item.body}</p></div>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="page-section">
        <span class="section-eyebrow">${copy.timelineTitle}</span>
        <div class="timeline">
          ${copy.timeline
            .map(
              (item) => `
                <article class="timeline-item" data-reveal>
                  <div class="surface-card timeline-card">
                    <div class="timeline-meta">
                      <span class="pill-label">${item.period}</span>
                      <span>${item.org}</span>
                    </div>
                    <h4>${item.title}</h4>
                    <p>${item.body}</p>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="page-section skills-shell">
        <article class="surface-card skills-copy-card">
          <span class="section-eyebrow">${copy.skillsTitle}</span>
          <h3>${copy.skillsTitle}</h3>
          <p>${copy.skillsBody}</p>
        </article>

        <article class="surface-card skills-chart-card skills-chart" data-skills-chart>
          <svg viewBox="0 0 500 320" role="img" aria-label="${copy.skillsTitle}">
            <line x1="60" y1="36" x2="60" y2="286" stroke="currentColor" opacity="0.18"></line>
            <line x1="60" y1="286" x2="470" y2="286" stroke="currentColor" opacity="0.18"></line>
            ${copy.skills
              .map(
                (skill, index) => `
                  <text x="60" y="${66 + index * 48}" fill="currentColor" font-size="16">${skill.label}</text>
                `
              )
              .join("")}
          </svg>
          <div class="skills-bars">
            ${copy.skills
              .map(
                (skill) => `
                  <div class="skill-row">
                    <div class="button-row" style="justify-content: space-between;">
                      <span>${skill.label}</span>
                      <strong>${Math.round(skill.level * 100)}%</strong>
                    </div>
                    <div class="skill-track">
                      <div class="skill-fill" style="--skill-level:${skill.level}"></div>
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      </div>
    </section>
  `;

  let cleanupLazy = () => {};
  let revealObserver = null;
  let parallaxHandler = () => {};

  return {
    el: element,
    onMount() {
      cleanupLazy = initializeLazyMedia(element);

      element.querySelectorAll("[data-accordion-item]").forEach((item) => {
        const button = item.querySelector(".accordion-trigger");
        button.addEventListener("click", () => {
          const id = item.dataset.accordionItem;
          const expanded = item.classList.toggle("is-open");
          button.setAttribute("aria-expanded", String(expanded));
          button.querySelector("span:last-child").textContent = expanded ? "−" : "+";

          if (expanded) {
            openAccordions.add(id);
          } else {
            openAccordions.delete(id);
          }

          patchState({ openAccordions: [...openAccordions] });
        });
      });

      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
            }
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -20% 0px" }
      );

      element.querySelectorAll("[data-reveal], [data-skills-chart]").forEach((target) => revealObserver.observe(target));

      const parallaxShell = element.querySelector("[data-parallax-shell]");
      const image = parallaxShell.querySelector("img");
      parallaxHandler = throttle(() => {
        const rect = parallaxShell.getBoundingClientRect();
        const distance = rect.top - window.innerHeight * 0.5;
        image.style.setProperty("--parallax-y", `${distance * -0.08}px`);
      }, 30);

      window.addEventListener("scroll", parallaxHandler, { passive: true });
      parallaxHandler();
    },
    onUnmount() {
      cleanupLazy();
      revealObserver?.disconnect();
      window.removeEventListener("scroll", parallaxHandler);
    },
    captureState() {
      return {
        openAccordions: [...openAccordions]
      };
    }
  };
}
