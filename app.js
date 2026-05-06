const STORAGE_KEY = "nyc-pocket-ledger-v2";
const LEGACY_STORAGE_KEYS = ["budget-flow-transactions-v1"];

const DEFAULT_CATEGORIES = {
  expense: [
    "房租水电",
    "地铁通勤",
    "打车",
    "外卖堂食",
    "买菜华超",
    "咖啡奶茶",
    "手机网费",
    "购物美妆",
    "社交聚会",
    "医疗保险",
    "学习证件",
    "孝敬父母/红包",
    "旅行",
    "订阅软件",
    "其他",
  ],
  income: [
    "工资",
    "奖金",
    "退税/报销",
    "副业",
    "现金收入",
    "投资利息",
    "二手转卖",
    "红包入账",
    "其他",
  ],
};

const PAYMENT_METHODS = [
  "信用卡",
  "借记卡",
  "Apple Pay",
  "现金",
  "Zelle",
  "Venmo",
  "微信转账",
  "支付宝",
  "银行转账",
  "Direct Deposit",
  "其他",
];

const CATEGORY_MIGRATION = {
  Dining: "外卖堂食",
  Transit: "地铁通勤",
  Groceries: "买菜华超",
  "Rent & Utilities": "房租水电",
  Shopping: "购物美妆",
  Entertainment: "社交聚会",
  Healthcare: "医疗保险",
  Travel: "旅行",
  Other: "其他",
  Paycheck: "工资",
  Bonus: "奖金",
  Freelance: "副业",
  Investment: "投资利息",
  Refund: "退税/报销",
  餐饮: "外卖堂食",
  交通: "地铁通勤",
  购物: "购物美妆",
  住房: "房租水电",
  娱乐: "社交聚会",
  医疗: "医疗保险",
  旅行: "旅行",
  其他: "其他",
  工资: "工资",
  奖金: "奖金",
  副业: "副业",
  理财: "投资利息",
  退款: "退税/报销",
};

const PAYMENT_METHOD_MIGRATION = {
  "Credit Card": "信用卡",
  "Debit Card": "借记卡",
  Cash: "现金",
  Other: "其他",
  支付宝: "支付宝",
  微信: "微信转账",
  银行卡: "借记卡",
  现金: "现金",
};

const state = {
  transactions: [],
  selectedMonth: getCurrentMonth(),
};

const elements = {
  currentMoment: document.querySelector("#currentMoment"),
  heroBalance: document.querySelector("#heroBalance"),
  heroSummary: document.querySelector("#heroSummary"),
  todayExpense: document.querySelector("#todayExpense"),
  todayIncome: document.querySelector("#todayIncome"),
  monthIncome: document.querySelector("#monthIncome"),
  monthExpense: document.querySelector("#monthExpense"),
  monthSavingRate: document.querySelector("#monthSavingRate"),
  netIncome: document.querySelector("#netIncome"),
  topCategory: document.querySelector("#topCategory"),
  entryCount: document.querySelector("#entryCount"),
  topPaymentMethod: document.querySelector("#topPaymentMethod"),
  categoryChart: document.querySelector("#categoryChart"),
  transactionList: document.querySelector("#transactionList"),
  transactionForm: document.querySelector("#transactionForm"),
  categoryField: document.querySelector("#categoryField"),
  paymentMethodField: document.querySelector("#paymentMethodField"),
  monthSelector: document.querySelector("#monthSelector"),
  adviceList: document.querySelector("#adviceList"),
  refreshAdviceButton: document.querySelector("#refreshAdviceButton"),
  useNowButton: document.querySelector("#useNowButton"),
  amountField: document.querySelector("#amountField"),
  datetimeField: document.querySelector("#datetimeField"),
  template: document.querySelector("#transactionItemTemplate"),
};

boot();

function boot() {
  hydrateState();
  populateCategories("expense");
  populatePaymentMethods();
  bindEvents();
  renderAll();
  window.setInterval(renderMoment, 60000);
  registerServiceWorker();
}

function hydrateState() {
  const storedTransactions = localStorage.getItem(STORAGE_KEY) || getLegacyTransactions();

  if (storedTransactions) {
    try {
      state.transactions = JSON.parse(storedTransactions).map(migrateTransaction);
      persistTransactions();
    } catch {
      state.transactions = [];
    }
  } else {
    state.transactions = getSeedTransactions();
    persistTransactions();
  }

  elements.monthSelector.value = state.selectedMonth;
  fillNow();
}

function getLegacyTransactions() {
  for (const key of LEGACY_STORAGE_KEYS) {
    const legacyValue = localStorage.getItem(key);
    if (legacyValue) {
      return legacyValue;
    }
  }

  return null;
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  elements.transactionForm.addEventListener("submit", onSubmitTransaction);
  elements.transactionForm.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.addEventListener("change", (event) => populateCategories(event.target.value));
  });

  elements.monthSelector.addEventListener("change", (event) => {
    state.selectedMonth = event.target.value;
    renderAll();
  });

  elements.refreshAdviceButton.addEventListener("click", renderAdvice);
  elements.useNowButton.addEventListener("click", fillNow);

  document.querySelectorAll(".chip-button").forEach((button) => {
    button.addEventListener("click", () => {
      elements.amountField.value = button.dataset.amount;
      elements.amountField.focus();
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function populateCategories(type) {
  elements.categoryField.innerHTML = DEFAULT_CATEGORIES[type]
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function populatePaymentMethods() {
  elements.paymentMethodField.innerHTML = PAYMENT_METHODS.map(
    (item) => `<option value="${item}">${item}</option>`,
  ).join("");
}

function onSubmitTransaction(event) {
  event.preventDefault();
  const formData = new FormData(elements.transactionForm);
  const datetime = formData.get("datetime");
  const type = formData.get("type");
  const transaction = {
    id: crypto.randomUUID(),
    type,
    amount: Number(formData.get("amount")),
    datetime,
    date: datetime.slice(0, 10),
    category: formData.get("category"),
    paymentMethod: formData.get("paymentMethod"),
    merchant: formData.get("merchant").trim(),
    note: formData.get("note").trim(),
    createdAt: new Date().toISOString(),
  };

  state.transactions.unshift(transaction);
  state.selectedMonth = transaction.datetime.slice(0, 7);
  persistTransactions();
  resetForm();
  renderAll();
  switchTab("dashboard");
}

function resetForm() {
  elements.transactionForm.reset();
  elements.transactionForm.querySelector('input[name="type"][value="expense"]').checked = true;
  elements.monthSelector.value = state.selectedMonth;
  populateCategories("expense");
  populatePaymentMethods();
  fillNow();
}

function renderAll() {
  renderMoment();
  renderSummary();
  renderTransactions();
  renderCategoryChart();
  renderAdvice();
}

function renderMoment() {
  const now = new Date();
  elements.currentMoment.textContent = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

function renderSummary() {
  const monthTransactions = getMonthTransactions();
  const todayTransactions = getTodayTransactions();
  const income = sumByType(monthTransactions, "income");
  const expense = sumByType(monthTransactions, "expense");
  const todayIncome = sumByType(todayTransactions, "income");
  const todayExpense = sumByType(todayTransactions, "expense");
  const balance = income - expense;
  const savingRate = income > 0 ? `${Math.max(0, ((balance / income) * 100).toFixed(0))}%` : "0%";
  const topCategory = getTopExpenseCategory(monthTransactions);
  const topPaymentMethod = getTopPaymentMethod(monthTransactions);

  elements.monthIncome.textContent = formatCurrency(income);
  elements.monthExpense.textContent = formatCurrency(expense);
  elements.todayIncome.textContent = formatCurrency(todayIncome);
  elements.todayExpense.textContent = formatCurrency(todayExpense);
  elements.monthSavingRate.textContent = savingRate;
  elements.netIncome.textContent = formatCurrency(balance);
  elements.entryCount.textContent = `${monthTransactions.length} 笔`;
  elements.topCategory.textContent = topCategory
    ? `${topCategory.category} · ${formatCurrency(topCategory.amount)}`
    : "还没有";
  elements.topPaymentMethod.textContent = topPaymentMethod
    ? `${topPaymentMethod.name} · ${topPaymentMethod.count} 次`
    : "还没有";
  elements.heroBalance.textContent = formatCurrency(balance);
  elements.heroSummary.textContent = getHeroSummary({
    monthTransactions,
    expense,
    balance,
    topCategory,
  });
}

function renderTransactions() {
  const fragment = document.createDocumentFragment();
  const monthTransactions = getMonthTransactions()
    .slice()
    .sort((a, b) => b.datetime.localeCompare(a.datetime));

  if (!monthTransactions.length) {
    elements.transactionList.innerHTML = `<li class="empty-state">这个月还没有记录，先从今天第一笔开始。</li>`;
    return;
  }

  monthTransactions.forEach((transaction) => {
    const node = elements.template.content.firstElementChild.cloneNode(true);
    const title = transaction.merchant || transaction.category;
    const amountText = `${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}`;
    const meta = [
      formatDateTime(transaction.datetime),
      transaction.category,
      transaction.paymentMethod || "未填写",
      transaction.note || "",
    ]
      .filter(Boolean)
      .join(" · ");

    node.querySelector(".item-title").textContent = title;
    node.querySelector(".item-meta").textContent = meta;
    node.querySelector(".type-badge").textContent = transaction.type === "income" ? "收入" : "支出";
    node.querySelector(".type-badge").classList.add(
      transaction.type === "income" ? "income-badge" : "expense-badge",
    );
    node.querySelector(".item-amount").textContent = amountText;
    node.querySelector(".item-amount").classList.add(
      transaction.type === "income" ? "income-amount" : "expense-amount",
    );
    node.querySelector(".text-button").addEventListener("click", () => deleteTransaction(transaction.id));
    fragment.appendChild(node);
  });

  elements.transactionList.innerHTML = "";
  elements.transactionList.appendChild(fragment);
}

function renderCategoryChart() {
  const expenses = getMonthTransactions().filter((item) => item.type === "expense");
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  if (!expenses.length) {
    elements.categoryChart.className = "chart-list empty-state";
    elements.categoryChart.textContent = "本月还没有支出数据";
    return;
  }

  const grouped = groupExpensesByCategory(expenses);
  elements.categoryChart.className = "chart-list";
  elements.categoryChart.innerHTML = grouped
    .map(({ category, amount }) => {
      const ratio = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      return `
        <article class="chart-row">
          <header>
            <strong>${category}</strong>
            <span>${formatCurrency(amount)} · ${ratio.toFixed(0)}%</span>
          </header>
          <div class="chart-bar"><span style="width:${ratio}%"></span></div>
        </article>
      `;
    })
    .join("");
}

function renderAdvice() {
  const advice = generateAdvice();
  elements.adviceList.innerHTML = advice
    .map(
      (item) => `
        <article class="advice-card">
          <p class="advice-tag">${item.tag}</p>
          <strong>${item.title}</strong>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter((item) => item.id !== id);
  persistTransactions();
  renderAll();
}

function generateAdvice() {
  const monthTransactions = getMonthTransactions();
  const expenseEntries = monthTransactions.filter((item) => item.type === "expense");
  const incomeEntries = monthTransactions.filter((item) => item.type === "income");
  const income = sumByType(monthTransactions, "income");
  const expense = sumByType(monthTransactions, "expense");
  const balance = income - expense;
  const topCategory = getTopExpenseCategory(monthTransactions);
  const groupedExpenses = groupExpensesByCategory(expenseEntries);
  const diningExpense = getCategoryTotal(monthTransactions, "外卖堂食");
  const groceryExpense = getCategoryTotal(monthTransactions, "买菜华超");
  const rideshareExpense = getCategoryTotal(monthTransactions, "打车");
  const transitExpense = getCategoryTotal(monthTransactions, "地铁通勤");
  const housingExpense = getCategoryTotal(monthTransactions, "房租水电");
  const subscriptionExpense = getCategoryTotal(monthTransactions, "订阅软件");
  const phoneExpense = getCategoryTotal(monthTransactions, "手机网费");
  const sideIncome = getCategoryTotalByType(monthTransactions, "income", "副业");

  if (!monthTransactions.length) {
    return [
      {
        tag: "起步建议",
        title: "先连续记满 7 天",
        body: "把早餐、地铁、外卖、房租、工资这些最常见项目先记完整，一周后这套建议会更接近你在纽约的真实花费。",
      },
      {
        tag: "随手记",
        title: "优先记录时间和金额",
        body: "在 iPhone 上打开后先把时间和金额记下来，商家和备注可以晚一点补，先保证不漏记最重要。",
      },
    ];
  }

  const advice = [];

  if (income > 0) {
    const savingRate = balance / income;
    advice.push({
      tag: "现金流",
      title: savingRate >= 0.2 ? "本月有留余地，继续守住结余" : "先把储蓄率往 20% 靠拢",
      body:
        savingRate >= 0.2
          ? `你这个月已经留出 ${Math.max(0, savingRate * 100).toFixed(0)}% 的空间，可以把一部分自动转去储蓄或 emergency fund。`
          : `你这个月储蓄率大约是 ${Math.max(0, savingRate * 100).toFixed(0)}%，可以先从最容易压缩的一类支出下手，不用一次改所有习惯。`,
    });
  } else {
    advice.push({
      tag: "记账完整度",
      title: "把收入也一起录入",
      body: "目前账本里主要是支出，建议把工资、报销、红包入账、现金收入也补齐，这样判断结余和建议才会更准。",
    });
  }

  if (topCategory) {
    advice.push({
      tag: "重点分类",
      title: `先盯住 ${topCategory.category}`,
      body: `${topCategory.category} 现在是本月第一大支出，金额约 ${formatCurrency(topCategory.amount)}。先给这类设一个周上限，比全面节流更容易坚持。`,
    });
  }

  if (diningExpense > 280 || (expense > 0 && diningExpense / expense > 0.18)) {
    advice.push({
      tag: "节流",
      title: "外卖堂食有压缩空间",
      body: `你本月在外卖堂食上花了 ${formatCurrency(diningExpense)}。在纽约把每周 1 到 2 次外卖换成自带午饭或 lunch special，月底通常能省出一笔明显的钱。`,
    });
  }

  if (groceryExpense > 0 && diningExpense > groceryExpense * 1.4) {
    advice.push({
      tag: "生活方式",
      title: "买菜比例偏低，可以把吃饭重心往家里拉一点",
      body: `外食明显高于买菜华超支出。若你平时常去 Chinatown、Flushing、Costco 或 Trader Joe's，提前备几样快手食材，通常比工作日临时点单更省。`,
    });
  }

  if (rideshareExpense > 120 || transitExpense + rideshareExpense > 220) {
    advice.push({
      tag: "通勤",
      title: "检查打车和通勤组合",
      body: `地铁通勤加打车本月约 ${formatCurrency(transitExpense + rideshareExpense)}。如果其中有不少是临时打车，可以把“晚归固定打车”改成“只有赶时间才打车”，通常最容易立刻见效。`,
    });
  }

  if (income > 0 && housingExpense / income > 0.35) {
    advice.push({
      tag: "固定成本",
      title: "房租水电占比高，变量支出更值得盯",
      body: `房租水电大约吃掉收入的 ${((housingExpense / income) * 100).toFixed(0)}%。这在纽约很常见，所以更现实的策略是先管住外卖、打车、订阅和临时购物。`,
    });
  }

  if (subscriptionExpense + phoneExpense > 120) {
    advice.push({
      tag: "账单优化",
      title: "订阅和手机网费值得每月复盘一次",
      body: `订阅软件加手机网费本月约 ${formatCurrency(subscriptionExpense + phoneExpense)}。把不常用的流媒体、云盘、App 订阅暂停 1 到 2 个，体感不强但长期效果很好。`,
    });
  }

  if (incomeEntries.length > 0 && sideIncome === 0 && (income === 0 || balance / income < 0.15)) {
    advice.push({
      tag: "开源",
      title: "可以考虑补一条轻量副业线",
      body: "如果主业结余不多，适合选启动成本低的副业，比如家教、摄影、翻译、周末接单、二手转卖。目标先不是赚很多，而是先把每月安全垫加厚一点。",
    });
  }

  if (groupedExpenses.length >= 5) {
    advice.push({
      tag: "执行方式",
      title: "下个月只保留 3 个重点分类",
      body: "分类太多时，人会更容易放弃。建议下个月只重点盯住房租水电、吃饭、通勤这类大头，其他先正常记，不急着优化所有项目。",
    });
  }

  advice.push({
    tag: "月末动作",
    title: "每月底只问自己两个问题",
    body: "这个月最容易削减的是哪一类？下个月最可能多带来一点收入的是哪件事？每月重复这两个问题，比做一份很复杂的预算更容易坚持。",
  });

  return advice.slice(0, 6);
}

function persistTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function migrateTransaction(transaction) {
  const rawDate = transaction.datetime || transaction.date || getToday();
  const datetime = normalizeDatetime(rawDate);

  return {
    ...transaction,
    datetime,
    date: datetime.slice(0, 10),
    category: CATEGORY_MIGRATION[transaction.category] || transaction.category || "其他",
    paymentMethod:
      PAYMENT_METHOD_MIGRATION[transaction.paymentMethod] || transaction.paymentMethod || "其他",
    merchant: transaction.merchant || "",
    note: transaction.note || "",
  };
}

function getMonthTransactions() {
  return state.transactions.filter((item) => item.datetime.startsWith(state.selectedMonth));
}

function getTodayTransactions() {
  const today = getToday();
  return state.transactions.filter((item) => item.date === today);
}

function sumByType(transactions, type) {
  return transactions
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function groupExpensesByCategory(expenses) {
  const map = new Map();

  expenses.forEach((item) => {
    map.set(item.category, (map.get(item.category) || 0) + item.amount);
  });

  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function getTopExpenseCategory(transactions) {
  return groupExpensesByCategory(transactions.filter((item) => item.type === "expense"))[0];
}

function getTopPaymentMethod(transactions) {
  const counts = new Map();

  transactions.forEach((item) => {
    const method = item.paymentMethod || "其他";
    counts.set(method, (counts.get(method) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)[0];
}

function getCategoryTotal(transactions, category) {
  return transactions
    .filter((item) => item.type === "expense" && item.category === category)
    .reduce((sum, item) => sum + item.amount, 0);
}

function getCategoryTotalByType(transactions, type, category) {
  return transactions
    .filter((item) => item.type === type && item.category === category)
    .reduce((sum, item) => sum + item.amount, 0);
}

function getHeroSummary({ monthTransactions, expense, balance, topCategory }) {
  if (!monthTransactions.length) {
    return "先记几笔，这里会开始懂你的花钱节奏。";
  }

  if (expense === 0) {
    return "这个月目前只有收入记录，补几笔日常支出后建议会更准。";
  }

  if (balance >= 0) {
    return `${monthTransactions.length} 笔记录，当前最大支出是 ${topCategory?.category || "其他"}。`;
  }

  return `本月支出已经超过收入，先从 ${topCategory?.category || "主要支出"} 开始收紧最有效。`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function fillNow() {
  elements.datetimeField.value = getCurrentDatetimeLocal();
}

function normalizeDatetime(value) {
  if (value.includes("T")) {
    return value.slice(0, 16);
  }

  return `${value.slice(0, 10)}T12:00`;
}

function getCurrentMonth() {
  return getCurrentDatetimeLocal().slice(0, 7);
}

function getCurrentDatetimeLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getToday() {
  return getCurrentDatetimeLocal().slice(0, 10);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  }
}

function getSeedTransactions() {
  const month = getCurrentMonth();
  return [
    {
      id: crypto.randomUUID(),
      type: "income",
      amount: 5600,
      datetime: `${month}-01T09:10`,
      date: `${month}-01`,
      category: "工资",
      paymentMethod: "Direct Deposit",
      merchant: "公司",
      note: "主业工资到账",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      type: "expense",
      amount: 32,
      datetime: `${month}-02T12:35`,
      date: `${month}-02`,
      category: "外卖堂食",
      paymentMethod: "信用卡",
      merchant: "Midtown 午饭",
      note: "工作日午餐",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      type: "expense",
      amount: 18.5,
      datetime: `${month}-03T08:20`,
      date: `${month}-03`,
      category: "地铁通勤",
      paymentMethod: "Apple Pay",
      merchant: "OMNY",
      note: "地铁和公交",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      type: "expense",
      amount: 86,
      datetime: `${month}-03T19:40`,
      date: `${month}-03`,
      category: "买菜华超",
      paymentMethod: "借记卡",
      merchant: "华人超市",
      note: "一周买菜",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      type: "income",
      amount: 120,
      datetime: `${month}-04T22:00`,
      date: `${month}-04`,
      category: "副业",
      paymentMethod: "Zelle",
      merchant: "客户",
      note: "周末拍摄",
      createdAt: new Date().toISOString(),
    },
  ];
}
