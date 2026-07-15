import { applyMagneticEffect } from "../utils.js";

const answers = {
  zh: {
    greeting: "你好，我是站内助手。你可以先点下面的常见问题。",
    faqs: [
      {
        question: "你主要做什么类型的项目？",
        answer: "我主要做高交互前端、数据产品界面，以及把设计系统真正推进到上线的产品体验工作。"
      },
      {
        question: "通常怎么合作？",
        answer: "我会先梳理目标与约束，再把视觉、交互、实现和可维护性统一成一条交付链路。"
      },
      {
        question: "支持远程合作吗？",
        answer: "支持。异步协作、设计评审、代码共创和阶段性交付都可以。"
      },
      {
        question: "可以多快开始？",
        answer: "短项目通常可以在一周内启动，复杂项目会先给出分阶段计划和关键风险。"
      }
    ]
  },
  en: {
    greeting: "Hi, I am the site assistant. Start with one of the quick questions below.",
    faqs: [
      {
        question: "What kind of work do you focus on?",
        answer: "Mostly interaction-heavy front-end systems, data products, and design systems that actually reach production."
      },
      {
        question: "How do you usually collaborate?",
        answer: "I align goals, constraints, visual direction, interaction logic, and implementation quality into one delivery path."
      },
      {
        question: "Do you work remotely?",
        answer: "Yes. Async collaboration, design reviews, code delivery, and staged milestones are all supported."
      },
      {
        question: "How fast can a project start?",
        answer: "Small scopes can usually start within a week. Larger scopes begin with phased planning and clear risk framing."
      }
    ]
  }
};

export function createChatbot(root, locale = "zh") {
  const copy = answers[locale];
  const shell = document.createElement("div");
  shell.className = "chatbot-shell";
  shell.innerHTML = `
    <div class="chatbot-panel">
      <strong>${locale === "zh" ? "快速问答" : "Quick Answers"}</strong>
      <div class="chat-log">
        <div class="chat-bubble chat-bubble--bot">${copy.greeting}</div>
      </div>
      <div class="faq-list"></div>
    </div>
    <button class="chatbot-launcher" type="button" aria-expanded="false" aria-label="${locale === "zh" ? "打开聊天窗口" : "Open chat"}">✦</button>
  `;

  root.replaceChildren(shell);

  const launcher = shell.querySelector(".chatbot-launcher");
  const log = shell.querySelector(".chat-log");
  const faqList = shell.querySelector(".faq-list");

  launcher.addEventListener("click", () => {
    const expanded = launcher.getAttribute("aria-expanded") === "true";
    launcher.setAttribute("aria-expanded", String(!expanded));
    shell.classList.toggle("is-open", !expanded);
  });

  copy.faqs.forEach((faq) => {
    const button = document.createElement("button");
    button.className = "ghost-button";
    button.type = "button";
    button.textContent = faq.question;
    button.addEventListener("click", () => {
      const user = document.createElement("div");
      user.className = "chat-bubble chat-bubble--user";
      user.textContent = faq.question;

      const bot = document.createElement("div");
      bot.className = "chat-bubble chat-bubble--bot";
      bot.textContent = faq.answer;

      log.append(user, bot);
      log.scrollTop = log.scrollHeight;
    });
    faqList.append(button);
  });

  applyMagneticEffect(shell);
}
