const STORAGE_KEY = "ledger-lite-v1";
const money = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

const categories = {
  expense: ["Food", "Transport", "Study", "Rent", "Other"],
  income: ["Allowance", "Pay", "Other"]
};

const monthInput = document.querySelector("#month");
const list = document.querySelector("#list");
const empty = document.querySelector("#empty");
const form = document.querySelector("#entry");
const formError = document.querySelector("#form-error");
const typeInput = document.querySelector("#type");
const categoryInput = document.querySelector("#category");
const budgetInput = document.querySelector("#budget");

const state = load();

const today = new Date();
monthInput.value = monthKey(today);
document.querySelector("#date").value = today.toISOString().slice(0, 10);
fillCategories();
render();

typeInput.addEventListener("change", fillCategories);
monthInput.addEventListener("change", render);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(document.querySelector("#amount").value);
  const date = document.querySelector("#date").value;
  if (!amount || amount <= 0) {
    formError.textContent = "Enter an amount greater than zero.";
    return;
  }
  if (!date) {
    formError.textContent = "Choose a date.";
    return;
  }
  formError.textContent = "";
  state.transactions.push({
    id: crypto.randomUUID(),
    type: typeInput.value,
    amount,
    category: categoryInput.value,
    date,
    note: document.querySelector("#note").value.trim()
  });
  save();
  form.reset();
  typeInput.value = "expense";
  fillCategories();
  document.querySelector("#date").value = date;
  monthInput.value = date.slice(0, 7);
  render();
});

document.querySelector("#budget-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = Number(budgetInput.value);
  if (Number.isNaN(value) || value < 0) return;
  state.budgets[monthInput.value] = value;
  save();
  render();
});

document.querySelector("#sample").addEventListener("click", () => {
  const month = monthInput.value;
  const samples = [
    ["income", 4500, "Allowance", `${month}-01`, "Monthly allowance"],
    ["expense", 1200, "Rent", `${month}-02`, "Room contribution"],
    ["expense", 180, "Transport", `${month}-04`, "Taxi to campus"],
    ["expense", 240, "Food", `${month}-07`, "Groceries"],
    ["expense", 90, "Study", `${month}-09`, "Printing"]
  ];
  for (const [type, amount, category, date, note] of samples) {
    state.transactions.push({ id: crypto.randomUUID(), type, amount, category, date, note });
  }
  state.budgets[month] = state.budgets[month] || 2500;
  save();
  render();
});

document.querySelector("#clear").addEventListener("click", () => {
  const month = monthInput.value;
  state.transactions = state.transactions.filter((item) => item.date.slice(0, 7) !== month);
  delete state.budgets[month];
  save();
  render();
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  state.transactions = state.transactions.filter((item) => item.id !== button.dataset.id);
  save();
  render();
});

function fillCategories() {
  const options = categories[typeInput.value];
  categoryInput.innerHTML = options.map((name) => `<option>${name}</option>`).join("");
}

function render() {
  const month = monthInput.value;
  const items = state.transactions
    .filter((item) => item.date.slice(0, 7) === month)
    .sort((a, b) => b.date.localeCompare(a.date));

  const income = sum(items, "income");
  const expenses = sum(items, "expense");
  const budget = state.budgets[month] || 0;
  const used = budget > 0 ? Math.round((expenses / budget) * 100) : 0;

  document.querySelector("#income").textContent = money.format(income);
  document.querySelector("#expenses").textContent = money.format(expenses);
  document.querySelector("#left").textContent = money.format(income - expenses);
  document.querySelector("#used").textContent = budget > 0 ? `${used}%` : "No budget";
  budgetInput.value = budget || "";

  const bar = document.querySelector("#bar");
  bar.style.width = `${Math.min(used, 100)}%`;
  bar.parentElement.classList.toggle("over", used > 100);

  list.innerHTML = items.map((item) => `
    <li class="item">
      <div>
        <strong>${escapeHtml(item.note || item.category)}</strong>
        <div><span class="pill ${item.type}">${item.category}</span></div>
        <small>${formatDate(item.date)}</small>
      </div>
      <span class="amount ${item.type}">${item.type === "income" ? "+" : "−"} ${money.format(item.amount)}</span>
      <button class="remove" type="button" data-id="${item.id}" aria-label="Remove transaction">Remove</button>
    </li>
  `).join("");

  empty.classList.toggle("hidden", items.length > 0);
}

function sum(items, type) {
  return items.filter((item) => item.type === type).reduce((total, item) => total + item.amount, 0);
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short"
  });
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.transactions)) {
      return { transactions: saved.transactions, budgets: saved.budgets || {} };
    }
  } catch {
    /* start fresh if stored data is unreadable */
  }
  return { transactions: [], budgets: {} };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
