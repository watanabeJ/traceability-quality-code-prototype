"use strict";

function icon(name, fallback = "·", extra = "") {
  return `<i data-lucide="${name}" class="icon ${extra}" aria-hidden="true"></i><span class="fallback-icon" aria-hidden="true">${fallback}</span>`;
}

function formatNumber(value) {
  return Number(value).toLocaleString("zh-CN");
}

function statusClass(value) {
  if (["已激活", "已通过", "启用", "已完成", "有效", "已分配"].includes(value)) return "success";
  if (["待审核", "待审批", "生成中", "部分分配"].includes(value)) return "warning";
  if (["已驳回", "已退回", "禁用", "失败"].includes(value)) return "danger";
  if (["已重置"].includes(value)) return "info";
  return "neutral";
}

function status(value) {
  return `<span class="status ${statusClass(value)}">${value}</span>`;
}

function globalBar() {
  const currentUser = state.portal === "customer"
    ? customers.find(item => item.account === state.currentAccount)
    : fxOperators.find(item => item.account === state.currentAccount);
  const accountName = currentUser?.name?.slice(0, 2) || "账号";
  const currentCustomer = state.portal === "customer" ? currentUser : null;
  const unread = state.portal === "customer" ? messages.filter(item => item.unread && (!item.recipient || item.recipient === currentCustomer?.name)).length : messages.filter(item => item.unread).length;
  const unreadBadge = unread ? `<span class="notification-badge" aria-label="${unread} 条未读消息">${unread > 99 ? "99+" : unread}</span>` : "";
  const accountActions = state.portal === "scan" ? "" : `
        <button class="icon-button notification-button" type="button" title="${unread ? `${unread} 条未读消息` : "暂无未读消息"}" aria-label="${unread ? `通知，${unread} 条未读消息` : "通知，无未读消息"}" data-action="show-notifications">${icon("bell", "!")}${unreadBadge}</button>
        <button class="avatar avatar-button" type="button" data-nav="settings" title="个人设置" aria-label="打开个人设置">${accountName}</button>`;
  return `
    <header class="global-bar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
        <span class="brand-name">溯源质控码平台</span>
      </div>
      <div class="top-actions">
        ${accountActions}
      </div>
    </header>`;
}

function portalSwitcher() {
  return `
    <nav class="portal-float" aria-label="平台切换" data-portal-switcher>
      <button class="portal-float-handle" type="button" aria-label="拖动平台切换窗口" title="拖动切换窗口" data-portal-drag-handle>
        ${icon("grip-vertical", "⋮")}
      </button>
      <div class="portal-float-links">
        ${Object.entries(portalEntries).map(([key, item]) => state.portal === key
          ? `<span class="portal-link active" aria-current="page" title="当前为${item.label}">${item.shortLabel}</span>`
          : `<a class="portal-link" href="${item.path}" title="打开${item.label}">${item.shortLabel}</a>`).join("")}
      </div>
    </nav>`;
}

function sidebar(portal) {
  const pageKey = portal === "ops" ? state.opsPage : state.customerPage;
  const customer = portal === "customer" ? customers.find(item => item.account === state.currentAccount) : null;
  const sidebarName = portal === "ops" ? "平台运营中心" : customer?.name || "客户后台";
  const sidebarMeta = portal === "ops" ? "全量运营权限" : customer?.account || "未登录";
  return `
    <aside class="sidebar ${state.sidebarCollapsed ? "is-collapsed" : ""}" aria-label="${portalLabels[portal]}导航">
      <div class="sidebar-head"><div class="nav-label">工作台</div><button type="button" class="sidebar-toggle" data-action="toggle-sidebar" aria-label="${state.sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}" title="${state.sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}">${icon(state.sidebarCollapsed ? "panel-left-open" : "panel-left-close", state.sidebarCollapsed ? "›" : "‹")}</button></div>
      <nav class="nav-list">
        ${nav[portal].map(([key, iconName, label]) => `
          <button type="button" class="nav-item ${pageKey === key ? "active" : ""}" data-nav="${key}" title="${label}">
            ${icon(iconName, "·")}
            <span>${label}</span>
          </button>`).join("")}
      </nav>
      <div class="sidebar-foot"><strong>${sidebarName}</strong>${sidebarMeta}</div>
    </aside>`;
}

function shell(portal, content) {
  return `${globalBar()}<div class="shell">${sidebar(portal)}<main class="main">${content}</main></div>${portalSwitcher()}${drawerMarkup()}${modalMarkup()}`;
}

function pageHeader(title, subtitle, actions = "") {
  return `<div class="page-header"><div><h1>${title}</h1></div><div class="page-actions">${actions}</div></div>`;
}

function metricStrip(items) {
  return `<section class="metric-strip" aria-label="数据概览">${items.map(item => `<div class="metric"><div class="metric-label">${item.icon ? icon(item.icon, "·") : ""}${item.label}</div><div class="metric-value">${item.value}</div></div>`).join("")}</section>`;
}

function pagination(total = 0, options = {}) {
  const key = options.key || "";
  const pageSize = Number(options.pageSize || 20);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Number(options.page || 1)), totalPages);
  const selected = Math.max(0, Number(options.selected || 0));
  const selectable = Boolean(options.selectable);
  const disabledFirst = page <= 1 ? "disabled" : "";
  const disabledLast = page >= totalPages ? "disabled" : "";
  const sizeOptions = [10, 20, 50, 100].map(size => `<option value="${size}" ${size === pageSize ? "selected" : ""}>${size}</option>`).join("");
  const summary = selectable ? `已选 <strong>${selected}</strong> 项，共 <strong>${total}</strong> 项` : `共 <strong>${total}</strong> 项`;
  return `<div class="pagination" data-pagination-key="${key}"><span class="pagination-summary">${summary}</span><div class="pagination-controls"><label class="pagination-size"><select data-pagination-size="${key}" aria-label="每页条数">${sizeOptions}</select><span>条 / 页</span></label><div class="page-buttons" aria-label="分页控件"><button type="button" data-action="pagination-page" data-pagination-key="${key}" data-page="1" ${disabledFirst} title="首页" aria-label="首页">${icon("chevrons-left", "|‹")}</button><button type="button" data-action="pagination-page" data-pagination-key="${key}" data-page="${Math.max(1, page - 1)}" ${disabledFirst} title="上一页" aria-label="上一页">${icon("chevron-left", "‹")}</button><label class="pagination-page-position"><input type="number" min="1" max="${totalPages}" value="${page}" data-pagination-page-input="${key}" aria-label="当前页"><span>/ ${totalPages} 页</span></label><button type="button" data-action="pagination-page" data-pagination-key="${key}" data-page="${Math.min(totalPages, page + 1)}" ${disabledLast} title="下一页" aria-label="下一页">${icon("chevron-right", "›")}</button><button type="button" data-action="pagination-page" data-pagination-key="${key}" data-page="${totalPages}" ${disabledLast} title="末页" aria-label="末页">${icon("chevrons-right", "›|")}</button></div></div></div>`;
}

function paginationRouteKey() {
  const page = state.portal === "ops" ? state.opsPage : state.portal === "customer" ? state.customerPage : "";
  return `${state.portal}-${page}`;
}

function applyRenderedPagination(root) {
  if (state.portal === "scan") return;
  state.pagination ||= {};
  const routeKey = paginationRouteKey();
  if (routeKey.endsWith("-overview")) return;
  const collections = [];
  root.querySelectorAll("main table").forEach((table, index) => {
    const rows = [...table.querySelectorAll("tbody > tr")];
    const dataRows = rows.filter(row => !(row.children.length === 1 && row.firstElementChild?.hasAttribute("colspan")));
    collections.push({ key: `${routeKey}-table-${index}`, nodes: dataRows, anchor: table.closest(".table-scroll") || table, selected: table.querySelectorAll('tbody input[type="checkbox"]:checked').length, selectable: table.classList.contains("message-table") });
  });
  collections.forEach(collection => {
    const saved = state.pagination[collection.key] || { page: 1, pageSize: 20 };
    const pageSize = [10, 20, 50, 100].includes(Number(saved.pageSize)) ? Number(saved.pageSize) : 20;
    const totalPages = Math.max(1, Math.ceil(collection.nodes.length / pageSize));
    const page = Math.min(Math.max(1, Number(saved.page || 1)), totalPages);
    state.pagination[collection.key] = { page, pageSize };
    collection.nodes.forEach((node, index) => {
      const visible = index >= (page - 1) * pageSize && index < page * pageSize;
      if (visible) node.removeAttribute("hidden");
      else node.setAttribute("hidden", "");
    });
    const markup = pagination(collection.nodes.length, { key: collection.key, page, pageSize, selected: collection.selected, selectable: collection.selectable });
    const existing = collection.anchor.nextElementSibling?.classList.contains("pagination") ? collection.anchor.nextElementSibling : null;
    if (existing) existing.outerHTML = markup;
    else collection.anchor.insertAdjacentHTML("afterend", markup);
  });
}
