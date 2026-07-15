import { clamp, throttle } from "../utils.js";

export function createBackToTop(button) {
  const circle = button.querySelector(".progress-value");
  const circumference = 126;

  const update = throttle(() => {
    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll <= 0 ? 0 : clamp(scrollTop / maxScroll, 0, 1);

    button.classList.toggle("is-visible", scrollTop > 500);
    circle.style.strokeDashoffset = `${circumference - progress * circumference}`;
    button.setAttribute("aria-label", `回到顶部，当前滚动 ${Math.round(progress * 100)}%`);
  }, 80);

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", update, { passive: true });
  update();
}
