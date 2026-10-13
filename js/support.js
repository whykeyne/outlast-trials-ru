/* =========================================
   OUTLAST TRIALS [RU] — SUPPORT FORM
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("supportForm");
  const status = document.getElementById("supportStatus");

  if (!form || !status) {
    console.warn("Форма обращений или статус не найдены.");
    return;
  }

  // Старый Worker поддержки. Не меняем адрес.
  const WORKER_URL = "https://whykeyne.eresenkonikita7.workers.dev/";

  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton
    ? submitButton.textContent.trim()
    : "ОТПРАВИТЬ ↗";

  let sending = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (sending || !form.reportValidity()) return;

    const formData = new FormData(form);

    const discord = String(formData.get("discord") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!discord || !category || !message) {
      status.textContent = "Заполни все поля формы.";
      status.style.color = "#ff3545";
      return;
    }

    sending = true;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "ОТПРАВКА...";
    }

    status.textContent = "Отправляем обращение...";
    status.style.color = "#aaa";

    try {
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          discord,
          category,
          message
        })
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error("Сервер вернул некорректный ответ.");
      }

      if (!response.ok || !result || result.ok !== true) {
        throw new Error(
          result?.error || `Ошибка сервера: ${response.status}`
        );
      }

      status.textContent =
        "✓ Обращение отправлено! Спасибо за сообщение.";
      status.style.color = "#65d995";

      form.reset();
    } catch (error) {
      console.error("Ошибка отправки обращения:", error);

      status.textContent =
        "Не удалось отправить обращение. Попробуй ещё раз позже.";
      status.style.color = "#ff3545";
    } finally {
      sending = false;

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
});