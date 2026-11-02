"use strict";

// Code payloads live outside localStorage so ordinary orders do not exhaust its quota.
// Excludes 00000000, so each category has 99,999,999 usable suffixes.
const omCategoryPoolSize = 99999999;
let omDatabase;
let omBusy = false;
const omNow = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" });
const omIsOrder = order => Array.isArray(order?.lines) && order.codeFormat === "random16";
const omCancelled = order => order?.allocationStatus === "已撤销";
const omOccupiesNumbers = order => omIsOrder(order) && (!omCancelled(order) || Boolean(order.downloads?.length));
const omOrderStatus = order => omCancelled(order) ? "已撤销" : "已生成";
function omCancellationInfo(order) {
  const record = order.cancellationRecords?.at(-1) || {};
  return {
    time: order.recalledAt || record.time || "—",
    operator: order.recalledBy || record.operator || "—",
    reason: order.recallReason || record.reason || "—",
    poolAction: record.poolAction || (order.downloads?.length ? "保留全部号码" : "释放全部号码"),
  };
}
function omCancellationMarkup(order) {
  const info = omCancellationInfo(order);
  const released = info.poolAction.includes("释放");
  const hint = released ? "未下载码包，整单号码已退回品类池" : "已下载过码包，整单号码保留锁定、不再分配";
  return `<dl class="detail-grid cancellation-info-grid"><div class="detail-item"><dt>撤销时间</dt><dd class="mono">${fxEscape(info.time)}</dd></div><div class="detail-item"><dt>撤销操作人</dt><dd>${fxEscape(info.operator)}</dd></div><div class="detail-item"><dt>号码处理</dt><dd>${fxEscape(hint)}</dd></div><div class="detail-item detail-wide"><dt>撤销原因</dt><dd class="order-note-detail">${fxEscape(info.reason)}</dd></div></dl>`;
}
const omRange = (first, last) => `${first}–${last}`;
const omPoolKey = line => String(line.productNumber || "");
const omCodePrefix = (order, line) => `${order.version}${order.companyNumber}${line.productNumber}`;
const omActor = () => state.portal === "ops" ? fxCurrentOperator()?.name : fxCurrentCustomer()?.name;

function omDb() {
  if (!omDatabase) omDatabase = new Promise((resolve, reject) => {
    const request = indexedDB.open("trace-copy-20261022-order-codes", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("codes", { keyPath: "no" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("无法打开码包存储，请检查浏览器存储权限"));
    request.onblocked = () => reject(new Error("码包存储被其他窗口占用，请关闭旧页面后重试"));
  }).catch(error => { omDatabase = null; throw error; });
  return omDatabase;
}
async function omPayload(no, value, remove = false) {
  const db = await omDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("codes", value || remove ? "readwrite" : "readonly");
    const store = transaction.objectStore("codes");
    const request = remove ? store.delete(no) : value ? store.put(value) : store.get(no);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = transaction.onabort = () => reject(new Error("码包存储失败，请检查本地存储空间后重试"));
  });
}
function omLock(task) {
  if (!navigator.locks) return Promise.reject(new Error("请使用支持本地事务锁的 Chrome 或 Edge 浏览器"));
  return navigator.locks.request("trace-copy-20261022-orders", task);
}
function omRefreshOrders() {
  const latest = fxStore.get(fxBusinessStorage.orders, null);
  if (Array.isArray(latest)) orders.splice(0, orders.length, ...latest);
}
function omWriteOrders(next) {
  localStorage.setItem(`copy-20261022:${fxBusinessStorage.orders}`, JSON.stringify(next));
  orders.splice(0, orders.length, ...next);
}
function omCanAccess(order) {
  return Boolean(order && (fxEnabledOperatorSession() || (fxEnabledCustomerSession() && fxRecordBelongsToCustomer(order, fxCurrentCustomer()))));
}
function omLine(order, id) { return order?.lines?.find(line => fxSameId(line.id, id)); }
function omRangeLine(order, range) {
  return order?.lines?.find(line => fxCodeRangeContains(omRange(line.first, line.last), range));
}
function omProductMatches(product, line) {
  const productCategory = fxCategoryForRecord(product);
  const lineCategory = fxCategoryForRecord(line);
  return Boolean(productCategory && lineCategory && fxSameId(productCategory.id, lineCategory.id));
}
function omLineStats(order, line) {
  const inside = range => fxCodeRangeContains(omRange(line.first, line.last), range);
  const active = fxEffectiveActivationAmount(order, row => inside(row.range));
  const pending = fxOrderPendingRequests(order.no).filter(row => inside(row.range)).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { active, pending, available: omCancelled(order) ? 0 : Math.max(0, line.quantity - active - pending) };
}
function omLineRanges(order, line, excludeProductId = null, excludeRequestId = null) {
  if (!line || omCancelled(order)) return [];
  return fxOrderFreeRanges(order, excludeProductId, excludeRequestId).filter(row =>
    fxCodeRangeContains(omRange(line.first, line.last), row.range));
}
function omEditorLine(order, product = null) {
  if (!omIsOrder(order)) return null;
  const request = bindRequests.find(row => fxSameId(row.id, state.editorBindRequestId));
  return omLine(order, request?.orderLineId || product?.orderLineId || (state.editorTargetOrderNo === order.no ? state.editorOrderLineId : null))
    || omRangeLine(order, request?.range || state.editorRequestedRange || product?.requestedRange);
}
function omBindingRanges(order, productId = null) {
  if (!omIsOrder(order)) return fxOrderFreeRanges(order, productId);
  const line = omEditorLine(order, products.find(row => fxSameId(row.id, productId)));
  return omLineRanges(order, line, productId, state.editorBindRequestId);
}
function omCancelReason(order) {
  if (omCancelled(order)) return "订单已撤销";
  if ((order.activations || []).some(row => Number(row.amount) > 0)
    || fxEffectiveActivationAmount(order) > 0
    || bindRequests.some(row => row.orderNo === order.no && row.status === "已通过")) return "订单已有产品绑定记录，不能撤销";
  if (fxOrderPendingRequests(order.no).length) return "订单存在待审核的绑定申请";
  return "";
}
function omCategoriesLabel(order) {
  return [...new Set((order.lines || []).map(line => line.category))].join("、") || order.category || "—";
}
function omCategoryCount(order) {
  return new Set((order.lines || [])
    .map(line => String(line.productNumber || line.categoryId || line.category || ""))
    .filter(Boolean)).size;
}
function omValidateDraft(draft) {
  const customer = customers.find(row => fxSameId(row.id, draft.customerId));
  if (!customer || customer.status !== "启用") throw new Error("请选择启用的客户");
  if (!/^\d{5}$/.test(customer.companyNumber || "")) throw new Error("客户尚未设置有效的五位公司号");
  if (!/^[1-9]$/.test(String(draft.version))) throw new Error("请选择 1 至 9 的版本号");
  if (!draft.lines?.length) throw new Error("请至少添加一条生成明细");
  const categories = fxCategories();
  let first = 1;
  const lines = draft.lines.map((row, index) => {
    const category = categories.find(item => fxSameId(item.id, row.categoryId) && item.status === "启用");
    if (!category) throw new Error(`第 ${index + 1} 行：请选择启用的产品大类`);
    const quantity = Number(row.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error(`第 ${index + 1} 行：数量须为正整数`);
    if (String(row.remark || "").length > 20) throw new Error(`第 ${index + 1} 行：备注最多 20 个字符`);
    const line = { id: crypto.randomUUID(), categoryId: category.id, category: category.name,
      categorySnapshot: { name: category.name, productNumber: category.productNumber }, productNumber: category.productNumber,
      quantity, remark: String(row.remark || "").trim(), first, last: first + quantity - 1 };
    first += quantity;
    if (!Number.isSafeInteger(first)) throw new Error("订单总量超出支持范围");
    return line;
  });
  const amounts = new Map();
  lines.forEach(line => amounts.set(line.productNumber, (amounts.get(line.productNumber) || 0) + line.quantity));
  if ([...amounts.values()].some(amount => amount > omCategoryPoolSize)) throw new Error("同一产品号的总数量不得超过 99,999,999");
  for (const [productNumber, amount] of amounts) {
    const category = categories.find(row => row.productNumber === productNumber);
    const remaining = category ? fxCategoryUsage(category).remaining : 0;
    if (amount > remaining) throw new Error(`产品号 ${productNumber} 超出剩余可用码量 ${formatNumber(remaining)}`);
  }
  return { customer, lines, total: first - 1 };
}
async function omGenerate(draft, progress = () => {}) {
  return omLock(async () => {
    omRefreshOrders();
    const latestCustomers = fxStore.get(fxBusinessStorage.customers, customers);
    customers.splice(0, customers.length, ...latestCustomers);
    const { customer, lines, total } = omValidateDraft(draft);
    const no = `ORD-${omNow().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const time = omNow();
    const order = { id: crypto.randomUUID(), no, codeFormat: "random16", recordType: "random-order",
      customerId: customer.id, customer: customer.name, companyNumber: customer.companyNumber, version: String(draft.version),
      customerSnapshot: { name: customer.name, companyNumber: customer.companyNumber, companyNumberType: customer.companyNumberType },
      total, active: 0, lines, range: omRange(1, total), allocationSegments: lines.map(line => ({ range: omRange(line.first, line.last), amount: line.quantity })),
      allocationStatus: "已分配", created: time.slice(0, 10), createdAt: time, allocatedAt: time, allocatedBy: omActor(),
      note: String(draft.note || "").trim(), activations: [], downloads: [], cancellationRecords: [],
      scanBase: new URL("pages/scan/active.html", document.baseURI).href };
    const payload = { no, lines: [] };
    const keys = [...new Set(lines.map(omPoolKey))];
    let completed = 0;
    for (const key of keys) {
      const occupied = new Uint8Array(Math.ceil((omCategoryPoolSize + 1) / 8));
      const has = number => Boolean(occupied[number >> 3] & (1 << (number & 7)));
      const add = number => { occupied[number >> 3] |= 1 << (number & 7); };
      let used = 0;
      for (const previous of orders.filter(omOccupiesNumbers)) {
        const scoped = previous.lines.filter(line => omPoolKey(line) === key);
        if (!scoped.length) continue;
        const stored = await omPayload(previous.no);
        if (!stored) throw new Error("历史码包数据缺失，为防止重复取号，请恢复本地码包数据后重试");
        for (const line of scoped) {
          const savedLine = stored.lines.find(row => row.id === line.id);
          if (!savedLine || savedLine.randoms.length !== line.quantity) throw new Error("历史码包不完整，已停止取号");
          for (const number of savedLine.randoms) { if (!has(number)) { add(number); used++; } }
        }
      }
      const requested = lines.filter(line => omPoolKey(line) === key).reduce((sum, line) => sum + line.quantity, 0);
      if (requested > omCategoryPoolSize - used) throw new Error(`产品号 ${key} 的号码池余额不足，请减少数量`);
      const entropy = new Uint32Array(4096);
      let entropyIndex = entropy.length;
      let freeNumbers = null;
      let freeCount = 0;
      const randomBelow = limit => {
        let value;
        const ceiling = Math.floor(4294967296 / limit) * limit;
        do {
          if (entropyIndex >= entropy.length) { crypto.getRandomValues(entropy); entropyIndex = 0; }
          value = entropy[entropyIndex++];
        } while (value >= ceiling);
        return value % limit;
      };
      for (const line of lines.filter(row => omPoolKey(row) === key)) {
        const randoms = new Uint32Array(line.quantity);
        for (let index = 0; index < line.quantity; index++) {
          let number;
          // Sample remaining values without replacement when rejection sampling becomes inefficient.
          if (omCategoryPoolSize - used < omCategoryPoolSize / 10) {
            if (!freeNumbers) {
              freeNumbers = new Uint32Array(omCategoryPoolSize - used);
              for (let candidate = 1; candidate <= omCategoryPoolSize; candidate++) if (!has(candidate)) freeNumbers[freeCount++] = candidate;
            }
            const choice = randomBelow(freeCount);
            number = freeNumbers[choice];
            freeNumbers[choice] = freeNumbers[--freeCount];
          } else {
            do { number = randomBelow(omCategoryPoolSize) + 1; } while (has(number));
          }
          add(number); used++; randoms[index] = number; completed++;
          if (completed % 4096 === 0) {
            progress(completed, total);
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        payload.lines.push({ id: line.id, randoms });
      }
    }
    // Persist code payload first. Only the metadata commit makes it an occupied order.
    await omPayload(no, payload);
    try {
      if (!fxEnabledOperatorSession()) throw new Error("当前登录已失效，请重新登录");
      const currentCustomer = fxStore.get(fxBusinessStorage.customers, customers).find(row => fxSameId(row.id, customer.id));
      if (!currentCustomer || currentCustomer.status !== "启用" || currentCustomer.companyNumber !== order.companyNumber) throw new Error("客户信息已改变，请重新选择客户");
      const currentCategories = fxCategories();
      if (lines.some(line => !currentCategories.some(row => fxSameId(row.id, line.categoryId) && row.status === "启用" && row.productNumber === line.productNumber))) throw new Error("产品大类已改变，请重新选择");
      lines.forEach(line => { line.category = currentCategories.find(row => fxSameId(row.id, line.categoryId)).name; });
      omWriteOrders([order, ...orders]);
    } catch (error) {
      await omPayload(no, null, true).catch(() => {});
      throw error;
    }
    customer.hasCreatedOrder = true;
    fxSaveBusiness();
    progress(total, total);
    return order;
  });
}
function omDownloadBounds(order, scope, value) {
  if (scope === "line") {
    const line = omLine(order, value);
    if (!line) throw new Error("订单明细不存在");
    return { first: line.first, last: line.last, label: `明细 ${order.lines.indexOf(line) + 1} · ${line.category}${line.remark ? ` · ${line.remark}` : ""}` };
  }
  if (scope === "first") {
    const amount = Number(value);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > order.total) throw new Error("请输入订单总量范围内的正整数");
    return { first: 1, last: amount, label: `前 ${amount} 个码` };
  }
  return { first: 1, last: order.total, label: "整单" };
}
function omCode(order, line, number) { return omCodePrefix(order, line) + String(number).padStart(8, "0"); }
window.omResolveScan = async function () {
  const serial = (new URLSearchParams(location.search).get("serial") || "").trim();
  if (!/^\d{16}$/.test(serial || "")) return;
  try {
    for (const order of orders.filter(row => omIsOrder(row) && !omCancelled(row) && row.version + row.companyNumber === serial.slice(0, 6))) {
      const payload = await omPayload(order.no);
      for (const line of order.lines.filter(row => row.productNumber === serial.slice(6, 8))) {
        const randoms = payload?.lines?.find(row => row.id === line.id)?.randoms;
        const offset = randoms?.indexOf(Number(serial.slice(8))) ?? -1;
        if (offset >= 0) { window.TRACE_RANDOM_SCAN = { orderNo: order.no, sequence: String(line.first + offset) }; return; }
      }
    }
  } catch (error) { console.warn("无法读取本地码包", error); }
};
let omXlsxLibrary;
async function omXlsxBlob(rows) {
  if (!window.XLSX) {
    omXlsxLibrary ||= new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("vendor/xlsx.full.min.js", document.baseURI).href;
      script.onload = () => window.XLSX ? resolve() : reject(new Error("Excel 组件加载失败，请重试"));
      script.onerror = () => { script.remove(); reject(new Error("Excel 组件加载失败，请重试")); };
      document.head.appendChild(script);
    }).catch(error => { omXlsxLibrary = null; throw error; });
    await omXlsxLibrary;
  }
  const workbook = window.XLSX.utils.book_new();
  // Reserve one Excel row for the header and split larger code packages by sheet.
  const sheetCapacity = 1048575;
  for (let offset = 0; offset < rows.length || offset === 0; offset += sheetCapacity) {
    const sheet = window.XLSX.utils.aoa_to_sheet([
      ["序号", "16位溯源码", "扫码链接"],
      ...rows.slice(offset, offset + sheetCapacity),
    ]);
    sheet["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 90 }];
    window.XLSX.utils.book_append_sheet(workbook, sheet, `码包${offset ? Math.floor(offset / sheetCapacity) + 1 : ""}`);
  }
  const bytes = window.XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
async function omDownload(no, scope, value, format = "txt") {
  if (!fxEnabledOperatorSession()) throw new Error("当前账号无权下载码包");
  return omLock(async () => {
    omRefreshOrders();
    const order = orders.find(row => row.no === no);
    if (!omCanAccess(order) || omCancelled(order)) throw new Error("订单不可下载");
    const bounds = omDownloadBounds(order, scope, value);
    const payload = await omPayload(no);
    if (!payload) throw new Error("码包数据缺失，无法下载，请恢复本地数据");
    const outputFormat = format === "xlsx" || format === "xls" ? "xlsx" : "txt";
    const parts = [];
    const excelRows = [];
    let chunk = [];
    let completed = 0;
    for (const line of order.lines) {
      const stored = payload.lines.find(row => row.id === line.id);
      if (!stored || stored.randoms.length !== line.quantity) throw new Error("码包数据不完整，已停止下载");
      for (let sequence = Math.max(bounds.first, line.first); sequence <= Math.min(bounds.last, line.last); sequence++) {
        const code = omCode(order, line, stored.randoms[sequence - line.first]);
        const scanUrl = `${order.scanBase}?serial=${code}`;
        if (outputFormat === "xlsx") excelRows.push([sequence, code, scanUrl]);
        else chunk.push(`${sequence},${code},${scanUrl}\r\n`);
        completed++;
        if (completed % 4096 === 0) {
          if (outputFormat === "txt") { parts.push(chunk.join("")); chunk = []; }
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    if (outputFormat === "txt" && chunk.length) parts.push(chunk.join(""));
    let blob;
    if (outputFormat === "xlsx") {
      blob = await omXlsxBlob(excelRows);
    } else {
      blob = new Blob(parts, { type: "text/plain;charset=utf-8" });
    }
    const formatLabel = outputFormat === "xlsx" ? "Excel（.xlsx）" : "TXT";
    const record = { id: crypto.randomUUID(), orderNo: no, scope: bounds.label, format: formatLabel, fileExtension: outputFormat, first: bounds.first, last: bounds.last, amount: bounds.last - bounds.first + 1, operator: omActor(), time: omNow() };
    const updated = { ...order, downloads: [...(order.downloads || []), record] };
    omWriteOrders(orders.map(row => row.no === no ? updated : row));
    fxDownloadBlob(`${no}_${bounds.first}-${bounds.last}.${outputFormat}`, blob);
    return record;
  });
}
async function omCancel(no, reason) {
  return omLock(async () => {
    omRefreshOrders();
    // Read other tabs' applications before deciding whether cancellation is allowed.
    for (const [name, list] of [["products", products], ["bindRequests", bindRequests]]) {
      const latest = fxStore.get(fxBusinessStorage[name], list);
      list.splice(0, list.length, ...latest);
    }
    const order = orders.find(row => row.no === no);
    if (!fxEnabledOperatorSession() || !omIsOrder(order)) throw new Error("当前账号无权撤销此订单");
    if (!reason?.trim()) throw new Error("请填写撤销原因");
    const blocked = omCancelReason(order);
    if (blocked) throw new Error(blocked);
    const retained = Boolean(order.downloads?.length);
    const record = { time: omNow(), operator: omActor(), reason: reason.trim(), poolAction: retained ? "保留全部号码" : "释放全部号码" };
    const updated = { ...order, allocationStatus: "已撤销", recalledAt: record.time, recalledBy: record.operator, recallReason: record.reason,
      cancellationRecords: [...(order.cancellationRecords || []), record] };
    omWriteOrders(orders.map(row => row.no === no ? updated : row));
    fxReconcileActivationStatistics();
    return record;
  });
}
function omDraft() {
  return state.omDraft ||= { customerId: "", version: "1", lines: [{ id: crypto.randomUUID(), categoryId: "", quantity: "", remark: "" }], note: "" };
}
function omCustomerSearchOptions(rawTerm = "") {
  const term = String(rawTerm || "").trim().toLowerCase();
  const active = customers.filter(customer => customer.status === "启用");
  const recent = typeof fxRecentCustomers === "function"
    ? fxRecentCustomers(8).filter(customer => customer.status === "启用")
    : [];
  const matches = term
    ? active.filter(customer => `${customer.name} ${customer.companyNumber} ${customer.account}`.toLowerCase().includes(term)).slice(0, 10)
    : (recent.length ? recent : active.slice(0, 8));
  const options = matches.map(customer => `<button type="button" class="customer-picker-option" role="option" data-action="om-select-customer" data-id="${fxEscape(customer.id)}"><span class="customer-picker-option-copy"><strong>${fxEscape(customer.name)}</strong><span class="customer-picker-account">${fxEscape(customer.account || "—")}</span></span><span class="mono">${fxEscape(customer.companyNumber || "—")}</span></button>`).join("");
  const empty = !matches.length ? `<div class="customer-picker-empty">未找到匹配的客户</div>` : "";
  return `${empty}${matches.length ? `<div class="customer-picker-caption">${term ? "搜索结果" : recent.length ? "最近使用" : "可选客户"}</div>${options}` : ""}<button type="button" class="customer-picker-option create-option" role="option" data-action="om-new-customer">${icon("plus", "+")}<span>新建客户</span></button>`;
}
function omCustomerPicker(selectedId = null) {
  const selected = customers.find(customer => fxSameId(customer.id, selectedId) && customer.status === "启用");
  return `<div class="field customer-picker om-order-customer-picker"><label class="required" for="om-customer-search">客户名称</label><div class="customer-picker-control"><input id="om-customer-search" type="search" value="${fxEscape(selected?.name || "")}" placeholder="输入名称、公司号或账号" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="om-customer-options" aria-expanded="false"><div id="om-customer-options" class="customer-picker-options" role="listbox">${omCustomerSearchOptions()}</div></div><input id="om-customer" type="hidden" value="${fxEscape(selected?.id || "")}"></div>`;
}
function omCategoryOptionValue(category) {
  return category ? `${category.name}（${category.productNumber}）` : "";
}
function omCategoryFromInput(value) {
  const term = String(value || "").trim().toLowerCase();
  if (!term) return null;
  return fxCategories().filter(category => category.status === "启用").find(category =>
    omCategoryOptionValue(category).toLowerCase() === term
    || category.name.toLowerCase() === term
    || String(category.productNumber) === term);
}
function omRecentCategories(limit = 5) {
  const active = fxCategories().filter(category => category.status === "启用");
  const seen = new Set();
  const recent = [];
  [...orders].sort((left, right) => String(right.createdAt || right.created || "").localeCompare(String(left.createdAt || left.created || ""))).forEach(order => {
    (order.lines || [order]).forEach(line => {
      const category = active.find(item =>
        fxSameId(item.id, line.categoryId)
        || item.productNumber === line.productNumber
        || item.name === line.category);
      if (!category || seen.has(category.id)) return;
      seen.add(category.id);
      recent.push(category);
    });
  });
  return recent.slice(0, limit);
}
function omCategorySearchOptions(rawTerm = "", lineId = "") {
  const term = String(rawTerm || "").trim().toLowerCase();
  const matches = term
    ? fxCategories().filter(category => category.status === "启用"
      && `${category.name} ${category.productNumber}`.toLowerCase().includes(term)).slice(0, 10)
    : omRecentCategories();
  const empty = !matches.length
    ? `<div class="customer-picker-empty">${term ? "未找到匹配的产品大类" : "暂无最近使用的产品大类"}</div>`
    : "";
  const options = matches.map(category => `<button type="button" class="customer-picker-option om-category-option" role="option" data-action="om-select-category" data-line-id="${fxEscape(lineId)}" data-id="${fxEscape(category.id)}"><span class="customer-picker-option-copy"><strong>${fxEscape(category.name)}</strong></span><span class="om-category-option-number">${fxEscape(category.productNumber)}</span></button>`).join("");
  return `${empty}${matches.length ? `<div class="customer-picker-caption">${term ? "搜索结果" : "最近使用"}</div>${options}` : ""}<button type="button" class="customer-picker-option create-option" role="option" data-action="om-new-category" data-line-id="${fxEscape(lineId)}"><span class="om-create-plus" aria-hidden="true">+</span><span>新建产品类别</span></button>`;
}
function omHideCategoryOptions() {
  const layer = document.getElementById("om-category-options-layer");
  if (layer) layer.hidden = true;
  document.querySelectorAll("[data-om-category-search]").forEach(input => input.setAttribute("aria-expanded", "false"));
}
function omPositionCategoryOptions(input) {
  const layer = document.getElementById("om-category-options-layer");
  if (!layer || layer.hidden || !input) return;
  const rect = input.getBoundingClientRect();
  const width = Math.min(window.innerWidth - 24, rect.width);
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
  const spaceBelow = window.innerHeight - rect.bottom - 12;
  const spaceAbove = rect.top - 12;
  const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(120, Math.min(300, placeAbove ? spaceAbove : spaceBelow));
  layer.style.width = `${width}px`;
  layer.style.left = `${left}px`;
  layer.style.maxHeight = `${maxHeight}px`;
  if (placeAbove) {
    layer.style.top = "auto";
    layer.style.bottom = `${window.innerHeight - rect.top + 4}px`;
  } else {
    layer.style.top = `${rect.bottom + 4}px`;
    layer.style.bottom = "auto";
  }
}
function omShowCategoryOptions(input) {
  if (!input) return;
  let layer = document.getElementById("om-category-options-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "om-category-options-layer";
    layer.className = "customer-picker-options om-category-options-portal customer-picker";
    layer.setAttribute("role", "listbox");
    document.body.appendChild(layer);
  }
  layer.hidden = false;
  layer.innerHTML = omCategorySearchOptions(input.value, input.dataset.omCategorySearch);
  input.setAttribute("aria-expanded", "true");
  omPositionCategoryOptions(input);
}
function omSyncDraftCategory(input, showError = false) {
  const row = omDraft().lines.find(line => line.id === input.dataset.omCategorySearch);
  if (!row) return null;
  const category = omCategoryFromInput(input.value);
  row.categoryId = category?.id || "";
  const tr = input.closest("tr");
  const value = tr?.querySelector('input[data-om-field="categoryId"]');
  if (value) value.value = row.categoryId;
  const number = tr?.querySelector(".om-product-number");
  if (number) number.textContent = category?.productNumber || "—";
  const invalid = showError && Boolean(input.value.trim()) && !category;
  const error = document.getElementById(`om-category-error-${row.id}`);
  if (error) error.hidden = !invalid;
  input.setAttribute("aria-invalid", String(invalid));
  omSyncDraftQuantityLimits();
  return category;
}
function omCategoryAvailableAmount(productNumber) {
  const category = fxCategories().find(row => row.productNumber === productNumber);
  return category ? fxCategoryUsage(category).remaining : 0;
}
function omSyncDraftQuantityLimits() {
  const lines = omDraft().lines;
  const totals = new Map();
  lines.forEach(line => {
    const category = fxCategories().find(row => fxSameId(row.id, line.categoryId));
    if (category) totals.set(category.productNumber, (totals.get(category.productNumber) || 0) + (Number(line.quantity) || 0));
  });
  lines.forEach(line => {
    const input = document.querySelector(`[data-om-line="${line.id}"] [data-om-field="quantity"]`);
    const error = document.getElementById(`om-quantity-error-${line.id}`);
    if (!input) return;
    const category = fxCategories().find(row => fxSameId(row.id, line.categoryId));
    if (!category) {
      input.max = "99999999";
      input.removeAttribute("title");
      input.setAttribute("aria-invalid", "false");
      if (error) error.hidden = true;
      return;
    }
    const available = omCategoryAvailableAmount(category.productNumber);
    const total = totals.get(category.productNumber) || 0;
    const quantity = Number(line.quantity) || 0;
    const maximum = Math.max(0, available - Math.max(0, total - quantity));
    input.max = String(maximum);
    input.title = `该品类剩余可用 ${formatNumber(available)} 个码`;
    const invalid = quantity > 0 && total > available;
    input.setAttribute("aria-invalid", String(invalid));
    if (error) {
      error.textContent = "超出剩余可用量";
      error.hidden = !invalid;
    }
  });
}
function omDraftRow(line, index) {
  const categories = fxCategories().filter(row => row.status === "启用");
  const category = categories.find(row => fxSameId(row.id, line.categoryId));
  return `<tr data-om-line="${line.id}"><td class="om-row-number">${index + 1}</td><td class="om-category-cell"><input class="om-category-input" type="search" data-om-category-search="${line.id}" value="${fxEscape(category?.name || "")}" placeholder="输入名称或产品号" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="om-category-options-layer" aria-expanded="false" aria-label="第 ${index + 1} 行产品大类" aria-describedby="om-category-error-${line.id}"><input type="hidden" data-om-field="categoryId" value="${fxEscape(line.categoryId || "")}"><span id="om-category-error-${line.id}" class="field-help danger-text" hidden>请选择已有产品大类，或点击“新建产品类别”</span></td><td class="mono om-product-number">${category?.productNumber || "—"}</td><td class="om-quantity-cell"><input data-om-field="quantity" type="number" min="1" max="99999999" maxlength="8" step="1" value="${line.quantity}" aria-label="第 ${index + 1} 行数量" aria-describedby="om-quantity-error-${line.id}" placeholder="输入数量"><span id="om-quantity-error-${line.id}" class="field-help danger-text" hidden></span></td><td><input data-om-field="remark" maxlength="20" value="${fxEscape(line.remark)}" aria-label="第 ${index + 1} 行备注" placeholder="选填"></td><td class="action-column"><button class="icon-button" data-action="om-remove-line" data-id="${line.id}" title="删除明细" aria-label="删除第 ${index + 1} 行">${icon("trash-2", "×")}</button></td></tr>`;
}
function omDraftTotalAmount() {
  return omDraft().lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
}
function omSyncDraftTotalDisplay() {
  const amount = omDraftTotalAmount();
  const total = document.getElementById("om-total");
  const uppercase = document.getElementById("om-total-uppercase");
  if (total) total.textContent = formatNumber(amount);
  if (uppercase) uppercase.textContent = `中文大写：${fxChineseIntegerUppercase(amount)}`;
}
function omCreatePage() {
  omHideCategoryOptions();
  if (state.omCustomerCreateFromOrder && state.modal !== "fx-customer") state.omCustomerCreateFromOrder = false;
  if (state.omCategoryCreateLineId && state.modal !== "cat-form") state.omCategoryCreateLineId = null;
  const back = `<button class="button" data-nav="orders">${icon("arrow-left", "←")}返回订单台账</button>`;
  if (state.omResult) {
    const order = orders.find(row => row.no === state.omResult);
    if (order) return `<div class="page">${pageHeader("创建订单", "", back)}<section class="detail-section om-result"><div class="success-icon">${icon("circle-check", "✓")}</div><h2>订单创建成功</h2><p class="mono">${fxEscape(order.no)}</p><p>${fxEscape(order.customer)} · ${order.lines.length} 条明细 · 共 ${formatNumber(order.total)} 个码</p><div class="table-actions"><button class="button primary" data-action="om-open-download" data-no="${order.no}">${icon("download", "↓")}下载码包</button><button class="button" data-action="om-detail" data-no="${order.no}">查看订单</button><button class="button" data-action="om-create">继续创建订单</button></div></section></div>`;
  }
  const draft = omDraft();
  const customer = customers.find(row => fxSameId(row.id, draft.customerId));
  const draftTotal = omDraftTotalAmount();
  requestAnimationFrame(() => {
    if (state.opsPage === "codes" && !state.omResult && document.getElementById("om-draft-lines")) omSyncDraftQuantityLimits();
  });
  return `<div class="page om-create-page">${pageHeader("创建订单", "", back)}<section class="detail-section"><h3>订单信息</h3><div class="form-grid om-order-info-grid">${omCustomerPicker(draft.customerId)}<div class="field"><label for="om-company">公司号</label><input id="om-company" readonly value="${fxEscape(customer?.companyNumber || "")}" placeholder="自动带入"></div><div class="field"><label class="required" for="om-version">版本号</label><select id="om-version">${Array.from({ length: 9 }, (_, index) => `<option ${String(index + 1) === draft.version ? "selected" : ""}>${index + 1}</option>`).join("")}</select></div></div></section><section class="detail-section"><div class="detail-title-row"><h3>品类明细</h3></div><div class="table-scroll"><table class="om-lines-form" data-sequence="off" data-pagination="off"><thead><tr><th>序号</th><th>产品大类</th><th>产品号</th><th>码数量</th><th>备注</th><th class="action-column">操作</th></tr></thead><tbody id="om-draft-lines">${draft.lines.map(omDraftRow).join("")}</tbody><tfoot><tr class="om-add-category-row"><td colspan="6"><button type="button" class="om-add-category-row-button" data-action="om-add-line">${icon("plus", "+")}添加品类</button></td></tr></tfoot></table></div><div class="om-total">订单码量：<strong id="om-total">${formatNumber(draftTotal)}</strong> 个码<div id="om-total-uppercase" class="om-total-uppercase" aria-live="polite">中文大写：${fxChineseIntegerUppercase(draftTotal)}</div></div></section><section class="detail-section om-order-note-section"><h3>订单备注</h3><div class="field"><textarea id="om-note" maxlength="500" aria-label="订单备注" placeholder="选填">${fxEscape(draft.note)}</textarea></div></section><div id="om-create-error" class="danger-text" role="alert"></div><div class="om-form-actions"><button class="button" data-nav="orders">取消</button><button class="button primary" data-action="om-generate">${icon("qr-code", "")}创建订单并生成码包</button></div></div>`;
}
function omLedgerRows(customer = false) {
  const filter = state.omFilters || {};
  return orders.filter(order => (!customer || (!omCancelled(order) && fxRecordBelongsToCustomer(order, fxCurrentCustomer()))) &&
    (!filter.occupiedOnly || omOccupiesNumbers(order)) &&
    (!filter.no || order.no.toLowerCase().includes(filter.no.toLowerCase())) &&
    (filter.customerId || !filter.customer || order.customer.includes(filter.customer)) &&
    (!filter.customerId || String(order.customerId ?? order.customer ?? order.companyNumber) === String(filter.customerId)) &&
    (customer || !filter.company || String(order.companyNumber || "").includes(filter.company)) &&
    (!filter.productNumber || (order.lines || []).some(line => String(line.productNumber) === String(filter.productNumber))) &&
    (!filter.statsProductKey || (order.lines || []).some(line => String(line.productNumber || line.category || "unknown") === filter.statsProductKey)) &&
    (filter.statsProductKey || filter.productNumber || !filter.category || (order.lines || []).some(line => String(line.category || "").includes(filter.category) || String(line.productNumber || "") === String(filter.category))) &&
    (!filter.version || String(order.version || "未标注") === filter.version) &&
    (customer || !filter.status || omOrderStatus(order) === filter.status) &&
    (!filter.from || String(order.createdAt || order.created).slice(0, 10) >= filter.from) &&
    (!filter.to || String(order.createdAt || order.created).slice(0, 10) <= filter.to))
    .sort((left, right) => String(right.createdAt || right.created).localeCompare(String(left.createdAt || left.created)));
}
function omLedgerPage(customer = false) {
  const rows = omLedgerRows(customer), filters = state.omFilters || {};
  const versions = [...new Set([...Array.from({ length: 9 }, (_, index) => String(index + 1)), ...(filters.version ? [filters.version] : [])])];
  const appliedScope = [filters.customer ? `客户 ${filters.customer}` : "", filters.productNumber ? `类别 ${filters.category || filters.productNumber}（${filters.productNumber}）` : "", filters.version ? `版本 ${filters.version}` : ""].filter(Boolean).join(" · ");
  const statisticalScope = !customer && filters.occupiedOnly ? `<div class="stats-order-scope"><span>${icon("list-filter", "")}来自数据统计${appliedScope ? ` · ${fxEscape(appliedScope)}` : " · 当前归属"}</span><div><button type="button" class="text-action" data-action="stat-return">${icon("arrow-left", "")}返回数据统计</button><button type="button" class="text-action" data-action="stat-clear-orders">清除统计限定</button></div></div>` : "";
  const field = (key, placeholder, type = "text") => `<input type="${type}" data-om-filter="${key}" value="${fxEscape(filters[key] || "")}" placeholder="${placeholder}" aria-label="${placeholder}">`;
  const body = rows.map(order => {
    const cancelled = omCancelled(order), reason = omCancelReason(order);
    const download = customer || !omIsOrder(order) ? "" : cancelled
      ? fxDisabledAction("下载码包", "订单已撤销，无法下载")
      : `<button class="text-action" data-action="om-open-download" data-no="${order.no}">下载码包</button>`;
    const cancel = customer || !omIsOrder(order) ? "" : reason ? fxDisabledAction("撤销订单", reason, "danger-text") : `<button class="text-action danger-text" data-action="om-open-cancel" data-no="${order.no}">撤销订单</button>`;
    const stateCell = `<span class="status ${cancelled ? "om-status-cancelled" : "success"}">${omOrderStatus(order)}</span>`;
    return `<tr><td class="mono">${fxEscape(order.no)}</td>${customer ? "" : `<td>${fxEscape(order.customer)}</td><td class="mono">${fxEscape(order.companyNumber || "—")}</td><td>${fxEscape(order.version || "—")}</td>`}<td class="stats-number">${formatNumber(omCategoryCount(order))}</td><td>${formatNumber(order.total)}</td><td>${formatNumber(order.active)}</td><td>${formatNumber(fxOrderPendingAmount(order))}</td><td>${formatNumber(fxOrderAvailableAmount(order))}</td>${customer ? "" : `<td>${stateCell}</td>`}<td>${fxEscape(order.createdAt || order.created)}</td><td class="action-column"><div class="table-actions"><button class="text-action" data-action="om-detail" data-no="${order.no}">${customer ? "订单详情" : "详情"}</button>${download}${cancel}</div></td></tr>`;
  }).join("");
  const statusFilter = customer ? "" : `<select data-om-filter="status" aria-label="订单状态"><option value="">全部状态</option>${["已生成", "已撤销"].map(value => `<option ${filters.status === value ? "selected" : ""}>${value}</option>`).join("")}</select>`;
  const dates = `${field("from", "订单创建开始日期", "date")}${field("to", "订单创建结束日期", "date")}`;
  return `<div class="page">${pageHeader("订单台账", "", `<button class="button" data-action="om-export">${icon("download", "↓")}导出台账</button>${customer ? "" : `<button class="button primary" data-action="om-create">${icon("plus", "+")}创建订单</button>`}`)}${statisticalScope}<div class="toolbar"><div class="filters om-ledger-filters" ${customer ? 'data-auto-collapse="off"' : ""}>${field("no", "搜索订单号")}${customer ? dates : field("customer", "搜索客户名称") + field("company", "搜索公司号")}<select data-om-filter="version" aria-label="版本"><option value="">全部版本</option>${versions.map(value => `<option ${filters.version === value ? "selected" : ""}>${fxEscape(value)}</option>`).join("")}</select>${statusFilter}${customer ? "" : dates}<button class="button small" data-action="om-search">${icon("search", "")}查询</button><button class="button small list-reset-button" data-action="om-reset">${icon("rotate-ccw", "")}重置</button></div></div><div class="table-shell"><div class="table-scroll"><table class="om-ledger-table"><thead><tr><th>订单号</th>${customer ? "" : "<th>客户名称</th><th>公司号</th><th>版本</th>"}<th class="stats-number">品类数量</th><th>订单码量</th><th>已绑定</th><th>绑定申请中</th><th>${"待绑定"}</th>${customer ? "" : "<th>订单状态</th>"}<th>订单创建时间</th><th class="action-column">操作</th></tr></thead><tbody>${body || fxEmpty(customer ? 8 : 12, "暂无订单记录")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
}
function omDetailPage(original) {
  const order = orders.find(row => row.no === state.selectedOrderNo);
  if (!omIsOrder(order)) return original();
  if (!omCanAccess(order)) return `<div class="page">${pageHeader("订单详情")}<div class="empty">订单不存在或无权查看</div></div>`;
  const cancelled = omCancelled(order);
  const root = document.createElement("div");
  // Retain the original binding history and its review/withdrawal actions.
  root.innerHTML = original();
  if (cancelled) {
    root.querySelectorAll(".detail-section button").forEach(button => button.remove());
    root.querySelectorAll(".detail-section [data-action]").forEach(node => {
      node.removeAttribute("data-action"); node.removeAttribute("tabindex"); node.removeAttribute("role");
      node.classList.remove("clickable-table-row");
    });
  }
  const bindingRows = [...root.querySelectorAll(".order-binding-table tbody tr")].filter(row => row.cells.length >= 4);
  const bindingRowsByLine = {};
  order.lines.forEach(line => {
    const lineRange = omRange(line.first, line.last);
    bindingRowsByLine[line.id] = bindingRows
      .filter(row => fxCodeRangeContains(lineRange, row.cells[3].textContent.trim()))
      .map(row => {
        const clone = row.cloneNode(true);
        clone.cells[7]?.remove();
        clone.cells[4]?.after(clone.cells[3]);
        return clone.outerHTML;
      })
      .join("");
  });
  state.omBindingRowsByLine = bindingRowsByLine;
  const statusValue = cancelled
    ? `<button type="button" class="status-link" data-action="om-open-cancel-info" data-no="${order.no}" title="查看撤销信息">${omOrderStatus(order)}</button>`
    : fxEscape(omOrderStatus(order));
  const fields = [["订单号", order.no, state.portal === "customer" ? "order-detail-half" : ""],
    ...(state.portal === "ops" ? [["客户名称", order.customer], ["公司号", order.companyNumber], ["版本号", order.version]] : []),
    ["订单创建时间", order.createdAt, state.portal === "customer" ? "order-detail-half" : ""],
    ...(state.portal === "ops" ? [["操作人", order.allocatedBy], ["订单状态", statusValue, "", true]] : []),
    ["订单码量", formatNumber(order.total), "order-detail-metrics-start"], ["已绑定", formatNumber(order.active)], ["绑定申请中", formatNumber(fxOrderPendingAmount(order))], ["待绑定", formatNumber(fxOrderAvailableAmount(order))],
    ...(state.portal === "ops" ? [["订单备注", order.note || "—", "order-detail-wide"]] : [])];
  const lines = order.lines.map((line, index) => {
    const counts = omLineStats(order, line);
    const recordAction = `<button class="text-action" data-action="om-open-line-bindings" data-no="${order.no}" data-line="${line.id}">绑定记录</button>`;
    return `<tr><td>${index + 1}</td><td>${fxEscape(line.category)}</td><td class="mono">${line.productNumber}</td><td class="om-line-remark">${fxEscape(line.remark || "—")}</td><td>${formatNumber(line.quantity)}</td><td class="mono">${omRange(line.first, line.last)}</td><td>${formatNumber(counts.active)}</td><td>${formatNumber(counts.pending)}</td><td>${formatNumber(counts.available)}</td><td class="action-column"><div class="table-actions">${cancelled ? recordAction : `${counts.available ? `<button class="text-action" data-action="om-bind" data-no="${order.no}" data-line="${line.id}">绑定产品</button>` : fxDisabledAction("绑定产品", "本明细暂无可用码量")}${recordAction}`}</div></td></tr>`;
  }).join("");
  const actions = `<button class="button" data-nav="orders">${icon("arrow-left", "")}返回订单台账</button>${state.portal === "ops" ? `<button class="button" data-action="om-history" data-no="${order.no}">${icon("history", "")}下载记录</button>` : ""}`;
  return `<div class="page order-detail-page">${pageHeader("订单详情", "", actions)}<section class="detail-section"><h3>订单信息</h3><dl class="detail-grid order-detail-grid">${fields.map(([label, value, className = "", raw = false]) => `<div class="detail-item ${className}"><dt>${label}</dt><dd class="${label === "订单备注" ? "order-note-detail" : ""}">${raw ? value : fxEscape(value)}</dd></div>`).join("")}</dl></section><section class="detail-section"><div class="detail-title-row"><h3>品类明细</h3></div><div class="table-shell"><div class="table-scroll"><table class="om-detail-lines" data-sequence="off"><thead><tr><th>序号</th><th>产品大类</th><th>产品号</th><th>备注</th><th>数量</th><th>序号</th><th>已绑定</th><th>绑定申请中</th><th>待绑定</th><th class="action-column">操作</th></tr></thead><tbody>${lines}</tbody></table></div></div></section></div>`;
}
function omModal() {
  const order = orders.find(row => row.no === state.selectedOrderNo);
  if (!omCanAccess(order)) return fxModalShell("订单不可用", "", "<p>请关闭窗口并刷新页面。</p>", '<button class="button" data-action="close-modal">关闭</button>');
  if (state.modal === "om-download") {
    const options = `<option value="all">整单（${formatNumber(order.total)}个码）</option><option value="first">前N个码</option>${order.lines.map(row => {
      const remark = String(row.remark || "").trim();
      return `<option value="line:${row.id}">${fxEscape(row.category)}${remark ? ` · ${fxEscape(remark)}` : ""}（${formatNumber(row.quantity)}个码）</option>`;
    }).join("")}`;
    const warning = `<div class="om-download-warning"><div class="om-download-warning-head">${icon("triangle-alert", "!")}<strong>注意</strong></div><p>为防止溯源码流出造成重复码和归属冲突，任意范围下载二维码后，该单涉及码段资源将无法释放并再次用于创建订单。</p></div>`;
    return fxModalShell("下载码包", order.no, `${warning}<div class="form-grid"><div class="field full"><label for="om-download-scope">下载范围</label><select id="om-download-scope">${options}</select></div><div id="om-first-field" class="field full" hidden><label for="om-first">码数量 N</label><input id="om-first" type="number" min="1" max="${order.total}" step="1" value="${Math.min(1000, order.total)}"></div><div class="field full"><label for="om-download-format">文件格式</label><select id="om-download-format"><option value="txt">TXT</option><option value="xlsx">Excel（.xlsx）</option></select></div></div><div id="om-modal-error" class="danger-text" role="alert"></div>`, '<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="om-download-confirm">确认下载</button>');
  }
  if (state.modal === "om-cancel") {
    const downloaded = Boolean(order.downloads?.length);
    const warning = downloaded ? `<div class="om-download-warning"><div class="om-download-warning-head">${icon("triangle-alert", "!")}<strong>注意</strong></div><p>该订单已下载，整单号码已锁定。撤销后二维码会失效，但号码不能重新分配；已流出的二维码无法收回，订单不可恢复。</p></div>` : "";
    return fxModalShell("撤销订单", order.no, `${warning}<p>本次将撤销整张订单，共 ${formatNumber(order.total)} 个码。</p><div class="field"><label class="required" for="om-cancel-reason">撤销原因</label><textarea id="om-cancel-reason" maxlength="500"></textarea></div><div id="om-modal-error" class="danger-text" role="alert"></div>`, `<button class="button" data-action="close-modal">取消</button><button class="button danger" data-action="om-cancel-confirm">${downloaded ? "确认撤销并作废二维码" : "确认撤销订单"}</button>`);
  }
  if (state.modal === "om-cancel-info") {
    if (!omCancelled(order)) return fxModalShell("撤销信息", order.no, "<p>该订单尚未撤销，暂无撤销信息。</p>", '<button class="button" data-action="close-modal">关闭</button>');
    return fxModalShell("撤销信息", order.no, omCancellationMarkup(order), '<button class="button" data-action="close-modal">关闭</button>', true);
  }
  if (state.modal === "om-history") {
    const downloads = [...(order.downloads || [])].reverse().map(row => `<tr><td>${fxEscape(row.scope)}</td><td>${fxEscape(row.format || "TXT")}</td><td>${omRange(row.first, row.last)}</td><td>${formatNumber(row.amount)}</td><td>${fxEscape(row.operator)}</td><td>${fxEscape(row.time)}</td></tr>`).join("");
    const empty = `<tr><td colspan="6"><div class="empty"><div><div class="empty-icon">${icon("history", "·")}</div><h3>暂无下载记录</h3><p>该订单还没有下载过码包。</p></div></div></td></tr>`;
    return fxModalShell("下载记录", order.no, `<div class="table-shell" data-download-history><div class="table-scroll"><table><thead><tr><th>下载范围</th><th>文件格式</th><th>序号</th><th>数量</th><th>操作人</th><th>时间</th></tr></thead><tbody>${downloads || empty}</tbody></table></div></div>`, '<button class="button" data-action="close-modal">关闭</button>', true);
  }
  if (state.modal === "om-line-bindings") {
    const line = omLine(order, state.omLineId);
    if (!line) return fxModalShell("绑定记录", "", "<p>该品类明细不存在。</p>", '<button class="button" data-action="close-modal">关闭</button>');
    const records = state.omBindingRowsByLine?.[line.id] || "";
    const header = "<tr><th>产品名称</th><th>产品大类</th><th>产品批次</th><th>数量</th><th>序号</th><th>申请时间</th><th>状态</th><th>处理时间</th><th>操作人</th><th class=\"action-column\">操作</th></tr>";
    const empty = '<tr><td colspan="10">暂无绑定记录</td></tr>';
    return fxModalShell("绑定记录", `${line.category} · 序号 ${omRange(line.first, line.last)}`, `<div class="table-scroll"><table class="line-binding-table" data-sequence="off"><thead>${header}</thead><tbody>${records || empty}</tbody></table></div>`, '<button class="button" data-action="close-modal">关闭</button>', true);
  }
  const line = omLine(order, state.omLineId);
  if (!line) return "";
  const available = omLineStats(order, line).available;
  const sources = omLineRanges(order, line);
  const maxContiguous = Math.max(0, ...sources.map(row => Number(row.amount) || 0));
  if (state.modal === "om-bind-choice" && state.portal === "customer") {
    return fxModalShell("申请绑定产品", `${order.no} · ${order.customer || "—"}`, fxBindChoiceMarkup(order, "om-bind-existing", "om-bind-new", line.category), '<button class="button" data-action="close-modal">取消</button>', true);
  }
  const matches = products.filter(product => fxRecordBelongsToCustomer(product, fxCustomerForRecord(order)) && product.status === "已激活" && omProductMatches(product, line));
  const backAction = state.portal === "customer"
    ? '<button class="button" data-action="om-bind-back">返回选择</button>'
    : '<button class="button" data-action="close-modal">取消</button>';
  const emptyHint = matches.length
    ? ""
    : `<span class="field-help">${state.portal === "ops" ? "该客户下暂无可绑定的已激活产品" : "暂无同一大类的已激活产品，可选择新建产品。"}</span>`;
  const amount = Math.min(1000, maxContiguous);
  const preview = omProposedBinding(order, line, amount);
  return fxModalShell("绑定产品", `${order.no} · ${order.customer || "—"}`, `<div class="form-grid"><div id="om-existing-field" class="form-grid" style="grid-column: 1 / -1">${fxBindProductPicker("om-bind-product", matches)}${emptyHint}</div><div class="field full"><label class="required" for="om-bind-amount">绑定数量</label><input id="om-bind-amount" type="number" min="1" max="${maxContiguous}" data-available="${available}" aria-describedby="om-bind-amount-hint om-bind-amount-error" step="1" value="${amount}"><span id="om-bind-amount-hint" class="field-help">剩余可用码量：${formatNumber(available)}</span><span id="om-bind-amount-error" class="field-help danger-text" role="alert" hidden></span></div><div class="field full"><label for="om-bind-range">序号</label><input id="om-bind-range" class="mono immutable-input" value="${fxEscape(preview?.range || "—")}" readonly aria-readonly="true"></div></div><div id="om-modal-error" class="danger-text" role="alert"></div>`, `${backAction}<button class="button primary" data-action="om-bind-confirm">下一步</button>`);
}
function omOpenNewProduct(order, line, amount, sourceRange, product = null) {
  state.editorOrderLineId = line.id;
  state.editorProductId = product?.id || null;
  state.editorDraft = product ? fxNormalizeDetails(fxClone(product.details)) : fxNewDraft();
  state.editorDraft.category = line.category;
  state.editorDraft.subcategory = line.remark;
  state.editorDraft.companyName = order.customer;
  state.editorReadonly = false;
  state.editorOwner = state.portal;
  state.editorBindRequestId = null;
  state.editorTargetOrderNo = order.no;
  state.editorRequestedSourceRange = sourceRange;
  state.editorRequestedRange = fxRequestedRange(sourceRange, amount);
  state.editorRequestedAmount = amount;
  state.editorAddingField = null;
  state.productStep = 0;
  state.modal = null;
  state.omNewProduct = state.portal === "ops";
  if (state.portal === "ops") state.opsPage = "review-detail";
  else state.customerPage = "editor";
  render();
}
function omProposedBinding(order, line, amount) {
  if (!line || !Number.isSafeInteger(amount) || amount < 1) return null;
  const source = omLineRanges(order, line).find(row => Number(row.amount) >= amount);
  return source ? { source: source.range, range: fxRequestedRange(source.range, amount) } : null;
}
function omValidateBindAmount(required = false) {
  const input = document.getElementById("om-bind-amount");
  const error = document.getElementById("om-bind-amount-error");
  if (!input || !error) return false;
  const amount = Number(input.value);
  const available = Number(input.dataset.available);
  const message = !input.value.trim() && !required ? ""
    : !Number.isSafeInteger(amount) || amount < 1 ? "请输入正整数"
    : amount > available ? "超出剩余可用码量"
    : amount > Number(input.max) ? "超出单次可绑定数量" : "";
  error.textContent = message;
  error.hidden = !message;
  input.setAttribute("aria-invalid", String(Boolean(message)));
  input.setCustomValidity(message);
  const preview = document.getElementById("om-bind-range");
  const order = orders.find(row => row.no === state.selectedOrderNo);
  if (preview) preview.value = message ? "—" : omProposedBinding(order, omLine(order, state.omLineId), amount)?.range || "—";
  return !message;
}
function omValidateBinding(order, line, product, range) {
  if (!omIsOrder(order)) return "";
  if (omCancelled(order) || !line || !fxCodeRangeContains(omRange(line.first, line.last), range)) return "绑定范围必须属于原订单的同一条明细";
  if ((product?.customerId != null || product?.company) && !fxRecordBelongsToCustomer(product, fxCustomerForRecord(order))) return "只能绑定该订单所属客户的产品";
  if (!omProductMatches(product, line)) return "产品大类必须与订单明细一致";
  return "";
}
function fxInstallOrderManagement() {
  nav.ops.splice(0, nav.ops.length, ...nav.ops.filter(row => row[0] !== "inventory"));
  portalEntries.ops.path = pageFiles.ops.orders;
  pageTitles["ops:codes"] = "溯源质控码平台 · 创建订单";
  const originalRestore = restoreFromLocation;
  restoreFromLocation = function () {
    originalRestore();
    if (state.portal === "ops" && ["inventory", "inventory-detail"].includes(state.opsPage)) state.opsPage = "orders";
    const order = orders.find(row => row.no === state.editorTargetOrderNo);
    const product = products.find(row => fxSameId(row.id, state.editorProductId));
    if (omIsOrder(order)) state.editorOrderLineId = omEditorLine(order, product)?.id || null;
  };
  opsCodes = omCreatePage;
  opsOrders = () => omLedgerPage(false);
  customerOrders = () => omLedgerPage(true);
  const originalDetail = fxOrderDetailPage;
  fxOrderDetailPage = () => omDetailPage(originalDetail);
  const originalModal = modalMarkup;
  modalMarkup = () => state.modal?.startsWith("om-") ? omModal() : originalModal();
  const originalNormalize = fxNormalizeAllocationOrder;
  fxNormalizeAllocationOrder = function (order, index) {
    const result = originalNormalize(order, index);
    if (omIsOrder(order)) result.recordType = "random-order";
    return result;
  };
  const originalEditorControl = fxStandardFieldControl;
  fxStandardFieldControl = function (field, module) {
    const product = products.find(row => row.id === state.editorProductId);
    const order = orders.find(row => row.no === (state.editorTargetOrderNo || product?.requestedOrderNo));
    if (field.key === "category" && omIsOrder(order)) return `<input value="${fxEscape(product?.category || fxCurrentCategoryName(omEditorLine(order, product)) || state.editorDraft?.category || "")}" readonly aria-label="产品大类">`;
    return originalEditorControl(field, module);
  };
  const originalRanges = fxReviewActivationRange;
  fxReviewActivationRange = function (order, amount, product) {
    if (!omIsOrder(order)) return originalRanges(order, amount, product);
    const range = fxRequestedRange(product?.requestedSourceRange, amount);
    const line = omLine(order, product?.orderLineId);
    return !omValidateBinding(order, line, product, range) && fxRequestedRangeIsAvailable(order, product?.requestedSourceRange, range, amount, product?.id) ? range : "";
  };
  const originalReview = fxReviewDetailPage;
  fxReviewDetailPage = function () {
    if (!state.omNewProduct || state.editorOwner !== "ops" || !state.editorDraft) return originalReview();
    return `<div class="page">${pageHeader("新建产品并申请绑定", "", '<button class="button" data-action="om-editor-back">返回订单详情</button>')}${fxEditorWorkspace()}<div class="om-form-actions"><button class="button" data-action="om-editor-save">保存草稿</button><button class="button primary" data-action="om-editor-submit">提交审核</button></div></div>`;
  };
  const originalPersist = fxPersistDraft;
  fxPersistDraft = function (submit) {
    const linkedProduct = products.find(row => row.id === state.editorProductId);
    const order = orders.find(row => row.no === (state.editorTargetOrderNo || linkedProduct?.requestedOrderNo));
    if (!omIsOrder(order)) return originalPersist(submit);
    const product = products.find(row => row.id === state.editorProductId);
    const line = omEditorLine(order, product);
    const error = omValidateBinding(order, line, product || line, state.editorRequestedRange);
    if (error || !omCanAccess(order)) return showToast(error || "产品大类与订单明细不一致或订单无权访问"), false;
    const bound = product && (product.status === "已激活" || orders.some(row =>
      (row.activations || []).some(activation => fxActivationBelongsToProduct(activation, product))));
    if (state.editorDraft) state.editorDraft.category = bound ? product.category : fxCurrentCategoryName(line);
    if (state.omNewProduct && state.editorOwner === "ops") {
      const draft = state.editorDraft;
      if (!draft?.productName?.trim() || !draft?.batch?.trim()) return showToast("请先填写产品名称和产品批次"), false;
      if (submit && !fxRequestedRangeIsAvailable(order, state.editorRequestedSourceRange, state.editorRequestedRange, state.editorRequestedAmount, product?.id)) return showToast("绑定范围已改变，请重新选择"), false;
      const unnamed = fxEditorModules.some(module => (draft.custom?.[module] || []).some(row => !row.name?.trim() && (row.value?.trim() || row.files?.length)));
      if (unnamed) return showToast("新增字段必须填写字段名称"), false;
      const item = product || { id: Math.max(0, ...products.map(row => row.id)) + 1, amount: 0 };
      Object.assign(item, { customerId: order.customerId, company: order.customer, name: draft.productName.trim(), batch: draft.batch.trim(),
        category: line.category, categoryId: line.categoryId, orderLineId: line.id, productNumber: line.productNumber, details: fxClone(draft), omCreatedByOps: true,
        status: submit ? "待审核" : "草稿", applicationType: "新建产品并绑定", requestedOrderNo: order.no,
        requestedSourceRange: state.editorRequestedSourceRange, requestedRange: state.editorRequestedRange, requestedAmount: Number(state.editorRequestedAmount),
        submitted: submit ? omNow() : "", preferredOrderNo: order.no });
      if (!product) products.unshift(item);
      state.editorProductId = item.id;
      fxSaveBusiness();
      return true;
    }
    if (!originalPersist(submit)) return false;
    const saved = products.find(row => row.id === state.editorProductId);
    Object.assign(saved, { categoryId: line.categoryId, orderLineId: line.id, productNumber: line.productNumber });
    fxSaveBusiness();
    return true;
  };
  const originalPersistExisting = fxPersistExistingBindEdit;
  fxPersistExistingBindEdit = function (submit, asDraft) {
    const order = orders.find(row => row.no === state.editorTargetOrderNo);
    if (omIsOrder(order)) {
      const product = products.find(row => row.id === state.editorProductId);
      const line = omEditorLine(order, product);
      const error = omValidateBinding(order, line, { ...product, category: state.editorDraft?.category }, state.editorRequestedRange);
      if (error) return showToast(error), false;
      if (state.editorDraft) state.editorDraft.category = product.category;
    }
    return originalPersistExisting(submit, asDraft);
  };
}
document.addEventListener("input", event => {
  const target = event.target;
  if (target.id === "om-bind-amount") {
    omValidateBindAmount();
    return;
  }
  if (target.id === "om-customer-search") {
    omDraft().customerId = "";
    const value = document.getElementById("om-customer");
    const company = document.getElementById("om-company");
    if (value) value.value = "";
    if (company) company.value = "";
    const options = document.getElementById("om-customer-options");
    if (options) options.innerHTML = omCustomerSearchOptions(target.value);
    return;
  }
  if (target.matches("[data-om-category-search]")) {
    omSyncDraftCategory(target);
    omShowCategoryOptions(target);
    return;
  }
  if (target.closest("[data-om-line]")) {
    if (target.dataset.omField === "quantity" && target.value.length > 8) target.value = target.value.slice(0, 8);
    const row = omDraft().lines.find(line => line.id === target.closest("[data-om-line]").dataset.omLine);
    if (row && target.dataset.omField) row[target.dataset.omField] = target.value;
    omSyncDraftTotalDisplay();
    if (target.dataset.omField === "quantity") omSyncDraftQuantityLimits();
  }
  if (target.id === "om-note") omDraft().note = target.value;
});
document.addEventListener("change", event => {
  const target = event.target;
  if (target.id === "om-version") omDraft().version = target.value;
  if (target.matches("[data-om-category-search]")) {
    omSyncDraftCategory(target, true);
  }
  if (target.id === "om-download-scope") document.getElementById("om-first-field").hidden = target.value !== "first";
});
document.addEventListener("focusin", event => {
  const target = event.target;
  if (target.id === "om-customer-search") {
    target.setAttribute("aria-expanded", "true");
    return;
  }
  if (!target.matches("[data-om-category-search]")) return;
  state.omActiveLineId = target.dataset.omCategorySearch;
  omShowCategoryOptions(target);
});
document.addEventListener("focusout", event => {
  const target = event.target;
  if (target.matches("[data-om-category-search]")) {
    omSyncDraftCategory(target, true);
    setTimeout(() => {
      const layer = document.getElementById("om-category-options-layer");
      if (!layer?.contains(document.activeElement)) omHideCategoryOptions();
    }, 0);
    return;
  }
  if (target.id !== "om-customer-search") return;
  setTimeout(() => {
    if (!target.closest(".om-order-customer-picker")?.contains(document.activeElement)) target.setAttribute("aria-expanded", "false");
  }, 0);
});
document.addEventListener("keydown", event => {
  if (event.target.matches("[data-om-category-search]") && ["ArrowDown", "Enter", "Escape"].includes(event.key)) {
    if (event.key === "Escape") {
      omHideCategoryOptions();
      event.target.blur();
      return;
    }
    const option = document.querySelector("#om-category-options-layer .customer-picker-option");
    if (!option) return;
    event.preventDefault();
    if (event.key === "ArrowDown") option.focus();
    else option.click();
    return;
  }
  if (event.target.id !== "om-customer-search" || !["ArrowDown", "Enter", "Escape"].includes(event.key)) return;
  if (event.key === "Escape") {
    event.target.setAttribute("aria-expanded", "false");
    event.target.blur();
    return;
  }
  const option = document.querySelector("#om-customer-options .customer-picker-option");
  if (!option) return;
  event.preventDefault();
  if (event.key === "ArrowDown") option.focus();
  else option.click();
});
window.addEventListener("scroll", () => {
  const input = document.querySelector("[data-om-category-search][aria-expanded='true']");
  if (input) omPositionCategoryOptions(input);
}, true);
window.addEventListener("resize", () => {
  const input = document.querySelector("[data-om-category-search][aria-expanded='true']");
  if (input) omPositionCategoryOptions(input);
});
document.addEventListener("click", async event => {
  const target = event.target.closest("[data-action], [data-nav]");
  if (!target) return;
  if (omBusy) { event.preventDefault(); event.stopImmediatePropagation(); return showToast("正在处理，请稍候"); }
  if (target.dataset.nav) state.omNewProduct = false;
  const action = target.dataset.action;
  const order = orders.find(row => row.no === (target.dataset.no || state.selectedOrderNo));
  // Legacy entrances must not create inventory or permit whole-order product binding.
  const removed = ["fx-new-qr", "fx-create-order", "fx-finish-order", "fx-view-generated-order", "fx-choose-allocation-batch", "fx-open-code-allocation", "fx-confirm-code-allocation", "fx-open-allocation-recall", "fx-confirm-allocation-recall"];
  if (removed.includes(action)) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (action === "fx-new-qr") { state.omResult = null; state.opsPage = "codes"; } else state.opsPage = "orders";
    return render();
  }
  if (["fx-ops-bind-order", "fx-customer-bind-order", "fx-customer-new-product-for-order", "fx-confirm-ops-bind", "fx-confirm-customer-bind"].includes(action) && omIsOrder(order)) {
    event.preventDefault(); event.stopImmediatePropagation();
    state.selectedOrderNo = order.no;
    state[state.portal === "ops" ? "opsPage" : "customerPage"] = "order-detail";
    state.modal = null; render(); return showToast("请在具体生成明细中选择绑定产品");
  }
  if (action === "fx-approve-bind-request" || action === "fx-confirm-activation") {
    const request = action === "fx-approve-bind-request" ? bindRequests.find(row => fxSameId(row.id, target.dataset.id)) : products.find(row => row.id === state.drawerProductId);
    const related = orders.find(row => row.no === (request?.orderNo || request?.requestedOrderNo));
    if (omIsOrder(related)) {
      const product = action === "fx-approve-bind-request" ? fxProductForRecord(request) : request;
      const range = action === "fx-confirm-activation" ? fxReviewActivationRange(related, Number(fxRead("fx-activation-amount")), product) : request.range;
      const error = omValidateBinding(related, omLine(related, request?.orderLineId), product, range);
      if (error || (action === "fx-confirm-activation" && fxRead("fx-activation-order") !== related.no)) {
        event.preventDefault(); event.stopImmediatePropagation(); return showToast(error || "不能更换绑定申请的订单");
      }
    }
  }
  if (!action?.startsWith("om-")) return;
  event.preventDefault(); event.stopImmediatePropagation();
  if (omBusy) return showToast("正在处理，请稍候");
  if (!(fxEnabledOperatorSession() || fxEnabledCustomerSession())) return showToast("请先登录");
  const opsActions = ["om-create", "om-new-customer", "om-new-category", "om-select-customer", "om-select-category", "om-add-line", "om-remove-line", "om-generate", "om-open-download", "om-download-confirm", "om-open-cancel", "om-cancel-confirm", "om-editor-save", "om-editor-submit", "om-resume-product"];
  if (opsActions.includes(action) && !fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
  try {
    if (action === "om-create") {
      const customerId = target.dataset.customerId;
      const customer = customerId ? customers.find(row => fxSameId(row.id, customerId)) : null;
      if (customerId && (!customer || customer.status !== "启用")) throw new Error("客户账号不存在或已禁用");
      state.omDraft = null;
      if (customer) omDraft().customerId = customer.id;
      state.omResult = null;
      state.omCustomerCreateFromOrder = false;
      state.omCategoryCreateLineId = null;
      state.opsPage = "codes";
      return render();
    }
    if (action === "om-new-customer") {
      state.omCustomerCreateFromOrder = true;
      state.selectedCustomerId = null;
      state.modal = "fx-customer";
      render();
      document.getElementById("fx-customer-name")?.focus();
      return;
    }
    if (action === "om-new-category") {
      const lines = omDraft().lines;
      const line = lines.find(row => row.id === (target.dataset.lineId || state.omActiveLineId))
        || lines.find(row => !row.categoryId)
        || lines.at(-1);
      state.omCategoryCreateLineId = line?.id || null;
      state.omActiveLineId = line?.id || null;
      state.categorySelectedId = null;
      state.modal = "cat-form";
      omHideCategoryOptions();
      render();
      document.getElementById("cat-name")?.focus();
      return;
    }
    if (action === "om-select-customer") {
      const customer = customers.find(row => fxSameId(row.id, target.dataset.id) && row.status === "启用");
      if (!customer) return showToast("客户不存在或已停用");
      omDraft().customerId = customer.id;
      const search = document.getElementById("om-customer-search");
      const value = document.getElementById("om-customer");
      const company = document.getElementById("om-company");
      if (search) {
        search.value = customer.name;
        search.setAttribute("aria-expanded", "false");
        search.blur();
      }
      if (value) value.value = customer.id;
      if (company) company.value = customer.companyNumber || "";
      return;
    }
    if (action === "om-select-category") {
      const line = omDraft().lines.find(row => row.id === target.dataset.lineId);
      const category = fxCategories().find(row => fxSameId(row.id, target.dataset.id) && row.status === "启用");
      if (!line || !category) return showToast("产品大类不存在或已停用");
      line.categoryId = category.id;
      const input = document.querySelector(`[data-om-category-search="${line.id}"]`);
      const hidden = target.closest("tr")?.querySelector('input[data-om-field="categoryId"]')
        || document.querySelector(`[data-om-line="${line.id}"] input[data-om-field="categoryId"]`);
      const number = document.querySelector(`[data-om-line="${line.id}"] .om-product-number`);
      if (input) {
        input.value = category.name;
        input.setAttribute("aria-invalid", "false");
        input.blur();
      }
      if (hidden) hidden.value = category.id;
      if (number) number.textContent = category.productNumber;
      const error = document.getElementById(`om-category-error-${line.id}`);
      if (error) error.hidden = true;
      omSyncDraftQuantityLimits();
      omHideCategoryOptions();
      return;
    }
    if (action === "om-add-line") {
      const line = { id: crypto.randomUUID(), categoryId: "", quantity: "", remark: "" };
      omDraft().lines.push(line);
      state.omActiveLineId = line.id;
      document.getElementById("om-draft-lines").insertAdjacentHTML("beforeend", omDraftRow(line, omDraft().lines.length - 1));
      window.lucide?.createIcons();
      requestAnimationFrame(() => document.querySelector(`[data-om-line="${line.id}"] .om-category-input`)?.focus());
      return;
    }
    if (action === "om-remove-line") {
      if (omDraft().lines.length < 2) return showToast("至少保留一条明细");
      omDraft().lines = omDraft().lines.filter(line => line.id !== target.dataset.id);
      if (state.omActiveLineId === target.dataset.id) state.omActiveLineId = null;
      target.closest("tr").remove();
      document.querySelectorAll("#om-draft-lines tr").forEach((row, index) => { row.querySelector(".om-row-number").textContent = index + 1; });
      omSyncDraftTotalDisplay();
      omSyncDraftQuantityLimits();
      return;
    }
    if (action === "om-generate") {
      omValidateDraft(omDraft());
      omBusy = true;
      const draft = fxClone(omDraft());
      document.getElementById("om-create-error").textContent = "";
      document.querySelectorAll(".om-create-page button, .om-create-page input, .om-create-page select, .om-create-page textarea").forEach(control => { control.disabled = true; });
      target.textContent = "正在创建…";
      const created = await omGenerate(draft);
      state.omResult = created.no; state.selectedOrderNo = created.no; state.opsPage = "codes";
      render(); return;
    }
    if (action === "om-detail") {
      if (!omCanAccess(order)) throw new Error("无权查看此订单");
      state.selectedOrderNo = order.no; state.orderDetailReturnPage = "";
      state[state.portal === "ops" ? "opsPage" : "customerPage"] = "order-detail"; return render();
    }
    if (action === "om-open-cancel-info") {
      if (!omCanAccess(order)) throw new Error("无权访问此订单");
      if (!omCancelled(order)) return;
      state.selectedOrderNo = order.no;
      state.modal = "om-cancel-info";
      return render();
    }
    if (["om-bind-existing", "om-bind-new", "om-bind-back"].includes(action)) {
      if (!fxEnabledCustomerSession() || !omCanAccess(order) || omCancelled(order)) throw new Error("当前订单不可申请绑定");
      const line = omLine(order, state.omLineId);
      const sources = line ? omLineRanges(order, line) : [];
      if (!sources.length) throw new Error("本明细暂无可用码量");
      if (action === "om-bind-new") {
        const source = sources.reduce((largest, row) => row.amount > largest.amount ? row : largest);
        return omOpenNewProduct(order, line, Math.min(1000, source.amount), source.range);
      }
      state.modal = action === "om-bind-back" ? "om-bind-choice" : "om-bind";
      return render();
    }
    if (["om-open-download", "om-open-cancel", "om-history", "om-bind", "om-open-line-bindings"].includes(action)) {
      if (!omCanAccess(order)) throw new Error("无权访问此订单");
      if (omCancelled(order) && !["om-history", "om-open-line-bindings"].includes(action)) throw new Error("订单已撤销");
      if (action === "om-open-cancel" && omCancelReason(order)) throw new Error(omCancelReason(order));
      state.selectedOrderNo = order.no; state.omLineId = target.dataset.line || null;
      state.modal = { "om-open-download": "om-download", "om-open-cancel": "om-cancel", "om-history": "om-history", "om-bind": "om-bind", "om-open-line-bindings": "om-line-bindings" }[action];
      if (action === "om-bind" && state.portal === "customer") state.modal = "om-bind-choice";
      return render();
    }
    if (action === "om-download-confirm") {
      const selection = fxRead("om-download-scope");
      const scope = selection.startsWith("line") ? "line" : selection;
      const value = selection.includes(":") ? selection.slice(5) : scope === "line" ? state.omLineId : fxRead("om-first");
      const format = fxRead("om-download-format") || "txt";
      omBusy = true; target.disabled = true; target.textContent = "正在准备…";
      await omDownload(order.no, scope, value, format);
      state.modal = null; render(); return showToast(`${format === "xlsx" || format === "xls" ? "Excel（.xlsx）" : "TXT"} 码包已下载，下载记录已保存`);
    }
    if (action === "om-cancel-confirm") {
      omBusy = true; await omCancel(order.no, fxRead("om-cancel-reason"));
      state.modal = null; render(); return showToast("订单已撤销");
    }
    if (action === "om-bind-confirm") {
      if (!omCanAccess(order) || omCancelled(order)) throw new Error("订单不可用");
      if (!omValidateBindAmount(true)) return;
      const line = omLine(order, state.omLineId), amount = Number(fxRead("om-bind-amount"));
      const proposed = omProposedBinding(order, line, amount);
      if (!proposed) throw new Error("没有可容纳该数量的连续码段，请减少绑定数量");
      const product = products.find(row => fxSameId(row.id, fxRead("om-bind-product")));
      if (!product || product.status !== "已激活" || !fxRecordBelongsToCustomer(product, fxCustomerForRecord(order)) || !omProductMatches(product, line)) throw new Error("请选择该客户同一大类的已激活产品");
      if (fxPendingBindRequest(order.no, product.id, product.batch)) throw new Error("该产品在本订单已有待审核的绑定申请");
      const range = proposed.range;
      bindRequests.unshift({ id: Date.now(), no: fxNextBindRequestNo(), orderNo: order.no, orderLineId: line.id, categoryId: line.categoryId,
        productId: product.id, customerId: order.customerId, customer: order.customer, product: product.name, batch: product.batch,
        range, amount, status: "待审批", time: omNow(), submittedBy: omActor(), decidedAt: "", operator: "", rejectReason: "" });
      fxSaveBusiness(); state.modal = null; render(); return showToast("绑定申请已提交，等待审核");
    }
    if (action === "om-resume-product") {
      if (!omCanAccess(order) || omCancelled(order)) throw new Error("订单不可用");
      const product = products.find(row => fxSameId(row.id, target.dataset.id) && row.requestedOrderNo === order.no && ["草稿", "已驳回"].includes(row.status));
      const line = omLine(order, product?.orderLineId);
      const sources = omLineRanges(order, line, product?.id);
      const source = sources.find(row => fxCodeRangeContains(row.range, product?.requestedRange)) || sources[0];
      if (!product || !line || !source) throw new Error("本明细暂无可申请的序号");
      return omOpenNewProduct(order, line, Math.min(product.requestedAmount || 1, source.amount), source.range, product);
    }
    if (action === "om-editor-save" || action === "om-editor-submit") {
      if (!fxPersistDraft(action === "om-editor-submit")) return;
      if (action === "om-editor-save") return showToast("草稿已保存");
      state.omNewProduct = false; state.selectedOrderNo = state.editorTargetOrderNo; state.opsPage = "order-detail";
      render(); return showToast("产品及绑定申请已提交审核");
    }
    if (action === "om-editor-back") {
      state.omNewProduct = false; state.selectedOrderNo = state.editorTargetOrderNo; state.opsPage = "order-detail"; return render();
    }
    if (action === "om-search") {
      const values = Object.fromEntries([...document.querySelectorAll("[data-om-filter]")].map(input => [input.dataset.omFilter, input.value.trim()]));
      if (values.from && values.to && values.from > values.to) throw new Error("开始日期不能晚于结束日期");
      const previous = state.omFilters || {};
      values.category = state.portal === "ops" && (previous.productNumber || previous.statsProductKey) ? previous.category : "";
      state.omFilters = { ...previous, ...values, customerId: values.customer === previous.customer ? previous.customerId : "", productNumber: values.category === previous.category ? previous.productNumber : "", statsProductKey: values.category === previous.category ? previous.statsProductKey : "" };
      state.pagination = {}; return render();
    }
    if (action === "om-reset") { state.omFilters = {}; state.pagination = {}; return render(); }
    if (action === "om-export") {
      const customer = state.portal === "customer";
      const headers = ["订单号", "客户名称", ...(customer ? [] : ["公司号", "版本"]), "品类数量", "订单码量", "已绑定", "绑定申请中", "待绑定", ...(customer ? [] : ["订单状态"]), "订单创建时间"];
      const values = omLedgerRows(customer).map(row => [row.no, row.customer, ...(customer ? [] : [row.companyNumber || "", row.version || ""]), omCategoryCount(row), row.total, row.active, fxOrderPendingAmount(row), fxOrderAvailableAmount(row), ...(customer ? [] : [omOrderStatus(row)]), row.createdAt || row.created]);
      fxDownloadExcel(`订单台账_${omNow().slice(0, 10)}.xls`, headers, values);
      return showToast("当前筛选结果已导出");
    }
  } catch (error) {
    const area = document.getElementById("om-modal-error") || document.getElementById("om-create-error");
    if (area) area.textContent = error.message;
    showToast(error.message || "操作失败，请重试");
    if (action === "om-generate") {
      document.querySelectorAll(".om-create-page button, .om-create-page input, .om-create-page select, .om-create-page textarea").forEach(control => { control.disabled = false; });
      target.innerHTML = `${icon("qr-code", "")}创建订单并生成码包`;
    }
    if (action === "om-download-confirm") { target.disabled = false; target.textContent = "确认下载"; }
  } finally { omBusy = false; }
}, true);
