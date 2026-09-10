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
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
    });
    const user = await response.json();
    if (!response.ok) throw new Error(user.message || "GitHub rejected that token.");
    sessionStorage.setItem(APP_TOKEN_KEY, token);
    sessionStorage.setItem("familyAppGithubLogin", user.login.toLowerCase());
    window.location.replace("/Summary/");
  } catch (error) {
    showLoginStatus(error.message, true);
  }
});