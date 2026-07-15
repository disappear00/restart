import { initializeLazyMedia } from "../components/lazyMedia.js";
import { createAvatarPlaceholder, applyMagneticEffect, throttle, prefersReducedMotion } from "../utils.js";

const copyByLocale = {
  zh: {
    kicker: "交互设计师 / 创意工程师 / 产品合作者",
    title: "把视觉叙事、产品逻辑和前端实现接成一条顺滑的体验曲线。",
    lead: "我关注的不只是页面好看，而是信息如何出现、动作如何回应，以及系统在真实业务约束里是否依旧优雅、清晰、可维护。",
    slogans: ["设计与代码同频。", "为复杂系统做可感知界面。", "让体验带动理解与转化。"],
    ctaPrimary: "浏览项目集",
    ctaSecondary: "认识我",
    scroll: "向下探索",
    stats: [
      { value: "8+", label: "年跨职能产品经验" },
      { value: "32", label: "交付过的体验系统与项目" },
      { value: "4.9/5", label: "长期合作满意度" }
    ],
    featureTitle: "我如何工作",
    featureList: [
      "先把问题讲清，再决定界面和技术结构。",
      "优先设计用户感知到的反馈节奏，而不是堆砌视觉细节。",
      "把动效、性能、可访问性和后续维护一起纳入方案。"
    ],
    spotlightTitle: "当前关注方向",
    spotlights: [
      {
        title: "高信息密度界面",
        body: "为后台、数据和协作场景设计更清楚的层级与操作流。"
      },
      {
        title: "品牌化产品体验",
        body: "让品牌语气真正进入交互，而不是停留在视觉包装层。"
      }
    ]
  },
  en: {
    kicker: "Interaction Designer / Creative Engineer / Product Collaborator",
    title: "I connect visual storytelling, product logic, and front-end craft into one coherent experience arc.",
    lead: "The goal is not just a beautiful screen. It is how information arrives, how motion responds, and whether the system still feels clear and maintainable under real constraints.",
    slogans: ["Design and code in sync.", "Interfaces that make complexity legible.", "Experiences that move understanding and conversion."],
    ctaPrimary: "Explore Projects",
    ctaSecondary: "About Me",
    scroll: "Scroll to explore",
    stats: [
      { value: "8+", label: "Years in cross-functional product work" },
      { value: "32", label: "Experience systems and products shipped" },
      { value: "4.9/5", label: "Long-term collaboration satisfaction" }
    ],
    featureTitle: "How I work",
    featureList: [
      "Clarify the problem first, then shape the interface and technical structure.",
      "Design around the feedback rhythm users actually feel, not decorative complexity.",
      "Treat motion, performance, accessibility, and maintainability as one system."
    ],
    spotlightTitle: "Current focus",
    spotlights: [
      {
        title: "Dense information interfaces",
        body: "Designing clearer hierarchy and action flows for operations, data, and collaboration tools."
      },
      {
        title: "Branded product experiences",
        body: "Bringing brand tone into interaction logic, not leaving it as surface decoration."
      }
    ]
  }
};

function createParticleField(canvas) {
  const context = canvas.getContext("2d");
  const reducedMotion = prefersReducedMotion();
  const particles = Array.from({ length: 70 }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0008,
    vy: (Math.random() - 0.5) * 0.0008,
    size: Math.random() * 2.8 + 1.5
  }));

  const pointer = { x: 0.5, y: 0.5, active: false };
  let frameId = 0;
  let width = 0;
  let height = 0;

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0 || particle.x > 1) {
        particle.vx *= -1;
      }

      if (particle.y < 0 || particle.y > 1) {
        particle.vy *= -1;
      }

      if (pointer.active && !reducedMotion) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 0.18) {
          const force = (0.18 - distance) * 0.0028;
          particle.vx += dx * force;
          particle.vy += dy * force;
        }
      }

      particle.vx *= 0.992;
      particle.vy *= 0.992;

      const x = particle.x * width;
      const y = particle.y * height;
      context.beginPath();
      context.fillStyle = "rgba(255,255,255,0.36)";
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fill();
    });

    for (let index = 0; index < particles.length; index += 1) {
      for (let inner = index + 1; inner < particles.length; inner += 1) {
        const a = particles[index];
        const b = particles[inner];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 0.16) {
          context.strokeStyle = `rgba(255,255,255,${(0.16 - distance) * 1.5})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(a.x * width, a.y * height);
          context.lineTo(b.x * width, b.y * height);
          context.stroke();
        }
      }
    }

    frameId = requestAnimationFrame(draw);
  };

  const handlePointerMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width;
    pointer.y = (event.clientY - rect.top) / rect.height;
    pointer.active = true;
  };

  resize();
  draw();

  const throttledResize = throttle(resize, 120);
  window.addEventListener("resize", throttledResize);
  canvas.addEventListener("mousemove", handlePointerMove);
  canvas.addEventListener("mouseleave", () => {
    pointer.active = false;
  });

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener("resize", throttledResize);
  };
}

function createTypewriter(target, phrases) {
  let phraseIndex = 0;
  let characterIndex = 0;
  let isDeleting = false;
  let timeoutId = 0;

  const tick = () => {
    const current = phrases[phraseIndex];
    target.textContent = current.slice(0, characterIndex);

    if (!isDeleting && characterIndex < current.length) {
      characterIndex += 1;
      timeoutId = window.setTimeout(tick, 78);
      return;
    }

    if (!isDeleting && characterIndex === current.length) {
      isDeleting = true;
      timeoutId = window.setTimeout(tick, 1200);
      return;
    }

    if (isDeleting && characterIndex > 0) {
      characterIndex -= 1;
      timeoutId = window.setTimeout(tick, 34);
      return;
    }

    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    timeoutId = window.setTimeout(tick, 260);
  };

  tick();

  return () => window.clearTimeout(timeoutId);
}

export const meta = {
  css: ["./styles/routes/home.css"]
};

export default function createHomeRoute({ locale }) {
  const copy = copyByLocale[locale];
  const element = document.createElement("div");
  element.innerHTML = `
    <section class="hero">
      <div class="hero-mesh" aria-hidden="true"></div>
      <canvas class="hero-canvas" aria-hidden="true"></canvas>

      <div class="hero-layout">
        <div class="hero-copy">
          <div class="hero-kicker">${copy.kicker}</div>
          <h1>${copy.title}</h1>
          <p class="hero-lead">${copy.lead}</p>
          <div class="typewriter" aria-live="polite">
            <span data-typewriter></span>
            <span class="typewriter-cursor" aria-hidden="true"></span>
          </div>
          <div class="button-row">
            <a class="primary-button link-underline" href="#/projects" data-magnetic>${copy.ctaPrimary}</a>
            <a class="ghost-button link-underline" href="#/about" data-magnetic>${copy.ctaSecondary}</a>
          </div>
        </div>

        <div class="hero-avatar-panel">
          <div class="avatar-card" data-avatar-card>
            <div class="avatar-image lazy-media" data-lazy-media>
              <img data-src="${createAvatarPlaceholder(locale)}" alt="${locale === "zh" ? "个人头像占位图，展示创意工程师形象" : "Portrait placeholder representing the creative engineer"}" />
            </div>
            <div class="avatar-float avatar-float--left">
              <strong>${locale === "zh" ? "交互动效" : "Motion Systems"}</strong>
              <span>${locale === "zh" ? "感知优先" : "Perceived first"}</span>
            </div>
            <div class="avatar-float avatar-float--right">
              <strong>${locale === "zh" ? "可维护实现" : "Buildable Craft"}</strong>
              <span>${locale === "zh" ? "结构清晰" : "Structured delivery"}</span>
            </div>
          </div>
        </div>
      </div>

      <button class="scroll-indicator" type="button" data-scroll-next aria-label="${copy.scroll}">
        <span>${copy.scroll}</span>
        <span aria-hidden="true"></span>
      </button>
    </section>

    <section class="page-section" id="home-overview">
      <div class="page-section eyebrow-grid">
        <div>
          <span class="section-eyebrow">${locale === "zh" ? "Studio Pulse" : "Studio Pulse"}</span>
          <div class="stats-grid">
            ${copy.stats
              .map(
                (item) => `
                  <article class="surface-card stat-card">
                    <strong>${item.value}</strong>
                    <span>${item.label}</span>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>

        <div class="home-highlights">
          <article class="surface-card home-feature-card">
            <h3>${copy.featureTitle}</h3>
            <ul>
              ${copy.featureList.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </article>

          <div class="spotlight-grid">
            ${copy.spotlights
              .map(
                (item) => `
                  <article class="surface-card home-feature-card">
                    <h4>${item.title}</h4>
                    <p>${item.body}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
  `;

  let cleanupLazy = () => {};
  let cleanupParticles = () => {};
  let cleanupTypewriter = () => {};

  return {
    el: element,
    onMount() {
      cleanupLazy = initializeLazyMedia(element);
      cleanupParticles = createParticleField(element.querySelector(".hero-canvas"));
      cleanupTypewriter = createTypewriter(element.querySelector("[data-typewriter]"), copy.slogans);
      applyMagneticEffect(element);

      const avatarCard = element.querySelector("[data-avatar-card]");
      // The tilt effect only manipulates transforms, which keeps the motion smooth
      // and avoids layout thrashing while still feeling responsive to the pointer.
      avatarCard.addEventListener("mousemove", (event) => {
        if (prefersReducedMotion()) {
          return;
        }

        const rect = avatarCard.getBoundingClientRect();
        const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -12;
        const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
        avatarCard.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      avatarCard.addEventListener("mouseleave", () => {
        avatarCard.style.transform = "";
      });

      element.querySelector("[data-scroll-next]").addEventListener("click", () => {
        element.querySelector("#home-overview")?.scrollIntoView({ behavior: "smooth" });
      });
    },
    onUnmount() {
      cleanupLazy();
      cleanupParticles();
      cleanupTypewriter();
    },
    captureState() {
      return {};
    }
  };
}
