import { createChatbot } from "../components/chatbot.js";
import { updateLiveRegion } from "../utils.js";

const socialIcons = {
  github:
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4a3.2 3.2 0 0 0-1.3-1.8c-1.1-.8.1-.8.1-.8a2.5 2.5 0 0 1 1.8 1.2 2.6 2.6 0 0 0 3.5 1 2.6 2.6 0 0 1 .8-1.6c-2.7-.3-5.4-1.3-5.4-5.9a4.7 4.7 0 0 1 1.2-3.2 4.3 4.3 0 0 1 .1-3.1s1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.2-1.5 3.3-1.2 3.3-1.2a4.3 4.3 0 0 1 .1 3.1 4.7 4.7 0 0 1 1.2 3.2c0 4.6-2.8 5.6-5.5 5.9a2.9 2.9 0 0 1 .8 2.2v3.2c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5A2.49 2.49 0 1 0 5 8.48 2.49 2.49 0 0 0 4.98 3.5ZM3 9h4v12H3Zm7 0h3.8v1.7h.1a4.1 4.1 0 0 1 3.7-2c4 0 4.8 2.6 4.8 6V21h-4v-5.5c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21h-4Z"/></svg>',
  twitter:
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.5 22H3.4l7.3-8.4L1 2h6.2l4.3 5.7L18.9 2Zm-1.1 18h1.7L6.2 3.9H4.3Z"/></svg>'
};

const copyByLocale = {
  zh: {
    eyebrow: "Contact",
    title: "如果你在筹划新的产品、品牌站点或复杂界面改造，可以从这里开始。",
    body: "我习惯先快速了解目标、受众和约束，再判断应该先做策略梳理、体验原型，还是直接进入高保真实现。",
    email: "邮箱",
    location: "协作方式",
    locationValue: "上海 / Remote First",
    formTitle: "发来一条消息",
    name: "姓名",
    subject: "主题",
    message: "消息内容",
    send: "发送消息",
    sending: "发送中",
    helper: "通常会在 24 小时内回复。想模拟失败提示，可以在主题或消息里输入 fail。",
    success: "消息已发送",
    successBody: "谢谢，你的需求已经进入待处理列表。",
    failure: "发送失败",
    failureBody: "这次模拟提交失败，请稍后重试。",
    errors: {
      required: "此项不能为空",
      email: "请输入有效邮箱地址"
    }
  },
  en: {
    eyebrow: "Contact",
    title: "If you are planning a new product, brand site, or a complex interface redesign, start here.",
    body: "I usually begin by understanding goals, audience, and constraints, then decide whether the next step is strategy framing, interactive prototyping, or a direct production build.",
    email: "Email",
    location: "Collaboration",
    locationValue: "Shanghai / Remote First",
    formTitle: "Send a message",
    name: "Name",
    subject: "Subject",
    message: "Message",
    send: "Send Message",
    sending: "Sending",
    helper: "Replies usually land within 24 hours. To simulate a failure state, include the word fail in the subject or message.",
    success: "Message sent",
    successBody: "Thanks. Your request has been queued for follow-up.",
    failure: "Submission failed",
    failureBody: "The simulated request failed this time. Please try again.",
    errors: {
      required: "This field is required",
      email: "Enter a valid email address"
    }
  }
};

export const meta = {
  css: ["./styles/routes/contact.css"]
};

function validateField(field, value, copy) {
  if (!value.trim()) {
    return copy.errors.required;
  }

  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return copy.errors.email;
  }

  return "";
}

export default function createContactRoute({ locale, state, patchState, toastManager, chatbotRoot }) {
  const copy = copyByLocale[locale];
  const formState = {
    name: state.name ?? "",
    email: state.email ?? "",
    subject: state.subject ?? "",
    message: state.message ?? ""
  };

  const element = document.createElement("div");
  element.innerHTML = `
    <section class="page-section">
      <div class="page-section contact-shell">
        <article class="surface-card contact-card">
          <span class="section-eyebrow">${copy.eyebrow}</span>
          <h2>${copy.title}</h2>
          <p>${copy.body}</p>

          <div class="contact-meta">
            <a class="surface-card contact-link inline-link" href="mailto:hello@linlab.dev">
              <span>${copy.email}</span>
              <strong>hello@linlab.dev</strong>
            </a>
            <div class="surface-card contact-link">
              <span>${copy.location}</span>
              <strong>${copy.locationValue}</strong>
            </div>
          </div>

          <div class="social-row">
            <a class="social-link" href="https://github.com/example" target="_blank" rel="noreferrer noopener">${socialIcons.github}<span>GitHub</span></a>
            <a class="social-link" href="https://linkedin.com/in/example" target="_blank" rel="noreferrer noopener">${socialIcons.linkedin}<span>LinkedIn</span></a>
            <a class="social-link" href="https://twitter.com/example" target="_blank" rel="noreferrer noopener">${socialIcons.twitter}<span>Twitter</span></a>
          </div>
        </article>

        <article class="surface-card contact-form-card">
          <h3>${copy.formTitle}</h3>
          <form class="contact-form" novalidate>
            <div class="form-field" data-field="name">
              <label for="contact-name">${copy.name}</label>
              <input id="contact-name" name="name" value="${formState.name}" autocomplete="name" />
              <span class="error-text" aria-live="polite"></span>
            </div>

            <div class="form-field" data-field="email">
              <label for="contact-email">${copy.email}</label>
              <input id="contact-email" name="email" type="email" value="${formState.email}" autocomplete="email" />
              <span class="error-text" aria-live="polite"></span>
            </div>

            <div class="form-field" data-field="subject">
              <label for="contact-subject">${copy.subject}</label>
              <input id="contact-subject" name="subject" value="${formState.subject}" />
              <span class="error-text" aria-live="polite"></span>
            </div>

            <div class="form-field" data-field="message">
              <label for="contact-message">${copy.message}</label>
              <textarea id="contact-message" name="message" rows="6">${formState.message}</textarea>
              <span class="error-text" aria-live="polite"></span>
            </div>

            <div class="button-row">
              <button class="primary-button" type="submit" data-submit-button>${copy.send}</button>
              <span class="helper-note">${copy.helper}</span>
            </div>
          </form>
        </article>
      </div>
    </section>
  `;

  const form = element.querySelector("form");
  const submitButton = element.querySelector("[data-submit-button]");

  function setError(fieldName, message) {
    const field = element.querySelector(`[data-field="${fieldName}"]`);
    field.classList.toggle("is-error", Boolean(message));
    field.querySelector(".error-text").textContent = message;
  }

  function syncState() {
    patchState(formState);
  }

  function validateSingle(fieldName) {
    const input = form.elements[fieldName];
    const error = validateField(fieldName, input.value, copy);
    setError(fieldName, error);
    return !error;
  }

  function validateAll() {
    return ["name", "email", "subject", "message"].every((fieldName) => validateSingle(fieldName));
  }

  return {
    el: element,
    onMount() {
      chatbotRoot.innerHTML = "";
      createChatbot(chatbotRoot, locale);

      ["name", "email", "subject", "message"].forEach((fieldName) => {
        form.elements[fieldName].addEventListener("input", (event) => {
          formState[fieldName] = event.target.value;
          syncState();
          validateSingle(fieldName);
        });
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateAll()) {
          updateLiveRegion(locale === "zh" ? "表单校验失败" : "Form validation failed");
          return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${copy.sending}`;

        await new Promise((resolve) => window.setTimeout(resolve, 1300));

        const shouldFail = `${formState.subject} ${formState.message}`.toLowerCase().includes("fail");

        if (shouldFail) {
          toastManager.push({
            title: copy.failure,
            body: copy.failureBody,
            tone: "error"
          });
        } else {
          toastManager.push({
            title: copy.success,
            body: copy.successBody,
            tone: "success"
          });
          form.reset();
          Object.keys(formState).forEach((key) => {
            formState[key] = "";
            setError(key, "");
          });
          syncState();
        }

        submitButton.disabled = false;
        submitButton.textContent = copy.send;
      });
    },
    onUnmount() {
      chatbotRoot.innerHTML = "";
    },
    captureState() {
      return formState;
    }
  };
}
