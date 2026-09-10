const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

function showLoginStatus(message, isError) {
  loginStatus.textContent = message;
  loginStatus.className = `app-status app-status-visible ${isError ? "app-status-error" : "app-status-success"}`;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = document.getElementById("githubToken").value.trim();
  if (!token) return;
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;
  showLoginStatus("Checking GitHub token...", false);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const user = await response.json();
    if (!response.ok) {
      throw new Error(`${user.message || "GitHub rejected that token."} (HTTP ${response.status})`);
    }
    const login = user.login.toLowerCase();
    sessionStorage.setItem(APP_TOKEN_KEY, token);
    sessionStorage.setItem("familyAppGithubLogin", login);
    if (sessionStorage.getItem(APP_TOKEN_KEY) !== token || sessionStorage.getItem("familyAppGithubLogin") !== login) {
      throw new Error("The browser could not save the login session. Check whether storage is blocked.");
    }
    showLoginStatus(`Verified as ${user.login}. Opening Summary...`, false);
    setTimeout(() => window.location.assign(SUMMARY_URL), 600);
  } catch (error) {
    const message = error.name === "AbortError"
      ? "GitHub did not respond within 10 seconds. Check your network or browser extensions."
      : error instanceof TypeError
      ? "The browser could not reach GitHub. Check the browser console, network connection, or an extension blocking api.github.com."
      : error.message;
    showLoginStatus(message, true);
    button.disabled = false;
  }
});