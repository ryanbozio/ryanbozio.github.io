---
layout: page
title: Child
permalink: /Child/
---

<link rel="stylesheet" href="{{ '/assets/css/app.css' | relative_url }}">

<div class="app-app" id="childPage">
  <div class="app-page-heading">
    <a class="app-back-link" href="{{ '/Summary/' | relative_url }}">Summary</a>
    <div id="childHeading"></div>
  </div>
  <div id="childBalance" class="app-child-balance"></div>
  <section class="app-panel">
    <div class="app-section-heading"><h2>Log a chore</h2><span>Earn points</span></div>
    <form id="childChoreForm" class="app-inline-form">
      <select id="childChore" required></select>
      <button type="submit">Log chore</button>
    </form>
  </section>
  <section class="app-panel">
    <div class="app-section-heading"><h2>Activity log</h2><span>Most recent first</span></div>
    <table class="app-history"><thead><tr><th>When</th><th>Type</th><th>Description</th><th>Points</th></tr></thead><tbody id="childHistory"></tbody></table>
  </section>
  <div id="childStatus" class="app-status"></div>
</div>

<script src="{{ '/assets/js/common.js' | relative_url }}"></script>
<script>
  const GITHUB_REPOSITORY = "ryanbozio/ryanbozio.github.io";
  const GITHUB_BRANCH = "main";
</script>
<script src="{{ '/assets/js/child.js' | relative_url }}"></script>
