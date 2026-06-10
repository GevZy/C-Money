/* ═══════════════════════════════════════════
   FINFLOW — app.js
   All data lives in localStorage under the
   key "finflow_data" as a single JSON object.
═══════════════════════════════════════════ */

// ─── DATA SCHEMA ────────────────────────────
const DEFAULT_STATE = {
  month: "",
  monthlyIncome: 0,
  miscIncomes: [],     // { id, label, amount, ts }
  expenses: [],        // { expId, name, amount, billId|savId|null, ts }
  bills: [],           // { id, name, target, allocated }
  savingTargets: [],   // { id, name, target, allocated }
  _nextExpId: 1,
  _nextBillId: 1,
  _nextSavingId: 1,
  _nextMiscId: 1,
};

// ─── STORAGE ────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem("finflow_data");
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (_) {}
  return { ...DEFAULT_STATE, month: currentMonthLabel() };
}

function saveState() {
  localStorage.setItem("finflow_data", JSON.stringify(state));
}

function currentMonthLabel() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── STATE ──────────────────────────────────
let state = loadState();

// ─── HELPERS ────────────────────────────────
function fmt(n) {
  return Math.round(n).toLocaleString("en-RW");
}

function pct(a, b) {
  if (!b) return 0;
  return Math.min(100, Math.round((a / b) * 100));
}

function uid(prefix, n) {
  return prefix + String(n).padStart(3, "0");
}

function toast(msg, delay = 2800) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), delay);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── DERIVED VALUES ─────────────────────────
function totalMiscIncome() {
  return (state.miscIncomes || []).reduce((s, m) => s + m.amount, 0);
}

function totalIncome() {
  return state.monthlyIncome + totalMiscIncome();
}

function totalExpenses() {
  return state.expenses.reduce((s, e) => s + e.amount, 0);
}

function totalAllocatedToBills() {
  return state.bills.reduce((s, b) => s + (b.allocated || 0), 0);
}

function totalAllocatedToSavings() {
  return state.savingTargets.reduce((s, t) => s + (t.allocated || 0), 0);
}

function balance() {
  return totalIncome() - totalExpenses();
}

// ─── RENDER: TOP BAR ────────────────────────
function renderTopBar() {
  document.getElementById("currentMonthBadge").textContent =
    state.month || currentMonthLabel();
}

// ─── RENDER: HOME ───────────────────────────
function renderHome() {
  const bal   = balance();
  const saved = totalAllocatedToSavings();
  const bills = totalAllocatedToBills();

  document.getElementById("homeBalance").innerHTML =
    fmt(bal) + ' <span class="currency">RWF</span>';
  document.getElementById("homeSaved").textContent = fmt(saved) + " RWF";
  document.getElementById("homeBills").textContent = fmt(bills) + " RWF";

  // ── Bills goal block ──
  const totalBillTarget = state.bills.reduce((s, b) => s + b.target, 0);
  const billsAlloc      = totalAllocatedToBills();
  const billsPct        = pct(billsAlloc, totalBillTarget);

  document.getElementById("billsGoalMeta").textContent =
    fmt(billsAlloc) + " / " + fmt(totalBillTarget) + " RWF";
  document.getElementById("billsGoalPct").textContent  = billsPct + "%";
  document.getElementById("billsProgress").style.width = billsPct + "%";

  const billItemList = document.getElementById("billsItemList");
  if (state.bills.length === 0) {
    billItemList.innerHTML =
      '<div style="font-size:.75rem;color:var(--text-3);padding:.25rem 0">No bills added yet.</div>';
  } else {
    billItemList.innerHTML = state.bills.map(b => {
      const p = pct(b.allocated || 0, b.target);
      return `
        <div class="goal-item">
          <div class="goal-item-top">
            <span class="goal-item-name">${escHtml(b.name)}</span>
            <span class="goal-item-pct">${p}%</span>
          </div>
          <div class="goal-item-meta">${fmt(b.allocated||0)} / ${fmt(b.target)} RWF</div>
          <div class="progress-track" style="height:4px">
            <div class="progress-fill fill-item" style="width:${p}%"></div>
          </div>
        </div>`;
    }).join("");
  }

  // ── Savings goal block ──
  const totalSavTarget = state.savingTargets.reduce((s, t) => s + t.target, 0);
  const savAlloc       = totalAllocatedToSavings();
  const savPct         = pct(savAlloc, totalSavTarget);

  document.getElementById("savingsGoalMeta").textContent =
    fmt(savAlloc) + " / " + fmt(totalSavTarget) + " RWF";
  document.getElementById("savingsGoalPct").textContent  = savPct + "%";
  document.getElementById("savingsProgress").style.width = savPct + "%";

  const savItemList = document.getElementById("savingsItemList");
  if (state.savingTargets.length === 0) {
    savItemList.innerHTML =
      '<div style="font-size:.75rem;color:var(--text-3);padding:.25rem 0">No savings targets set yet.</div>';
  } else {
    savItemList.innerHTML = state.savingTargets.map(t => {
      const p = pct(t.allocated || 0, t.target);
      return `
        <div class="goal-item">
          <div class="goal-item-top">
            <span class="goal-item-name">${escHtml(t.name)}</span>
            <span class="goal-item-pct">${p}%</span>
          </div>
          <div class="goal-item-meta">${fmt(t.allocated||0)} / ${fmt(t.target)} RWF</div>
          <div class="progress-track" style="height:4px">
            <div class="progress-fill fill-savings" style="width:${p}%"></div>
          </div>
        </div>`;
    }).join("");
  }
}

// ─── RENDER: EXPENSES ───────────────────────
function renderExpenses(filter = "") {
  document.getElementById("expBalance").textContent = fmt(balance());
  document.getElementById("expIncome").textContent  = fmt(totalIncome());
  document.getElementById("expTotal").textContent   = fmt(totalExpenses());

  const list = [...state.expenses]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 15);

  const filtered = filter
    ? list.filter(e =>
        e.name.toLowerCase().includes(filter.toLowerCase()) ||
        e.expId.toLowerCase().includes(filter.toLowerCase()))
    : list;

  const el = document.getElementById("expenseList");
  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-state">No expenses found.</div>';
    return;
  }

  el.innerHTML = filtered.map(e => {
    const isSav  = !!e.savId;
    const hasBill = !!e.billId;
    const cls     = isSav ? "is-savings" : (hasBill ? "is-bill" : "");
    const amtCls  = isSav ? "savings" : "";
    const dt      = new Date(e.ts);
    const dtStr   = dt.toLocaleDateString("en-GB", { day:"2-digit", month:"short" })
                  + " · " + dt.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
    const linkId  = e.billId || e.savId || null;
    return `
      <div class="expense-item ${cls}">
        <div class="exp-left">
          <div class="exp-name">${escHtml(e.name)}</div>
          <div class="exp-meta">${dtStr}</div>
          ${linkId ? `<div class="exp-id">→ ${escHtml(linkId)}</div>` : ""}
          <div class="exp-id">${e.expId}</div>
        </div>
        <div class="exp-amount ${amtCls}">−${fmt(e.amount)}</div>
      </div>`;
  }).join("");
}

// ─── RENDER: BILLS PAGE ─────────────────────
function renderBillsPage() {
  const billsEl = document.getElementById("billsList");
  if (state.bills.length === 0) {
    billsEl.innerHTML =
      '<div class="empty-state">No bills set up.<br/>Tap ＋ to add a monthly bill.</div>';
  } else {
    billsEl.innerHTML = state.bills.map(b => {
      const p = pct(b.allocated || 0, b.target);
      return `
        <div class="bill-item">
          <div class="bill-item-top">
            <div class="bill-item-left">
              <div class="bill-item-name">${escHtml(b.name)}</div>
              <div style="margin-top:.3rem"><span class="bill-id-tag">${escHtml(b.id)}</span></div>
            </div>
            <div class="bill-item-pct">${p}%</div>
          </div>
          <div class="bill-item-meta">${fmt(b.allocated||0)} / ${fmt(b.target)} RWF allocated</div>
          <div class="progress-track">
            <div class="progress-fill fill-bills" style="width:${p}%"></div>
          </div>
          <button class="bill-delete" data-delete-bill="${b.id}">✕ Remove</button>
        </div>`;
    }).join("");
  }
}

// ─── RENDER: SAVINGS PAGE ───────────────────
function renderSavingsPage() {
  const totalTarget = state.savingTargets.reduce((s, t) => s + t.target, 0);
  const totalAlloc  = totalAllocatedToSavings();

  document.getElementById("savingsTotal").innerHTML =
    fmt(totalAlloc) + ' <span class="currency">RWF</span>';
  document.getElementById("savingsTarget").innerHTML =
    fmt(totalTarget) + ' <span class="currency">RWF</span>';

  // ── Savings targets list (now lives on this page) ──
  const targetsEl = document.getElementById("savingsTargetsList");
  if (state.savingTargets.length === 0) {
    targetsEl.innerHTML =
      '<div class="empty-state">No savings targets.<br/>Tap ＋ to add one.</div>';
  } else {
    targetsEl.innerHTML = state.savingTargets.map(t => {
      const p = pct(t.allocated || 0, t.target);
      return `
        <div class="bill-item">
          <div class="bill-item-top">
            <div class="bill-item-left">
              <div class="bill-item-name">${escHtml(t.name)}</div>
              <div style="margin-top:.3rem"><span class="bill-id-tag sav-tag">${escHtml(t.id)}</span></div>
            </div>
            <div class="bill-item-pct" style="color:var(--purple)">${p}%</div>
          </div>
          <div class="bill-item-meta">${fmt(t.allocated||0)} / ${fmt(t.target)} RWF saved</div>
          <div class="progress-track">
            <div class="progress-fill fill-savings" style="width:${p}%"></div>
          </div>
          <button class="bill-delete" data-delete-saving="${t.id}">✕ Remove</button>
        </div>`;
    }).join("");
  }

  // ── Savings ledger entries ──
  const entries = state.expenses
    .filter(e => !!e.savId)
    .sort((a, b) => b.ts - a.ts);

  const el = document.getElementById("savingsLedger");
  if (entries.length === 0) {
    el.innerHTML =
      '<div class="empty-state">No savings entries yet.<br/>Log an expense and link a SAV- ID to start.</div>';
    return;
  }

  el.innerHTML = entries.map(e => {
    const dt    = new Date(e.ts);
    const dtStr = dt.toLocaleDateString("en-GB", { day:"2-digit", month:"short" })
                + " · " + dt.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
    const tgt = state.savingTargets.find(t => t.id === e.savId);
    return `
      <div class="expense-item is-savings">
        <div class="exp-left">
          <div class="exp-name">${escHtml(e.name)}</div>
          <div class="exp-meta">${dtStr}</div>
          <div class="exp-id">→ ${escHtml(e.savId)}${tgt ? " · " + escHtml(tgt.name) : ""}</div>
          <div class="exp-id">${e.expId}</div>
        </div>
        <div class="exp-amount savings">+${fmt(e.amount)}</div>
      </div>`;
  }).join("");
}

// ─── RENDER: SETTINGS ───────────────────────
function renderSettings() {
  document.getElementById("currentIncome").textContent =
    fmt(state.monthlyIncome) + " RWF";
  document.getElementById("totalIncomeDisplay").textContent =
    fmt(totalIncome()) + " RWF";

  const miscEl = document.getElementById("miscIncomeList");
  const miscs  = state.miscIncomes || [];
  if (miscs.length === 0) {
    miscEl.innerHTML =
      '<div class="empty-state" style="padding:1rem">No misc income logged yet.</div>';
  } else {
    miscEl.innerHTML = [...miscs].reverse().map(m => {
      const dt    = new Date(m.ts);
      const dtStr = dt.toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
      return `
        <div class="expense-item" style="margin-bottom:.5rem">
          <div class="exp-left">
            <div class="exp-name">${escHtml(m.label)}</div>
            <div class="exp-meta">${dtStr} · ${m.id}</div>
          </div>
          <div class="exp-amount" style="color:var(--green)">+${fmt(m.amount)}</div>
        </div>`;
    }).join("");
  }
}

// ─── RENDER ALL ─────────────────────────────
function renderAll() {
  renderTopBar();
  renderHome();
  renderExpenses(document.getElementById("expenseSearch").value);
  renderBillsPage();
  renderSavingsPage();
  renderSettings();
}

// ─── NAVIGATION ─────────────────────────────
const navBtns = document.querySelectorAll(".nav-btn");
const pages   = document.querySelectorAll(".page");

navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.page;
    navBtns.forEach(b => b.classList.toggle("active", b.dataset.page === target));
    pages.forEach(p => p.classList.toggle("active", p.id === "page-" + target));
    renderAll();
  });
});

// ─── MODALS ─────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.getElementById("openAddExpense").addEventListener("click", () => openModal("addExpenseModal"));
document.getElementById("openAddBill").addEventListener("click",    () => openModal("addBillModal"));
document.getElementById("openAddSaving").addEventListener("click",  () => openModal("addSavingModal"));
document.getElementById("resetBtn").addEventListener("click",       () => openModal("confirmResetModal"));

// ─── ADD EXPENSE ────────────────────────────
document.getElementById("submitExpense").addEventListener("click", () => {
  const name   = document.getElementById("expName").value.trim();
  const amount = parseFloat(document.getElementById("expAmount").value);
  const rawId  = document.getElementById("expBillId").value.trim().toUpperCase();

  if (!name)            { toast("⚠ Please enter a name."); return; }
  if (!amount || amount <= 0) { toast("⚠ Enter a valid amount."); return; }

  // Determine if rawId points to a bill or a savings target
  let billId = null;
  let savId  = null;

  if (rawId) {
    const bill = state.bills.find(b => b.id === rawId);
    const sav  = state.savingTargets.find(t => t.id === rawId);

    if (!bill && !sav) {
      toast("⚠ ID \"" + rawId + "\" not found in bills or savings."); return;
    }

    if (bill) {
      const remaining = bill.target - (bill.allocated || 0);
      if (amount > remaining) {
        toast("⚠ Over limit! " + escHtml(bill.name) + " only needs " + fmt(remaining) + " RWF more."); return;
      }
      billId = rawId;
      bill.allocated = (bill.allocated || 0) + amount;
    }

    if (sav) {
      const remaining = sav.target - (sav.allocated || 0);
      if (amount > remaining) {
        toast("⚠ Over limit! " + escHtml(sav.name) + " only needs " + fmt(remaining) + " RWF more."); return;
      }
      savId = rawId;
      sav.allocated = (sav.allocated || 0) + amount;
    }
  }

  const expId   = uid("EXP-", state._nextExpId++);
  const expense = { expId, name, amount, billId, savId, ts: Date.now() };
  state.expenses.unshift(expense);

  saveState();
  renderAll();
  closeModal("addExpenseModal");

  document.getElementById("expName").value   = "";
  document.getElementById("expAmount").value = "";
  document.getElementById("expBillId").value = "";
  toast("✓ Expense logged");
});

// ─── ADD BILL ───────────────────────────────
document.getElementById("submitBill").addEventListener("click", () => {
  const name   = document.getElementById("billName").value.trim();
  const target = parseFloat(document.getElementById("billTarget").value);
  const id     = document.getElementById("billId").value.trim().toUpperCase();

  if (!name)   { toast("⚠ Enter a bill name."); return; }
  if (!target || target <= 0) { toast("⚠ Enter a valid amount."); return; }
  if (!id)     { toast("⚠ Enter a Bill ID."); return; }

  const allIds = [
    ...state.bills.map(b => b.id),
    ...state.savingTargets.map(t => t.id),
  ];
  if (allIds.includes(id)) { toast("⚠ That ID already exists."); return; }

  state.bills.push({ id, name, target, allocated: 0 });
  saveState();
  renderAll();
  closeModal("addBillModal");

  document.getElementById("billName").value   = "";
  document.getElementById("billTarget").value = "";
  document.getElementById("billId").value     = "";
  toast("✓ Bill added");
});

// ─── ADD SAVING TARGET ──────────────────────
document.getElementById("submitSaving").addEventListener("click", () => {
  const name   = document.getElementById("savingName").value.trim();
  const target = parseFloat(document.getElementById("savingTarget").value);
  const id     = document.getElementById("savingId").value.trim().toUpperCase();

  if (!name)   { toast("⚠ Enter a target name."); return; }
  if (!target || target <= 0) { toast("⚠ Enter a valid amount."); return; }
  if (!id)     { toast("⚠ Enter a Savings ID."); return; }

  const allIds = [
    ...state.bills.map(b => b.id),
    ...state.savingTargets.map(t => t.id),
  ];
  if (allIds.includes(id)) { toast("⚠ That ID already exists."); return; }

  state.savingTargets.push({ id, name, target, allocated: 0 });
  saveState();
  renderAll();
  closeModal("addSavingModal");

  document.getElementById("savingName").value   = "";
  document.getElementById("savingTarget").value = "";
  document.getElementById("savingId").value     = "";
  toast("✓ Savings target added");
});

// ─── DELETE BILL (delegated) ─────────────────
document.getElementById("billsList").addEventListener("click", e => {
  const btn = e.target.closest("[data-delete-bill]");
  if (!btn) return;
  state.bills = state.bills.filter(b => b.id !== btn.dataset.deleteBill);
  saveState(); renderAll();
  toast("Bill removed");
});

// ─── DELETE SAVING TARGET (delegated) ───────
document.getElementById("savingsTargetsList").addEventListener("click", e => {
  const btn = e.target.closest("[data-delete-saving]");
  if (!btn) return;
  state.savingTargets = state.savingTargets.filter(t => t.id !== btn.dataset.deleteSaving);
  saveState(); renderAll();
  toast("Savings target removed");
});

// ─── SEARCH EXPENSES ────────────────────────
document.getElementById("expenseSearch").addEventListener("input", e => {
  renderExpenses(e.target.value);
});

// ─── SAVE BASE INCOME ───────────────────────
document.getElementById("saveIncomeBtn").addEventListener("click", () => {
  const val = parseFloat(document.getElementById("monthlyIncomeInput").value);
  if (!val || val <= 0) { toast("⚠ Enter a valid income amount."); return; }
  state.monthlyIncome = val;
  if (!state.month) state.month = currentMonthLabel();
  saveState(); renderAll();
  document.getElementById("monthlyIncomeInput").value = "";
  toast("✓ Base income saved");
});

// ─── LOG MISC INCOME ────────────────────────
document.getElementById("saveMiscIncomeBtn").addEventListener("click", () => {
  const label  = document.getElementById("miscIncomeLabel").value.trim();
  const amount = parseFloat(document.getElementById("miscIncomeAmount").value);

  if (!label)  { toast("⚠ Enter a description for this income."); return; }
  if (!amount || amount <= 0) { toast("⚠ Enter a valid amount."); return; }

  if (!state.miscIncomes) state.miscIncomes = [];
  const id = uid("INC-", state._nextMiscId++);
  state.miscIncomes.push({ id, label, amount, ts: Date.now() });

  saveState(); renderAll();
  document.getElementById("miscIncomeLabel").value  = "";
  document.getElementById("miscIncomeAmount").value = "";
  toast("✓ Income of " + fmt(amount) + " RWF added");
});

// ─── EXPORT JSON ────────────────────────────
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "finflow-" + (state.month || "data").replace(/\s/g, "-") + ".json";
  a.click();
  URL.revokeObjectURL(url);
  toast("✓ Data exported");
});

// ─── RESET MONTH ────────────────────────────
document.getElementById("confirmResetBtn").addEventListener("click", () => {
  const bills         = state.bills.map(b => ({ ...b, allocated: 0 }));
  const savingTargets = state.savingTargets.map(t => ({ ...t, allocated: 0 }));

  state = {
    ...DEFAULT_STATE,
    month:         currentMonthLabel(),
    bills,
    savingTargets,
    _nextBillId:   state._nextBillId,
    _nextSavingId: state._nextSavingId,
  };

  saveState(); renderAll();
  closeModal("confirmResetModal");
  toast("✓ New month started");
});

// ─── INITIAL RENDER ─────────────────────────
renderAll();