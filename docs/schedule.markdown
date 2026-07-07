---
layout: page
title: Schedule
permalink: /schedule/
---

# Daily planner

Use the form below to add tasks.

<div class="planner-app">
  <input id="taskName" type="text" placeholder="Water the plants">
  <select id="recurrence">
    <option value="none">One-time</option>
    <option value="daily">Daily</option>
    <option value="weekly">Weekly</option>
    <option value="monthly">Monthly</option>
  </select>
  <button id="addTaskBtn">Create task</button>
</div>

<div id="taskList"></div>

<script src="{{ '/assets/js/planner.js' | relative_url }}"></script>
