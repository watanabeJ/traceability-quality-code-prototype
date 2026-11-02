"use strict";

let fxCodeQueryRequestId = 0;

function fxCodeQueryWithdrawalRanges(item, orderNo) {
  if (item.segments?.length) return item.segments.filter(segment => segment.orderNo === orderNo).map(segment => segment.range).filter(Boolean);
  return item.orderNo === orderNo ? (item.resetRanges || []).filter(Boolean) : [];
}

function fxCodeQueryStatus(result) {
  if (omCancelled(result.order)) return { label: "订单已撤销", tone: "danger" };
  const serial = String(result.sequence);
  const latestActivationTime = String(result.activation?.time || "");
  const reset = withdrawals.some(item => {
    if (item.status !== "已通过" || !fxWithdrawalMatchesProduct(item, result.product)) return false;
    const ranges = fxCodeQueryWithdrawalRanges(item, result.order.no);
    const withdrawalTime = String(item.decidedAt || item.time || "");
    return (!latestActivationTime || !withdrawalTime || withdrawalTime >= latestActivationTime)
      && ranges.some(range => fxCodeInRange(serial, range));
  });
  if (reset || result.activation?.status === "已重置") return { label: "产品绑定已撤回", tone: "warning" };
  if (result.activation) return { label: "已绑定产品", tone: "success" };
  if (result.requests.some(item => item.status === "待审批" && item.range && fxCodeInRange(serial, item.range))) return { label: "绑定审核中", tone: "warning" };
  return { label: "尚未绑定", tone: "neutral" };
}

async function fxCodeQueryFind(code) {
  const prefix = code.slice(0, 8);
  const suffix = Number(code.slice(8));
  const candidates = orders
    .filter(order => omIsOrder(order) && `${order.version}${order.companyNumber}` === prefix.slice(0, 6))
    .flatMap(order => order.lines.filter(line => line.productNumber === prefix.slice(6, 8)).map(line => ({ order, line })))
    .sort((left, right) => Number(omCancelled(left.order)) - Number(omCancelled(right.order)));

  let incompletePayload = false;
  for (const { order, line } of candidates) {
    const payload = await omPayload(order.no);
    const randoms = Array.isArray(payload?.lines) ? payload.lines.find(row => row.id === line.id)?.randoms : null;
    if (!randoms || typeof randoms.indexOf !== "function") { incompletePayload = true; continue; }
    const offset = randoms?.indexOf(suffix) ?? -1;
    if (offset < 0) continue;

    const sequence = line.first + offset;
    const activations = order.activations || [];
    const activation = activations
      .filter(item => item.range && fxCodeInRange(String(sequence), item.range))
      .sort((left, right) => String(left.time || "").localeCompare(String(right.time || "")))
      .at(-1) || null;
    const product = activation ? fxProductForRecord({
      productId: activation.productId,
      product: activation.product,
      batch: activation.batch,
      customerId: order.customerId,
      customer: order.customer,
    }) : null;
    const requests = fxAllBindingReviewRequests().filter(item => item.orderNo === order.no && item.range && fxCodeInRange(String(sequence), item.range));
    const codeHistory = [
      { time: order.createdAt || order.created, event: "生成订单", detail: order.no },
      ...requests.map(item => ({
        time: item.decidedAt || item.time,
        event: item.status === "已通过" ? "绑定审核通过" : item.status === "已驳回" ? "绑定申请驳回" : "提交绑定申请",
        detail: `${item.product || "产品"} · ${item.status}`,
      })),
      ...activations.filter(item => item.range && fxCodeInRange(String(sequence), item.range)).map(item => ({
        time: item.status === "已重置" ? item.resetTime || item.time : item.time,
        event: item.status === "已重置" ? "产品绑定撤回" : "激活产品绑定",
        detail: `${item.product || "产品"} · ${item.status === "已重置" ? "已撤回" : "已激活"}`,
      })),
    ];
    withdrawals.forEach(item => {
      if (item.status === "待审批" && item.segments?.some(segment =>
        segment.orderNo === order.no && fxCodeInRange(String(sequence), segment.range))) {
        codeHistory.push({ time: item.time, event: "提交产品撤回申请", detail: `${item.product || "产品"} · 待审批` });
      } else if (product && fxWithdrawalMatchesProduct(item, product)
        && fxCodeQueryWithdrawalRanges(item, order.no).some(range => fxCodeInRange(String(sequence), range))) {
        codeHistory.push({
          time: item.decidedAt || item.time,
          event: item.status === "已通过" ? "产品绑定撤回" : "产品撤回申请驳回",
          detail: `${item.product || product.name} · ${item.status}`,
        });
      }
    });
    if (omCancelled(order)) {
      codeHistory.push({ time: order.recalledAt || order.cancellationRecords?.at(-1)?.time, event: "撤销订单", detail: order.recallReason || "订单已撤销" });
    }
    return {
      code, order, line, sequence, product, activation, requests,
      customer: fxCustomerForRecord(order),
      status: fxCodeQueryStatus({ order, sequence, product, activation, requests }),
      history: codeHistory.filter(item => item.time).sort((left, right) => String(left.time).localeCompare(String(right.time))),
      scans: fxStore.get("trace-scan-records-v2", {})[code] || { count: 0, times: [] },
    };
  }
  if (incompletePayload) throw new Error("部分订单的本地码包数据缺失，无法完整查询，请恢复码包数据后重试。");
  return null;
}

function fxCodeQueryPage() {
  const result = state.codeQueryResult;
  const form = `<section class="detail-section code-query-form"><div class="code-query-inputs"><label class="field"><span>前 8 位</span><input id="code-query-prefix" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="版本号 + 公司号 + 产品号" value="${fxEscape(state.codeQueryPrefix || "")}"></label><span class="code-query-divider">-</span><label class="field"><span>后 8 位</span><input id="code-query-suffix" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="随机码" value="${fxEscape(state.codeQuerySuffix || "")}"></label><button type="button" class="button primary" data-action="cq-search" ${state.codeQueryLoading ? "disabled" : ""}>${icon("search", "")}查询</button><button type="button" class="button" data-action="cq-reset">重置</button></div><p class="field-help">输入二维码前后两段各 8 位数字。</p>${state.codeQueryError ? `<p class="danger-text" role="alert">${fxEscape(state.codeQueryError)}</p>` : ""}</section>`;
  if (!result) return `<div class="page code-query-page">${pageHeader("单码查询", "查看二维码的归属、绑定状态和操作记录")}${form}<div class="empty"><div><div class="empty-icon">${icon("scan-search", "⌕")}</div><h3>输入完整的 16 位码</h3><p>查询后可查看所属客户、产品大类、订单和扫码记录。</p></div></div></div>`;

  const customer = result.customer;
  const product = result.product;
  const fields = [
    ["溯源码", result.code, false, "code-query-wide"],
    ["当前状态", `<span class="status ${result.status.tone}">${result.status.label}</span>`, true],
    ["累计扫码次数", `${formatNumber(result.scans.count || 0)} 次`],
    ["客户名称", customer?.name || result.order.customer || "—", false, "code-query-wide code-query-row-start"],
    ["公司号", result.order.companyNumber || "—"],
    ["版本号", result.order.version || "—"],
    ["订单号", result.order.no, false, "code-query-wide code-query-row-start"],
    ["序号", result.sequence, false, "code-query-wide"],
    ["绑定产品", product?.name || result.activation?.product || "—", false, "code-query-wide code-query-row-start"],
    ["产品大类", result.line.category || "—"],
    ["产品号", result.line.productNumber || "—"],
  ];
  const scanRecords = Array.isArray(result.scans.records)
    ? result.scans.records
    : (result.scans.times || []).map(time => ({ time }));
  state.pagination ||= {};
  const saved = state.pagination["cq-scans"] || { page: 1, pageSize: 10 };
  const pageSize = [10, 20, 50, 100].includes(Number(saved.pageSize)) ? Number(saved.pageSize) : 10;
  const page = Math.min(Math.max(1, Number(saved.page) || 1), Math.max(1, Math.ceil(scanRecords.length / pageSize)));
  state.pagination["cq-scans"] = { page, pageSize };
  const offset = (page - 1) * pageSize;
  const scanRows = scanRecords.slice().reverse().slice(offset, offset + pageSize).map((row, index) => `<tr><td class="sequence-col">${offset + index + 1}</td><td class="scan-time">${fxEscape(row.time || "—")}</td><td class="scan-ip mono">${fxEscape(row.ip || "—")}${row.mock ? '<span class="scan-mock-label">模拟</span>' : ""}</td></tr>`).join("");
  const scans = `<section class="detail-section code-query-scans"><div class="detail-title-row"><h2>扫码记录</h2></div><div class="table-shell code-query-scan-shell"><div class="table-scroll"><table class="code-query-scan-table" data-sequence="off" data-pagination="off"><colgroup><col class="scan-col-index"><col class="scan-col-time"><col class="scan-col-ip"></colgroup><thead><tr><th class="sequence-col">序号</th><th>扫码时间</th><th>IP地址</th></tr></thead><tbody>${scanRows || fxEmpty(3, "暂无扫码记录")}</tbody></table></div>${pagination(scanRecords.length, { key: "cq-scans", page, pageSize })}</div></section>`;
  return `<div class="page code-query-page">${pageHeader("单码查询", "查看二维码的归属、绑定状态和操作记录")}${form}<section class="detail-section"><div class="detail-title-row"><h2>二维码信息</h2></div><dl class="detail-grid code-query-summary">${fields.map(([label, value, raw, layout = ""]) => `<div class="detail-item ${layout}"><dt>${label}</dt><dd class="${["溯源码", "订单号", "序号", "公司号", "产品号", "版本号"].includes(label) ? "mono" : ""}">${raw ? value : fxEscape(value)}</dd></div>`).join("")}</dl></section>${scans}</div>`;
}

function fxCodeQueryRefresh() {
  const modal = document.querySelector(".code-query-modal");
  if (!modal || state.modal !== "cq-query") return;
  const body = modal.querySelector(".modal-body");
  const scrollTop = body.scrollTop;
  const page = modal.querySelector(".code-query-page");
  const template = document.createElement("template");
  template.innerHTML = modalMarkup();
  const nextPage = template.content.querySelector(".code-query-page");
  const form = page.querySelector(".code-query-form");
  form.querySelector('[role="alert"]')?.remove();
  const error = nextPage.querySelector('[role="alert"]');
  if (error) form.append(error);
  page.setAttribute("aria-busy", String(state.codeQueryLoading));
  page.querySelectorAll("#code-query-prefix, #code-query-suffix").forEach(input => {
    input.disabled = state.codeQueryLoading;
    input.value = input.id === "code-query-prefix" ? state.codeQueryPrefix : state.codeQuerySuffix;
  });
  form.querySelector('[data-action="cq-search"]').disabled = state.codeQueryLoading;
  // Keep the previous result in place until the lookup completes.
  if (!state.codeQueryLoading) {
    [...page.children].filter(child => child !== form).forEach(child => child.remove());
    [...nextPage.children].filter(child => !child.matches(".code-query-form")).forEach(child => page.append(child));
    modal.querySelector(".modal-foot").innerHTML = template.content.querySelector(".modal-foot").innerHTML;
    normalizeRenderedControls(page);
    numberRenderedTables(page);
    numberRenderedLists(page);
    applyRenderedPagination(page);
    if (window.lucide) window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
  }
  modal.querySelectorAll('[data-action="cq-order"], [data-action="cq-preview"]').forEach(button => {
    button.disabled = state.codeQueryLoading;
  });
  body.scrollTop = scrollTop;
}

function fxInstallCodeQuery() {
  pageFiles.ops["code-query"] = "pages/ops/code-query.html";
  pageTitles["ops:code-query"] = "溯源质控码平台 · 单码查询";
  const queryIndex = nav.ops.findIndex(item => item[0] === "code-query");
  if (queryIndex >= 0) nav.ops.splice(queryIndex, 1);
  Object.assign(state, { codeQueryPrefix: "", codeQuerySuffix: "", codeQueryResult: null, codeQueryError: "", codeQueryLoading: false });

  const originalOrders = opsOrders;
  opsOrders = () => {
    const root = document.createElement("div");
    root.innerHTML = originalOrders();
    const actions = root.querySelector(".page-header .page-actions");
    if (actions) actions.insertAdjacentHTML("afterbegin", `<button type="button" class="button" data-action="cq-open">${icon("scan-search", "")}查码</button>`);
    return root.innerHTML;
  };
  const originalModal = modalMarkup;
  modalMarkup = () => {
    if (state.modal !== "cq-query" || state.portal !== "ops" || !fxEnabledOperatorSession()) return originalModal();
    const root = document.createElement("div");
    root.innerHTML = fxCodeQueryPage();
    root.querySelector(".page-header")?.remove();
    root.firstElementChild?.classList.remove("page");
    const result = state.codeQueryResult;
    const links = result ? `<button class="button" data-action="cq-order">订单详情</button>${result.product ? '<button class="button" data-action="cq-preview">预览码</button>' : ""}` : "";
    return fxModalShell("查码", "", root.innerHTML, links, true)
      .replace("modal modal-wide", "modal modal-wide code-query-modal");
  };
  // Keep old bookmarked routes working without retaining a separate module.
  if (state.portal === "ops" && state.opsPage === "code-query") {
    state.opsPage = "orders";
    state.modal = "cq-query";
  }
  window.fxCodeQueryFind = fxCodeQueryFind;

  const updateScanPage = (page, pageSize) => {
    if (state.codeQueryLoading) return;
    state.pagination["cq-scans"] = { page, pageSize };
    fxCodeQueryRefresh();
  };
  window.addEventListener("click", event => {
    const target = event.target.closest('[data-action="pagination-page"][data-pagination-key="cq-scans"]');
    if (!target || state.modal !== "cq-query") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!target.disabled) updateScanPage(Number(target.dataset.page), state.pagination["cq-scans"].pageSize);
  }, true);
  window.addEventListener("change", event => {
    const target = event.target;
    if (state.modal !== "cq-query") return;
    if (target.dataset.paginationSize === "cq-scans") {
      event.stopImmediatePropagation();
      updateScanPage(1, Number(target.value));
    } else if (target.dataset.paginationPageInput === "cq-scans") {
      event.stopImmediatePropagation();
      updateScanPage(Number(target.value), state.pagination["cq-scans"].pageSize);
    }
  }, true);
  document.addEventListener("input", event => {
    if (event.target.id === "code-query-prefix") state.codeQueryPrefix = event.target.value = event.target.value.replace(/\D/g, "").slice(0, 8);
    if (event.target.id === "code-query-suffix") state.codeQuerySuffix = event.target.value = event.target.value.replace(/\D/g, "").slice(0, 8);
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Enter" && event.target.dataset.paginationPageInput === "cq-scans" && state.modal === "cq-query") {
      event.preventDefault();
      event.stopImmediatePropagation();
      return updateScanPage(Number(event.target.value), state.pagination["cq-scans"].pageSize);
    }
    if (event.key === "Enter" && event.target.matches("#code-query-prefix, #code-query-suffix")) {
      event.preventDefault();
      document.querySelector('[data-action="cq-search"]')?.click();
    }
  }, true);
  document.addEventListener("click", async event => {
    const target = event.target.closest('[data-action^="cq-"]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (state.portal !== "ops" || !fxEnabledOperatorSession()) return showToast("当前账号无权查询单码");
    if (target.dataset.action === "cq-open") {
      fxCodeQueryRequestId++;
      state.pagination ||= {};
      state.pagination["cq-scans"] = { page: 1, pageSize: 10 };
      Object.assign(state, { modal: "cq-query", codeQueryPrefix: "", codeQuerySuffix: "", codeQueryResult: null, codeQueryError: "", codeQueryLoading: false });
      return render();
    }
    if (target.dataset.action === "cq-order" || target.dataset.action === "cq-preview") {
      const result = state.codeQueryResult;
      if (!result || state.modal !== "cq-query") return;
      state.modal = null;
      if (target.dataset.action === "cq-order") {
        state.selectedOrderNo = result.order.no;
        state.orderDetailReturnPage = "orders";
        state.opsPage = "order-detail";
      } else {
        if (!result.product) return;
        state.editorProductId = result.product.id;
        state.editorDraft = fxClone(result.product.details);
        state.modal = "fx-preview";
      }
      return render();
    }
    if (state.modal !== "cq-query") return;
    if (target.dataset.action === "cq-reset") {
      fxCodeQueryRequestId++;
      Object.assign(state, { codeQueryPrefix: "", codeQuerySuffix: "", codeQueryResult: null, codeQueryError: "", codeQueryLoading: false });
      return fxCodeQueryRefresh();
    }
    if (state.codeQueryLoading) return;
    state.codeQueryError = "";
    const prefix = String(state.codeQueryPrefix || "").trim();
    const suffix = String(state.codeQuerySuffix || "").trim();
    if (!/^\d{8}$/.test(prefix) || !/^\d{8}$/.test(suffix)) {
      state.codeQueryResult = null;
      state.codeQueryError = "请输入完整的前 8 位和后 8 位数字。";
      return fxCodeQueryRefresh();
    }
    const requestId = ++fxCodeQueryRequestId;
    const isCurrent = () => requestId === fxCodeQueryRequestId && state.modal === "cq-query" && fxEnabledOperatorSession();
    state.codeQueryLoading = true;
    fxCodeQueryRefresh();
    try {
      const code = `${prefix}${suffix}`;
      const result = await fxCodeQueryFind(code);
      if (!isCurrent()) return;
      state.pagination["cq-scans"] = { page: 1, pageSize: state.pagination["cq-scans"]?.pageSize || 10 };
      state.codeQueryResult = result;
      if (!result) state.codeQueryError = "没有找到这条码记录，请核对二维码是否正确。";
    } catch (error) {
      if (isCurrent()) {
        state.codeQueryResult = null;
        state.codeQueryError = error.message || "查询失败，请稍后重试。";
      }
    } finally {
      if (requestId === fxCodeQueryRequestId) {
        state.codeQueryLoading = false;
        if (state.modal === "cq-query") fxCodeQueryRefresh();
      }
    }
  }, true);
  if (state.portal === "ops") render();
}

fxInstallCodeQuery();
