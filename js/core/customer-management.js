"use strict";

const fxSharedNumbersKey = "trace-shared-company-numbers-v1";
function fxSharedNumbers() { return fxStore.get(fxSharedNumbersKey, ["99999"]); }
function fxFilteredCustomers() {
  const includes = (value, term) => !term || String(value || "").toLowerCase().includes(term.trim().toLowerCase());
  return fxSortedRows(customers.filter(item =>
    includes(item.name, state.customerNameFilter) &&
    includes(item.account, state.customerAccountFilter) &&
    includes(item.phone, state.customerPhoneFilter) &&
    includes(item.companyNumber, state.customerNumberFilter) &&
    (!state.customerNumberType || state.customerNumberType === "全部类型" || item.companyNumberType === state.customerNumberType) &&
    (state.customerStatus === "全部状态" || item.status === state.customerStatus)), "customer");
}
function fxHasCustomerOrders(customer) {
  return Boolean(customer && (customer.hasCreatedOrder || orders.some(order => fxRecordBelongsToCustomer(order, customer))));
}
function fxCompanyNumberError(number, type, customer = null) {
  if (!/^\d{5}$/.test(number) || Number(number) < 1) return "请输入 00001 至 99999 的五位公司号";
  const shared = fxSharedNumbers().includes(number);
  if (type === "共享" && !shared) return "该号码不是已设置的共享号";
  if (type === "专属" && shared) return "该号码已设为共享号，请选择使用共享号";
  if (customers.some(item => item.id !== customer?.id && item.companyNumber === number && (type !== "共享" || item.companyNumberType !== "共享"))) return "该公司号已被客户专属使用";
  if (orders.some(order => order.companyNumber === number && (!customer || !fxRecordBelongsToCustomer(order, customer))) && type !== "共享") return "该公司号已有历史订单，不可重新发放";
  if (fxHasCustomerOrders(customer) && (number !== customer.companyNumber || type !== customer.companyNumberType)) return "客户已创建过订单，公司号及类型不可更换";
  return "";
}
function fxSmallestAvailableCompanyNumber() {
  const used = new Set([...fxSharedNumbers(), ...customers.map(item => item.companyNumber), ...orders.map(item => item.companyNumber)]);
  for (let number = 1; number <= 99999; number++) {
    const candidate = String(number).padStart(5, "0");
    if (!used.has(candidate)) return candidate;
  }
  return "";
}
function fxCompanyFields(customer) {
  const locked = fxHasCustomerOrders(customer);
  const type = customer?.companyNumberType || "专属";
  return `<div class="field full"><label class="required" for="fx-company-mode">公司号类型</label><select id="fx-company-mode" ${locked ? "disabled" : ""}><option value="专属" ${type === "专属" ? "selected" : ""}>专属公司号</option><option value="共享" ${type === "共享" ? "selected" : ""}>共享公司号</option></select></div><div class="field full" id="fx-company-number-field">${fxCompanyNumberControl(type, customer?.companyNumber || "", locked, customer)}</div>`;
}
function fxCompanyNumberControl(type, value, locked, customer) {
  if (type === "共享") return `<label class="required" for="fx-company-number">共享公司号</label><select id="fx-company-number" ${locked ? "disabled" : ""}><option value="">请选择共享号</option>${fxSharedNumbers().map(number => `<option value="${number}" ${number === value ? "selected" : ""}>${number}</option>`).join("")}</select>`;
  if (!value && !customer) value = fxSmallestAvailableCompanyNumber();
  return `<label class="required" for="fx-company-number">专属公司号</label><input id="fx-company-number" type="text" value="${fxEscape(value)}" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" autocomplete="off" aria-describedby="fx-company-number-error" placeholder="请输入五位公司号" ${locked ? 'disabled title="已创建过订单，公司号不可更换"' : ""}><span id="fx-company-number-error" class="field-help danger-text" aria-live="polite" hidden></span>`;
}
function fxReadonlyCompanyFields(customer) {
  return `<div class="field"><label for="fx-company-number">公司号</label><input id="fx-company-number" class="immutable-input mono" value="${fxEscape(customer.companyNumber || "—")}" readonly aria-readonly="true"></div><div class="field"><label for="fx-company-mode">公司号类型</label><input id="fx-company-mode" class="immutable-input" value="${fxEscape(customer.companyNumberType || "—")}" readonly aria-readonly="true"></div>`;
}
function fxValidateCompanyNumberInput(input, complete = false) {
  const hint = document.getElementById("fx-company-number-error");
  if (!hint || input.disabled) return;
  const value = input.value.trim();
  const customer = customers.find(item => item.id === state.selectedCustomerId);
  const error = value && (complete || value.length >= 5)
    ? fxCompanyNumberError(value, "专属", customer)
    : "";
  hint.textContent = error;
  hint.hidden = !error;
  input.setAttribute("aria-invalid", error ? "true" : "false");
  input.style.borderColor = error ? "var(--danger)" : "";
  input.setCustomValidity(error);
}
function fxSharedNumberError(number) {
  if (fxSharedNumbers().includes(number)) return "该号码已设置为共享号，无需重复添加";
  return fxCompanyNumberError(number, "专属");
}
function fxValidateSharedNumberInput(input, complete = false) {
  state.sharedNumberDraft = input.value;
  const value = input.value.trim();
  const error = fxSharedNumberError(value);
  const showError = Boolean(value && (complete || value.length >= 5) && error);
  const hint = document.getElementById("cm-shared-number-hint");
  hint.textContent = showError ? error : value && !error ? "该号码可设置为共享号" : "请输入 00001 至 99999 的五位未使用号码";
  hint.classList.toggle("danger-text", showError);
  input.setAttribute("aria-invalid", String(showError));
  input.setCustomValidity(error);
  document.querySelector('[data-action="cm-add-shared"]').disabled = Boolean(error);
}
function fxSharedNumberRow(number, sequence = null) {
  const count = customers.filter(customer => customer.companyNumber === number).length;
  const historical = orders.some(order => order.companyNumber === number);
  return `<tr>${sequence === null ? "" : `<td class="sequence-cell">${sequence}</td>`}<td class="mono">${number}</td><td>${count}</td><td class="action-column">${count || historical ? `<span class="muted">${count ? "已被客户使用" : "已有历史订单"}</span>` : `<button class="text-action danger-text" data-action="cm-remove-shared" data-number="${number}">取消共享设置</button>`}</td></tr>`;
}
function fxSharedNumberDraftRow(sequence = null) {
  const draft = state.sharedNumberDraft || "";
  return `<tr class="shared-number-draft-row">${sequence === null ? "" : `<td class="sequence-cell">${sequence}</td>`}<td><div class="field"><input id="cm-shared-number" type="text" value="${fxEscape(draft)}" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" autocomplete="off" aria-label="新增共享公司号" aria-describedby="cm-shared-number-hint" placeholder="请输入五位号码"><span id="cm-shared-number-hint" class="field-help" aria-live="polite">请输入 00001 至 99999 的五位未使用号码</span></div></td><td>—</td><td class="action-column"><div class="shared-number-row-actions"><button type="button" class="button primary small" data-action="cm-add-shared" ${fxSharedNumberError(draft.trim()) ? "disabled" : ""}>确认</button><button type="button" class="button small" data-action="cm-cancel-add-shared">取消</button></div></td></tr>`;
}
function fxFinishSharedNumberEdit() {
  state.sharedNumberAdding = false;
  state.sharedNumberDraft = "";
  const button = document.querySelector('[data-action="cm-start-add-shared"]');
  if (button) { button.disabled = false; button.focus({ preventScroll: true }); }
}
function fxSyncSharedNumberRows() {
  const body = document.querySelector(".shared-number-table tbody");
  if (!body.children.length) body.innerHTML = '<tr><td colspan="4">暂无共享号</td></tr>';
  body.querySelectorAll(".sequence-cell").forEach((cell, index) => { cell.textContent = index + 1; });
}
function fxSharedNumberModal() {
  const rows = fxSharedNumbers().map(number => fxSharedNumberRow(number)).join("");
  const editor = state.sharedNumberAdding ? fxSharedNumberDraftRow() : "";
  return fxModalShell("设置共享号", "", `<div class="shared-number-toolbar"><button type="button" class="button primary small" data-action="cm-start-add-shared" ${state.sharedNumberAdding ? "disabled" : ""}>${icon("plus", "+")}添加共享号</button></div><div class="table-scroll"><table class="shared-number-table"><thead><tr><th>共享公司号</th><th>使用客户数</th><th>操作</th></tr></thead><tbody>${rows || (!editor ? '<tr><td colspan="3">暂无共享号</td></tr>' : "")}${editor}</tbody></table></div>`, '<button class="button" data-action="close-modal">关闭</button>', true).replace("modal modal-wide", "modal modal-wide shared-number-modal");
}
function fxCustomerHistory(customer) {
  const rows = (customer.changeHistory || []).slice().reverse().map(record => `<tr><td>${fxEscape(record.time)}</td><td>${fxEscape(record.operator)}</td><td>${fxEscape(record.field)}</td><td>${fxEscape(record.before || "—")}</td><td>${fxEscape(record.after || "—")}</td></tr>`).join("");
  return `<div class="table-shell" data-customer-history><div class="table-scroll"><table><thead><tr><th>修改时间</th><th>操作人</th><th>变更字段</th><th>修改前</th><th>修改后</th></tr></thead><tbody>${rows || '<tr><td colspan="5">暂无修改记录</td></tr>'}</tbody></table></div></div>`;
}
function fxLogCustomerChanges(customer, next) {
  const labels = { name: "客户名称", account: "登录账号", phone: "联系电话", companyNumber: "公司号", companyNumberType: "公司号类型", license: "营业执照", legalId: "法人身份证" };
  customer.changeHistory ||= [];
  const time = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" });
  for (const [key, label] of Object.entries(labels)) {
    const attachment = key === "license" || key === "legalId";
    if (key === "phone" && String(customer[key]).replace(/\s+/g, "") === String(next[key]).replace(/\s+/g, "")) continue;
    if (JSON.stringify(customer[key]) === JSON.stringify(next[key])) continue;
    customer.changeHistory.push({ time, operator: fxCurrentOperator()?.name || state.currentAccount, field: label, before: attachment ? fxFileName(customer[key]) : customer[key], after: attachment ? fxFileName(next[key]) : next[key] });
  }
}

function fxInstallCustomerManagement() {
  state.customerNumberFilter = "";
  state.customerNumberType = "全部类型";
  const originalCustomers = opsCustomers;
  opsCustomers = function () {
    const root = document.createElement("div");
    root.innerHTML = originalCustomers();
    const actions = root.querySelector('[data-action="fx-new-customer"]')?.parentElement;
    actions?.insertAdjacentHTML("beforeend", `<button class="button" data-action="cm-open-shared">${icon("settings-2", "")}设置共享号</button>`);
    const filters = root.querySelector(".customer-search-filters");
    filters?.querySelector(".list-reset-button")?.insertAdjacentHTML("beforebegin", `${fxFilterInput("cm-company-search", state.customerNumberFilter, "搜索公司号")}${fxToolbarSelectFilter("号码类型", "customerNumberType", ["全部类型", "专属", "共享"], state.customerNumberType)}`);
    const table = root.querySelector(".customer-account-table");
    table.querySelector("thead tr th").classList.add("customer-name-column");
    table.querySelector("thead tr").children[2].insertAdjacentHTML("afterend", "<th>公司号</th><th>号码类型</th>");
    table.querySelectorAll('[data-action="fx-choose-allocation-batch"]').forEach(button => button.remove());
    for (const row of [...table.querySelectorAll("tbody tr")]) {
      const id = Number(row.querySelector('[data-action="fx-edit-customer"]')?.dataset.id);
      const customer = customers.find(item => item.id === id);
      if (!customer) continue;
      if (!customer.companyNumber?.includes(state.customerNumberFilter.trim()) || (state.customerNumberType !== "全部类型" && customer.companyNumberType !== state.customerNumberType)) { row.remove(); continue; }
      row.cells[2].insertAdjacentHTML("afterend", `<td class="mono">${fxEscape(customer.companyNumber)}</td><td>${fxEscape(customer.companyNumberType)}</td>`);
      row.querySelector('[data-action="fx-edit-customer"]')?.insertAdjacentHTML("afterend", `<button class="text-action" data-action="om-create" data-customer-id="${fxEscape(customer.id)}" ${customer.status === "启用" ? "" : 'disabled title="客户账号已禁用"'}>创建订单</button>`);
    }
    // Pagination uses the filtered records, not hidden rows from the original table.
    root.querySelector(".pagination")?.remove();
    const count = table.querySelectorAll('tbody [data-action="fx-edit-customer"]').length;
    if (!count) table.querySelector("tbody").innerHTML = fxEmpty(11, "未找到客户");
    root.querySelector(".table-shell").insertAdjacentHTML("beforeend", pagination(count));
    return root.innerHTML;
  };
  const originalDetail = fxCustomerDetailPage;
  fxCustomerDetailPage = function () {
    const root = document.createElement("div");
    root.innerHTML = originalDetail();
    const customer = customers.find(item => item.id === state.selectedCustomerId);
    if (customer) {
      root.querySelector('[data-action="fx-choose-allocation-batch"]')?.remove();
      root.querySelector(".page-header .page-actions")?.insertAdjacentHTML("beforeend", `<button type="button" class="button primary" data-action="om-create" data-customer-id="${fxEscape(customer.id)}" ${customer.status === "启用" ? "" : 'disabled title="客户账号已禁用"'}>${icon("plus", "+")}创建订单</button>`);
      const summary = root.querySelector(".detail-grid");
      summary.classList.add("customer-profile-grid");
      const [name, account, phone, accountStatus, license, legalId, activeProducts] = summary.children;
      summary.insertAdjacentHTML("beforeend", `<div class="detail-item"><dt>公司号</dt><dd class="mono">${fxEscape(customer.companyNumber)}</dd></div><div class="detail-item"><dt>公司号类型</dt><dd>${fxEscape(customer.companyNumberType)}</dd></div>`);
      const companyNumber = summary.children[7];
      const companyNumberType = summary.children[8];
      for (const item of [account, companyNumber, license, activeProducts]) item.classList.add("customer-profile-row-start");
      license.classList.add("customer-profile-document");
      legalId.classList.add("customer-profile-document");
      summary.replaceChildren(name, phone, account, accountStatus, companyNumber, companyNumberType, license, legalId, activeProducts);
      const summaryHeading = root.querySelector(".detail-section > h3");
      summaryHeading.outerHTML = `<div class="detail-title-row"><h3>客户完整资料</h3><button type="button" class="button small" data-action="cm-open-history">${icon("history", "")}修改记录</button></div>`;
      const orderSection = [...root.querySelectorAll(".detail-section")].find(section => section.querySelector("h3")?.textContent.trim() === "客户订单记录");
      orderSection?.querySelector(".detail-title-row")?.insertAdjacentHTML("beforeend", `<div class="table-actions"><button class="button small" data-action="stat-open-customer" data-id="${fxEscape(customer.id)}">${icon("chart-column", "")}订单统计</button></div>`);
    }
    return root.innerHTML;
  };
  const originalModal = modalMarkup;
  modalMarkup = function () {
    if (state.modal === "cm-shared") return fxSharedNumberModal();
    if (state.modal === "cm-history") {
      const customer = customers.find(item => item.id === state.selectedCustomerId);
      if (!customer) return "";
      return fxModalShell("修改记录", customer.name, fxCustomerHistory(customer), '<button class="button" data-action="close-modal">关闭</button>', true);
    }
    const markup = originalModal();
    if (state.modal !== "fx-customer") return markup;
    const root = document.createElement("div");
    root.innerHTML = markup;
    const customer = customers.find(item => item.id === state.selectedCustomerId);
    if (customer) {
      root.querySelector("#fx-customer-name")?.closest(".field")?.insertAdjacentHTML("afterend", fxReadonlyCompanyFields(customer));
    } else {
      root.querySelector(".form-grid").insertAdjacentHTML("afterbegin", fxCompanyFields(null));
    }
    return root.innerHTML;
  };
  fxSearchFilters["cm-company-search"] = "customerNumberFilter";
  const originalReset = fxResetListFilters;
  fxResetListFilters = function (context) {
    if (context === "customers") { state.customerNumberFilter = ""; state.customerNumberType = "全部类型"; }
    return originalReset(context);
  };
}

document.addEventListener("change", event => {
  if (event.target.id === "fx-company-number") fxValidateCompanyNumberInput(event.target, true);
  if (event.target.dataset.tableFilter === "customerNumberType") {
    event.stopImmediatePropagation();
    state.customerNumberType = event.target.value;
    return render();
  }
  if (event.target.id !== "fx-company-mode") return;
  const customer = customers.find(item => item.id === state.selectedCustomerId);
  document.getElementById("fx-company-number-field").innerHTML = fxCompanyNumberControl(event.target.value, "", fxHasCustomerOrders(customer), customer);
}, true);
document.addEventListener("input", event => {
  if (event.target.id === "fx-company-number") fxValidateCompanyNumberInput(event.target);
  if (event.target.id === "cm-shared-number") fxValidateSharedNumberInput(event.target);
});
document.addEventListener("focusout", event => {
  if (event.target.id === "fx-company-number") fxValidateCompanyNumberInput(event.target, true);
  if (event.target.id === "cm-shared-number") fxValidateSharedNumberInput(event.target, true);
});

let fxCustomerSaving = false;
document.addEventListener("click", async event => {
  const target = event.target.closest("[data-action]");
  const action = target?.dataset.action;
  if (!action || (!action.startsWith("cm-") && !["fx-confirm-customer", "fx-export-customers"].includes(action))) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (entryPortal !== "ops" || !fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
  if (action === "cm-open-shared") { state.sharedNumberAdding = false; state.sharedNumberDraft = ""; state.modal = "cm-shared"; return render(); }
  if (action === "cm-start-add-shared") {
    const body = document.querySelector(".shared-number-table tbody");
    if (!body || body.querySelector(".shared-number-draft-row")) return;
    state.sharedNumberAdding = true;
    state.sharedNumberDraft = "";
    body.querySelector("td[colspan]")?.closest("tr").remove();
    body.insertAdjacentHTML("beforeend", fxSharedNumberDraftRow(body.rows.length + 1));
    target.disabled = true;
    document.getElementById("cm-shared-number")?.focus({ preventScroll: true });
    document.querySelector(".shared-number-draft-row")?.scrollIntoView({ block: "nearest" });
    return;
  }
  if (action === "cm-cancel-add-shared") {
    target.closest("tr")?.remove();
    fxFinishSharedNumberEdit();
    fxSyncSharedNumberRows();
    return;
  }
  if (action === "cm-open-history") {
    if (!customers.some(item => item.id === state.selectedCustomerId)) return showToast("客户不存在");
    state.modal = "cm-history";
    return render();
  }
  if (action === "cm-add-shared") {
    const row = target.closest(".shared-number-draft-row");
    if (!row) return;
    const number = fxRead("cm-shared-number");
    const error = fxSharedNumberError(number);
    if (error) { fxValidateSharedNumberInput(document.getElementById("cm-shared-number"), true); return; }
    fxStore.set(fxSharedNumbersKey, [...fxSharedNumbers(), number]);
    const sequence = Number(row.querySelector(".sequence-cell").textContent);
    row.outerHTML = fxSharedNumberRow(number, sequence);
    fxFinishSharedNumberEdit();
    showToast(`共享号 ${number} 已添加`);
    return;
  }
  if (action === "cm-remove-shared") {
    const number = target.dataset.number;
    if (customers.some(item => item.companyNumber === number) || orders.some(item => item.companyNumber === number)) return showToast("该共享号已使用，不可取消设置");
    fxStore.set(fxSharedNumbersKey, fxSharedNumbers().filter(item => item !== number));
    target.closest("tr")?.remove();
    fxSyncSharedNumberRows();
    return;
  }
  if (action === "fx-export-customers") {
    fxDownloadExcel(`客户列表_${fxToday}.xls`, ["客户名称", "公司号", "号码类型", "账号", "联系电话", "状态", "订单码量", "已绑定", "绑定申请中", "待绑定"], fxFilteredCustomers().map(item => {
      const summary = fxCustomerCodeSummary(item);
      return [item.name, item.companyNumber, item.companyNumberType, item.account, item.phone, item.status, summary.total, summary.active, summary.pending, summary.available];
    }));
    return showToast("客户列表已导出");
  }
  if (fxCustomerSaving) return;
  let customer = customers.find(item => item.id === state.selectedCustomerId);
  const number = fxRead("fx-company-number"), type = fxRead("fx-company-mode");
  const error = fxCustomerAccountSubmissionError() || fxCompanyNumberError(number, type, customer);
  if (error) return showToast(error);
  const licenseFile = document.getElementById("fx-customer-license")?.files?.[0];
  const legalFile = document.getElementById("fx-customer-legal")?.files?.[0];
  if (!customer && (!licenseFile || !legalFile)) return showToast("请上传营业执照和法人身份证");
  const files = [licenseFile, legalFile].filter(Boolean);
  if (files.some(file => !(file.type.startsWith("image/") || file.type === "application/pdf" || /\.pdf$/i.test(file.name)))) return showToast("证照文件仅支持图片或 PDF");
  if (files.some(file => file.size > 10 * 1024 * 1024)) return showToast("证照文件不能超过 10 MB");
  const draft = { name: fxRead("fx-customer-name"), account: customer?.account || fxRead("fx-customer-account"), phone: fxRead("fx-customer-phone").replace(/\s+/g, ""), companyNumber: number, companyNumberType: type };
  const password = customer?.password || fxRead("fx-customer-password");
  fxCustomerSaving = true;
  try {
    const attachment = async file => ({ name: file.name, type: file.type || fxFileType(file.name), size: file.size, src: await fxReadFileData(file) });
    draft.license = licenseFile ? await attachment(licenseFile) : customer?.license;
    draft.legalId = legalFile ? await attachment(legalFile) : customer?.legalId;
    const latest = fxStore.get(fxBusinessStorage.customers, customers);
    customers.splice(0, customers.length, ...latest);
    customer = customers.find(item => item.id === state.selectedCustomerId);
    const latestOrders = fxStore.get(fxBusinessStorage.orders, orders);
    orders.splice(0, orders.length, ...latestOrders);
    const conflict = fxCompanyNumberError(number, type, customer);
    if (conflict) return showToast(conflict);
    if (customer) {
      const previousName = customer.name;
      orders.forEach(order => {
        if (!fxRecordBelongsToCustomer(order, customer)) return;
        order.customerId = customer.id;
        order.customerSnapshot ||= { name: order.customer, companyNumber: customer.companyNumber, companyNumberType: customer.companyNumberType };
      });
      fxLogCustomerChanges(customer, draft);
      Object.assign(customer, draft, { hasCreatedOrder: fxHasCustomerOrders(customer) });
      for (const [list, field] of [[products, "company"], [bindRequests, "customer"], [withdrawals, "customer"], [messages, "customer"]]) {
        list.forEach(record => { if (fxSameId(record.customerId, customer.id) || (!record.customerId && record[field] === previousName)) Object.assign(record, { customerId: customer.id, [field]: customer.name }); });
      }
    } else {
      if (customers.some(item => item.account === draft.account)) return showToast("该账号已存在");
      const created = { ...draft, id: Date.now(), password, status: "启用", total: 0, active: 0, changeHistory: [] };
      customers.unshift(created);
      if (state.omCustomerCreateFromOrder && state.omDraft) {
        state.omDraft.customerId = created.id;
        state.omCustomerCreateFromOrder = false;
      }
    }
    fxSaveBusiness();
    state.modal = null;
    render();
    showToast("客户资料已保存");
  } catch (_) {
    showToast("客户资料保存失败，请重新尝试");
  } finally { fxCustomerSaving = false; }
}, true);
