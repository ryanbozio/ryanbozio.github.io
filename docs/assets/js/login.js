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
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const user = await response.json();
    if (!response.ok) {
      throw new Error(`${user.message || "GitHub rejected that token."} (HTTP ${response.status})`);
    }
    sessionStorage.setItem(APP_TOKEN_KEY, token);
    sessionStorage.setItem("familyAppGithubLogin", user.login.toLowerCase());
    window.location.replace("/Summary/");
  } catch (error) {
    const message = error instanceof TypeError
      ? "The browser could not reach GitHub. Check the browser console, network connection, or an extension blocking api.github.com."
      : error.message;
    showLoginStatus(message, true);
    button.disabled = false;
  }
});