import { throttle } from "../utils.js";

export function createCursor() {
  if (window.matchMedia("(max-width: 767px)").matches) {
    return;
  }

  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");

  if (!dot || !ring) {
    return;
  }

  let ringX = 0;
  let ringY = 0;
  let targetX = 0;
  let targetY = 0;

  const updateHoverState = throttle((event) => {
    const interactive = event.target.closest("a, button, input, textarea, [role='button']");
    document.body.classList.toggle("cursor-hover", Boolean(interactive));
  }, 40);

  const animate = () => {
    ringX += (targetX - ringX) * 0.15;
    ringY += (targetY - ringY) * 0.15;
    dot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animate);
  };

  window.addEventListener("mousemove", (event) => {
    document.body.classList.add("cursor-active");
    targetX = event.clientX;
    targetY = event.clientY;
    updateHoverState(event);
  });

  window.addEventListener("mouseleave", () => document.body.classList.remove("cursor-active"));
  animate();
}
