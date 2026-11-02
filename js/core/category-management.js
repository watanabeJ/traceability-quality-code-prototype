"use strict";

const fxCategoryKey = "trace-product-categories-v1";
const fxCategoryAuditKey = "trace-product-category-audit-v1";
function fxCategories() { return fxStore.get(fxCategoryKey, []).map(item => ({ ...item, status: item.status || "启用" })); }
function fxCategoryForRecord(record, items = fxCategories()) {
  if (!record) return null;
  if (record.categoryId != null && record.categoryId !== "") return items.find(item => fxSameId(item.id, record.categoryId)) || null;
  const number = record.productNumber || record.categorySnapshot?.productNumber;
  if (number) return items.find(item => item.productNumber === number) || null;
  const name = record.categorySnapshot?.name || record.category;
  const matches = items.filter(item => item.name === name);
  return matches.length === 1 ? matches[0] : null;
}
function fxCurrentCategoryName(record) {
  return fxCategoryForRecord(record)?.name || record?.category || record?.categorySnapshot?.name || "";
}
function fxSyncCategoryNames() {
  const items = fxCategories();
  for (const order of orders) {
    for (const line of order.lines || [order]) {
      const category = fxCategoryForRecord(line, items);
      if (!category) continue;
      line.categorySnapshot ||= { name: line.category || category.name, productNumber: line.productNumber || category.productNumber };
      Object.assign(line, { categoryId: category.id, productNumber: category.productNumber, category: category.name });
    }
  }
  // Resolve legacy identities without rewriting product data published to scan pages.
  for (const product of products) {
    const category = fxCategoryForRecord(product, items);
    if (category) {
      product.categoryId ??= category.id;
      product.productNumber ||= category.productNumber;
      const bound = product.status === "已激活" || orders.some(order =>
        (order.activations || []).some(activation => fxActivationBelongsToProduct(activation, product)));
      if (!bound) {
        product.category = category.name;
        if (product.details) product.details.category = category.name;
      }
    }
  }
}
function fxCategoryFilterOptions(customer = null) {
  const ownProducts = products.filter(item => !customer || fxRecordBelongsToCustomer(item, customer));
  const ownOrders = orders.filter(item => !customer || fxRecordBelongsToCustomer(item, customer));
  const names = [
    ...fxCategories().sort((left, right) => left.productNumber.localeCompare(right.productNumber)).map(item => item.name),
    ...ownProducts.map(item => item.category),
    ...ownOrders.flatMap(order => (order.lines || [order]).map(line => line.category)),
  ];
  return ["全部大类", ...new Set(names.filter(Boolean))];
}
function fxCategoryLineMatches(item, line) {
  return fxSameId(fxCategoryForRecord(line)?.id, item.id);
}
function fxCategoryOrders(item) {
  return fxStore.get(fxBusinessStorage.orders, orders).filter(order =>
    order.lines ? order.lines.some(line => fxCategoryLineMatches(item, line)) :
    order.categoryId != null ? fxSameId(order.categoryId, item.id) :
      order.productNumber === item.productNumber || order.categorySnapshot?.productNumber === item.productNumber ||
      order.category === item.name || order.categorySnapshot?.name === item.name);
}
function fxCategoryUsed(item) { return Boolean(item.hasCreatedOrder || fxCategoryOrders(item).length); }
function fxCategoryUsage(item) {
  const matchingOrders = fxCategoryOrders(item);
  const amount = matchingOrders.reduce((sum, order) => sum + (order.lines
    ? order.lines.filter(line => fxCategoryLineMatches(item, line)).reduce((lineSum, line) => lineSum + (Number(line.quantity) || 0), 0)
    : Number(order.total) || 0), 0);
  const capacity = typeof omCategoryPoolSize === "number" ? omCategoryPoolSize : 99_999_999;
  return { orders: matchingOrders.length, amount, remaining: Math.max(0, capacity - amount) };
}
function fxCategoryNumbers(item = null) {
  const occupied = new Set(fxCategories().filter(row => row.id !== item?.id).map(row => row.productNumber));
  for (const order of fxStore.get(fxBusinessStorage.orders, orders)) {
    for (const line of order.lines || []) {
      if (line.productNumber && line.productNumber !== item?.productNumber) occupied.add(line.productNumber);
    }
    const number = order.productNumber || order.categorySnapshot?.productNumber;
    if (number && number !== item?.productNumber) occupied.add(number);
  }
  return Array.from({ length: 99 }, (_, index) => String(index + 1).padStart(2, "0")).filter(number => !occupied.has(number));
}
function fxCategoryError(name, number, item = null) {
  const length = Array.from(name.trim()).length;
  if (length < 2 || length > 20) return "产品大类须为 2～20 个字符";
  if (fxCategories().some(row => row.id !== item?.id && row.name.trim() === name.trim())) return "产品大类已存在";
  return fxCategoryNumberError(number, item);
}
function fxCategoryNumberError(number, item = null) {
  if (!/^(0[1-9]|[1-9][0-9])$/.test(number)) return "请输入 01 至 99 的两位产品号";
  if (item && fxCategoryUsed(item) && item.productNumber !== number) return "已生成过订单，产品号不可更换";
  if (!fxCategoryNumbers(item).includes(number)) return "该产品号已被占用，请使用其他号码";
  return "";
}
function fxValidateCategoryNumberInput(input, complete = false) {
  const hint = document.getElementById("cat-number-error");
  if (!hint || input.disabled) return;
  const item = fxCategories().find(row => row.id === state.categorySelectedId);
  const number = input.value.trim();
  const error = number && (complete || number.length >= 2) ? fxCategoryNumberError(number, item) : "";
  hint.textContent = error || hint.dataset.categoryRule;
  hint.classList.toggle("danger-text", Boolean(error));
  input.setAttribute("aria-invalid", error ? "true" : "false");
  input.style.borderColor = error ? "var(--danger)" : "";
  input.setCustomValidity(error);
}
function fxCategoryLog(item, changes) {
  const records = fxStore.get(fxCategoryAuditKey, []);
  const time = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" });
  for (const change of changes) records.push({
    categoryId: item.id, categoryName: item.name, productNumber: item.productNumber,
    time, operator: fxCurrentOperator()?.name || state.currentAccount, ...change
  });
  return records;
}
function fxWriteCategories(items, audit) {
  // Persist both records together from the user's perspective; restore on quota errors.
  const keys = [fxCategoryKey, fxCategoryAuditKey].map(key => `copy-20261022:${key}`);
  const previous = keys.map(key => localStorage.getItem(key));
  try {
    localStorage.setItem(keys[0], JSON.stringify(items));
    localStorage.setItem(keys[1], JSON.stringify(audit));
    return true;
  } catch (_) {
    keys.forEach((key, index) => {
      try { if (previous[index] === null) localStorage.removeItem(key); else localStorage.setItem(key, previous[index]); } catch (_) {}
    });
    showToast("保存失败，本地存储空间不足，请重试");
    return false;
  }
}
function fxCategoryPage() {
  const rows = fxCategories().filter(item =>
    item.name.includes(state.categoryNameFilter.trim()) &&
    item.productNumber.includes(state.categoryNumberFilter.trim()) &&
    (state.categoryStatus === "全部状态" || item.status === state.categoryStatus));
  const actions = `<button class="button" data-action="cat-history">${icon("history", "")}修改记录</button><button class="button primary" data-action="cat-new">${icon("plus", "+")}新建产品大类</button>`;
  const body = rows.map(item => {
    const usage = fxCategoryUsage(item);
    const lifecycleAction = item.status === "停用"
      ? `<button class="text-action success-text" data-action="cat-toggle" data-id="${item.id}">启用</button>`
      : fxCategoryUsed(item)
        ? `<button class="text-action danger-text" data-action="cat-toggle" data-id="${item.id}">停用</button>`
        : `<button class="text-action danger-text" data-action="cat-delete" data-id="${item.id}">删除</button>`;
    return `<tr><td>${fxEscape(item.name)}</td><td class="mono">${item.productNumber}</td><td>${status(item.status)}</td><td class="stats-number">${formatNumber(usage.orders)}</td><td class="stats-number">${formatNumber(usage.amount)}</td><td class="stats-number">${formatNumber(usage.remaining)}</td><td class="category-remark-cell">${fxEscape(item.remark || "—")}</td><td class="action-column"><div class="table-actions"><button class="text-action" data-action="cat-edit" data-id="${item.id}">编辑</button>${lifecycleAction}</div></td></tr>`;
  }).join("");
  return `<div class="page">${pageHeader("品类管理", "", actions)}<div class="toolbar"><div class="filters">${fxFilterInput("cat-name-search", state.categoryNameFilter, "搜索产品大类")}${fxFilterInput("cat-number-search", state.categoryNumberFilter, "搜索产品号")}${fxToolbarSelectFilter("状态", "categoryStatus", ["全部状态", "启用", "停用"], state.categoryStatus)}<button class="button small list-reset-button" data-action="cat-reset">${icon("rotate-ccw", "")}重置</button></div></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>产品大类</th><th>产品号</th><th>状态</th><th class="stats-number">关联订单数</th><th class="stats-number">已生成码量</th><th class="stats-number">剩余可用码量</th><th>备注</th><th>操作</th></tr></thead><tbody>${body || fxEmpty(8, "暂无匹配的产品大类")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
}
function fxCategoryNumberControl(item, locked) {
  const exhausted = !locked && !fxCategoryNumbers(item).length;
  const readonly = locked || exhausted;
  const rule = locked ? "已生成过订单，产品号不可更换" : exhausted ? "产品号已用完" : "请输入 01 至 99 的两位产品号";
  return `<input id="cat-number"${locked ? ' class="immutable-input"' : ""} type="text" inputmode="numeric" maxlength="2" pattern="(0[1-9]|[1-9][0-9])" value="${fxEscape(item?.productNumber || "")}" placeholder="请输入产品号" autocomplete="off" aria-label="产品号" aria-describedby="cat-number-error" ${readonly ? "readonly aria-readonly=\"true\"" : ""}><span id="cat-number-error" class="field-help${exhausted ? " danger-text" : ""}" data-category-rule="${rule}" aria-live="polite">${rule}</span>`;
}
function fxCategoryModal() {
  const item = fxCategories().find(row => row.id === state.categorySelectedId);
  if (state.modal === "cat-form") {
    const locked = item && fxCategoryUsed(item);
    const body = `<div class="form-grid"><div class="field full"><label class="required" for="cat-name">产品大类</label><input id="cat-name" value="${fxEscape(item?.name || "")}" placeholder="请输入产品大类" autocomplete="off"><span class="field-help">2～20 个字符，名称不可重复。</span></div><div class="field full"><label class="required" for="cat-number">产品号</label>${fxCategoryNumberControl(item, locked)}</div><div class="field full"><label for="cat-remark">备注</label><textarea id="cat-remark" maxlength="20" placeholder="请输入备注（选填）">${fxEscape(item?.remark || "")}</textarea></div><div class="field full"><span id="cat-error" class="field-help danger-text" role="alert"></span></div></div>`;
    return fxModalShell(item ? "编辑产品大类" : "新建产品大类", "", body, '<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="cat-save">保存</button>');
  }
  if (state.modal === "cat-history") {
    const records = fxStore.get(fxCategoryAuditKey, []).filter(row => !state.categorySelectedId || row.categoryId === state.categorySelectedId).reverse();
    const body = records.map(row => `<tr><td>${fxEscape(row.time)}</td><td>${fxEscape(row.operator)}</td><td>${fxEscape(row.categoryName)}</td><td>${fxEscape(row.field === "品类名称" ? "产品大类" : row.field)}</td><td>${fxEscape(row.before || "—")}</td><td>${fxEscape(row.after || "—")}</td></tr>`).join("");
    return fxModalShell("修改记录", item?.name || "全部产品大类", `<div class="table-shell" data-category-history><div class="table-scroll"><table><thead><tr><th>修改时间</th><th>操作人</th><th>产品大类</th><th>变更字段</th><th>修改前</th><th>修改后</th></tr></thead><tbody>${body || fxEmpty(6, "暂无修改记录")}</tbody></table></div></div>`, '<button class="button" data-action="close-modal">关闭</button>', true);
  }
  if (item && state.modal === "cat-toggle") {
    const nextStatus = item.status === "停用" ? "启用" : "停用";
    return fxModalShell(`${nextStatus}产品大类`, "", `<p>${fxEscape(item.name)}（${item.productNumber}）</p><p>${nextStatus === "停用" ? "停用后不再用于生成新订单，产品号继续保留，历史订单及后续绑定、撤回不受影响。" : "启用后可重新用于生成新订单。"}</p>`, `<button class="button" data-action="close-modal">取消</button><button class="button ${nextStatus === "停用" ? "danger" : "primary"}" data-action="cat-confirm">确认${nextStatus}</button>`);
  }
  if (!item || state.modal !== "cat-delete") return "";
  return fxModalShell("删除产品大类", "", `<p>${fxEscape(item.name)}（${item.productNumber}）</p><p>删除后释放产品号，修改记录继续保留。</p>`, '<button class="button" data-action="close-modal">取消</button><button class="button danger" data-action="cat-confirm">确认删除</button>');
}
function fxInstallCategoryManagement() {
  const originalRender = render;
  render = function () { fxSyncCategoryNames(); return originalRender(); };
  pageFiles.ops.categories = "pages/ops/categories.html";
  pageTitles["ops:categories"] = "溯源质控码平台 · 品类管理";
  nav.ops.splice(nav.ops.findIndex(item => item[0] === "customers") + 1, 0, ["categories", "tags", "品类管理"]);
  Object.assign(state, { categoryNameFilter: "", categoryNumberFilter: "", categoryStatus: "全部状态" });
  fxSearchFilters["cat-name-search"] = "categoryNameFilter";
  fxSearchFilters["cat-number-search"] = "categoryNumberFilter";
  const originalOps = renderOps;
  renderOps = () => state.opsPage === "categories" ? shell("ops", fxCategoryPage().replace("<table>", '<table class="category-management-table">')) : originalOps();
  const originalModal = modalMarkup;
  modalMarkup = () => state.modal?.startsWith("cat-") ? fxCategoryModal() : originalModal();
  const originalSave = fxSaveBusiness;
  fxSaveBusiness = function () {
    fxSyncCategoryNames();
    let changed = false;
    const items = fxCategories();
    for (const item of items) {
      for (const order of orders) {
        if (order.lines) {
          if (order.lines.some(line => fxSameId(line.categoryId, item.id)) && !item.hasCreatedOrder) { item.hasCreatedOrder = true; changed = true; }
          continue;
        }
        const matches = order.categoryId != null ? fxSameId(order.categoryId, item.id) :
          order.productNumber === item.productNumber || order.categorySnapshot?.productNumber === item.productNumber ||
          order.category === item.name || order.categorySnapshot?.name === item.name;
        if (!matches) continue;
        order.categoryId ??= item.id;
        order.productNumber ||= item.productNumber;
        order.categorySnapshot ||= { name: order.category || item.name, productNumber: item.productNumber };
        if (!item.hasCreatedOrder) { item.hasCreatedOrder = true; changed = true; }
      }
    }
    if (changed) fxStore.set(fxCategoryKey, items);
    return originalSave();
  };
}
document.addEventListener("change", event => {
  if (event.target.id === "cat-number") fxValidateCategoryNumberInput(event.target, true);
}, true);
document.addEventListener("input", event => {
  if (event.target.id === "cat-number") fxValidateCategoryNumberInput(event.target);
});
document.addEventListener("focusout", event => {
  if (event.target.id === "cat-number") fxValidateCategoryNumberInput(event.target, true);
});
document.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  const action = target?.dataset.action;
  if (!action?.startsWith("cat-")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (entryPortal !== "ops" || !fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
  const items = fxCategories();
  const id = target.dataset.id || state.categorySelectedId;
  const item = items.find(row => row.id === id);
  if (action === "cat-reset") { Object.assign(state, { categoryNameFilter: "", categoryNumberFilter: "", categoryStatus: "全部状态", pagination: {} }); return render(); }
  if (action === "cat-new" || action === "cat-edit") {
    if (action === "cat-edit" && !item) return showToast("类别已不存在，请刷新");
    state.categorySelectedId = action === "cat-new" ? null : id;
    state.modal = "cat-form";
    render();
    document.getElementById("cat-name")?.focus();
    return;
  }
  if (action === "cat-history") { state.categorySelectedId = target.dataset.id || null; state.modal = "cat-history"; return render(); }
  if (action === "cat-delete" || action === "cat-toggle") {
    if (!item) return showToast("类别已不存在，请刷新");
    if (action === "cat-delete" && fxCategoryUsed(item)) return showToast("已生成过订单，不可删除");
    if (action === "cat-delete" && item.status === "停用") return showToast("停用类别请先启用");
    if (action === "cat-toggle" && item.status !== "停用" && !fxCategoryUsed(item)) return showToast("未生成过订单的类别可直接删除");
    state.categorySelectedId = id;
    state.categoryToggleFromStatus = item.status;
    state.modal = action;
    return render();
  }
  if (action === "cat-save") {
    if (state.categorySelectedId && !item) return showToast("类别已不存在，请刷新");
    const name = fxRead("cat-name"), productNumber = fxRead("cat-number"), remark = fxRead("cat-remark");
    if (remark.length > 20) {
      document.getElementById("cat-error").textContent = "备注最多 20 个字符";
      document.getElementById("cat-remark")?.focus();
      return;
    }
    const numberError = fxCategoryNumberError(productNumber, item);
    if (numberError) {
      const input = document.getElementById("cat-number");
      if (input) fxValidateCategoryNumberInput(input, true);
      document.getElementById("cat-error").textContent = "";
      input?.focus();
      return;
    }
    const error = fxCategoryError(name, productNumber, item);
    if (error) { document.getElementById("cat-error").textContent = error; document.getElementById("cat-name")?.focus(); return; }
    let audit;
    let savedCategory = item;
    if (item) {
      const draft = { name, productNumber, remark };
      const changes = [["name", "产品大类"], ["productNumber", "产品号"], ["remark", "备注"]].filter(([key]) => (item[key] || "") !== draft[key]).map(([key, field]) => ({ field, before: item[key] || "", after: draft[key] }));
      audit = fxCategoryLog(item, changes);
      Object.assign(item, { name, productNumber, remark, hasCreatedOrder: fxCategoryUsed(item) });
    } else {
      const created = { id: crypto.randomUUID(), name, productNumber, remark, status: "启用", hasCreatedOrder: false };
      items.push(created);
      savedCategory = created;
      audit = fxCategoryLog(created, [{ field: "新建", before: "", after: `${name}（${productNumber}）` }]);
    }
    fxSyncCategoryNames();
    if (!fxWriteCategories(items, audit)) return;
    if (savedCategory && state.omDraft && state.omCategoryCreateLineId) {
      const line = state.omDraft.lines.find(row => row.id === state.omCategoryCreateLineId);
      if (line) line.categoryId = savedCategory.id;
      state.omCategoryCreateLineId = null;
    }
  } else if (action === "cat-confirm") {
    if (!item) return showToast("类别已不存在，请刷新");
    if (state.modal === "cat-toggle") {
      if (item.status !== state.categoryToggleFromStatus) return showToast("类别状态已变更，请关闭窗口后重试");
      if (item.status !== "停用" && !fxCategoryUsed(item)) return showToast("未生成过订单的类别可直接删除");
      const nextStatus = item.status === "停用" ? "启用" : "停用";
      const audit = fxCategoryLog(item, [{ field: "状态", before: item.status, after: nextStatus }]);
      Object.assign(item, { status: nextStatus, hasCreatedOrder: fxCategoryUsed(item) });
      if (!fxWriteCategories(items, audit)) return;
    } else if (state.modal === "cat-delete") {
      if (fxCategoryUsed(item)) return showToast("已生成过订单，不可删除");
      if (item.status === "停用") return showToast("停用类别请先启用");
      if (!fxWriteCategories(items.filter(row => row.id !== id), fxCategoryLog(item, [{ field: "删除", before: `${item.name}（${item.productNumber}）`, after: "" }]))) return;
    } else return;
  } else return;
  state.modal = null;
  render();
  showToast("操作已保存");
}, true);
window.addEventListener("storage", event => {
  if ([fxCategoryKey, fxCategoryAuditKey].some(key => event.key === `copy-20261022:${key}`)) {
    fxSyncCategoryNames();
    if (!state.modal) fxRenderFromStorage();
  }
});
