/* ============================================================
   DayFlow — app.js
   Scheduling logic:
   - Custom day window per day
   - 30-min gaps between every task
   - Tasks packed as early as possible from "start from" time
   - Remaining time = free/rest blocks
   ============================================================ */

// ── State ────────────────────────────────────────────────────
const state = {
  tasks: [],   // { id, name, durationMins }
  nextId: 1,
};

// ── DOM Refs ─────────────────────────────────────────────────
const taskNameInput   = document.getElementById('task-name');
const taskHoursInput  = document.getElementById('task-hours');
const taskMinsSelect  = document.getElementById('task-mins');
const addTaskBtn      = document.getElementById('add-task-btn');
const taskListEl      = document.getElementById('task-list');
const taskCountBadge  = document.getElementById('task-count');
const generateBtn     = document.getElementById('generate-btn');
const resetBtn        = document.getElementById('reset-btn');

const dayStartInput   = document.getElementById('day-start');
const dayEndInput     = document.getElementById('day-end');
const startFromInput  = document.getElementById('start-from');

const outputPlaceholder = document.getElementById('output-placeholder');
const scheduleView      = document.getElementById('schedule-view');
const timelineEl        = document.getElementById('timeline');
const scheduleMetaEl    = document.getElementById('schedule-meta');
const freeSummaryEl     = document.getElementById('free-time-summary');

// ── Helpers ──────────────────────────────────────────────────

/** Parse "HH:MM" → minutes since midnight */
function timeToMins(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

/** minutes since midnight → "HH:MM" */
function minsToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** minutes → human-readable "Xh Ym" */
function minsToHuman(mins) {
  if (mins <= 0) return '0 min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Show toast message */
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// ── Task Management ───────────────────────────────────────────

function addTask() {
  const name = taskNameInput.value.trim();
  const hours = parseInt(taskHoursInput.value) || 0;
  const mins  = parseInt(taskMinsSelect.value) || 0;
  const totalMins = hours * 60 + mins;

  if (!name) {
    showToast('Please enter a task name.', 'error');
    taskNameInput.focus();
    return;
  }
  if (totalMins <= 0) {
    showToast('Please set a duration > 0.', 'error');
    return;
  }

  const task = { id: state.nextId++, name, durationMins: totalMins };
  state.tasks.push(task);

  // Reset inputs
  taskNameInput.value = '';
  taskHoursInput.value = '1';
  taskMinsSelect.value = '0';
  taskNameInput.focus();

  renderTaskList();
  showToast(`"${name}" added — ${minsToHuman(totalMins)}`, 'success');
}

function removeTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  renderTaskList();
}

function renderTaskList() {
  taskCountBadge.textContent = state.tasks.length;

  if (state.tasks.length === 0) {
    taskListEl.innerHTML = '<li class="task-empty">No tasks yet — add some above</li>';
    return;
  }

  taskListEl.innerHTML = '';
  state.tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <span class="task-item-name">${escapeHtml(task.name)}</span>
      <span class="task-item-duration">${minsToHuman(task.durationMins)}</span>
      <button class="task-item-remove" aria-label="Remove task" data-id="${task.id}">×</button>
    `;
    taskListEl.appendChild(li);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Scheduling Engine ─────────────────────────────────────────

const GAP_MINS = 30; // enforced gap between tasks

/**
 * Build a schedule from the current state.
 * Returns an array of blocks:
 *   { type: 'task'|'gap'|'free', label, start, end, durationMins }
 */
function buildSchedule() {
  const dayStart  = timeToMins(dayStartInput.value);
  const dayEnd    = timeToMins(dayEndInput.value);
  const startFrom = timeToMins(startFromInput.value);

  // Validate
  if (dayEnd <= dayStart) {
    showToast('Day end must be after day start.', 'error');
    return null;
  }

  // Clamp startFrom to day window
  const scheduleStart = Math.max(startFrom, dayStart);

  if (scheduleStart >= dayEnd) {
    showToast('"Schedule From" time is after day end.', 'error');
    return null;
  }

  // Calculate total time needed
  const totalTaskMins = state.tasks.reduce((s, t) => s + t.durationMins, 0);
  const totalGaps     = state.tasks.length > 1 ? (state.tasks.length - 1) * GAP_MINS : 0;
  const totalNeeded   = totalTaskMins + totalGaps;
  const available     = dayEnd - scheduleStart;

  if (totalNeeded > available) {
    const overBy = totalNeeded - available;
    showToast(
      `Tasks exceed available time by ${minsToHuman(overBy)}. Remove some tasks or adjust your day window.`,
      'error'
    );
    return null;
  }

  // Build blocks: pack tasks from scheduleStart with 30-min gaps
  const blocks = [];
  let cursor = scheduleStart;

  // If scheduleStart > dayStart, there's free time at the start
  if (scheduleStart > dayStart) {
    blocks.push({
      type: 'free',
      label: 'Free Time',
      start: dayStart,
      end: scheduleStart,
      durationMins: scheduleStart - dayStart,
    });
  }

  state.tasks.forEach((task, i) => {
    // Task block
    blocks.push({
      type: 'task',
      label: task.name,
      start: cursor,
      end: cursor + task.durationMins,
      durationMins: task.durationMins,
    });
    cursor += task.durationMins;

    // Gap (unless last task)
    if (i < state.tasks.length - 1) {
      blocks.push({
        type: 'gap',
        label: '30 min break',
        start: cursor,
        end: cursor + GAP_MINS,
        durationMins: GAP_MINS,
      });
      cursor += GAP_MINS;
    }
  });

  // Remaining time after last task = free time
  if (cursor < dayEnd) {
    blocks.push({
      type: 'free',
      label: 'Free Time',
      start: cursor,
      end: dayEnd,
      durationMins: dayEnd - cursor,
    });
  }

  return blocks;
}

// ── Render Schedule ───────────────────────────────────────────

function renderSchedule(blocks) {
  // Show output panel
  outputPlaceholder.style.display = 'none';
  scheduleView.style.display = 'block';

  // Meta
  const dayStart = timeToMins(dayStartInput.value);
  const dayEnd   = timeToMins(dayEndInput.value);
  const totalFree = blocks
    .filter(b => b.type === 'free')
    .reduce((s, b) => s + b.durationMins, 0);

  scheduleMetaEl.textContent =
    `${minsToTime(dayStart)} – ${minsToTime(dayEnd)}  ·  ${state.tasks.length} task${state.tasks.length !== 1 ? 's' : ''}`;

  // Timeline
  timelineEl.innerHTML = '';
  blocks.forEach(block => {
    const row = document.createElement('div');
    row.className = `timeline-block block-${block.type}`;

    let innerHtml = '';
    if (block.type === 'task') {
      innerHtml = `
        <div class="block-label">${escapeHtml(block.label)}</div>
        <div class="block-duration">${minsToTime(block.start)} → ${minsToTime(block.end)}  ·  ${minsToHuman(block.durationMins)}</div>
      `;
    } else if (block.type === 'gap') {
      innerHtml = `<div class="block-label">↳ ${block.label}</div>`;
    } else {
      innerHtml = `
        <div class="block-label">◉ Free Time</div>
        <div class="block-duration">${minsToTime(block.start)} → ${minsToTime(block.end)}  ·  ${minsToHuman(block.durationMins)}</div>
      `;
    }

    row.innerHTML = `
      <div class="block-time">${minsToTime(block.start)}</div>
      <div class="block-content">${innerHtml}</div>
    `;
    timelineEl.appendChild(row);
  });

  // Add end-of-day time marker
  const endRow = document.createElement('div');
  endRow.className = 'timeline-block';
  endRow.innerHTML = `
    <div class="block-time" style="color: var(--text-secondary);">${minsToTime(dayEnd)}</div>
    <div class="block-content" style="border:none; background: none; padding: 8px 16px;">
      <div style="font-size:0.7rem; color: var(--text-muted); letter-spacing:0.06em;">— End of day</div>
    </div>
  `;
  timelineEl.appendChild(endRow);

  // Free time summary
  freeSummaryEl.innerHTML = `
    <div>
      <div class="fts-label">Total Free / Rest Time</div>
    </div>
    <div class="fts-value">${minsToHuman(totalFree)}</div>
  `;
}

// ── Generate Handler ──────────────────────────────────────────

function handleGenerate() {
  if (state.tasks.length === 0) {
    showToast('Add at least one task first.', 'error');
    return;
  }

  const blocks = buildSchedule();
  if (!blocks) return; // error already shown

  renderSchedule(blocks);

  // Scroll to output on mobile
  if (window.innerWidth <= 820) {
    scheduleView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── Reset Handler ─────────────────────────────────────────────

function handleReset() {
  state.tasks = [];
  state.nextId = 1;
  renderTaskList();
  scheduleView.style.display = 'none';
  outputPlaceholder.style.display = 'flex';
  showToast('Schedule cleared.', '');
}

// ── Sync startFrom with dayStart ──────────────────────────────
// When the user changes Day Start, auto-update "Schedule From" to match
// unless the user has manually set it further ahead.
dayStartInput.addEventListener('change', () => {
  const dayStartMins   = timeToMins(dayStartInput.value);
  const startFromMins  = timeToMins(startFromInput.value);
  if (startFromMins < dayStartMins) {
    startFromInput.value = dayStartInput.value;
  }
});

// ── Event Listeners ───────────────────────────────────────────

addTaskBtn.addEventListener('click', addTask);
generateBtn.addEventListener('click', handleGenerate);
resetBtn.addEventListener('click', handleReset);

taskNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

taskListEl.addEventListener('click', e => {
  const btn = e.target.closest('.task-item-remove');
  if (btn) removeTask(Number(btn.dataset.id));
});

// ── Init ──────────────────────────────────────────────────────
renderTaskList();
