---
layout: page
title: Tickets
permalink: /tickets/
---

<link rel="stylesheet" href="{{ '/assets/css/tickets.css' | relative_url }}">

# Family Tickets

<div class="ticket-app">
  <div id="ticketCards" class="ticket-cards"></div>

  <h2>Recent activity</h2>
  <table class="ticket-history">
    <thead>
      <tr><th>When</th><th>Kid</th><th>Type</th><th>Description</th><th>Points</th></tr>
    </thead>
    <tbody id="ticketHistoryBody"></tbody>
  </table>

  <p><a href="{{ '/tickets/admin/' | relative_url }}">Parent admin</a></p>
</div>

<script src="{{ '/assets/js/tickets-common.js' | relative_url }}"></script>
<script src="{{ '/assets/js/tickets.js' | relative_url }}"></script>
