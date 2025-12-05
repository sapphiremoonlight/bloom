document.addEventListener("DOMContentLoaded", () => {
// --- simple local DB ---
const DB_KEY = 'bloom_local_db_v1';
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw
      ? JSON.parse(raw)
      : { user: { avgCycle: 28, avgPeriod: 5 }, entries: [], cycles: [] };
  } catch (e) {
    console.error(e);
    return { user: { avgCycle: 28, avgPeriod: 5 }, entries: [], cycles: [] };
  }
}
function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
let DB = loadDB();

// --- helpers ---
const fmt = d => new Date(d).toLocaleDateString();
const ISO = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const todayISO = () => ISO(new Date());

// --- missing function fixed ---
function rangeDates(startISO, endISO) {
  if (!startISO || !endISO) return [];
  const start = new Date(startISO);
  const end = new Date(endISO);
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(ISO(d));
  }
  return dates;
}

// --- compute cycles ---
function computeCycles() {
  const starts = DB.entries
    .filter(e => e.type === 'period_start')
    .map(e => e.date)
    .sort((a,b)=>new Date(a)-new Date(b));

  const cycles = [];
  for (let i = 1; i < starts.length; i++) {
    const prev = new Date(starts[i - 1]);
    const cur = new Date(starts[i]);
    const len = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
    cycles.push({ start: starts[i - 1], nextStart: starts[i], length: len });
  }

  DB.cycles = cycles;
  saveDB(DB);
  return cycles;
}

function stats() {
  const cycles = computeCycles();
  const n = cycles.length;
  const avgCycle = n
    ? Math.round(cycles.reduce((s, c) => s + c.length, 0) / n)
    : DB.user.avgCycle || 28;
  const avgPeriod = DB.user.avgPeriod || 5;
  return { cycles, avgCycle, avgPeriod };
}

// --- prediction ---
function predict() {
  const cycles = computeCycles();
  const lastStartEntry = DB.entries
    .filter(e => e.type === "period_start")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-1)[0];

  const lastStart = lastStartEntry ? new Date(lastStartEntry.date) : null;
  const lastLens = cycles.slice(-6).map(c => c.length);
  const avg = lastLens.length
    ? Math.round(lastLens.reduce((a, b) => a + b, 0) / lastLens.length)
    : DB.user.avgCycle || 28;

  const variance =
    lastLens.length > 1
      ? Math.round(
          lastLens.reduce((s, c) => s + Math.pow(c - avg, 2), 0) /
            (lastLens.length - 1)
        )
      : 0;

  let predictedStart = null, ovulation = null, lutealStart = null, lutealEnd = null, fertileStart = null, fertileEnd = null;

  if (lastStart) {
    predictedStart = new Date(lastStart);
    predictedStart.setDate(predictedStart.getDate() + avg);

    ovulation = new Date(predictedStart);
    ovulation.setDate(ovulation.getDate() - 14);

    fertileStart = new Date(ovulation);
    fertileStart.setDate(fertileStart.getDate() - 5);
    fertileEnd = new Date(ovulation);

    lutealStart = new Date(ovulation);
    lutealStart.setDate(lutealStart.getDate() + 1);

    lutealEnd = new Date(predictedStart);
    lutealEnd.setDate(lutealEnd.getDate() - 1);
  }

  const confidence = Math.max(20, 100 - Math.min(80, variance * 3));

  return { predictedStart, ovulation, fertileStart, fertileEnd, lutealStart, lutealEnd, avg, variance, completed: cycles.length, confidence };
}

// --- compute period ranges ---
function computePeriodRanges() {
  const starts = DB.entries
    .filter(e => e.type === "period_start")
    .map(e => e.date)
    .sort();

  const ends = DB.entries
    .filter(e => e.type === "period_end")
    .map(e => e.date)
    .sort();

  const ranges = [];

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = ends.find(e => e >= start) || start;
    ranges.push(rangeDates(start, end));
  }

  return ranges.flat();
}

// --- UI render ---
document.getElementById("todayHuman").textContent = new Date().toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric" });

// ... the rest of your JS remains unchanged, except CSV fix below:

// History CSV
document.getElementById("showHistory").onclick = () => {
  const rows = DB.entries
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(
      e =>
        `${e.date},${e.type},${e.flow || ""},${e.appetite || ""},${e.mood || ""},"${(e.notes || "").replace(/"/g, '""')}"`
    );
  const csv = "date,type,flow,appetite,mood,notes\n" + rows.join("\n");
  downloadData(csv, "bloom_history.csv", "text/csv");
};

// compute cycles from entries (period start tags)
function computeCycles() {
  const starts = DB.entries
    .filter(e => e.type === 'period_start')
    .map(e => e.date)
    .sort();

  const cycles = [];
  for (let i = 1; i < starts.length; i++) {
    const prev = new Date(starts[i - 1]);
    const cur = new Date(starts[i]);
    const len = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
    cycles.push({ start: starts[i - 1], nextStart: starts[i], length: len });
  }

  DB.cycles = cycles;
  saveDB(DB);
  return cycles;
}

function stats() {
  const cycles = computeCycles();
  const n = cycles.length;
  const avgCycle = n
    ? Math.round(cycles.reduce((s, c) => s + c.length, 0) / n)
    : DB.user.avgCycle || 28;
  const avgPeriod = DB.user.avgPeriod || 5;
  return { cycles, avgCycle, avgPeriod };
}

// prediction
function predict() {
  const cycles = computeCycles();

  const lastStartEntry = DB.entries
    .filter(e => e.type === "period_start")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-1)[0];

  const lastStart = lastStartEntry ? new Date(lastStartEntry.date) : null;

  const lastLens = cycles.slice(-6).map(c => c.length);

  const avg = lastLens.length
    ? Math.round(lastLens.reduce((a, b) => a + b, 0) / lastLens.length)
    : DB.user.avgCycle || 28;

  const variance =
    lastLens.length > 1
      ? Math.round(
          lastLens.reduce((s, c) => s + Math.pow(c - avg, 2), 0) /
            (lastLens.length - 1)
        )
      : 0;

  let predictedStart = null,
    ovulation = null,
    lutealStart = null,
    lutealEnd = null,
    fertileStart = null,
    fertileEnd = null;

  if (lastStart) {
    predictedStart = new Date(lastStart);
    predictedStart.setDate(predictedStart.getDate() + avg);

    ovulation = new Date(predictedStart);
    ovulation.setDate(ovulation.getDate() - 14);

    fertileStart = new Date(ovulation);
    fertileStart.setDate(fertileStart.getDate() - 5);
    fertileEnd = new Date(ovulation);

    lutealStart = new Date(ovulation);
    lutealStart.setDate(lutealStart.getDate() + 1);

    lutealEnd = new Date(predictedStart);
    lutealEnd.setDate(lutealEnd.getDate() - 1);
  }

  const confidence = Math.max(20, 100 - Math.min(80, variance * 3));

  return {
    predictedStart,
    ovulation,
    fertileStart,
    fertileEnd,
    lutealStart,
    lutealEnd,
    avg,
    variance,
    completed: cycles.length,
    confidence
  };
}

// compute full period ranges
function computePeriodRanges() {
  const starts = DB.entries
    .filter(e => e.type === "period_start")
    .map(e => e.date)
    .sort();

  const ends = DB.entries
    .filter(e => e.type === "period_end")
    .map(e => e.date)
    .sort();

  const ranges = [];

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = ends.find(e => e >= start) || start;
    ranges.push(rangeDates(start, end));
  }

  return ranges.flat();
}

// UI render
const todayHuman = document.getElementById("todayHuman");
todayHuman.textContent = new Date().toLocaleString(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric"
});

// Save daily data
document.getElementById("saveEntry").onclick = () => {
  const flow = document.getElementById("flowSel").value;
  const appetite = document.getElementById("appetiteSel").value;
  const mood = document.getElementById("moodSel").value;
  const notes = document.getElementById("notes").value.trim();

  const entry = {
    date: todayISO(),
    type: "day_entry",
    flow,
    appetite,
    mood,
    notes,
    created_at: new Date().toISOString()
  };

  DB.entries.push(entry);
  saveDB(DB);
  refreshAll();
  toast("Saved");
};

document.getElementById("logStartBtn").onclick = () => {
  DB.entries.push({
    date: todayISO(),
    type: "period_start",
    created_at: new Date().toISOString()
  });
  saveDB(DB);
  refreshAll();
  toast("Period start logged");
};

document.getElementById("logEndBtn").onclick = () => {
  DB.entries.push({
    date: todayISO(),
    type: "period_end",
    created_at: new Date().toISOString()
  });
  saveDB(DB);
  refreshAll();
  toast("Period end logged");
};

// History CSV
document.getElementById("showHistory").onclick = () => {
  const rows = DB.entries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      e =>
        `${e.date},${e.type},${e.flow || ""},${e.appetite || ""},${e.mood ||
          ""},"${(e.notes || "").replace(/\"/g, '\"')}"`
    );

  const csv = "date,type,flow,appetite,mood,notes\n" + rows.join("\n");
  downloadData(csv, "bloom_history.csv", "text/csv");
};

// cycle CSV export
document.getElementById("exportCSV").onclick = () => {
  const cycles = computeCycles();
  const rows = cycles.map(c => `${c.start},${c.nextStart},${c.length}`);
  const csv = "start,next_start,length\n" + rows.join("\n");
  downloadData(csv, "bloom_cycles.csv", "text/csv");
};

// export JSON
document.getElementById("exportJSON").onclick = () => {
  downloadData(
    JSON.stringify(DB, null, 2),
    "bloom_backup.json",
    "application/json"
  );
};

// import JSON
document.getElementById("importJSON").onclick = () => {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "application/json";
  inp.onchange = ev => {
    const file = ev.target.files[0];
    if (!file) return;
    file.text().then(txt => {
      try {
        DB = JSON.parse(txt);
        saveDB(DB);
        refreshAll();
        toast("Imported JSON");
      } catch (e) {
        alert("Invalid file");
      }
    });
  };
  inp.click();
};

// clear db
document.getElementById("clearData").onclick = () => {
  if (confirm("Clear all local data? This cannot be undone.")) {
    localStorage.removeItem(DB_KEY);
    DB = loadDB();
    refreshAll();
    toast("Cleared");
  }
};

// install guide
document.getElementById("installGuides").onclick = () => {
  alert(
    "How to install: open this file in your browser. On Android/Huawei browser: open menu (⋮) → Add to Home screen / Install."
  );
};

function downloadData(data, filename, type) {
  const blob = new Blob([data], { type: type || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.right = "16px";
  el.style.bottom = "16px";
  el.style.padding = "10px 12px";
  el.style.background = "linear-gradient(90deg,var(--accent),var(--accent-2))";
  el.style.color = "white";
  el.style.borderRadius = "10px";
  el.style.boxShadow = "var(--shadow)";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// Calendar + Navigation
let view = new Date();
document.getElementById("prevMonth").onclick = () => {
  view.setMonth(view.getMonth() - 1);
  renderCalendar();
};
document.getElementById("nextMonth").onclick = () => {
  view.setMonth(view.getMonth() + 1);
  renderCalendar();
};

//compute all note dates
function computeNoteDates() {
  return DB.entries
    .filter(e => e.type === "note")
    .map(e => e.date);
}

// RENDER CALENDAR
function renderCalendar() {
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";

  const m = view.getMonth();
  const y = view.getFullYear();

  document.getElementById("monthLabel").textContent = view.toLocaleString(
    undefined,
    { month: "long" }
  );
  document.getElementById("yearLabel").textContent = y;

  const first = new Date(y, m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // empty cells for previous month
  for (let i = 0; i < startDay; i++) {
    const el = document.createElement("div");
    el.className = "day";
    el.style.opacity = 0.4;
    cal.appendChild(el);
  }

  const p = predict();
  const periodAll = computePeriodRanges();
  const fertileRange = rangeDates(p.fertileStart, p.fertileEnd);
  const lutealRange = rangeDates(p.lutealStart, p.lutealEnd);
  const noteDates = computeNoteDates(); // <-- note days

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const iso = ISO(date);

    const el = document.createElement("div");
    el.className = "day";
    el.style.cursor = "pointer";

    const hdr = document.createElement("div");
    hdr.className = "dayHeader";
    hdr.textContent = d;
    el.appendChild(hdr);

    // Apply CSS classes
    if (periodAll.includes(iso)) el.classList.add("period");
    else if (fertileRange.includes(iso)) el.classList.add("fertile");
    else if (lutealRange.includes(iso)) el.classList.add("luteal");
    else if (noteDates.includes(iso)) el.classList.add("noteOnly"); // new line

    if (iso === todayISO()) el.classList.add("today");

    el.onclick = () => openDayEditor(iso);
    cal.appendChild(el);
  }
}


// modal editor
function openDayEditor(iso) {
  const modal = document.getElementById("dayModal");
  const content = document.getElementById("modalContent");
  const title = document.getElementById("modalTitle");

  const entries = DB.entries.filter(e => e.date === iso);

  title.textContent = new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  content.innerHTML = `
    <div class="modalSectionTitle">Entries for this day</div>
    ${entries.length === 0 ? `<div class="small" style="opacity:.6;margin-bottom:10px">No logs yet</div>` :
    entries.map((e, i) => `
      <div class="modalEntry">
        <div>
          <strong>${labelEntryType(e.type)}</strong>
          ${printEntryValues(e)}
        </div>
        <button class="deleteEntryBtn" data-del="${i}">Delete</button>
      </div>
    `).join("")}

    <div class="modalSectionTitle" style="margin-top:18px">Add something</div>
    <div class="modalAddButtons">
      <button id="addStart">Add period start</button>
      <button id="addEnd">Add period end</button>
      <button id="addNote">Add note</button>
    </div>
  `;

  modal.style.display = "flex";

  content.querySelectorAll("button[data-del]").forEach(btn => {
    btn.onclick = () => {
      const index = parseInt(btn.dataset.del, 10);
      const entry = entries[index];
      DB.entries = DB.entries.filter(e => e !== entry);
      saveDB(DB);
      modal.style.display = "none";
      refreshAll();
    };
  });

  document.getElementById("addStart").onclick = () => {
    DB.entries.push({ date: iso, type: "period_start", created_at: new Date().toISOString() });
    saveDB(DB);
    modal.style.display = "none";
    refreshAll();
  };
  document.getElementById("addEnd").onclick = () => {
    DB.entries.push({ date: iso, type: "period_end", created_at: new Date().toISOString() });
    saveDB(DB);
    modal.style.display = "none";
    refreshAll();
  };
  document.getElementById("addNote").onclick = () => {
    const txt = prompt("Note:");
    if (txt && txt.trim() !== "") {
      DB.entries.push({ date: iso, type: "note", notes: txt.trim(), created_at: new Date().toISOString() });
      saveDB(DB);
      modal.style.display = "none";
      refreshAll();
    }
  };

  document.getElementById("closeModal").onclick = () => (modal.style.display = "none");
}

function labelEntryType(type) {
  if (type === "period_start") return "Period start";
  if (type === "period_end") return "Period end";
  if (type === "day_entry") return "Daily log";
  if (type === "note") return "Note";
  return type;
}

function printEntryValues(e) {
  let s = "";
  if (e.flow) s += ` · Flow: ${e.flow}`;
  if (e.mood) s += ` · Mood: ${e.mood}`;
  if (e.appetite) s += ` · Appetite: ${e.appetite}`;
  if (e.notes) s += `<div class="small">${e.notes}</div>`;
  return s;
}

function refreshAll() {
  const p = predict();

  document.getElementById("predictedStart").textContent = p.predictedStart
    ? p.predictedStart.toLocaleDateString()
    : "need at least one start";

  document.getElementById("ovulationEst").textContent = p.ovulation
    ? p.ovulation.toLocaleDateString()
    : "—";

  document.getElementById("lutealWindow").textContent = p.lutealStart
    ? `${p.lutealStart.toLocaleDateString()} → ${p.lutealEnd.toLocaleDateString()}`
    : "—";

  document.getElementById("confidence").textContent = p.confidence + "%";
  document.getElementById("completedCyclesInfo").textContent = `${p.completed} completed cycles`;

  document.getElementById("avgCycle").textContent = p.avg + " days";
  document.getElementById("avgPeriod").textContent = DB.user.avgPeriod + " days";

  const lastStart = DB.entries
    .filter(e => e.type === "period_start")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-1)[0];

  document.getElementById("lastStart").textContent = lastStart ? lastStart.date : "—";

  renderCalendar();
}

// init
computeCycles();
refreshAll();
renderCalendar();

// import shortcut
window.addEventListener("keydown", e => {
  if (e.key === "i" && (e.ctrlKey || e.metaKey)) {
    const txt = prompt("Paste exported JSON here");
    if (txt) {
      try {
        DB = JSON.parse(txt);
        saveDB(DB);
        refreshAll();
        toast("Imported");
      } catch (err) {
        alert("bad json");
      }
    }
  }
});

// prefill today's entry
(function prefillToday() {
  const today = todayISO();
  const e = DB.entries.filter(x => x.date === today && x.type === "day_entry")[0];
  if (e) {
    document.getElementById("flowSel").value = e.flow || "";
    document.getElementById("appetiteSel").value = e.appetite || "";
    document.getElementById("moodSel").value = e.mood || "";
    document.getElementById("notes").value = e.notes || "";
  }
})();
document.getElementById("flowSel").focus();

 computeCycles();
  refreshAll();
  renderCalendar();
});