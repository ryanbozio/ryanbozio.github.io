---
layout: page
title: Login
permalink: /Login/
---

<link rel="stylesheet" href="{{ '/assets/css/app.css' | relative_url }}">

<div class="app-app app-login-page">
  <div class="app-hero">
    <p class="app-kicker">BOZIO BUCKS</p>
    <h1>Welcome back.</h1>
    <p>Sign in with your GitHub access token to open your family app space.</p>
  </div>
  <form id="loginForm" class="app-panel app-stack">
    <label for="githubToken">GitHub token</label>
    <input id="githubToken" type="password" autocomplete="off" placeholder="github_pat_..." required>
    <button type="submit">Continue</button>
    <div id="loginStatus" class="app-status"></div>
  </form>
</div>

<script src="{{ '/assets/js/common.js' | relative_url }}"></script>
<script>
  const GITHUB_REPOSITORY = "ryanbozio/ryanbozio.github.io";
  const SUMMARY_URL = "{{ '/Summary/' | relative_url }}";
</script>
<script src="{{ '/assets/js/login.js' | relative_url }}"></script>