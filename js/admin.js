
"use strict";

const API_URL = "https://outlast-trials-ru-api.eresenkonikita7.workers.dev";

const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("adminDashboard");
const loginForm = document.getElementById("adminLoginForm");
const passwordInput = document.getElementById("adminPassword");
const loginButton = document.getElementById("loginButton");
const loginStatus = document.getElementById("adminLoginStatus");

const postForm = document.getElementById("postForm");
const postIdInput = document.getElementById("postId");
const titleInput = document.getElementById("postTitle");
const categoryInput = document.getElementById("postCategory");
const summaryInput = document.getElementById("postSummary");
const contentInput = document.getElementById("postContent");
const imageInput = document.getElementById("postImage");
const saveButton = document.getElementById("savePostButton");
const cancelButton = document.getElementById("cancelEditButton");
const refreshButton = document.getElementById("refreshPostsButton");

const formStatus = document.getElementById("postFormStatus");
const postsStatus = document.getElementById("postsStatus");
const postsCounter = document.getElementById("postsCounter");
const postsList = document.getElementById("adminPostsList");
const logoutButton = document.getElementById("logoutButton");

let sessionToken = null;
let currentPosts = [];
let busy = false;

function setStatus(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Сервер вернул некорректный ответ.");
  }

  if (response.status === 401) {
    logout(false);
    throw new Error("Сессия завершена. Войди снова.");
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Ошибка сервера: ${response.status}`);
  }

  return data;
}

function showDashboard() {
  loginPanel.classList.add("admin-hidden");
  dashboard.classList.remove("admin-hidden");
}

function showLogin() {
  dashboard.classList.add("admin-hidden");
  loginPanel.classList.remove("admin-hidden");
}

function logout(showMessage = true) {
  sessionToken = null;
  currentPosts = [];
  postsList.replaceChildren();
  postsCounter.textContent = "Войди, чтобы загрузить публикации.";
  showLogin();

  if (showMessage) {
    setStatus(loginStatus, "Ты вышел из панели.", true);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (busy) return;

  const password = passwordInput.value;

  if (!password) {
    setStatus(loginStatus, "Введи пароль администратора.");
    return;
  }

  busy = true;
  loginButton.disabled = true;
  loginButton.textContent = "Проверка...";
  setStatus(loginStatus, "");

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });

    if (!data.token) {
      throw new Error("Сервер не выдал токен авторизации.");
    }

    sessionToken = data.token;
    passwordInput.value = "";

    showDashboard();
    setStatus(loginStatus, "");
    await loadPosts();
  } catch (error) {
    setStatus(loginStatus, error.message || "Не удалось войти.");
  } finally {
    busy = false;
    loginButton.disabled = false;
    loginButton.textContent = "Войти в панель";
  }
});

function clearPostForm() {
  postForm.reset();
  postIdInput.value = "";
  saveButton.textContent = "Опубликовать";
  setStatus(formStatus, "");
}

cancelButton.addEventListener("click", clearPostForm);

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (busy || !sessionToken) return;

  const id = postIdInput.value;

  const post = {
    title: titleInput.value.trim(),
    category: categoryInput.value,
    summary: summaryInput.value.trim(),
    content: contentInput.value.trim(),
    image_url: imageInput.value.trim()
  };

  busy = true;
  saveButton.disabled = true;
  setStatus(formStatus, id ? "Сохраняю изменения..." : "Публикую...");

  try {
    await apiRequest(id ? `/posts/${encodeURIComponent(id)}` : "/posts", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(post)
    });

    clearPostForm();
    setStatus(formStatus, id ? "Изменения сохранены." : "Публикация создана.", true);
    await loadPosts();
  } catch (error) {
    setStatus(formStatus, error.message || "Не удалось сохранить публикацию.");
  } finally {
    busy = false;
    saveButton.disabled = false;
  }
});

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function categoryLabel(category) {
  const labels = {
    news: "Новость",
    events: "Событие",
    important: "Важное"
  };

  return labels[category] || category;
}

function renderPosts(posts) {
  postsList.replaceChildren();
  postsCounter.textContent = `Публикаций: ${posts.length}`;

  if (posts.length === 0) {
    postsList.append(
      makeElement("p", "admin-muted", "Публикаций пока нет. Создай первую выше.")
    );
    return;
  }

  for (const post of posts) {
    const card = makeElement("article", "admin-post");
    const tag = makeElement("span", "admin-tag", categoryLabel(post.category));
    const title = makeElement("h3", "", post.title);
    const summary = makeElement("p", "", post.summary);
    const date = makeElement(
      "p",
      "admin-muted",
      post.created_at ? `Создано: ${post.created_at}` : ""
    );

    const actions = makeElement("div", "admin-actions");
    const editButton = makeElement("button", "admin-btn secondary", "Редактировать");
    editButton.type = "button";
    editButton.addEventListener("click", () => editPost(post.id));

    const deleteButton = makeElement("button", "admin-btn danger", "Удалить");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deletePost(post.id, post.title));

    actions.append(editButton, deleteButton);
    card.append(tag, title, summary, date, actions);
    postsList.append(card);
  }
}

async function loadPosts() {
  if (!sessionToken) return;

  postsStatus.textContent = "";
  postsCounter.textContent = "Загружаю публикации...";

  try {
    const data = await apiRequest("/posts", { method: "GET" });
    currentPosts = Array.isArray(data.posts) ? data.posts : [];
    renderPosts(currentPosts);
  } catch (error) {
    postsCounter.textContent = "Не удалось загрузить публикации.";
    setStatus(postsStatus, error.message || "Ошибка загрузки.");
  }
}

function editPost(id) {
  const post = currentPosts.find(item => String(item.id) === String(id));

  if (!post) {
    setStatus(formStatus, "Публикация не найдена.");
    return;
  }

  postIdInput.value = post.id;
  titleInput.value = post.title || "";
  categoryInput.value = post.category || "news";
  summaryInput.value = post.summary || "";
  contentInput.value = post.content || "";
  imageInput.value = post.image_url || "";

  saveButton.textContent = "Сохранить изменения";
  setStatus(formStatus, `Редактирование публикации №${post.id}.`);

  postForm.scrollIntoView({ behavior: "smooth", block: "start" });
  titleInput.focus();
}

async function deletePost(id, title) {
  if (busy || !sessionToken) return;

  const confirmed = window.confirm(
    `Удалить публикацию «${title}»? Это действие нельзя отменить.`
  );

  if (!confirmed) return;

  busy = true;
  setStatus(postsStatus, "Удаляю публикацию...");

  try {
    await apiRequest(`/posts/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (String(postIdInput.value) === String(id)) {
      clearPostForm();
    }

    setStatus(postsStatus, "Публикация удалена.", true);
    await loadPosts();
  } catch (error) {
    setStatus(postsStatus, error.message || "Не удалось удалить публикацию.");
  } finally {
    busy = false;
  }
}

refreshButton.addEventListener("click", loadPosts);

logoutButton.addEventListener("click", () => {
  logout();
  setStatus(loginStatus, "Ты вышел из панели.", true);
});

showLogin();
