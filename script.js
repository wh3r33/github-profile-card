const form = document.querySelector("#search-form");
const usernameInput = document.querySelector("#username");
const searchButton = document.querySelector("#search-button");
const loading = document.querySelector("#loading");
const error = document.querySelector("#error");
const profile = document.querySelector("#profile");
const reposSection = document.querySelector("#repos-section");
const reposContainer = document.querySelector("#repos");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();

  if (!username) {
    showError("Введите GitHub username");
    return;
  }

  setLoading(true);
  clearError();
  hideOldData();

  try {
    const user = await getUser(username);
    const repos = await getRepos(username);

    renderUser(user);
    renderRepos(repos);
  } catch (err) {
    showError(err.message || "Что-то пошло не так");
  } finally {
    setLoading(false);
  }
});

async function getUser(username) {
  // fetch отправляет HTTP-запрос к GitHub API и возвращает объект response.
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);

  // await останавливает выполнение этой функции, пока запрос не завершится.
  // Если GitHub вернул 404, значит пользователь с таким username не найден.
  if (response.status === 404) {
    throw new Error("Пользователь не найден");
  }

  if (!response.ok) {
    throw new Error("Не удалось загрузить пользователя");
  }

  return response.json();
}

async function getRepos(username) {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos`);

  if (response.status === 404) {
    throw new Error("Пользователь не найден");
  }

  if (!response.ok) {
    throw new Error("Не удалось загрузить репозитории");
  }

  const repos = await response.json();

  return repos
    .sort((repoA, repoB) => new Date(repoB.updated_at) - new Date(repoA.updated_at))
    .slice(0, 5);
}

function renderUser(data) {
  profile.innerHTML = `
    <img class="avatar" src="${data.avatar_url}" alt="Аватар пользователя ${escapeHtml(data.login)}">
    <div>
      <h2>${escapeHtml(data.name || data.login)}</h2>
      <p class="bio">${escapeHtml(data.bio || "Нет описания")}</p>
      <div class="stats">
        <div class="stat">
          <strong>${data.public_repos}</strong>
          <span>Репозитории</span>
        </div>
        <div class="stat">
          <strong>${data.followers}</strong>
          <span>Подписчики</span>
        </div>
        <div class="stat">
          <strong>${data.following}</strong>
          <span>Подписки</span>
        </div>
      </div>
    </div>
  `;

  profile.classList.remove("hidden");
}

function renderRepos(repos) {
  if (repos.length === 0) {
    reposContainer.innerHTML = '<article class="repo"><p>Репозитории не найдены</p></article>';
  } else {
    reposContainer.innerHTML = repos
      .map((repo) => `
        <article class="repo">
          <h3>${escapeHtml(repo.name)}</h3>
          <p>${escapeHtml(repo.description || "Нет описания")}</p>
        </article>
      `)
      .join("");
  }

  reposSection.classList.remove("hidden");
}

function showError(message) {
  hideOldData();
  error.textContent = message;
  error.classList.remove("hidden");
}

function clearError() {
  error.textContent = "";
  error.classList.add("hidden");
}

function hideOldData() {
  profile.classList.add("hidden");
  reposSection.classList.add("hidden");
  profile.innerHTML = "";
  reposContainer.innerHTML = "";
}

function setLoading(isLoading) {
  loading.classList.toggle("hidden", !isLoading);
  searchButton.disabled = isLoading;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
