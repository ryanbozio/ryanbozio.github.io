---
layout: page
title: Tasks
permalink: /tasks/
---

<link rel="stylesheet" href="{{ '/assets/css/planner.css' | relative_url }}">

# Daily planner

Use the form below to add tasks.

<div class="planner-app">
  <div class="form-row">
    <div>
      <label for="taskName">Task name</label>
      <input id="taskName" type="text" placeholder="Water the plants">
    </div>
    <div>
      <label for="recurrence">Recurrence</label>
      <select id="recurrence">
        <option value="none">One-time</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
    </div>
  </div>

  <!-- Subtasks queued up before the task is created -->
  <div id="subtaskInputs"></div>

  <div class="subtask-add-row">
    <input id="subtaskName" type="text" placeholder="Add a subtask">
    <button id="addSubtaskBtn" type="button">+ Add subtask</button>
  </div>

  <button id="addTaskBtn" type="button">Create task</button>
</div>

<div id="taskList"></div>

<script src="{{ '/assets/js/planner.js' | relative_url }}"></script>
