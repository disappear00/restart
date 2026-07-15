export function initializeLazyMedia(root = document) {
  const media = root.querySelectorAll("[data-lazy-media]");

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const wrapper = entry.target;
        const image = wrapper.querySelector("img[data-src]");

        if (image) {
          image.src = image.dataset.src;
          image.addEventListener(
            "load",
            () => {
              wrapper.classList.add("is-loaded");
            },
            { once: true }
          );
        }

        currentObserver.unobserve(wrapper);
      });
    },
    { rootMargin: "200px 0px" }
  );

  media.forEach((item) => observer.observe(item));

  return () => observer.disconnect();
}
