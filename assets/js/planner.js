// planner.js
// Recurring task planner with subtasks, persisted to localStorage.
// Include on any Jekyll page via:
//   <script src="{{ '/assets/js/planner.js' | relative_url }}"></script>

(function () {
  const STORAGE_KEY = 'jekyll_planner_tasks';
  let pendingSubtasks = [];

  // ---------- storage ----------
  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // ---------- recurrence helpers ----------
  // Returns true if a recurring task should be reset/marked "due" again today,
  // based on its recurrence type and the last time it was completed.
  function isDueToday(task) {
    if (task.recurrence === 'none') return !task.done;
    if (!task.lastCompleted) return true;

    const last = new Date(task.lastCompleted);
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSince = Math.floor((now - last) / msPerDay);

    if (task.recurrence === 'daily') return daysSince >= 1;
    if (task.recurrence === 'weekly') return daysSince >= 7;
    if (task.recurrence === 'monthly') {
      return (
        now.getFullYear() > last.getFullYear() ||
        now.getMonth() > last.getMonth()
      );
    }
    return false;
  }

  // Call this once on page load to auto-reset recurring tasks whose
  // interval has elapsed (unchecks the task and its subtasks).
  function refreshRecurringTasks() {
    const tasks = loadTasks();
    let changed = false;
    tasks.forEach((t) => {
      if (t.recurrence !== 'none' && t.done && isDueToday(t)) {
        t.done = false;
        t.subtasks.forEach((s) => (s.done = false));
        changed = true;
      }
    });
    if (changed) saveTasks(tasks);
    return tasks;
  }

  // ---------- subtask input UI (the "add subtask" row before creating a task) ----------
  function renderSubtaskInputs() {
    const el = document.getElementById('subtaskInputs');
    if (!el) return;
    el.innerHTML = pendingSubtasks
      .map(
        (s, i) =>
          `<div class="subtask-input-row">
            <span>${s}</span>
            <button data-i="${i}" class="rmSub" aria-label="Remove subtask">&times;</button>
          </div>`
      )
      .join('');
    el.querySelectorAll('.rmSub').forEach((b) =>
      b.addEventListener('click', () => {
        pendingSubtasks.splice(parseInt(b.dataset.i, 10), 1);
        renderSubtaskInputs();
      })
    );
  }

  // ---------- task list rendering ----------
  function renderTaskList() {
    const tasks = refreshRecurringTasks();
    const el = document.getElementById('taskList');
    if (!el) return;

    if (tasks.length === 0) {
      el.innerHTML = '<p class="planner-empty">No tasks yet. Add one above.</p>';
      return;
    }

    const recurrenceLabel = {
      none: 'One-time',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
    };

    el.innerHTML = tasks
      .map((t) => {
        const subHtml = t.subtasks
          .map(
            (s, i) => `
            <div class="subtask-row">
              <input type="checkbox" data-tid="${t.id}" data-sidx="${i}" class="subCheck" ${s.done ? 'checked' : ''}>
              <span class="${s.done ? 'done' : ''}">${s.name}</span>
            </div>`
          )
          .join('');

        return `
          <div class="task-card">
            <div class="task-row">
              <input type="checkbox" data-tid="${t.id}" class="taskCheck" ${t.done ? 'checked' : ''}>
              <span class="task-name ${t.done ? 'done' : ''}">${t.name}</span>
              <span class="recurrence-badge">${recurrenceLabel[t.recurrence]}</span>
              <button data-tid="${t.id}" class="delTask" aria-label="Delete task">&times;</button>
            </div>
            ${subHtml}
          </div>`;
      })
      .join('');

    el.querySelectorAll('.taskCheck').forEach((c) =>
      c.addEventListener('change', () => toggleTask(parseInt(c.dataset.tid, 10)))
    );
    el.querySelectorAll('.subCheck').forEach((c) =>
      c.addEventListener('change', () =>
        toggleSubtask(parseInt(c.dataset.tid, 10), parseInt(c.dataset.sidx, 10))
      )
    );
    el.querySelectorAll('.delTask').forEach((b) =>
      b.addEventListener('click', () => deleteTask(parseInt(b.dataset.tid, 10)))
    );
  }

  // ---------- task actions ----------
  function addTask(name, recurrence, subtaskNames) {
    if (!name.trim()) return;
    const tasks = loadTasks();
    tasks.push({
      id: Date.now(),
      name: name.trim(),
      recurrence: recurrence,
      subtasks: subtaskNames.map((s) => ({ name: s, done: false })),
      done: false,
      lastCompleted: null,
    });
    saveTasks(tasks);
    renderTaskList();
  }

  function toggleTask(id) {
    const tasks = loadTasks();
    const t = tasks.find((t) => t.id === id);
    if (t) {
      t.done = !t.done;
      if (t.done) t.lastCompleted = new Date().toISOString();
    }
    saveTasks(tasks);
    renderTaskList();
  }

  function toggleSubtask(id, idx) {
    const tasks = loadTasks();
    const t = tasks.find((t) => t.id === id);
    if (t && t.subtasks[idx]) {
      t.subtasks[idx].done = !t.subtasks[idx].done;
      // auto-complete the parent task when every subtask is done
      if (t.subtasks.length > 0 && t.subtasks.every((s) => s.done)) {
        t.done = true;
        t.lastCompleted = new Date().toISOString();
      }
    }
    saveTasks(tasks);
    renderTaskList();
  }

  function deleteTask(id) {
    saveTasks(loadTasks().filter((t) => t.id !== id));
    renderTaskList();
  }

  // ---------- wire up the "create task" form, if present on the page ----------
  function initForm() {
    const addSubtaskBtn = document.getElementById('addSubtaskBtn');
    const subtaskNameInput = document.getElementById('subtaskName');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskNameInput = document.getElementById('taskName');
    const recurrenceSelect = document.getElementById('recurrence');

    if (addSubtaskBtn && subtaskNameInput) {
      addSubtaskBtn.addEventListener('click', () => {
        if (subtaskNameInput.value.trim()) {
          pendingSubtasks.push(subtaskNameInput.value.trim());
          subtaskNameInput.value = '';
          renderSubtaskInputs();
        }
      });
    }

    if (addTaskBtn && taskNameInput && recurrenceSelect) {
      addTaskBtn.addEventListener('click', () => {
        addTask(taskNameInput.value, recurrenceSelect.value, pendingSubtasks);
        taskNameInput.value = '';
        pendingSubtasks = [];
        renderSubtaskInputs();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initForm();
    renderSubtaskInputs();
    renderTaskList();
  });
})();