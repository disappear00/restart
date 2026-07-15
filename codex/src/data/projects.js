import { createSvgPlaceholder } from "../utils.js";

const baseProjects = [
  {
    id: "aurora",
    category: "frontend",
    palette: ["#264653", "#2a9d8f"],
    tech: ["WebGL", "Canvas", "Design Tokens"],
    span: 13,
    links: {
      github: "https://github.com/example/aurora",
      demo: "https://example.com/aurora"
    }
  },
  {
    id: "signal",
    category: "backend",
    palette: ["#1f6f78", "#f4a261"],
    tech: ["Node.js", "Queues", "Observability"],
    span: 11,
    links: {
      github: "https://github.com/example/signal",
      demo: "https://example.com/signal"
    }
  },
  {
    id: "atlas",
    category: "design",
    palette: ["#7f5539", "#ddb892"],
    tech: ["UX Systems", "Figma", "Accessibility"],
    span: 12,
    links: {
      github: "https://github.com/example/atlas",
      demo: "https://example.com/atlas"
    }
  },
  {
    id: "pulse",
    category: "frontend",
    palette: ["#003049", "#d62828"],
    tech: ["PWA", "Service Worker", "Offline First"],
    span: 10,
    links: {
      github: "https://github.com/example/pulse",
      demo: "https://example.com/pulse"
    }
  },
  {
    id: "terrain",
    category: "backend",
    palette: ["#283618", "#bc6c25"],
    tech: ["Python", "ETL", "Data Viz"],
    span: 12,
    links: {
      github: "https://github.com/example/terrain",
      demo: "https://example.com/terrain"
    }
  },
  {
    id: "lumen",
    category: "design",
    palette: ["#5f0f40", "#9a031e"],
    tech: ["Branding", "Motion", "Storytelling"],
    span: 11,
    links: {
      github: "https://github.com/example/lumen",
      demo: "https://example.com/lumen"
    }
  }
];

const localizedCopy = {
  zh: {
    aurora: {
      title: "Aurora Canvas",
      blurb: "将生成式视觉、实时交互和响应式排版融合到产品首页的沉浸体验。",
      challenge: "核心挑战是让大面积视觉层在中低端设备上依旧顺滑，因此我把每一帧的粒子更新与 hover 交互都限制在 transform 与 opacity 上，并把重绘范围锁在单独图层。",
      summary: "一个兼顾品牌表达与性能预算的交互式营销首屏。",
      details: ["动态渐变网格", "自定义着色感视觉", "无障碍动效降级"]
    },
    signal: {
      title: "Signal Ops",
      blurb: "面向运营团队的事件指挥台，把队列、告警和日志上下文合并到同一视图。",
      challenge: "为了让业务人员看懂链路状态，我把复杂的系统节点转换成任务语言，并把异常分层成可执行建议而不是原始堆栈。",
      summary: "一次把工程复杂度翻译成运营可见性的后台系统改造。",
      details: ["事件回放", "任务优先级编排", "异常归因面板"]
    },
    atlas: {
      title: "Atlas Design System",
      blurb: "为多产品线整理统一设计语言，覆盖颜色、组件、文案和交互动效。",
      challenge: "设计系统最难的不是做组件，而是做边界。我把通用层、品牌层和业务层拆清，避免系统过度抽象。",
      summary: "从视觉规范走向实际落地的一套产品语言系统。",
      details: ["组件规范", "多品牌映射", "设计开发对齐"]
    },
    pulse: {
      title: "Pulse Journal",
      blurb: "支持离线浏览与本地缓存的知识阅读应用，面向移动端深度阅读场景。",
      challenge: "我需要同时解决缓存一致性和阅读体验，因此把资源缓存与内容更新拆成不同策略，并设计了感知弱网状态的 UI。",
      summary: "一个把阅读流畅度和可靠性放在第一优先级的 PWA。",
      details: ["离线缓存", "阅读进度同步", "弱网提示"]
    },
    terrain: {
      title: "Terrain Analytics",
      blurb: "连接数据采集、清洗和地图可视化的地理分析工具。",
      challenge: "原始数据质量波动很大，我把数据校验、缺失修复和可视化警示串成统一流程，降低了误读风险。",
      summary: "把数据工程链路前移到产品界面的一次可视化实践。",
      details: ["地图叠层", "指标诊断", "ETL 状态透出"]
    },
    lumen: {
      title: "Lumen Studio",
      blurb: "为内容团队打造的品牌故事工作台，支持素材拼贴、叙事节奏和多端输出。",
      challenge: "我希望创意流程不被工具结构限制，因此采用模块化画布和叙事轨道，让编辑像搭积木一样组织内容。",
      summary: "将品牌叙事、视觉动效与生产效率揉合到一起的创意工具。",
      details: ["叙事时间线", "素材版本管理", "多端预览"]
    }
  },
  en: {
    aurora: {
      title: "Aurora Canvas",
      blurb: "A launch experience that blends generative visuals, responsive typography, and real-time interaction.",
      challenge: "The main challenge was sustaining smooth motion on mid-range devices, so every interactive layer was constrained to transform and opacity while keeping repaints inside isolated surfaces.",
      summary: "An immersive marketing hero tuned for both brand presence and performance budgets.",
      details: ["Animated mesh gradient", "Shader-like visual language", "Reduced-motion fallback"]
    },
    signal: {
      title: "Signal Ops",
      blurb: "An operational control room that merges queues, incidents, and logs into one shared view.",
      challenge: "I translated systems complexity into task language so non-engineers could act quickly, replacing stack traces with action-focused guidance.",
      summary: "A backend operations product that turns infrastructure state into human-readable workflows.",
      details: ["Event replay", "Priority orchestration", "Incident diagnosis"]
    },
    atlas: {
      title: "Atlas Design System",
      blurb: "A shared design language spanning color, components, copy, and motion across several product lines.",
      challenge: "The hard part was defining boundaries. I separated foundation, brand, and product layers so the system stayed reusable without becoming vague.",
      summary: "A design system built for delivery, not just documentation.",
      details: ["Component governance", "Brand mappings", "Design-dev alignment"]
    },
    pulse: {
      title: "Pulse Journal",
      blurb: "An offline-ready reading application optimized for deep mobile reading sessions.",
      challenge: "Caching consistency and reading comfort had to coexist, so I split update strategies by asset type and surfaced network state in the interface.",
      summary: "A PWA focused on reliability and reading flow first.",
      details: ["Offline cache", "Reading sync", "Low-bandwidth UI"]
    },
    terrain: {
      title: "Terrain Analytics",
      blurb: "A geospatial analytics tool that connects ingestion, cleaning, and map-based insight delivery.",
      challenge: "Source quality was inconsistent, so I made validation, repair, and warning layers visible throughout the product instead of hiding them in the pipeline.",
      summary: "A data product that exposes the health of the analytics chain instead of masking it.",
      details: ["Map overlays", "Metric diagnostics", "ETL visibility"]
    },
    lumen: {
      title: "Lumen Studio",
      blurb: "A storytelling workspace for content teams producing campaigns across formats and screens.",
      challenge: "Creative flow should not be dictated by tooling, so the canvas and narrative tracks were modularized to keep assembly fluid.",
      summary: "A content production workspace where narrative rhythm and tooling speed reinforce each other.",
      details: ["Story tracks", "Asset versions", "Multi-device previews"]
    }
  }
};

export function getProjects(locale = "zh") {
  return baseProjects.map((project) => {
    const copy = localizedCopy[locale][project.id];
    const images = [
      createSvgPlaceholder({
        title: copy.title,
        subtitle: copy.summary,
        palette: project.palette,
        ratio: "920 720"
      }),
      createSvgPlaceholder({
        title: copy.details[0],
        subtitle: project.tech.join(" · "),
        palette: [...project.palette].reverse(),
        ratio: "920 720"
      }),
      createSvgPlaceholder({
        title: copy.details[1],
        subtitle: copy.challenge.slice(0, 44),
        palette: [project.palette[0], "#f7f5ef"],
        ratio: "920 720",
        accent: "plain"
      })
    ];

    return {
      ...project,
      ...copy,
      images
    };
  });
}
