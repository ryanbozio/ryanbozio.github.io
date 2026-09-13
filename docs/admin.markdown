---
layout: page
title: Admin
permalink: /Admin/
---

<link rel="stylesheet" href="{{ '/assets/css/app.css' | relative_url }}">

# Parent Admin

<div class="app-app">
  <div class="app-auth">
    <label for="githubToken">GitHub token</label>
    <input id="githubToken" type="password" autocomplete="off" placeholder="github_pat_...">
    <button id="githubConnect" type="button">Connect</button>
    <button id="githubSignOut" type="button" hidden>Disconnect</button>
    <span id="githubIdentity"></span>
  </div>

  <div id="appStatus" class="app-status"></div>

  <div id="appCards" class="app-cards"></div>

  <div class="app-grid">
  </div>

  <div class="app-grid">
    <section>
      <h2>Add kid</h2>
      <form id="addChildForm" class="app-stack">
        <label>Name <input id="addChildName" type="text" required></label>
        <label>Color <input id="addChildColor" type="color" value="#4a90d9"></label>
        <button type="submit">Add</button>
      </form>
    </section>

    <section>
      <h2>Add chore</h2>
      <form id="addChoreForm" class="app-stack">
        <label>Name <input id="addChoreName" type="text" required></label>
        <label>Bozio Bucks <input id="addChorePoints" type="number" required></label>
        <label>Category
          <select id="addChoreCategory" required>
            <option value="Kitchen">Kitchen</option>
            <option value="Dining Table">Dining Table</option>
            <option value="Bathroom">Bathroom</option>
            <option value="Bedroom">Bedroom</option>
            <option value="Yardwork">Yardwork</option>
          </select>
        </label>
        <button type="submit">Add</button>
      </form>
    </section>

    <section>
      <h2>Add prize</h2>
      <form id="addPrizeForm" class="app-stack">
        <label>Name <input id="addPrizeName" type="text" required></label>
        <label>Cost (Bozio Bucks) <input id="addPrizeCost" type="number" required></label>
        <label>Category
          <select id="addPrizeCategory">
            <option value="Time">Time</option>
            <option value="Movie">Movie</option>
            <option value="Money">Money</option>
            <option value="Outing" selected>Outing</option>
          </select>
        </label>
        <button type="submit">Add</button>
      </form>
    </section>
  </div>

  <section class="app-panel">
    <div class="app-section-heading"><h2>Manage items</h2><span>Remove items you no longer use</span></div>
    <div id="manageItems" class="app-manage-list"></div>
  </section>

  <h2>Recent activity</h2>
  <table class="app-history">
    <thead>
      <tr><th>When</th><th>Kid</th><th>Type</th><th>Description</th><th>Bozio Bucks</th></tr>
    </thead>
    <tbody id="appHistoryBody"></tbody>
  </table>

  <p><a href="{{ '/Summary/' | relative_url }}">Back to Summary</a></p>
</div>

<script src="{{ '/assets/js/common.js' | relative_url }}"></script>
<script>
  const GITHUB_REPOSITORY = "ryanbozio/ryanbozio.github.io";
  const GITHUB_BRANCH = "main";
</script>
<script src="{{ '/assets/js/admin.js' | relative_url }}"></script>
