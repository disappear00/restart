import { createElementFromHTML, updateLiveRegion } from "../utils.js";

export function createModalController(root, t) {
  let shell = null;
  let cleanup = null;

  function closeModal() {
    if (!shell) {
      return;
    }

    shell.classList.remove("is-open");
    document.body.style.removeProperty("overflow");

    // The animated elements live inside the shell, so a timeout is more reliable than
    // waiting for a transition event on the wrapper itself.
    window.setTimeout(() => {
      cleanup?.();
      cleanup = null;
      shell?.remove();
      shell = null;
      updateLiveRegion(t("common.close"));
    }, 320);
  }

  function openModal({ title, content, onMount }) {
    if (shell) {
      cleanup?.();
      shell.remove();
      shell = null;
    }

    shell = createElementFromHTML(`
      <div class="modal-shell" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="modal-backdrop" data-modal-close></div>
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="button-row" style="justify-content: space-between; align-items: center;">
              <h3>${title}</h3>
              <button class="icon-button" type="button" aria-label="${t("common.close")}" data-modal-close>×</button>
            </div>
          </div>
          <div class="modal-body"></div>
        </div>
      </div>
    `);

    const body = shell.querySelector(".modal-body");
    body.append(content);
    root.append(shell);
    document.body.style.overflow = "hidden";

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    shell.addEventListener("click", (event) => {
      if (event.target instanceof HTMLElement && event.target.hasAttribute("data-modal-close")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", handleKeydown);
    cleanup = () => document.removeEventListener("keydown", handleKeydown);
    onMount?.(body, closeModal);

    requestAnimationFrame(() => shell?.classList.add("is-open"));
    updateLiveRegion(title);
  }

  return {
    openModal,
    closeModal
  };
}
