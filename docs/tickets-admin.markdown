---
layout: page
title: Admin
permalink: /tickets/admin/
---

<link rel="stylesheet" href="{{ '/assets/css/tickets.css' | relative_url }}">

# Parent Admin

<div class="ticket-app">
  <div class="ticket-auth">
    <label for="githubToken">GitHub token</label>
    <input id="githubToken" type="password" autocomplete="off" placeholder="github_pat_...">
    <button id="githubConnect" type="button">Connect</button>
    <button id="githubSignOut" type="button" hidden>Disconnect</button>
    <span id="githubIdentity"></span>
  </div>

  <div id="ticketStatus" class="ticket-status"></div>

  <div id="ticketCards" class="ticket-cards"></div>

  <div class="ticket-grid">
    <section>
      <h2>Log a chore</h2>
      <form id="logChoreForm" class="ticket-stack">
        <label>Kid <select id="logChoreChild" required></select></label>
        <label>Chore <select id="logChoreChore" required></select></label>
        <button type="submit">Log chore</button>
      </form>
    </section>

    <section>
      <h2>Behavior adjustment</h2>
      <form id="adjustmentForm" class="ticket-stack">
        <label>Kid <select id="adjustmentChild" required></select></label>
        <label>Remove Tickets <input id="adjustmentPoints" type="number" required></label>
        <label>Reason <input id="adjustmentReason" type="text" placeholder="e.g. Talked back"></label>
        <button type="submit">Apply</button>
      </form>
    </section>

    <section>
      <h2>Redeem a prize</h2>
      <form id="redeemForm" class="ticket-stack">
        <label>Kid <select id="redeemChild" required></select></label>
        <label>Prize <select id="redeemPrize" required></select></label>
        <button type="submit">Redeem</button>
      </form>
    </section>
  </div>

  <div class="ticket-grid">
    <section>
      <h2>Add kid</h2>
      <form id="addChildForm" class="ticket-stack">
        <label>Name <input id="addChildName" type="text" required></label>
        <label>Color <input id="addChildColor" type="color" value="#4a90d9"></label>
        <button type="submit">Add</button>
      </form>
    </section>

    <section>
      <h2>Add chore</h2>
      <form id="addChoreForm" class="ticket-stack">
        <label>Name <input id="addChoreName" type="text" required></label>
        <label>Tickets <id="addChorePoints" type="number" required></label>
        <button type="submit">Add</button>
      </form>
    </section>

    <section>
      <h2>Add prize</h2>
      <form id="addPrizeForm" class="ticket-stack">
        <label>Name <input id="addPrizeName" type="text" required></label>
        <label>Cost (tickets) <input id="addPrizeCost" type="number" required></label>
        <label>Category
          <select id="addPrizeCategory">
            <option value="dessert">Dessert</option>
            <option value="money">Money</option>
            <option value="activity">Activity</option>
            <option value="other" selected>Other</option>
          </select>
        </label>
        <button type="submit">Add</button>
      </form>
    </section>
  </div>

  <h2>Recent activity</h2>
  <table class="ticket-history">
    <thead>
      <tr><th>When</th><th>Kid</th><th>Type</th><th>Description</th><th>Points</th></tr>
    </thead>
    <tbody id="ticketHistoryBody"></tbody>
  </table>

  <p><a href="{{ '/tickets/' | relative_url }}">Back to dashboard</a></p>
</div>

<script src="{{ '/assets/js/tickets-common.js' | relative_url }}"></script>
<script>
  const GITHUB_REPOSITORY = "ryanbozio/ryanbozio.github.io";
  const GITHUB_BRANCH = "main";
</script>
<script src="{{ '/assets/js/tickets-admin.js' | relative_url }}"></script>
