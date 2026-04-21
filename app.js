// ── State ────────────────────────────────────────────────────
const state = {
  tasks: [],   // { id, name, durationMins }
  nextId: 1,
};

let alarmCheckInterval = null;
const alarmSoundEl = document.getElementById('alarm-sound');
const triggeredAlarms = new Set(); // track which task times already triggered alarms

let currentTimeDisplay; // will be initialized after DOM loads

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

/** Get current time in "HH:MM" format */
function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
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

/** Update the current time display */
function updateTimeDisplay() {
  if (currentTimeDisplay) {
    currentTimeDisplay.textContent = `Now: ${getCurrentTime()}`;
  }
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
 * Tasks are spread evenly across the day with equal spacing.
 */
function buildSchedule() {
  const dayStart  = timeToMins(dayStartInput.value);
  const dayEnd    = timeToMins(dayEndInput.value);
  const currentMins = timeToMins(getCurrentTime());
  
  // Always schedule from the current time (or day start if we're before the day begins)
  let startFrom = Math.max(currentMins, dayStart);

  // Validate
  if (dayEnd <= dayStart) {
    showToast('Day end must be after day start.', 'error');
    return null;
  }
  
  if (startFrom < dayStart) {
    startFrom = dayStart;
  }
  
  if (startFrom >= dayEnd) {
    showToast('Start time must be before end of day.', 'error');
    return null;
  }

  // Calculate total time needed
  const totalTaskMins = state.tasks.reduce((s, t) => s + t.durationMins, 0);
  const totalGaps     = state.tasks.length > 1 ? (state.tasks.length - 1) * GAP_MINS : 0;
  const totalNeeded   = totalTaskMins + totalGaps;
  const available     = dayEnd - startFrom;

  if (totalNeeded > available) {
    const overBy = totalNeeded - available;
    showToast(
      `Tasks exceed available time by ${minsToHuman(overBy)}. Remove some tasks or adjust your day window.`,
      'error'
    );
    return null;
  }

  // Calculate free time to distribute evenly
  const remainingFree = available - totalNeeded;
  const numIntervals = state.tasks.length + 1; // free time slots before, between, and after tasks
  const freePerInterval = Math.floor(remainingFree / numIntervals);
  const extraMinutes = remainingFree % numIntervals; // distribute leftover minutes

  // Build blocks: spread tasks evenly across the day
  const blocks = [];
  let cursor = startFrom;

  state.tasks.forEach((task, i) => {
    // Add free time slot before this task
    let freeSlot = freePerInterval;
    if (i === 0) freeSlot += extraMinutes; // put extra minutes at the start
    
    if (freeSlot > 0) {
      blocks.push({
        type: 'free',
        label: 'Free Time',
        start: cursor,
        end: cursor + freeSlot,
        durationMins: freeSlot,
      });
      cursor += freeSlot;
    }

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

  // Free time after last task
  const lastFreeSlot = dayEnd - cursor;
  if (lastFreeSlot > 0) {
    blocks.push({
      type: 'free',
      label: 'Free Time',
      start: cursor,
      end: dayEnd,
      durationMins: lastFreeSlot,
    });
  }

  return blocks;
}

// ── Alarm Monitoring ────────────────────────────────────────────

function playAlarm() {
  alarmSoundEl.currentTime = 0;
  alarmSoundEl.play().catch(err => console.log('Could not play alarm:', err));
}

function startAlarmMonitoring(blocks) {
  // Clear any existing interval
  if (alarmCheckInterval) clearInterval(alarmCheckInterval);
  triggeredAlarms.clear();

  // Check every 10 seconds if it's time for a task
  alarmCheckInterval = setInterval(() => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    blocks.forEach(block => {
      if (block.type === 'task' && !triggeredAlarms.has(block.start)) {
        if (currentMins === block.start) {
          triggeredAlarms.add(block.start);
          playAlarm();
          showToast(`Time for: ${block.label}`, 'success');
        }
      }
    });
  }, 10000); // Check every 10 seconds
}

function stopAlarmMonitoring() {
  if (alarmCheckInterval) {
    clearInterval(alarmCheckInterval);
    alarmCheckInterval = null;
  }
  triggeredAlarms.clear();
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

  // Start monitoring for task alarms
  startAlarmMonitoring(blocks);
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
  stopAlarmMonitoring();
  state.tasks = [];
  state.nextId = 1;
  renderTaskList();
  scheduleView.style.display = 'none';
  outputPlaceholder.style.display = 'flex';
  showToast('Schedule cleared.', '');
}

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
currentTimeDisplay = document.getElementById('current-time');
updateTimeDisplay();
setInterval(updateTimeDisplay, 1000); // Update clock every second

renderTaskList();
