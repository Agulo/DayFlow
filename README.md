# ◈ DayFlow — Smart Day Planner

> Stack your tasks. Protect your rest.

---

## What is DayFlow?

DayFlow is a lightweight web app that helps you plan your day without overloading yourself. You tell it what you need to do and how long each thing will take — it figures out the best way to fit everything in, adds breathing room between tasks, and shows you exactly how much free time you have left.

No accounts. No syncing. Just open it and go.

---

## Getting Started

1. Download or copy the three files into the same folder:
   - `index.html`
   - `style.css`
   - `app.js`

2. Open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari).

3. That's it — no installation, no internet connection required after the page loads.

---

## How to Use It

### Step 1 — Set Your Day

Every day is different, so you set the window fresh each time.

| Field | What it does |
|---|---|
| **Day Starts** | The very beginning of your day (e.g. when you wake up) |
| **Day Ends** | When you want your day to be completely done |
| **Schedule From** | The earliest a task can begin today (e.g. after morning routine) |

> **Tip:** If you have a slow morning, set *Day Starts* to 07:00 but *Schedule From* to 09:00. The gap before your first task will automatically show as free time.

---

### Step 2 — Add Your Tasks

- Type what you need to do in the **task name** field
- Set how long it will take using **Hours** and **Minutes**
- Click **Add Task** (or press **Enter**)
- Repeat for every task you need to get done today
- You can remove any task from the queue by clicking the **×** button next to it

---

### Step 3 — Generate Your Schedule

Click **Generate My Day**.

DayFlow will:
- Pack your tasks in order, starting from your *Schedule From* time
- Insert a **30-minute break** between every task automatically
- Mark all remaining time in the day as **Free / Rest Time**
- Show a summary of your total free time at the bottom

If your tasks don't fit in the day, it will tell you exactly how many minutes or hours you're over — so you can remove something or adjust your times.

---

## How the Scheduling Works

```
[Day Start] → [Free Time?] → [Task 1] → [30 min break] → [Task 2] → [30 min break] → ... → [Free Time] → [Day End]
```

- Tasks are scheduled **as early as possible** from your *Schedule From* time
- A **30-minute gap** is enforced between every task — no exceptions
- Whatever time is left over (before the first task and after the last) becomes **free/rest time**
- The goal is always to **maximise your free time** by keeping tasks compact

---

## Features

- ✅ Custom day window — set different start/end times every day
- ✅ Conflict-free scheduling — tasks never overlap
- ✅ 30-minute breaks between every task, automatically
- ✅ Maximum free time preserved
- ✅ Clear visual timeline with colour-coded blocks
- ✅ Overflow warning — tells you if your tasks don't fit
- ✅ Works entirely offline in any browser
- ✅ No data stored or sent anywhere

---

## File Structure

```
dayflow/
├── index.html   — App structure and layout
├── style.css    — All styling and theme
├── app.js       — Scheduling logic and interactions
└── README.md    — This file
```

---

## Browser Support

Works in any modern browser. No frameworks or build tools needed.

| Browser | Supported |
|---|---|
| Chrome 90+ | ✅ |
| Firefox 88+ | ✅ |
| Edge 90+ | ✅ |
| Safari 14+ | ✅ |

---

## Customising

Want to tweak the gap between tasks? Open `app.js` and change this line near the top:

```js
const GAP_MINS = 30; // enforced gap between tasks
```

Set it to `15` for shorter breaks or `45` for longer ones.

---

## License

Free to use and modify for personal use.
