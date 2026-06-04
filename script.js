const form = document.querySelector("#search-form");
const usernameInput = document.querySelector("#username");
const compareUsernameInput = document.querySelector("#compare-username");
const searchButton = document.querySelector("#search-button");
const randomButton = document.querySelector("#random-button");
const themeToggle = document.querySelector("#theme-toggle");
const repoSort = document.querySelector("#repo-sort");
const loading = document.querySelector("#loading");
const error = document.querySelector("#error");
const profiles = document.querySelector("#profiles");
const profile = document.querySelector("#profile");
const compareProfile = document.querySelector("#compare-profile");
const reposSection = document.querySelector("#repos-section");
const reposTitle = document.querySelector("#repos-title");
const reposContainer = document.querySelector("#repos");
const languagesSection = document.querySelector("#languages-section");
const languagesContainer = document.querySelector("#languages");
const searchHistory = document.querySelector("#search-history");

const THEME_KEY = "github-profile-card-theme";
const HISTORY_KEY = "github-profile-card-searches";
const randomDevelopers = [
  "torvalds",
  "gaearon",
  "sindresorhus",
  "addyosmani",
  "yyx990803",
  "tj",
  "wesbos",
  "kentcdodds"
];

let currentResults = [];

initApp();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const firstUsername = usernameInput.value.trim();
  const secondUsername = compareUsernameInput.value.trim();

  if (!firstUsername) {
    showError("Введите GitHub username");
    return;
  }

  await searchUsers(firstUsername, secondUsername);
});

repoSort.addEventListener("change", () => {
  renderCurrentData();
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  saveTheme(nextTheme);
  applyTheme(nextTheme);
});

randomButton.addEventListener("click", async () => {
  const username = getRandomDeveloper();

  usernameInput.value = username;
  compareUsernameInput.value = "";
  await searchUsers(username, "");
});

function initApp() {
  applyTheme(loadTheme());
  renderSearchHistory();
}

async function searchUsers(firstUsername, secondUsername) {
  setLoading(true);
  clearError();
  hideOldData();

  try {
    const firstResult = await getUserData(firstUsername);
    const results = [firstResult];

    if (secondUsername) {
      const secondResult = await getUserData(secondUsername);
      results.push(secondResult);
    }

    currentResults = results;
    saveSearch(firstUsername);

    if (secondUsername) {
      saveSearch(secondUsername);
    }

    renderSearchHistory();
    renderCurrentData();
  } catch (err) {
    showError(err.message || "Что-то пошло не так");
  } finally {
    setLoading(false);
  }
}

async function getUserData(username) {
  const user = await getUser(username);
  const repos = await getRepos(username);

  return {
    user,
    repos
  };
}

async function getUser(username) {
  // fetch отправляет HTTP-запрос к GitHub API и возвращает объект response.
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);

  // await останавливает выполнение этой функции, пока запрос не завершится.
  // Если GitHub вернул 404, значит пользователь с таким username не найден.
  if (response.status === 404) {
    throw new Error(`Пользователь ${username} не найден`);
  }

  if (!response.ok) {
    throw new Error("Не удалось загрузить пользователя");
  }

  return response.json();
}

async function getRepos(username) {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100`);

  if (response.status === 404) {
    throw new Error(`Пользователь ${username} не найден`);
  }

  if (!response.ok) {
    throw new Error("Не удалось загрузить репозитории");
  }

  return response.json();
}

function renderCurrentData() {
  if (currentResults.length === 0) {
    return;
  }

  renderProfiles(currentResults);
  renderLanguages(currentResults);
  renderRepos(currentResults);
}

function renderProfiles(results) {
  const isComparing = results.length === 2;

  profiles.classList.toggle("compare-mode", isComparing);
  profiles.classList.remove("hidden");

  renderUser(results[0].user, profile);

  if (isComparing) {
    renderUser(results[1].user, compareProfile);
  } else {
    compareProfile.classList.add("hidden");
    compareProfile.innerHTML = "";
  }
}

function renderUser(data, container) {
  container.innerHTML = `
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

  container.classList.remove("hidden");
}

function renderLanguages(results) {
  const languages = getTopLanguages(results);

  if (languages.length === 0) {
    languagesContainer.innerHTML = '<article class="repo"><p>Языки не найдены</p></article>';
  } else {
    languagesContainer.innerHTML = languages
      .map((language) => `
        <div class="language-item">
          <span>${escapeHtml(language.name)}</span>
          <div class="language-bar" aria-hidden="true">
            <div class="language-fill" style="width: ${language.percent}%"></div>
          </div>
          <span>${language.count} реп.</span>
        </div>
      `)
      .join("");
  }

  languagesSection.classList.remove("hidden");
}

function getTopLanguages(results) {
  const languageCounts = {};

  results.forEach((result) => {
    result.repos.forEach((repo) => {
      if (!repo.language) {
        return;
      }

      if (!languageCounts[repo.language]) {
        languageCounts[repo.language] = 0;
      }

      languageCounts[repo.language] += 1;
    });
  });

  const maxCount = Math.max(...Object.values(languageCounts), 0);

  return Object.keys(languageCounts)
    .map((name) => ({
      name,
      count: languageCounts[name],
      percent: Math.round((languageCounts[name] / maxCount) * 100)
    }))
    .sort((languageA, languageB) => languageB.count - languageA.count)
    .slice(0, 5);
}

function renderRepos(results) {
  const repos = getVisibleRepos(results);
  const sortName = repoSort.value;

  reposTitle.textContent = getReposTitle(sortName);

  if (repos.length === 0) {
    reposContainer.innerHTML = '<article class="repo"><p>Репозитории не найдены</p></article>';
  } else {
    reposContainer.innerHTML = repos
      .map((repo) => `
        <article class="repo">
          <h3>${escapeHtml(repo.full_name || repo.name)}</h3>
          <p>${escapeHtml(repo.description || "Нет описания")}</p>
          <div class="repo-meta">
            <span>⭐ ${repo.stargazers_count}</span>
            <span>Создан: ${formatDate(repo.created_at)}</span>
            <span>Обновлен: ${formatDate(repo.updated_at)}</span>
          </div>
        </article>
      `)
      .join("");
  }

  reposSection.classList.remove("hidden");
}

function getVisibleRepos(results) {
  const allRepos = [];

  results.forEach((result) => {
    result.repos.forEach((repo) => {
      allRepos.push(repo);
    });
  });

  return sortRepos(allRepos, repoSort.value).slice(0, 5);
}

function sortRepos(repos, sortName) {
  const sortedRepos = [...repos];

  if (sortName === "stars") {
    return sortedRepos.sort((repoA, repoB) => repoB.stargazers_count - repoA.stargazers_count);
  }

  if (sortName === "created") {
    return sortedRepos.sort((repoA, repoB) => new Date(repoB.created_at) - new Date(repoA.created_at));
  }

  return sortedRepos.sort((repoA, repoB) => new Date(repoB.updated_at) - new Date(repoA.updated_at));
}

function getReposTitle(sortName) {
  if (sortName === "stars") {
    return "Популярные репозитории";
  }

  if (sortName === "created") {
    return "Новые репозитории";
  }

  return "Последние репозитории";
}

function saveTheme(themeName) {
  localStorage.setItem(THEME_KEY, themeName);
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

function applyTheme(themeName) {
  document.body.dataset.theme = themeName;
  themeToggle.textContent = themeName === "dark" ? "Светлая тема" : "Темная тема";
}

function saveSearch(username) {
  const cleanUsername = username.trim();

  if (!cleanUsername) {
    return;
  }

  const oldSearches = loadSearchHistory();
  const filteredSearches = oldSearches.filter(
    (oldUsername) => oldUsername.toLowerCase() !== cleanUsername.toLowerCase()
  );
  const nextSearches = [cleanUsername, ...filteredSearches].slice(0, 5);

  localStorage.setItem(HISTORY_KEY, JSON.stringify(nextSearches));
}

function loadSearchHistory() {
  const savedSearches = localStorage.getItem(HISTORY_KEY);

  if (!savedSearches) {
    return [];
  }

  try {
    return JSON.parse(savedSearches);
  } catch (err) {
    return [];
  }
}

function renderSearchHistory() {
  const searches = loadSearchHistory();

  if (searches.length === 0) {
    searchHistory.classList.add("hidden");
    searchHistory.innerHTML = "";
    return;
  }

  searchHistory.innerHTML = searches
    .map((username) => `
      <button class="history-button" type="button" data-username="${escapeHtml(username)}">
        ${escapeHtml(username)}
      </button>
    `)
    .join("");

  searchHistory.classList.remove("hidden");
}

searchHistory.addEventListener("click", async (event) => {
  const button = event.target.closest(".history-button");

  if (!button) {
    return;
  }

  usernameInput.value = button.dataset.username;
  compareUsernameInput.value = "";
  await searchUsers(button.dataset.username, "");
});

function getRandomDeveloper() {
  const randomIndex = Math.floor(Math.random() * randomDevelopers.length);

  return randomDevelopers[randomIndex];
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
  profiles.classList.add("hidden");
  profile.classList.add("hidden");
  compareProfile.classList.add("hidden");
  languagesSection.classList.add("hidden");
  reposSection.classList.add("hidden");
  profile.innerHTML = "";
  compareProfile.innerHTML = "";
  languagesContainer.innerHTML = "";
  reposContainer.innerHTML = "";
}

function setLoading(isLoading) {
  loading.classList.toggle("hidden", !isLoading);
  form.setAttribute("aria-busy", String(isLoading));
  usernameInput.disabled = isLoading;
  compareUsernameInput.disabled = isLoading;
  searchButton.disabled = isLoading;
  randomButton.disabled = isLoading;
  repoSort.disabled = isLoading;
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("ru-RU");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
