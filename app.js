"use strict";
/* Claim Tracker
   Users: Drew, Margo, William. Each user's log and approval count are
   separate. The "All" view combines everyone for an overall daily total.
   Approval numbers are computed per user, per day, counting Approves only,
   so edits and deletes renumber automatically with no gaps. */

const USERS = ["Drew", "Margo", "William"];
const STORE_KEY = "claim-tracker-v1";
const TZ = "America/New_York";

function dateKeyInTZ(date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function timeLabelInTZ(date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(date);
}
function todayKey() { return dateKeyInTZ(new Date()); }

function shiftDateKey(key, days) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/* Pure logic (also tested outside the browser) */
function entriesFor(entries, user, dateKey) {
  return entries
    .filter((e) => e.date === dateKey && (user === "All" || e.user === user))
    .slice()
    .sort((a, b) => a.ts - b.ts);
}
function withApprovalNumbers(dayEntries) {
  const counters = {};
  return dayEntries.map((e, i) => {
    let approvalNo = null;
    if (e.decision === "Approve") {
      counters[e.user] = (counters[e.user] || 0) + 1;
      approvalNo = counters[e.user];
    }
    return { ...e, rowNo: i + 1, approvalNo };
  });
}
function totalsFor(entries, user, dateKey) {
  const list = entriesFor(entries, user, dateKey);
  const approved = list.filter((e) => e.decision === "Approve").length;
  const rwe = list.filter((e) => e.decision === "RWE").length;
  return { reviewed: list.length, approved, rwe, nextApproval: approved + 1 };
}
function perUserTotals(entries, dateKey) {
  const out = {};
  for (const u of USERS) out[u] = totalsFor(entries, u, dateKey);
  out.All = totalsFor(entries, "All", dateKey);
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { USERS, entriesFor, withApprovalNumbers, totalsFor, perUserTotals, shiftDateKey };
}
if (typeof document !== "undefined") {
/* Browser app */
let entries = [];
try { entries = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { entries = []; }
if (!Array.isArray(entries)) entries = [];

let currentUser = localStorage.getItem("claim-tracker-user") || "Drew";
if (![...USERS, "All"].includes(currentUser)) currentUser = "Drew";
let currentDate = todayKey();
let lastAddedId = null;

const $ = (id) => document.getElementById(id);
const els = {
  todayLabel: $("todayLabel"), userTabs: $("userTabs"), dateInput: $("dateInput"),
  stats: $("stats"), breakdown: $("overallBreakdown"), form: $("logForm"),
  claim: $("claimInput"), hint: $("logHint"), banner: $("banner"),
  logBody: $("logBody"), empty: $("emptyState"), logTitle: $("logTitle"),
  userColHead: $("userColHead"), search: $("searchInput"),
};
els.dateInput.value = currentDate;

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(entries)); }

function renderTabs() {
  els.userTabs.innerHTML = "";
  for (const u of [...USERS, "All"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "user-tab" + (currentUser === u ? " active" : "");
    b.textContent = u === "All" ? "All · Overall" : u;
    b.addEventListener("click", () => { currentUser = u; localStorage.setItem("claim-tracker-user", u); render(); });
    els.userTabs.appendChild(b);
  }
}

function statCard(num, cap) { return `<div class="stat"><div class="num">${num}</div><div class="cap">${cap}</div></div>`; }

function render() {
  renderTabs();
  const niceDate = new Date(currentDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  els.todayLabel.textContent = niceDate;
  els.dateInput.value = currentDate;

  const totals = totalsFor(entries, currentUser, currentDate);
  const isAll = currentUser === "All";

  if (isAll) {
    const per = perUserTotals(entries, currentDate);
    els.breakdown.hidden = false;
    els.breakdown.innerHTML = "";
    for (const u of USERS) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "person";
      b.innerHTML = `<div class="name">${u}</div><div class="nums">${per[u].reviewed} reviewed<br>${per[u].approved} approved · ${per[u].rwe} RWE</div>`;
      b.addEventListener("click", () => { currentUser = u; localStorage.setItem("claim-tracker-user", u); render(); });
      els.breakdown.appendChild(b);
    }
    els.stats.innerHTML = statCard(totals.reviewed, "Overall reviewed") + statCard(totals.approved, "Overall approved") + statCard(totals.rwe, "Overall RWE") + statCard(totals.reviewed ? Math.round((totals.approved / totals.reviewed) * 100) + "%" : "—", "Approval rate");
  } else {
    els.breakdown.hidden = true;
    els.stats.innerHTML = statCard(totals.reviewed, "Reviewed") + statCard(totals.approved, "Approved") + statCard(totals.rwe, "RWE") + statCard(totals.nextApproval, "Next approval #");
  }

  const loggingToday = currentDate === todayKey();
  els.form.style.display = isAll ? "none" : "";
  els.hint.textContent = isAll ? "" : loggingToday
    ? `Logging as ${currentUser}. Approve counts as the next approval number for ${currentUser} today.`
    : `You are viewing ${niceDate}. New entries stamp the current time and count for today; switch to Today to log.`;
  $("approveBtn").disabled = $("rweBtn").disabled = !loggingToday || isAll;
  els.claim.disabled = !loggingToday || isAll;

  els.logTitle.textContent = isAll ? `Overall log · ${niceDate}` : `${currentUser} · ${niceDate}`;
  els.userColHead.hidden = !isAll;

  const q = els.search.value.trim().toUpperCase();
  let rows = withApprovalNumbers(entriesFor(entries, currentUser, currentDate));
  if (q) rows = rows.filter((e) => e.claim.includes(q));
  els.logBody.innerHTML = "";
  for (const e of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.rowNo}</td><td>${e.time}</td><td><strong>${e.claim}</strong></td>` +
      (isAll ? `<td>${e.user}</td>` : "") +
      `<td><span class="pill ${e.decision === "Approve" ? "approve" : "rwe"}">${e.decision}</span></td><td>${e.approvalNo ?? ""}</td>`;
    const td = document.createElement("td"); td.className = "row-actions";
    const flip = document.createElement("button"); flip.textContent = e.decision === "Approve" ? "Make RWE" : "Make Approve";
    flip.addEventListener("click", () => { e.decision = e.decision === "Approve" ? "RWE" : "Approve"; const orig = entries.find((x) => x.id === e.id); if (orig) orig.decision = e.decision; save(); render(); });
    const del = document.createElement("button"); del.textContent = "Delete";
    del.addEventListener("click", () => { entries = entries.filter((x) => x.id !== e.id); save(); render(); });
    td.append(flip, del); tr.appendChild(td);
    els.logBody.appendChild(tr);
  }
  els.empty.hidden = rows.length > 0;
}

function logClaim(decision) {
  const claim = els.claim.value.trim().toUpperCase();
  if (!claim || currentUser === "All") { els.claim.focus(); return; }
  const now = new Date();
  const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), user: currentUser, claim, decision, ts: now.getTime(), date: dateKeyInTZ(now), time: timeLabelInTZ(now) };
  entries.push(entry); lastAddedId = entry.id; save();
  currentDate = entry.date;
  els.claim.value = ""; render();
  const t = totalsFor(entries, currentUser, currentDate);
  els.banner.hidden = false;
  els.banner.innerHTML = `<span>Logged ${entry.claim} as ${decision} for ${currentUser} at ${entry.time}${decision === "Approve" ? ` · Approval #${t.approved}` : ""}.</span>`;
  const undo = document.createElement("button"); undo.textContent = "Undo";
  undo.addEventListener("click", () => { entries = entries.filter((x) => x.id !== lastAddedId); save(); els.banner.hidden = true; render(); });
  els.banner.appendChild(undo);
  els.claim.focus();
}

els.form.addEventListener("submit", (ev) => { ev.preventDefault(); logClaim("Approve"); });
$("rweBtn").addEventListener("click", () => logClaim("RWE"));
els.search.addEventListener("input", render);
els.dateInput.addEventListener("change", () => { if (els.dateInput.value) { currentDate = els.dateInput.value; render(); } });
$("todayBtn").addEventListener("click", () => { currentDate = todayKey(); render(); });
$("prevDayBtn").addEventListener("click", () => { currentDate = shiftDateKey(currentDate, -1); render(); });
$("nextDayBtn").addEventListener("click", () => { currentDate = shiftDateKey(currentDate, 1); render(); });

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$("exportCsvBtn").addEventListener("click", () => {
  const rows = [["Date", "Time", "User", "Claim", "Decision", "Approval #"]];
  const sorted = entries.slice().sort((a, b) => a.ts - b.ts);
  const byDayUser = {};
  for (const e of sorted) {
    const k = e.date + "|" + e.user;
    byDayUser[k] = byDayUser[k] || [];
    byDayUser[k].push(e);
  }
  const num = {};
  for (const e of sorted) {
    let n = "";
    if (e.decision === "Approve") { const k = e.date + "|" + e.user; num[k] = (num[k] || 0) + 1; n = num[k]; }
    rows.push([e.date, e.time, e.user, e.claim, e.decision, n]);
  }
  download(`claim-tracker-${todayKey()}.csv`, rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
});
$("exportJsonBtn").addEventListener("click", () => download(`claim-tracker-backup-${todayKey()}.json`, JSON.stringify(entries, null, 2), "application/json"));
$("importFile").addEventListener("change", async (ev) => {
  const file = ev.target.files[0]; if (!file) return;
  try {
    const incoming = JSON.parse(await file.text());
    if (!Array.isArray(incoming)) throw new Error("not a backup");
    const ids = new Set(entries.map((e) => e.id));
    let added = 0;
    for (const e of incoming) {
      if (e && e.id && !ids.has(e.id) && USERS.includes(e.user) && e.claim && (e.decision === "Approve" || e.decision === "RWE")) { entries.push(e); ids.add(e.id); added++; }
    }
    save(); render(); alert(`Imported ${added} new entr${added === 1 ? "y" : "ies"}.`);
  } catch { alert("That file could not be imported. Use a Backup JSON file from this app."); }
  ev.target.value = "";
});

render();
}
