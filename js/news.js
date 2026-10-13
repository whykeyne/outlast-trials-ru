"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://outlast-trials-ru-api.eresenkonikita7.workers.dev";

  const newsGrid = document.getElementById("newsGrid");
  const newsCounter = document.getElementById("newsCounter");
  const newsEmpty = document.getElementById("newsEmpty");
  const filterButtons = document.querySelectorAll("[data-filter]");

  if (!newsGrid) return;

  let allPosts = [];
  let activeFilter = "all";

  const categoryInfo = {
    news: {
      label: "НОВОСТЬ",
      className: "category-news"
    },
    events: {
      label: "СОБЫТИЕ",
      className: "category-event"
    },
    important: {
      label: "ВАЖНОЕ",
      className: "category-important"
    }
  };

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  function formatDate(value) {
    if (!value) return "";

    const normalized = value.includes("T")
      ? value
      : value.replace(" ", "T") + "Z";

    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function renderPosts() {
    newsGrid.replaceChildren();

    const visiblePosts = allPosts.filter(post =>
      activeFilter === "all" || post.category === activeFilter
    );

    if (newsCounter) {
      newsCounter.textContent = `ЗАПИСИ: ${String(visiblePosts.length).padStart(2, "0")}`;
    }

    if (newsEmpty) {
      newsEmpty.hidden = visiblePosts.length !== 0;
    }

    if (visiblePosts.length === 0) {
      newsGrid.hidden = true;
      return;
    }

    newsGrid.hidden = false;

    visiblePosts.forEach((post, index) => {
      const info = categoryInfo[post.category] || categoryInfo.news;
      const card = createElement("article", "news-card");

      const top = createElement("div", "news-card-top");
      top.append(
        createElement("span", `news-category ${info.className}`, info.label),
        createElement(
          "span",
          "news-card-code",
          `OT / ${String(index + 1).padStart(3, "0")}`
        )
      );

      card.append(top);

      if (post.image_url) {
        try {
          const imageUrl = new URL(post.image_url);

          if (["https:", "http:"].includes(imageUrl.protocol)) {
            const image = createElement("img", "news-card-art");
            image.src = imageUrl.href;
            image.alt = post.title || "Изображение публикации";
            image.loading = "lazy";
            image.style.width = "100%";
            image.style.height = "175px";
            image.style.objectFit = "cover";
            image.addEventListener("error", () => image.remove());
            card.append(image);
          }
        } catch {
          // Некорректный URL изображения пропускаем.
        }
      }

      const content = createElement("div", "news-card-content");
      const dateText = formatDate(post.created_at);

      if (dateText) {
        content.append(createElement("p", "news-date", dateText));
      }

      content.append(
        createElement("h3", "", post.title || "Без названия"),
        createElement("p", "", post.summary || "")
      );

      if (post.content) {
        const details = createElement("details", "news-details");
        const summary = createElement("summary", "news-details-toggle", "Читать полностью");
        const fullText = createElement("p", "news-full-content", post.content);

        details.append(summary, fullText);
        content.append(details);
      }

      const footer = createElement("div", "news-card-footer");
      footer.append(
        createElement("span", "", "OUTLAST TRIALS [RU]"),
        createElement("span", "", "///")
      );

      content.append(footer);
      card.append(content);
      newsGrid.append(card);
    });
  }

  function setActiveFilter(button) {
    activeFilter = button.dataset.filter || "all";

    filterButtons.forEach(item => {
      const selected = item === button;

      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

    renderPosts();
  }

  filterButtons.forEach(button => {
    button.addEventListener("click", () => setActiveFilter(button));
  });

  async function loadNews() {
    newsGrid.hidden = false;
    newsGrid.replaceChildren(
      createElement("p", "news-load-message", "ЗАГРУЗКА ПУБЛИКАЦИЙ...")
    );

    try {
      const response = await fetch(`${API_URL}/posts`, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const data = await response.json();

      if (data.ok !== true || !Array.isArray(data.posts)) {
        throw new Error("Некорректный ответ сервера.");
      }

      allPosts = data.posts;
      renderPosts();
    } catch (error) {
      console.error("Ошибка загрузки новостей:", error);

      newsGrid.hidden = false;
      newsGrid.replaceChildren(
        createElement(
          "p",
          "news-load-message",
          "Не удалось загрузить публикации. Попробуй позже."
        )
      );

      if (newsCounter) newsCounter.textContent = "АРХИВ НЕДОСТУПЕН";
      if (newsEmpty) newsEmpty.hidden = true;
    }
  }

  const initialFilter = document.querySelector('[data-filter="all"]');

  if (initialFilter) {
    setActiveFilter(initialFilter);
  }

  loadNews();
});