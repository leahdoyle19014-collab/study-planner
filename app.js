// ====== Configurable bits ======

// Personalise: change reminder offsets here (in days before due date)
const REMINDER_DAYS = [7, 4];

const STORAGE_KEYS = {
  tasks: "sp_tasks_ddmmyyyy_v1",
  assignments: "sp_assignments_ddmmyyyy_v1",
};

let tasks = [];
let assignments = [];

const todayDate = new Date();
const todayStr = toDateStr(todayDate);

// ====== Helpers ======

function toDateStr(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}


function parseStoredDate(str) {
  const [d, m, y] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
// ISO (YYYY-MM-DD) → display (DD-MM-YYYY)
function isoToDisplay(isoStr) {
  const [y, m, d] = isoStr.split("-").map(Number);
  return `${String(d).padStart(2,"0")}-${String(m).padStart(2,"0")}-${y}`;
}

// display (DD-MM-YYYY) → ISO (YYYY-MM-DD)
function displayToIso(displayStr) {
  const [d, m, y] = displayStr.split("-").map(Number);
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}


function save() {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  localStorage.setItem(STORAGE_KEYS.assignments, JSON.stringify(assignments));
}

function load() {
  tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks) || "[]");
  assignments = JSON.parse(localStorage.getItem(STORAGE_KEYS.assignments) || "[]");
}

function getReminderDates(dueDateStr) {
  const due = parseStoredDate(dueDateStr);
  const res = [];
  for (const n of REMINDER_DAYS) {
    const d = new Date(due);
    d.setDate(d.getDate() - n);
    res.push(toDateStr(d));
  }
  return res;
}

function getTodayReminders() {
  const result = [];
  for (const a of assignments) {
    const reminderDates = getReminderDates(a.dueDate);
    reminderDates.forEach((rd, idx) => {
      if (rd === todayStr) {
        result.push({
          assignment: a,
          daysBefore: REMINDER_DAYS[idx],
        });
      }
    });
  }
  return result;
}

// ====== Rendering: Today pane ======

function renderToday() {
  document.getElementById("today-label").textContent = new Date().toDateString();

  renderTodayTasks();
  renderTodayReminders();
}

function renderTodayTasks() {
  const container = document.getElementById("today-tasks");
  container.innerHTML = "";

  const todaysTasks = tasks.filter((t) => t.date === todayStr);

  if (todaysTasks.length === 0) {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.textContent = "No tasks for today yet.";
    container.appendChild(div);
    return;
  }

  todaysTasks.forEach((task) => {
    const row = document.createElement("div");
    row.className = "task-item";
    if (task.done) row.classList.add("done");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      save();
      renderTodayTasks();
    });

    const titleSpan = document.createElement("span");
    titleSpan.textContent = task.title;

    const metaSpan = document.createElement("span");
    metaSpan.style.fontSize = "0.75rem";
    metaSpan.style.color = "var(--text-muted)";
    let metaText = [];
    if (task.category) metaText.push(task.category);
    if (task.notes) metaText.push("notes");
    metaSpan.textContent = metaText.length ? `(${metaText.join(" • ")})` : "";

    row.appendChild(checkbox);
    row.appendChild(titleSpan);
    if (metaText.length) row.appendChild(metaSpan);

    container.appendChild(row);
  });
}

function renderTodayReminders() {
  const container = document.getElementById("today-reminders");
  container.innerHTML = "";

  const reminders = getTodayReminders();

  if (reminders.length === 0) {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.textContent = "No assignment reminders today.";
    container.appendChild(div);
    return;
  }

  reminders.forEach((r) => {
    const div = document.createElement("div");
    div.className = "reminder-item";
    const modulePart = r.assignment.module
      ? ` [${r.assignment.module}]`
      : "";
    div.textContent = `${r.assignment.title}${modulePart} is due in ${r.daysBefore} day(s) on ${r.assignment.dueDate}`;
    container.appendChild(div);
  });
}

// ====== Rendering: Calendar ======

function renderCalendarForMonth(date) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth(); // 0-based

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  // Add weekday headers
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  weekdays.forEach((wd) => {
    const header = document.createElement("div");
    header.style.fontSize = "0.7rem";
    header.style.fontWeight = "600";
    header.style.textAlign = "center";
    header.style.color = "var(--text-muted)";
    header.textContent = wd;
    grid.appendChild(header);
  });

  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Calculate offset (how many blank cells before day 1)
  let startDay = firstOfMonth.getDay(); // 0 = Sun, 1 = Mon, ...
  if (startDay === 0) startDay = 7; // make Monday=1..Sunday=7

  const totalCells = weekdays.length + (startDay - 1) + daysInMonth;

  for (let i = weekdays.length; i < totalCells; i++) {
    const cellIndex = i - weekdays.length; // 0-based for calendar days
    const dayNumber = cellIndex - (startDay - 2);

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      const emptyCell = document.createElement("div");
      grid.appendChild(emptyCell);
      continue;
    }

    const dateStr = toDateStr(new Date(year, monthIndex, dayNumber));
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day";

    // header
    const header = document.createElement("div");
    header.className = "calendar-day-header";

    const num = document.createElement("div");
    num.className = "calendar-day-number";
    num.textContent = dayNumber;
    header.appendChild(num);

    if (dateStr === todayStr) {
      cell.classList.add("calendar-day-today");
    }

    cell.appendChild(header);

    const counters = document.createElement("div");
    counters.className = "counters";

    const taskCount = tasks.filter((t) => t.date === dateStr).length;
    const assnCount = assignments.filter((a) => a.dueDate === dateStr).length;

    if (taskCount > 0) {
      const tDot = document.createElement("span");
      tDot.className = "counter-dot tasks";
      tDot.textContent = taskCount;
      counters.appendChild(tDot);
    }

    if (assnCount > 0) {
      const aDot = document.createElement("span");
      aDot.className = "counter-dot assignments";
      aDot.textContent = assnCount;
      counters.appendChild(aDot);
    }

    if (taskCount === 0 && assnCount === 0) {
      counters.textContent = "";
    }

    cell.appendChild(counters);

    cell.addEventListener("click", () => {
      renderSelectedDay(dateStr);
    });

    grid.appendChild(cell);
  }
}

function renderSelectedDay(dateStr) {
  const container = document.getElementById("selected-day-details");
  container.innerHTML = "";

  const heading = document.createElement("div");
  heading.style.fontWeight = "600";
  heading.style.marginBottom = "0.25rem";
  heading.textContent = dateStr === todayStr ? `${dateStr} (Today)` : dateStr;
  container.appendChild(heading);

  const dayTasks = tasks.filter((t) => t.date === dateStr);
  const dayAssignments = assignments.filter((a) => a.dueDate === dateStr);

  const tasksHeader = document.createElement("h4");
  tasksHeader.textContent = "Tasks";
  container.appendChild(tasksHeader);

  if (dayTasks.length === 0) {
    const p = document.createElement("div");
    p.className = "empty-state";
    p.textContent = "No tasks for this day.";
    container.appendChild(p);
  } else {
    const ul = document.createElement("ul");
    dayTasks.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t.title + (t.done ? " (done)" : "");
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  const assnHeader = document.createElement("h4");
  assnHeader.textContent = "Assignments due";
  container.appendChild(assnHeader);

  if (dayAssignments.length === 0) {
    const p = document.createElement("div");
    p.className = "empty-state";
    p.textContent = "No assignments due on this day.";
    container.appendChild(p);
  } else {
    const ul = document.createElement("ul");
    dayAssignments.forEach((a) => {
      const li = document.createElement("li");
      const modulePart = a.module ? ` [${a.module}]` : "";
      li.textContent = a.title + modulePart;
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }
}

// ====== Modals ======

function showModal(id) {
  document.getElementById("modal-backdrop").classList.remove("hidden");
  document.getElementById(id).classList.remove("hidden");
}

function hideModal(id) {
  document.getElementById("modal-backdrop").classList.add("hidden");
  document.getElementById(id).classList.add("hidden");
}

// ====== Event wiring ======

function setupEventListeners() {
  // open modals
 // NEW TASK
document.getElementById("btn-new-task").addEventListener("click", () => {
  const dateInput = document.getElementById("task-date");
  dateInput.value = displayToIso(todayStr);

  document.getElementById("task-title").value = "";
  document.getElementById("task-category").value = "";
  document.getElementById("task-notes").value = "";

  showModal("task-modal");
});



  document
  .getElementById("btn-new-assignment")
  .addEventListener("click", () => {
    // Get the <input type="date"> element for the assignment due date
    const dueInput = document.getElementById("assignment-due");
    dueInput.value = displayToIso(todayStr);


    document.getElementById("assignment-title").value = "";
    document.getElementById("assignment-module").value = "";
    document.getElementById("assignment-notes").value = "";
    document.getElementById("assignment-create-task").checked = true;
    showModal("assignment-modal");
  });


  // cancel buttons
  document.getElementById("task-cancel").addEventListener("click", () => {
    hideModal("task-modal");
  });

  document
    .getElementById("assignment-cancel")
    .addEventListener("click", () => {
      hideModal("assignment-modal");
    });

  // close modals when clicking backdrop
  document.getElementById("modal-backdrop").addEventListener("click", () => {
    hideModal("task-modal");
    hideModal("assignment-modal");
  });

  // Task form submit
  document.getElementById("task-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("task-title").value.trim();
  const iso = document.getElementById("task-date").value;
  const date = isoToDisplay(iso);
  const category = document.getElementById("task-category").value;
  const notes = document.getElementById("task-notes").value.trim();

  if (!title || !date) return;

  tasks.push({
    id: "task_" + Date.now(),
    title,
    date,
    done: false,
    category,
    notes,
  });

  save();
  hideModal("task-modal");
  renderToday();
  const monthDate = parseStoredDate(date);
  setMonthPicker(monthDate);
  renderCalendarForMonth(monthDate);
});

  

  // Assignment form submit
  document
    .getElementById("assignment-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("assignment-title").value.trim();
      const module = document.getElementById("assignment-module").value.trim();
      const iso = document.getElementById("assignment-due").value;
      const dueDate = isoToDisplay(iso);
      const notes = document.getElementById("assignment-notes").value.trim();
      const createTask = document.getElementById(
        "assignment-create-task"
      ).checked;

      if (!title || !dueDate) return;

      const assignment = {
        id: "assn_" + Date.now(),
        title,
        module,
        dueDate,
        notes,
      };

      assignments.push(assignment);
      save();

      if (createTask) {
        tasks.push({
          id: "task_" + Date.now() + "_due",
          title: `Finish: ${title}`,
          date: dueDate,
          done: false,
          category: "Study",
          notes: module ? `Module: ${module}` : "",
        });
        save();
      }

      hideModal("assignment-modal");
      renderToday();
      const monthDate = parseStoredDate(dueDate);
      setMonthPicker(monthDate);
      renderCalendarForMonth(monthDate);
    });

  // Month picker
  const monthPicker = document.getElementById("month-picker");
  monthPicker.addEventListener("change", () => {
    const [y, m] = monthPicker.value.split("-");
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    renderCalendarForMonth(d);
  });
}

function setMonthPicker(date) {
  const monthPicker = document.getElementById("month-picker");
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  monthPicker.value = `${y}-${m}`;
}

// ====== Service Worker Registration ======

// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", () => {
//     navigator.serviceWorker
//       .register("service-worker.js")
//       .catch((err) => console.error("SW registration failed", err));
//   });
// }


// ====== Init ======

function init() {
  load();
  setupEventListeners();

  // Today pane
  renderToday();

  // Calendar
  setMonthPicker(todayDate);
  renderCalendarForMonth(todayDate);
  renderSelectedDay(todayStr);
}

document.addEventListener("DOMContentLoaded", init);





