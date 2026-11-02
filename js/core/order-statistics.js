"use strict";

const fxStatsDimensions = [
  { key: "company", label: "公司统计", icon: "building-2" },
  { key: "product", label: "产品统计", icon: "tag" },
  { key: "version", label: "版本统计", icon: "layers-3" },
];
const fxStatsDefaultFilters = { customerId: "", customer: "", productNumber: "", category: "" };

function fxStatsAppliedFilters() {
  const scope = state.statsScope || {};
  const filters = state.statsFilters || {};
  return { customerId: filters.customerId || "", customer: filters.customer || "", productNumber: filters.productNumber || "", category: filters.category || "",
    ...(scope.customerId ? { customerId: String(scope.customerId) } : {}),
    ...(scope.productNumber ? { productNumber: String(scope.productNumber) } : {}) };
}

function fxStatsCategoryOptions() {
  const categories = new Map();
  fxCategories().forEach(item => categories.set(String(item.productNumber), item.name));
  orders.forEach(order => (order.lines || []).forEach(line => {
    if (line.productNumber && !categories.has(String(line.productNumber))) categories.set(String(line.productNumber), line.category || line.productNumber);
  }));
  return [...categories].sort(([left], [right]) => left.localeCompare(right, "zh-CN", { numeric: true }));
}

function fxStatsCompanyKey(order) {
  return String(order.customerId ?? order.customer ?? order.companyNumber);
}

function fxStatsProductKey(line) {
  return String(line.productNumber || line.category || "unknown");
}

function fxStatsLines(order) {
  const lines = order.lines || [];
  const filters = fxStatsAppliedFilters();
  if (filters.productNumber) return lines.filter(line => String(line.productNumber || "") === String(filters.productNumber));
  const keyword = filters.category.trim();
  return keyword ? lines.filter(line => fxCurrentCategoryName(line).includes(keyword)) : lines;
}

function fxStatsOrders() {
  const filters = fxStatsAppliedFilters();
  const keyword = filters.customer.trim().toLowerCase();
  const companyNumberSearch = /^\d+$/.test(keyword);
  return orders.filter(order => omOccupiesNumbers(order)
    && (!filters.customerId || fxStatsCompanyKey(order) === String(filters.customerId))
    && (filters.customerId || !keyword || String(companyNumberSearch ? order.companyNumber || "" : order.customer || "").toLowerCase().includes(keyword))
    && fxStatsLines(order).length);
}

function fxStatsCompareRows(left, right) {
  return String(left.number || left.key).localeCompare(String(right.number || right.key), "zh-CN", { numeric: true })
    || String(left.label || "").localeCompare(String(right.label || ""), "zh-CN", { numeric: true });
}

function fxStatsSortKey(dimension, groupKey = null) {
  return JSON.stringify([dimension, groupKey == null ? null : String(groupKey)]);
}

function fxStatsSortDirection(key) {
  return state.statsSortDirections?.[key] === "asc" ? "asc" : "desc";
}

function fxStatsSortRows(rows, key) {
  const direction = fxStatsSortDirection(key) === "asc" ? 1 : -1;
  return [...rows].sort((left, right) =>
    direction * (Number(left.total) - Number(right.total)) || fxStatsCompareRows(left, right));
}

function fxStatsPaginationKey(dimension, groupKey = null) {
  return `ops-statistics-${encodeURIComponent(fxStatsSortKey(dimension, groupKey))}`;
}

function fxStatsPageSlice(rows, key) {
  state.pagination ||= {};
  const saved = state.pagination[key] || {};
  const pageSize = [10, 20, 50, 100].includes(Number(saved.pageSize)) ? Number(saved.pageSize) : 20;
  const page = Math.min(Math.max(1, Number(saved.page || 1)), Math.max(1, Math.ceil(rows.length / pageSize)));
  state.pagination[key] = { page, pageSize };
  return { page, pageSize, visibleRows: rows.slice((page - 1) * pageSize, page * pageSize) };
}

function fxStatsAmountHeader(dimension, groupKey = null) {
  const direction = fxStatsSortDirection(fxStatsSortKey(dimension, groupKey));
  const nextLabel = direction === "desc" ? "从低到高" : "从高到低";
  return `<th class="stats-number" aria-sort="${direction === "desc" ? "descending" : "ascending"}"><button type="button" class="stats-sort-button" data-action="stat-sort" data-dimension="${fxEscape(dimension)}"${groupKey == null ? "" : ` data-key="${fxEscape(groupKey)}"`} title="按码量${nextLabel}排序" aria-label="码量，当前${direction === "desc" ? "从高到低" : "从低到高"}，点击${nextLabel}排序">码量${icon(direction === "desc" ? "arrow-down" : "arrow-up", "")}</button></th>`;
}

function fxStatsRows(dimension) {
  const rows = new Map();
  const add = (map, key, seed, amount, order) => {
    key = String(key);
    if (!map.has(key)) map.set(key, { key, ...seed, total: 0, orders: new Set(), children: new Map() });
    const row = map.get(key);
    row.total += Number(amount) || 0;
    row.orders.add(order.no);
    return row;
  };
  fxStatsOrders().forEach(order => {
    const lines = fxStatsLines(order);
    if (dimension === "company") {
      const group = add(rows, fxStatsCompanyKey(order), {
        level: "group",
        label: order.customer || "未命名客户",
        number: order.companyNumber || "",
      }, 0, order);
      lines.forEach(line => {
        add(group.children, fxStatsProductKey(line), {
          level: "child",
          label: fxCurrentCategoryName(line) || "未命名产品大类",
          number: line.productNumber || "",
        }, line.quantity, order);
        group.total += Number(line.quantity) || 0;
      });
    } else if (dimension === "version") {
      const amount = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
      add(rows, order.version || "未标注", { level: "group", label: `版本 ${order.version || "未标注"}`, number: order.version || "未标注" }, amount, order);
    } else {
      lines.forEach(line => {
        const group = add(rows, fxStatsProductKey(line), {
          level: "group",
          label: fxCurrentCategoryName(line) || "未命名产品大类",
          number: line.productNumber || "",
        }, 0, order);
        add(group.children, fxStatsCompanyKey(order), {
          level: "child",
          label: order.customer || "未命名客户",
          number: order.companyNumber || "",
        }, line.quantity, order);
        group.total += Number(line.quantity) || 0;
      });
    }
  });
  return [...rows.values()]
    .map(row => ({
      ...row,
      orders: row.orders.size,
      children: [...row.children.values()]
        .map(child => ({ ...child, orders: child.orders.size }))
        .sort(fxStatsCompareRows),
    }))
    .sort(fxStatsCompareRows);
}

function fxStatsVisibleRows(dimension) {
  return fxStatsSortRows(fxStatsRows(dimension), fxStatsSortKey(dimension));
}

function fxStatsTableContext() {
  const dimension = state.statsDimension || "company";
  const rows = fxStatsVisibleRows(dimension);
  const allOrders = fxStatsOrders();
  const companies = new Set(allOrders.map(fxStatsCompanyKey));
  const products = new Set(allOrders.flatMap(order => fxStatsLines(order).map(line => String(line.productNumber || line.category || "unknown"))));
  const versions = new Set(allOrders.map(order => String(order.version || "未标注")));
  return {
    dimension,
    groups: fxStatsRows(dimension),
    rows,
    summary: {
      qrTotal: allOrders.reduce((sum, order) => sum + fxStatsLines(order).reduce((lineSum, line) => lineSum + (Number(line.quantity) || 0), 0), 0),
      companyTotal: companies.size,
      productTotal: products.size,
      versionTotal: versions.size,
    },
  };
}

function fxStatsExportName(dimension) {
  const label = fxStatsDimensions.find(item => item.key === dimension)?.label || "数据统计";
  return `${label}_${omNow().slice(0, 10)}.xls`;
}

function fxStatsDetailModal() {
  const detail = state.statsDetail;
  const group = detail && fxStatsRows(detail.dimension).find(row => row.key === String(detail.key));
  if (!group) {
    return fxModalShell("统计详情", "", "<p>该统计项不存在或数据已更新。</p>", '<button type="button" class="button" data-action="close-modal">关闭</button>');
  }
  const isCompany = detail.dimension === "company";
  const detailType = isCompany ? "产品类别明细" : "公司明细";
  const headers = isCompany ? ["产品号", "产品类别"] : ["客户号", "公司名称"];
  const children = fxStatsSortRows(group.children, fxStatsSortKey(detail.dimension, detail.key));
  const paginationKey = fxStatsPaginationKey(detail.dimension, detail.key);
  const { page, pageSize, visibleRows } = fxStatsPageSlice(children, paginationKey);
  const rows = visibleRows.map((row, index) =>
    `<tr><td class="sequence-cell">${(page - 1) * pageSize + index + 1}</td><td class="mono">${fxEscape(row.number || row.key)}</td><td>${fxEscape(row.label)}</td><td class="stats-number">${formatNumber(row.orders)}</td><td class="stats-number">${formatNumber(row.total)}</td></tr>`).join("");
  const table = `<div class="table-shell stats-detail-table-shell"><div class="table-scroll"><table class="stats-detail-table" data-sequence="off" data-pagination="off"><thead><tr><th class="sequence-col">序号</th>${headers.map(header => `<th>${header}</th>`).join("")}<th class="stats-number">订单数量</th>${fxStatsAmountHeader(detail.dimension, detail.key)}</tr></thead><tbody>${rows || fxEmpty(5, "暂无下级统计数据")}</tbody></table></div>${pagination(children.length, { key: paginationKey, page, pageSize })}</div>`;
  return fxModalShell(`${group.label} · ${detailType}`, "", table, '<button type="button" class="button" data-action="close-modal">关闭</button>', true)
    .replace("modal modal-wide", "modal modal-wide stats-detail-modal");
}

function fxStatsRefreshDetailTable() {
  const modal = document.querySelector(".stats-detail-modal");
  const table = modal?.querySelector(".stats-detail-table");
  if (!table) return false;
  const template = document.createElement("template");
  template.innerHTML = fxStatsDetailModal();
  const nextTable = template.content.querySelector(".stats-detail-table");
  if (!nextTable) return false;
  const scroller = table.closest(".table-scroll");
  const body = modal.querySelector(".modal-body");
  const scrollLeft = scroller.scrollLeft;
  const scrollTop = body.scrollTop;
  table.tBodies[0].innerHTML = nextTable.tBodies[0].innerHTML;
  const heading = table.querySelector("th[aria-sort]");
  const nextHeading = nextTable.querySelector("th[aria-sort]");
  heading.setAttribute("aria-sort", nextHeading.getAttribute("aria-sort"));
  const button = heading.querySelector(".stats-sort-button");
  const nextButton = nextHeading.querySelector(".stats-sort-button");
  button.title = nextButton.title;
  button.setAttribute("aria-label", nextButton.getAttribute("aria-label"));
  button.innerHTML = nextButton.innerHTML;
  modal.querySelector(".pagination").innerHTML = template.content.querySelector(".pagination").innerHTML;
  if (window.lucide) window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
  scroller.scrollLeft = scrollLeft;
  body.scrollTop = scrollTop;
  return true;
}

function fxStatsPage() {
  const context = fxStatsTableContext();
  const paginationKey = fxStatsPaginationKey(context.dimension);
  const { page, pageSize, visibleRows } = fxStatsPageSlice(context.rows, paginationKey);
  const scope = state.statsScope;
  const scopedCustomer = scope?.customerId ? customers.find(item => fxSameId(item.id, scope.customerId)) : null;
  const scopedCategory = scope?.categoryId ? fxCategories().find(item => fxSameId(item.id, scope.categoryId)) : null;
  const scopeName = scopedCustomer?.name || scopedCategory?.name || "";
  const headers = context.dimension === "company"
    ? ["客户号", "公司名称"]
    : context.dimension === "product"
      ? ["产品号", "产品大类"]
      : ["版本号"];
  const relatedCountLabel = context.dimension === "company" ? "品类数量" : context.dimension === "product" ? "关联客户数" : "";
  const body = visibleRows.map((row, index) =>
    `<tr><td class="sequence-cell">${(page - 1) * pageSize + index + 1}</td><td class="mono">${fxEscape(row.number || row.key)}</td>${context.dimension === "version" ? "" : `<td>${fxEscape(row.label)}</td>`}${relatedCountLabel ? `<td class="stats-number"><button type="button" class="text-action" data-action="stat-detail" data-dimension="${context.dimension}" data-key="${fxEscape(row.key)}" aria-haspopup="dialog" aria-label="${fxEscape(row.label)}的${relatedCountLabel}：${row.children.length}，查看详情">${formatNumber(row.children.length)}</button></td>` : ""}<td class="stats-number"><button type="button" class="text-action" data-action="stat-orders" data-dimension="${context.dimension}" data-key="${fxEscape(row.key)}" aria-label="在订单台账查看${fxEscape(row.label)}的${row.orders}笔关联订单">${formatNumber(row.orders)}</button></td><td class="stats-number">${formatNumber(row.total)}</td></tr>`).join("");
  const actions = `${scope ? `<button class="button" data-action="stat-clear-scope">查看全部</button>` : ""}<button class="button" data-action="stat-export">${icon("download", "")}导出统计</button>`;
  const tabs = `<div class="stats-tabs" role="tablist" aria-label="统计维度">${fxStatsDimensions.map(item =>
    `<button type="button" class="${item.key === context.dimension ? "active" : ""}" data-action="stat-dimension" data-dimension="${item.key}" role="tab" aria-selected="${item.key === context.dimension}">${icon(item.icon, "")}${item.label}</button>`).join("")}</div>`;
  const metrics = [
    { label: "码总量", value: context.summary.qrTotal, icon: "qr-code" },
    { label: "公司数", value: context.summary.companyTotal, icon: "building-2" },
    { label: "品类数", value: context.summary.productTotal, icon: "tag" },
    { label: "版本数", value: context.summary.versionTotal, icon: "layers-3" },
  ];
  const summary = `<section class="stats-summary stats-summary-four" aria-label="统计总览">${metrics.map(item => `<div class="metric"><div class="metric-label">${icon(item.icon, "")}${item.label}</div><div class="metric-value">${formatNumber(item.value)}</div></div>`).join("")}</section>`;
  const draft = { ...fxStatsAppliedFilters(), ...(state.statsFilterDraft || {}) };
  const searchField = (id, key, label) => fxFilterInput(id, draft[key], label)
    .replace("<input ", `<input data-stats-filter="${key}" autocomplete="off" `);
  const filters = `<form class="toolbar stats-filters" aria-label="订单统计筛选">
    <div class="filters stats-filter-controls">${searchField("stats-customer-search", "customer", "搜索客户名称")}${searchField("stats-category-search", "category", "搜索产品大类")}
    <button type="button" class="button small list-reset-button" data-action="stat-reset">${icon("rotate-ccw", "")}重置</button></div>${tabs}
  </form>`;
  return `<div class="page stats-page">${pageHeader(scopeName ? `数据统计 · ${scopeName}` : "数据统计", "", actions)}${summary}${filters}
    <div class="table-shell"><div class="table-scroll"><table class="stats-table${context.dimension === "version" ? " stats-table-version" : ""}" data-pagination="off" data-sequence="off"><thead><tr><th class="sequence-col">序号</th>${headers.map(header => `<th>${header}</th>`).join("")}${relatedCountLabel ? `<th class="stats-number">${relatedCountLabel}</th>` : ""}<th class="stats-number">订单笔数</th>${fxStatsAmountHeader(context.dimension)}</tr></thead><tbody>${body || fxEmpty(headers.length + 3 + (relatedCountLabel ? 1 : 0), "暂无统计数据")}</tbody></table></div>${pagination(context.rows.length, { key: paginationKey, page, pageSize })}</div></div>`;
}

function fxStatsHandleAction(action, target) {
  if (state.portal !== "ops" || !fxEnabledOperatorSession()) return false;
  if (action === "stat-sort") {
    const dimension = target.dataset.dimension;
    if (!fxStatsDimensions.some(item => item.key === dimension)) return true;
    const groupKey = target.dataset.key ?? null;
    const key = fxStatsSortKey(dimension, groupKey);
    state.statsSortDirections ||= {};
    state.statsSortDirections[key] = fxStatsSortDirection(key) === "desc" ? "asc" : "desc";
    const paginationKey = fxStatsPaginationKey(dimension, groupKey);
    state.pagination[paginationKey] = { ...state.pagination[paginationKey], page: 1 };
    if (groupKey != null && state.modal === "stats-detail" && fxStatsRefreshDetailTable()) return true;
    render();
    return true;
  }
  if (action === "stat-return") { setNav("statistics"); return true; }
  if (action === "stat-clear-orders") { state.omFilters = {}; state.pagination = {}; render(); return true; }
  if (action === "stat-search") {
    const draft = Object.fromEntries(Object.keys(fxStatsDefaultFilters).map(key => [key, state.statsFilterDraft?.[key] || ""]));
    state.statsFilters = { ...draft, customer: draft.customer.trim(), category: draft.category.trim() };
    state.statsFilterDraft = { ...draft };
    state.statsScope = null;
    state.statsFilterError = "";
    state.pagination = {};
    render();
    return true;
  }
  if (action === "stat-reset" || action === "stat-clear-scope") {
    const draft = { ...fxStatsDefaultFilters };
    state.statsScope = null;
    state.statsFilterDraft = { ...draft };
    state.statsFilters = { ...draft };
    state.statsFilterError = "";
    state.pagination = {};
    render();
    return true;
  }
  if (action === "stat-dimension") {
    state.statsDimension = target.dataset.dimension;
    state.statsExpanded = {};
    render();
    return true;
  }
  if (action === "stat-detail") {
    state.statsDetail = { dimension: target.dataset.dimension, key: target.dataset.key };
    state.modal = "stats-detail";
    render();
    return true;
  }
  if (action === "stat-orders") {
    const source = target.dataset;
    if (!source.dimension || source.key == null) return false;
    const parent = fxStatsRows(source.dimension).find(row => row.key === String(source.key));
    if (!parent) return true;
    const company = source.dimension === "company" ? parent : null;
    const product = source.dimension === "product" ? parent : null;
    // Replace stale ledger filters so the destination matches the clicked count.
    state.omFilters = { occupiedOnly: true };
    const filters = fxStatsAppliedFilters();
    const companyNumberSearch = /^\d+$/.test(filters.customer);
    Object.assign(state.omFilters, { customer: companyNumberSearch ? "" : filters.customer, company: companyNumberSearch ? filters.customer : "", category: filters.category });
    const customerFilterId = filters.customerId;
    if (customerFilterId) {
      const customer = customers.find(row => fxSameId(row.id, customerFilterId));
      Object.assign(state.omFilters, { customerId: customerFilterId, customer: customer?.name || "" });
    }
    if (filters.productNumber) Object.assign(state.omFilters, { statsProductKey: String(filters.productNumber), productNumber: String(filters.productNumber), category: fxStatsCategoryOptions().find(([number]) => number === String(filters.productNumber))?.[1] || "" });
    if (company) Object.assign(state.omFilters, { customerId: company.key, customer: company.label });
    if (product) Object.assign(state.omFilters, { statsProductKey: product.key, productNumber: product.number, category: product.label });
    if (source.dimension === "version") state.omFilters.version = parent.key;
    Object.entries(state.pagination).forEach(([key, saved]) => {
      if (key.startsWith("ops-orders-")) state.pagination[key] = { ...saved, page: 1 };
    });
    setNav("orders");
    return true;
  }
  if (action === "stat-export") {
    const context = fxStatsTableContext();
    const headers = context.dimension === "company" ? ["客户号", "公司名称"] : context.dimension === "product" ? ["产品号", "产品大类"] : ["版本号"];
    if (context.dimension !== "version") headers.push(context.dimension === "company" ? "品类数量" : "关联客户数");
    fxDownloadExcel(fxStatsExportName(context.dimension), [...headers, "订单笔数", "码量"],
      context.rows.map(row => [row.number || row.key, ...(context.dimension === "version" ? [] : [row.label, row.children.length]), row.orders, row.total]));
    showToast("统计结果已导出");
    return true;
  }
  if (action === "stat-open-customer" || action === "stat-open-category") {
    state.statsDimension = action === "stat-open-customer" ? "company" : "product";
    state.statsFilterError = "";
    state.statsFilterDraft = { ...fxStatsDefaultFilters };
    state.statsFilters = { ...fxStatsDefaultFilters };
    if (action === "stat-open-customer") {
      const customer = customers.find(item => fxSameId(item.id, target.dataset.id));
      if (!customer) return showToast("客户记录不存在，请刷新后重试"), true;
      state.statsScope = { customerId: String(customer.id), customerName: customer.name };
      state.statsFilterDraft.customerId = String(customer.id);
      state.statsFilters.customerId = String(customer.id);
      state.statsFilterDraft.customer = customer.name;
      state.statsFilters.customer = customer.name;
    } else {
      const category = fxCategories().find(item => fxSameId(item.id, target.dataset.id));
      if (!category) return showToast("产品类别不存在，请刷新后重试"), true;
      state.statsScope = { categoryId: category.id, productNumber: category.productNumber, categoryName: category.name };
      state.statsFilterDraft.productNumber = String(category.productNumber);
      state.statsFilters.productNumber = String(category.productNumber);
      state.statsFilterDraft.category = category.name;
      state.statsFilters.category = category.name;
    }
    state.pagination = {};
    setNav("statistics");
    return true;
  }
  return false;
}

function fxInstallOrderStatistics() {
  const originalOps = renderOps;
  const originalModal = modalMarkup;
  modalMarkup = () => state.modal === "stats-detail" ? fxStatsDetailModal() : originalModal();
  const originalSetNav = setNav;
  pageFiles.ops.statistics = "pages/ops/statistics.html";
  if (!nav.ops.some(item => item[0] === "statistics")) {
    const index = nav.ops.findIndex(item => item[0] === "orders");
    nav.ops.splice(index < 0 ? nav.ops.length : index + 1, 0, ["statistics", "chart-column", "数据统计"]);
  }
  state.statsFilters ||= { ...fxStatsDefaultFilters };
  state.statsFilterDraft ||= { ...state.statsFilters };
  state.statsFilterError = "";
  renderOps = () => state.opsPage === "statistics" ? shell("ops", fxStatsPage()) : originalOps();
  setNav = page => {
    if (page === "statistics") state.statsDetail = null;
    return originalSetNav(page);
  };
  const originalCategory = fxCategoryPage;
  fxCategoryPage = () => {
    const root = document.createElement("div");
    root.innerHTML = originalCategory();
    root.querySelectorAll('[data-action="cat-edit"]').forEach(button => {
      button.insertAdjacentHTML("beforebegin", `<button class="text-action" data-action="stat-open-category" data-id="${fxEscape(button.dataset.id)}">订单统计</button>`);
    });
    return root.innerHTML;
  };
  window.fxStatsHandleAction = fxStatsHandleAction;
}
const fxStatsComposingInputs = new WeakSet();
function fxStatsCommitSearch(target) {
  state.statsFilterDraft ||= { ...fxStatsDefaultFilters };
  state.statsFilterDraft[target.dataset.statsFilter] = target.value;
  if (target.dataset.statsFilter === "customer") state.statsFilterDraft.customerId = "";
  if (target.dataset.statsFilter === "category") state.statsFilterDraft.productNumber = "";
  const start = target.selectionStart;
  const end = target.selectionEnd;
  fxStatsHandleAction("stat-search", target);
  const replacement = document.getElementById(target.id);
  if (replacement) { replacement.focus({ preventScroll: true }); replacement.setSelectionRange(start, end); }
}
document.addEventListener("compositionstart", event => {
  if (event.target.matches("[data-stats-filter]")) fxStatsComposingInputs.add(event.target);
}, true);
document.addEventListener("compositionend", event => {
  if (!event.target.matches("[data-stats-filter]")) return;
  fxStatsComposingInputs.delete(event.target);
  fxStatsCommitSearch(event.target);
}, true);
document.addEventListener("input", event => {
  if (!event.target.matches("[data-stats-filter]") || event.isComposing || fxStatsComposingInputs.has(event.target)) return;
  fxStatsCommitSearch(event.target);
}, true);
document.addEventListener("submit", event => {
  if (!event.target.matches(".stats-filters")) return;
  event.preventDefault();
  fxStatsHandleAction("stat-search", event.target);
}, true);
document.addEventListener("keydown", event => {
  if (event.key !== "Enter" || event.isComposing || !event.target.matches(".stats-filters input")) return;
  event.preventDefault();
  fxStatsHandleAction("stat-search", event.target);
}, true);
fxInstallOrderStatistics();
