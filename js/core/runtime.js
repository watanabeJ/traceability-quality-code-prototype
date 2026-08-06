"use strict";

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = state.portal === "ops" ? renderOps() : state.portal === "customer" ? renderCustomer() : renderScan();
  normalizeRenderedControls(app);
  numberRenderedTables(app);
  numberRenderedLists(app);
  applyRenderedPagination(app);
  syncCurrentRoute();
  if (window.lucide) {
    window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    document.documentElement.classList.add("icons-loaded");
  }
  restorePortalSwitcherPosition();
}

function normalizeRenderedControls(root) {
  root.querySelectorAll("button:not([type])").forEach(button => {
    button.type = "button";
  });
  root.querySelectorAll("table").forEach(table => {
    const headers = [...table.querySelectorAll("thead tr:first-child > th")];
    headers.forEach((header, columnIndex) => {
      if (!/操作$/.test(header.textContent.trim())) return;
      header.classList.add("action-column");
      table.querySelectorAll("tbody > tr").forEach(row => {
        const cell = row.children[columnIndex];
        if (cell?.tagName === "TD") cell.classList.add("action-column");
      });
    });
  });
}

function numberRenderedTables(root) {
  root.querySelectorAll("table").forEach(table => {
    if (table.dataset.sequence === "off") return;
    const headerRow = table.querySelector("thead tr");
    if (!headerRow || headerRow.firstElementChild?.classList.contains("sequence-col")) return;

    const header = document.createElement("th");
    header.className = "sequence-col";
    header.scope = "col";
    header.textContent = "序号";
    headerRow.prepend(header);

    const colgroup = table.querySelector("colgroup");
    if (colgroup) {
      const column = document.createElement("col");
      column.className = "sequence-column";
      colgroup.prepend(column);
    }

    let sequence = 0;
    table.querySelectorAll("tbody > tr").forEach(row => {
      const cells = [...row.children].filter(cell => cell.tagName === "TD");
      if (cells.length === 1 && cells[0].hasAttribute("colspan")) {
        cells[0].setAttribute("colspan", String(Number(cells[0].getAttribute("colspan") || 1) + 1));
        return;
      }
      sequence += 1;
      const cell = document.createElement("td");
      cell.className = "sequence-cell";
      cell.textContent = String(sequence);
      row.prepend(cell);
    });
  });
}

function numberRenderedLists(root) {
  root.querySelectorAll(".list").forEach(list => {
    if (list.dataset.sequence === "off") return;
    let sequence = 0;
    [...list.children].filter(item => item.classList.contains("list-item")).forEach(item => {
      sequence += 1;
      if (item.firstElementChild?.classList.contains("list-sequence")) {
        item.firstElementChild.textContent = String(sequence);
        return;
      }
      const marker = document.createElement("span");
      marker.className = "list-sequence";
      marker.textContent = String(sequence);
      marker.setAttribute("aria-label", `序号 ${sequence}`);
      item.prepend(marker);
    });
  });
}

function syncCurrentRoute() {
  const page = state.portal === "ops" ? state.opsPage : state.portal === "customer" ? state.customerPage : "";
  const file = pageFiles[state.portal]?.[page];
  if (!file) return;
  const target = new URL(file, document.baseURI);
  if (page === "order-detail" && state.selectedOrderNo) target.searchParams.set("order", state.selectedOrderNo);
  if (page === "customer-detail" && state.selectedCustomerId) target.searchParams.set("customer", state.selectedCustomerId);
  if (page === "review-detail" && state.drawerProductId) target.searchParams.set("product", state.drawerProductId);
  if (page === "editor" && state.editorProductId) target.searchParams.set("product", state.editorProductId);
  if (page === "editor" && state.editorTargetOrderNo) target.searchParams.set("order", state.editorTargetOrderNo);
  if (["review-detail", "editor"].includes(page) && Number(state.productStep) > 0) target.searchParams.set("step", state.productStep);
  document.title = pageTitles[`${state.portal}:${page}`] || document.title;
  if (window.location.pathname !== target.pathname) {
    window.location.assign(target.href);
    return;
  }
  if (window.location.search !== target.search || window.location.hash) window.history.replaceState({ portal: state.portal, page }, "", target.href);
}

function showToast(message) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `${icon("circle-check", "✓")}<span>${message}</span>`;
  root.appendChild(node);
  if (window.lucide) window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
  setTimeout(() => node.remove(), 2400);
}

function setNav(page) {
  if (state.portal === "ops") state.opsPage = page;
  if (state.portal === "customer") state.customerPage = page;
  state.modal = null;
  state.drawerProductId = null;
  state.reviewEditing = false;
  render();
}

const portalPositionKey = "trace-portal-switcher-position-v1";
let portalDrag = null;

function clampPortalPosition(left, top, element) {
  const gutter = 8;
  return {
    left: Math.min(Math.max(gutter, left), Math.max(gutter, window.innerWidth - element.offsetWidth - gutter)),
    top: Math.min(Math.max(gutter, top), Math.max(gutter, window.innerHeight - element.offsetHeight - gutter)),
  };
}

function setPortalPosition(element, left, top) {
  const position = clampPortalPosition(left, top, element);
  element.style.left = `${position.left}px`;
  element.style.top = `${position.top}px`;
  element.style.right = "auto";
  element.style.bottom = "auto";
  return position;
}

function restorePortalSwitcherPosition() {
  const element = document.querySelector("[data-portal-switcher]");
  if (!element) return;
  try {
    const saved = JSON.parse(localStorage.getItem(portalPositionKey) || "null");
    if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) setPortalPosition(element, saved.left, saved.top);
  } catch (_) {
    localStorage.removeItem(portalPositionKey);
  }
}

document.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest("[data-portal-drag-handle]");
  if (!handle) return;
  const element = handle.closest("[data-portal-switcher]");
  const rect = element.getBoundingClientRect();
  portalDrag = { element, handle, pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
  setPortalPosition(element, rect.left, rect.top);
  handle.setPointerCapture(event.pointerId);
  document.body.classList.add("portal-dragging");
  event.preventDefault();
});

document.addEventListener("pointermove", (event) => {
  if (!portalDrag || portalDrag.pointerId !== event.pointerId) return;
  setPortalPosition(portalDrag.element, event.clientX - portalDrag.offsetX, event.clientY - portalDrag.offsetY);
});

function finishPortalDrag(event) {
  if (!portalDrag || portalDrag.pointerId !== event.pointerId) return;
  const rect = portalDrag.element.getBoundingClientRect();
  localStorage.setItem(portalPositionKey, JSON.stringify({ left: rect.left, top: rect.top }));
  if (portalDrag.handle.hasPointerCapture(event.pointerId)) portalDrag.handle.releasePointerCapture(event.pointerId);
  portalDrag = null;
  document.body.classList.remove("portal-dragging");
}

document.addEventListener("pointerup", finishPortalDrag);
document.addEventListener("pointercancel", finishPortalDrag);
window.addEventListener("resize", restorePortalSwitcherPosition);

document.addEventListener("click", (event) => {
  const clickedButton = event.target.closest("button");
  if (clickedButton) event.preventDefault();
  const target = event.target.closest("[data-nav], [data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action?.startsWith("fx-")) return;
  event.preventDefault();
  if (target.dataset.nav) return setNav(target.dataset.nav);
  if (!action) return;
  if (action === "toggle-sidebar") { state.sidebarCollapsed = !state.sidebarCollapsed; localStorage.setItem("trace-sidebar-collapsed-v1", state.sidebarCollapsed ? "1" : "0"); return render(); }
  if (action === "pagination-page") {
    const key = target.dataset.paginationKey;
    if (!key || !state.pagination[key]) return;
    state.pagination[key].page = Number(target.dataset.page || 1);
    return render();
  }
  if (action === "toggle-password") {
    const input = document.getElementById(target.dataset.target);
    if (!input) return;
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    target.setAttribute("aria-pressed", String(visible));
    target.setAttribute("aria-label", visible ? "隐藏密码" : "显示密码");
    target.title = visible ? "隐藏密码" : "显示密码";
    target.innerHTML = icon(visible ? "eye-off" : "eye", visible ? "◉" : "○");
    if (window.lucide) window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    return;
  }
  if (action === "open-design") return window.open("../DESIGN/preview.html", "_blank");
  if (action === "show-notifications") return setNav("messages");
  if (action === "refresh") return showToast("数据已刷新");
  if (action === "export") return showToast("导出任务已创建");
  if (action === "download") return showToast("下载已开始");
  if (action === "go-reviews") return setNav("reviews");
  if (action === "go-codes") return setNav("codes");
  if (action === "go-orders") return setNav("orders");
  if (action === "customer-products") return setNav("products");
  if (action === "new-customer") { state.modal = "new-customer"; return render(); }
  if (action === "edit-customer") return showToast("客户编辑抽屉已就绪");
  if (action === "confirm-new-customer") {
    const value = document.getElementById("new-customer-name")?.value.trim();
    if (!value) return showToast("请填写客户名称");
    customers.unshift({ name: value, account: "new_customer", phone: "待补充", status: "启用", total: 0, active: 0 });
    state.modal = null;
    render();
    return showToast("客户账号已创建");
  }
  if (action === "qr-next") { state.qrStep = Math.min(4, state.qrStep + 1); render(); return state.qrStep === 4 ? showToast("二维码生成任务已完成") : null; }
  if (action === "qr-prev") { state.qrStep = Math.max(1, state.qrStep - 1); return render(); }
  if (action === "open-first-pending") {
    const pending = products.find(p => p.status === "待审核");
    state.drawerProductId = pending?.id || products[0].id;
    return render();
  }
  if (action === "open-review") { state.drawerProductId = Number(target.dataset.id); state.reviewEditing = false; state.editorProductId = null; state.editorDraft = null; state.productStep = 0; state.opsPage = "review-detail"; return render(); }
  if (action === "close-drawer") { state.drawerProductId = null; state.modal = null; return render(); }
  if (action === "approve-review") { state.modal = "activation"; return render(); }
  if (action === "reject-review") { state.modal = "reject"; return render(); }
  if (action === "confirm-activation") {
    const amount = Number(document.getElementById("activation-amount")?.value || 0);
    if (amount < 1 || amount > 40000) return showToast("激活数量必须在可用余额内");
    const product = products.find(p => p.id === state.drawerProductId);
    if (product) { product.status = "已激活"; product.amount = amount; }
    state.modal = null; state.drawerProductId = null; render(); return showToast(`审核通过，已激活 ${formatNumber(amount)} 枚码`);
  }
  if (action === "confirm-reject") {
    const product = products.find(p => p.id === state.drawerProductId);
    if (product) product.status = "已驳回";
    state.modal = null; state.drawerProductId = null; render(); return showToast("产品已驳回，客户将收到通知");
  }
  if (action === "clear-filters") { state.filter = ""; state.reviewStatus = "全部状态"; return render(); }
  if (action === "order-detail") return showToast("已加载订单激活批次");
  if (action === "approve-withdrawal") { state.modal = "withdraw-approve"; return render(); }
  if (action === "reject-withdrawal") return showToast("撤回申请已驳回");
  if (action === "confirm-withdraw-approve") { withdrawals[0].status = "已通过"; state.modal = null; render(); return showToast("撤回已通过，关联码已重置"); }
  if (action === "mark-read") return showToast("全部消息已标记为已读");
  if (action === "read-message") { state.modal = "message"; return render(); }
  if (action === "save-password") return showToast("登录密码已更新");
  if (action === "customer-new-product" || action === "customer-edit-product") { state.customerPage = "editor"; state.productStep = 0; return render(); }
  if (action === "product-step") { state.productStep = Number(target.dataset.step); return render(); }
  if (action === "product-next") { if (state.productStep < 4) state.productStep += 1; render(); return showToast(state.productStep === 4 ? "已进入生产追溯模块" : "草稿已保存"); }
  if (action === "product-prev") { state.productStep = Math.max(0, state.productStep - 1); return render(); }
  if (action === "customer-preview") { state.modal = "preview"; return render(); }
  if (action === "regenerate-preview") return showToast("预览码已重新生成");
  if (action === "submit-product") { state.modal = "submit-product"; return render(); }
  if (action === "confirm-submit-product") { products[0].status = "待审核"; state.modal = null; state.customerPage = "products"; render(); return showToast("产品资料已提交审核"); }
  if (action === "customer-withdraw") { state.modal = "withdraw"; return render(); }
  if (action === "confirm-withdraw") { state.modal = null; render(); return showToast("全量撤回申请已提交"); }
  if (action === "close-modal") { state.modal = null; return render(); }
  if (action === "scan-status") { state.scanStatus = target.dataset.status; return render(); }
  if (action === "scan-tab") { state.scanTab = target.dataset.tab; return render(); }
  if (action === "fx-toggle-product-details") { state.scanProductExpanded = !state.scanProductExpanded; return render(); }
}, true);

const composingProductSearchInputs = new WeakSet();
function commitProductSearch(target) {
  state.filter = target.value;
  const cursor = target.selectionStart;
  render();
  const input = document.getElementById("product-search");
  if (input) { input.focus(); input.setSelectionRange(cursor, cursor); }
}
document.addEventListener("compositionstart", (event) => {
  if (event.target.id === "product-search") composingProductSearchInputs.add(event.target);
});
document.addEventListener("compositionend", (event) => {
  if (event.target.id !== "product-search") return;
  composingProductSearchInputs.delete(event.target);
  commitProductSearch(event.target);
});
document.addEventListener("input", (event) => {
  if (event.target.id !== "product-search") return;
  if (event.isComposing || composingProductSearchInputs.has(event.target)) return;
  commitProductSearch(event.target);
});

document.addEventListener("change", (event) => {
  if (event.target.dataset.paginationSize) {
    const key = event.target.dataset.paginationSize;
    state.pagination[key] = { page: 1, pageSize: Number(event.target.value || 20) };
    return render();
  }
  if (event.target.dataset.paginationPageInput) {
    const key = event.target.dataset.paginationPageInput;
    if (!state.pagination[key]) return;
    state.pagination[key].page = Math.max(1, Number(event.target.value || 1));
    return render();
  }
  if (event.target.id === "review-status") { state.reviewStatus = event.target.value; render(); }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.dataset.paginationPageInput) {
    event.preventDefault();
    const key = event.target.dataset.paginationPageInput;
    if (!state.pagination[key]) return;
    state.pagination[key].page = Math.max(1, Number(event.target.value || 1));
    return render();
  }
  if (event.key === "Escape" && (state.modal || state.drawerProductId)) {
    state.modal = null;
    state.drawerProductId = null;
    render();
  }
});

function restoreFromLocation() {
  const page = document.body.dataset.initialPage || initialPage;
  const params = new URLSearchParams(window.location.search);
  state.portal = entryPortal;
  const opsRoutes = new Set([...nav.ops.map(item => item[0]), "codes", "customer-detail", "review-detail", "order-detail"]);
  if (entryPortal === "ops" && opsRoutes.has(page)) state.opsPage = page;
  const customerRoutes = new Set([...nav.customer.map(item => item[0]), "editor", "order-detail"]);
  if (entryPortal === "customer" && customerRoutes.has(page)) state.customerPage = page;
  if (page === "order-detail" && params.get("order")) state.selectedOrderNo = params.get("order");
  if (page === "customer-detail" && params.get("customer")) state.selectedCustomerId = Number(params.get("customer"));
  if (page === "review-detail" && params.get("product")) state.drawerProductId = Number(params.get("product"));
  if (page === "editor" && params.get("product")) {
    const productId = Number(params.get("product"));
    const product = typeof products !== "undefined" ? products.find(item => item.id === productId) : null;
    const targetOrderNo = params.get("order");
    state.editorProductId = productId;
    state.editorOwner = "customer";
    state.editorTargetOrderNo = targetOrderNo || null;
    state.editorRequestedSourceRange = targetOrderNo ? product?.requestedSourceRange || "" : "";
    state.editorRequestedRange = targetOrderNo ? product?.requestedRange || "" : "";
    state.editorRequestedAmount = targetOrderNo ? Number(product?.requestedAmount || 0) : 0;
    if (product) {
      state.editorDraft = fxNormalizeDetails(fxClone(product.details || fxDefaultDetails(product)));
      state.editorReadonly = !targetOrderNo && ["待审核", "已激活"].includes(product.status);
      if (typeof fxInitializeEditorBinding === "function") fxInitializeEditorBinding(product);
    }
  }
  if (page === "editor" && params.get("order") && !params.get("product")) state.editorTargetOrderNo = params.get("order");
  if (["review-detail", "editor"].includes(page) && params.get("step")) state.productStep = Math.max(0, Math.min(5, Number(params.get("step")) || 0));
}

window.addEventListener("popstate", () => {
  restoreFromLocation();
  render();
});

document.addEventListener("submit", event => event.preventDefault());

restoreFromLocation();
render();
