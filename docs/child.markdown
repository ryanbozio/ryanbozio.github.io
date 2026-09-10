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
  <p><a id="childStoreLink" class="app-primary-link" href="/Store/">Open Store</a></p>
  <section class="app-panel">
    <div class="app-section-heading"><h2>Chores</h2><span>Earn points</span></div>
    <div id="childChores" class="app-store-grid"></div>
  </section>
  <section class="app-panel">
    <div class="app-section-heading"><h2>Behavior adjustment</h2><span>Add or remove points</span></div>
    <form id="childAdjustmentForm" class="app-stack">
      <label>Points <input id="childAdjustmentPoints" type="number" required></label>
      <label>Reason <input id="childAdjustmentReason" type="text" placeholder="e.g. Great teamwork" required></label>
      <button type="submit">Apply adjustment</button>
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
