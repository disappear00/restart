export function createToastManager(root) {
  return {
    push({ title, body, tone = "success", duration = 3000 }) {
      const toast = document.createElement("div");
      toast.className = `toast toast--${tone}`;
      toast.innerHTML = `
        <strong>${title}</strong>
        <p>${body}</p>
      `;

      root.appendChild(toast);

      window.setTimeout(() => {
        toast.classList.add("is-leaving");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
      }, duration);
    }
  };
}
