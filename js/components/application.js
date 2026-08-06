"use strict";

function fxLoginPage(portal) {
    const isCustomer = portal === "customer";
    return `<main class="login-page"><section class="login-card"><div class="login-brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><div><strong>溯源质控码平台</strong><span>${isCustomer ? "客户后台" : "运营方后台"}</span></div></div><div class="login-copy"><h1>账号密码登录</h1><p>${isCustomer ? "使用运营方分配的客户账号登录。" : "仅限运营方内部账号登录。"}</p></div><div class="form-grid"><div class="field full"><label class="required">登录账号</label><input id="fx-login-account" autocomplete="username" value="${isCustomer ? "yunling" : "operator_01"}"></div><div class="field full"><label class="required">登录密码</label><input id="fx-login-password" type="password" autocomplete="current-password" value="Trace@2026"></div><div class="field full"><button class="button primary login-submit" data-action="fx-login">登录${isCustomer ? "客户" : "运营"}后台</button></div></div><div class="login-tip">演示账号已预填；禁用账号无法登录。不提供验证码或微信扫码登录。</div></section>${portalSwitcher()}</main>`;
  }

  globalBar = function () {
    const currentUser = state.portal === "customer" ? fxCurrentCustomer() : fxCurrentOperator();
    const accountName = currentUser.name.slice(0, 2);
    const unread = fxUnreadMessageCount();
    const unreadBadge = unread ? `<span class="notification-badge" aria-label="${unread} 条未读消息">${unread > 99 ? "99+" : unread}</span>` : "";
    const accountActions = state.portal === "scan" ? "" : `<button class="icon-button notification-button" type="button" title="${unread ? `${unread} 条未读消息` : "暂无未读消息"}" aria-label="${unread ? `通知，${unread} 条未读消息` : "通知，无未读消息"}" data-action="show-notifications">${icon("bell", "!")}${unreadBadge}</button><button class="avatar avatar-button" type="button" data-nav="settings" title="个人设置" aria-label="打开个人设置">${fxEscape(accountName)}</button><button class="button small" type="button" data-action="fx-logout">退出登录</button>`;
    return `<header class="global-bar"><div class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="brand-name">溯源质控码平台</span></div><div class="top-actions">${accountActions}</div></header>`;
  };

  sidebar = function (portal) {
    const pageKey = portal === "ops" ? state.opsPage : state.customerPage;
    const navPageKey = pageKey === "review-detail" ? "reviews" : pageKey === "customer-detail" ? "customers" : pageKey === "order-detail" ? "orders" : pageKey;
    const counts = portal === "ops" ? { "bind-requests": bindRequests.filter(item => item.status === "待审批").length, reviews: products.filter(item => item.status === "待审核").length, withdrawals: withdrawals.filter(item => item.status === "待审批").length, messages: fxUnreadMessageCount("ops") } : { messages: fxUnreadMessageCount("customer") };
    const navButton = ([key, iconName, label]) => `<button type="button" class="nav-item ${navPageKey === key ? "active" : ""}" data-nav="${key}" title="${label}">${icon(iconName, "·")}<span>${label}</span>${counts[key] ? `<span class="nav-count">${counts[key]}</span>` : ""}</button>`;
    const navMarkup = nav[portal].map(item => navButton(item)).join("");
    return `<aside class="sidebar ${state.sidebarCollapsed ? "is-collapsed" : ""}" aria-label="${portalLabels[portal]}导航"><div class="sidebar-head"><div class="nav-label">工作台</div><button type="button" class="sidebar-toggle" data-action="toggle-sidebar" aria-label="${state.sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}" title="${state.sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}">${icon(state.sidebarCollapsed ? "panel-left-open" : "panel-left-close", state.sidebarCollapsed ? "›" : "‹")}</button></div><nav class="nav-list">${navMarkup}</nav></aside>`;
  };

  function fxOverviewMetricStrip(items) {
    return `<section class="metric-strip metric-strip-${items.length}" aria-label="数据概览">${items.map(item => `<button type="button" class="metric metric-link" ${item.nav ? `data-nav="${item.nav}"` : `data-action="${item.action}"`} ${item.status ? `data-status="${item.status}"` : ""} aria-label="${fxEscape(item.label)}，点击查看详情"><div class="metric-label">${item.icon ? icon(item.icon, "·") : ""}${fxEscape(item.label)}</div><div class="metric-value">${item.value}</div></button>`).join("")}</section>`;
  }
  opsOverview = function () {
    const totalCodes = orders.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const activeCodes = orders.reduce((sum, item) => sum + Number(item.active || 0), 0);
    const pendingReviews = products.filter(item => item.status === "待审核");
    const pendingWithdrawals = withdrawals.filter(item => item.status === "待审批");
    const todoItems = [
      ...pendingReviews.slice(0, 3).map(item => `<button class="list-item list-button" data-action="open-review" data-id="${item.id}"><span class="list-icon">${icon("clipboard-check", "✓")}</span><div class="list-content"><div class="list-title">${fxEscape(item.name)}</div><div class="list-meta">${fxEscape(item.company)} · 等待审核</div></div></button>`),
      ...pendingWithdrawals.slice(0, 2).map(item => `<button class="list-item list-button" data-nav="withdrawals"><span class="list-icon">${icon("rotate-ccw", "↻")}</span><div class="list-content"><div class="list-title">${fxEscape(item.product)}</div><div class="list-meta">${fxEscape(item.customer)} · 撤回待审批</div></div></button>`),
    ].join("") || `<div class="empty"><p>暂无待处理事项</p></div>`;
    const recentOrders = [...orders].sort((left, right) => String(right.createdAt || right.created || "").localeCompare(String(left.createdAt || left.created || ""))).slice(0, 6).map(item => `<tr><td><button class="text-action mono" data-action="fx-order-detail" data-no="${fxEscape(item.no)}">${fxEscape(item.no)}</button></td><td><button class="text-action" data-action="fx-find-customer-account" data-customer="${fxEscape(item.customer)}">${fxEscape(item.customer)}</button></td><td>${formatNumber(item.total)}</td><td>${formatNumber(item.active)}</td></tr>`).join("") || fxEmpty(4, "暂无订单");
    return `<div class="page">${pageHeader("运营概览", `${fxToday} · 平台实时业务状态`, `<button class="button primary" data-action="go-reviews">${icon("clipboard-check", "✓")}处理待审核</button>`)}${fxOverviewMetricStrip([{ label: "订单总量", value: formatNumber(orders.length), note: "全部订单", icon: "receipt-text", nav: "orders" }, { label: "码段总量", value: formatNumber(totalCodes), note: "订单额度", icon: "qr-code", nav: "orders" }, { label: "已激活", value: formatNumber(activeCodes), note: totalCodes ? `${Math.round(activeCodes / totalCodes * 100)}%` : "0%", icon: "circle-check", up: true, nav: "orders" }, { label: "未激活", value: formatNumber(totalCodes - activeCodes), note: "可用余额", icon: "circle-dashed", nav: "orders" }])}<div class="section-row"><section class="panel"><div class="panel-header"><h2>最近订单</h2><button class="button small" data-action="go-orders">查看全部</button></div><div class="table-scroll"><table><thead><tr><th>订单号</th><th>客户</th><th>码量</th><th>已激活</th></tr></thead><tbody>${recentOrders}</tbody></table></div></section><section class="panel"><div class="panel-header"><h2>待办事项</h2></div><div class="panel-body list">${todoItems}</div></section></div></div>`;
  };

  qrMarkup = function (seed = "preview", options = {}) {
    const target = new URL("pages/scan/preview.html?preview=1", document.baseURI).href;
    return `<div class="qr-preview qr-svg-preview">${fxQrSvg(seed, target, options)}</div>`;
  };

  function fxFilterInput(id, value, placeholder, resetContext = "") {
    const context = resetContext || ({ "fx-operator-search": "operators", "fx-customer-search": "customers", "fx-order-search": "orders", "fx-bind-request-search": "bind-requests", "fx-review-search": "reviews", "fx-withdrawal-search": "withdrawals", "fx-message-search": "messages", "fx-customer-product-search": "customer-products" })[id] || "";
    return `<div class="search-field">${icon("search", "⌕")}<input id="${id}" value="${fxEscape(value)}" placeholder="${placeholder}"></div>${context ? `<button type="button" class="button small list-reset-button" data-action="fx-reset-list" data-reset-context="${context}">${icon("rotate-ccw", "↻")}重置</button>` : ""}`;
  }
  function fxEmpty(colspan, text) { return `<tr><td colspan="${colspan}"><div class="empty"><div><div class="empty-icon">${icon("search-x", "×")}</div><h3>${text}</h3><p>调整筛选条件后重试。</p></div></div></td></tr>`; }

  function fxTableSelectHeader(label, filter, options, current) {
    const optionMarkup = options.map(value => `<option value="${fxEscape(value)}" ${current === value ? "selected" : ""}>${fxEscape(value)}</option>`).join("");
    const active = !String(current).startsWith("全部");
    return `<div class="table-heading"><span>${label}</span><label class="header-filter-control ${active ? "active" : ""}" title="筛选${label}">${icon("list-filter", "≡")}<select data-table-filter="${filter}" aria-label="筛选${label}">${optionMarkup}</select></label></div>`;
  }
  function fxCombinedPendingProducts(orderNo, excludeProductId = null) {
    return products.filter(product =>
      product.status === "待审核" &&
      product.applicationType === "新建产品并绑定" &&
      product.requestedOrderNo === orderNo &&
      Number(product.id) !== Number(excludeProductId)
    );
  }
  function fxOrderPendingRequests(orderNo, excludeProductId = null) {
    const existingRequests = bindRequests.filter(request => request.orderNo === orderNo && request.status === "待审批");
    const combinedRequests = fxCombinedPendingProducts(orderNo, excludeProductId).map(product => ({
      id: `product-${product.id}`,
      source: "product-review",
      productId: product.id,
      orderNo,
      customer: product.company,
      product: product.name,
      batch: product.batch,
      range: product.requestedRange || "",
      amount: Number(product.requestedAmount || 0),
      status: "待审批",
      time: product.submitted || "",
    }));
    return [...existingRequests, ...combinedRequests];
  }
  function fxOrderPendingAmount(orderOrNo, excludeProductId = null) {
    const orderNo = typeof orderOrNo === "string" ? orderOrNo : orderOrNo?.no;
    return fxOrderPendingRequests(orderNo, excludeProductId).reduce((sum, request) => sum + Number(request.amount || 0), 0);
  }
  function fxOrderAvailableAmount(order, excludeProductId = null) {
    return Math.max(0, Number(order?.total || 0) - Number(order?.active || 0) - fxOrderPendingAmount(order, excludeProductId));
  }
  function fxSortValue(item, key) {
    if (key === "pending") return fxOrderPendingAmount(item);
    if (key === "remaining") return fxOrderAvailableAmount(item);
    return Number(item[key] || 0);
  }
  function fxNewestRows(rows, getTime) {
    return rows.map((item, index) => ({ item, index, time: /^\d{4}-\d{2}-\d{2}/.test(String(getTime(item) || "")) ? String(getTime(item)) : "" })).sort((left, right) => right.time.localeCompare(left.time) || left.index - right.index).map(entry => entry.item);
  }
  function fxSortedRows(rows, scope, defaultTime) {
    const key = state[`${scope}SortKey`]; const direction = state[`${scope}SortDirection`];
    if (!key) return defaultTime ? fxNewestRows(rows, defaultTime) : rows;
    return [...rows].sort((left, right) => (fxSortValue(left, key) - fxSortValue(right, key)) * (direction === "desc" ? -1 : 1));
  }
  function fxSortHeader(label, scope, key, options = {}) {
    const active = state[`${scope}SortKey`] === key; const direction = state[`${scope}SortDirection`];
    const iconName = active ? direction === "desc" ? "arrow-down" : "arrow-up" : "arrow-up-down";
    const directionText = active ? direction === "desc" ? "倒序" : "正序" : "未排序";
    return `<div class="table-heading ${options.className || ""}"><span>${options.labelMarkup || label}</span><button type="button" class="header-filter-control header-sort-button ${active ? "active" : ""}" data-action="fx-sort-${scope}s" data-sort="${key}" aria-label="${label}${directionText}" aria-pressed="${active}" title="${label}：${directionText}">${icon(iconName, active ? direction === "desc" ? "↓" : "↑" : "↕")}</button></div>`;
  }
  function fxToggleSort(scope, key) {
    const sortKey = `${scope}SortKey`; const directionKey = `${scope}SortDirection`;
    if (state[sortKey] === key) state[directionKey] = state[directionKey] === "asc" ? "desc" : "asc";
    else { state[sortKey] = key; state[directionKey] = "asc"; }
  }

  function fxOperatorStatusHeader() {
    return fxTableSelectHeader("状态", "operatorStatus", ["全部状态", "启用", "禁用"], state.operatorStatus);
  }
  function fxOperatorLoginHeader() {
    const active = Boolean(state.operatorDateFrom || state.operatorDateTo);
    return `<div class="table-heading"><span>最近登录</span><button type="button" class="header-filter-control operator-date-trigger date-filter-trigger ${active ? "active" : ""}" data-action="fx-open-operator-calendar" aria-label="筛选最近登录时间" aria-expanded="${state.operatorCalendarOpen}" title="筛选最近登录时间">${icon("calendar-range", "▦")}</button></div>`;
  }
  function fxOrderCreatedHeader() {
    const active = Boolean(state.orderFrom || state.orderTo);
    return `<div class="table-heading"><span>创建时间</span><button type="button" class="header-filter-control order-date-trigger date-filter-trigger ${active ? "active" : ""}" data-action="fx-open-order-calendar" aria-label="筛选创建时间" aria-expanded="${state.orderCalendarOpen}" title="筛选创建时间">${icon("calendar-range", "▦")}</button></div>`;
  }

  function fxOpsOperators() {
    const rows = fxFilteredOperators();
    return `<div class="page">${pageHeader("运营账号管理", "所有运营账号权限一致，可维护登录状态与密码", `<button class="button primary" data-action="fx-new-operator">${icon("plus", "+")}新建运营账号</button>`)}<div class="toolbar"><div class="filters">${fxFilterInput("fx-operator-search", state.operatorFilter, "搜索账号或姓名", "operators")}</div></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>姓名</th><th>账号</th><th>${fxOperatorStatusHeader()}</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(item => `<tr><td><div class="cell-main">${fxEscape(item.name)}</div></td><td class="mono">${fxEscape(item.account)}</td><td>${status(item.status)}</td><td><div class="table-actions"><button class="text-action" data-action="fx-edit-operator" data-id="${item.id}">编辑</button>${fxIsCurrentOperator(item) ? `<span class="status neutral current-account-label" title="当前账号请在个人设置中修改密码，且不能更改自身状态">当前账号</span>` : `<button class="text-action ${item.status === "启用" ? "danger-text" : "success-text"}" data-action="fx-toggle-operator" data-id="${item.id}">${item.status === "启用" ? "禁用" : "启用"}</button>`}</div></td></tr>`).join("") : fxEmpty(4, "未找到运营账号")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  }

  function fxCustomerCodeSummary(customerName) {
    const customerOrders = orders.filter(order => order.customer === customerName);
    return {
      total: customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      active: customerOrders.reduce((sum, order) => sum + Number(order.active || 0), 0),
      pending: customerOrders.reduce((sum, order) => sum + fxOrderPendingAmount(order), 0),
      available: customerOrders.reduce((sum, order) => sum + fxOrderAvailableAmount(order), 0),
    };
  }

  opsCustomers = function () {
    const term = state.customerFilter.trim().toLowerCase(); let rows = customers.filter(item => (!term || `${item.name} ${item.account} ${item.phone}`.toLowerCase().includes(term)) && (state.customerStatus === "全部状态" || item.status === state.customerStatus)); rows = fxSortedRows(rows, "customer");
    return `<div class="page">${pageHeader("客户列表", "管理客户资料、登录状态与订单码量", `<button class="button primary" data-action="fx-new-customer">${icon("plus", "+")}新建客户</button>`)}<div class="toolbar"><div class="filters">${fxFilterInput("fx-customer-search", state.customerFilter, "搜索客户名称、账号或电话", "customers")}</div><button class="button" data-action="fx-export-customers">${icon("download", "↓")}导出</button></div><div class="table-shell"><div class="table-scroll"><table class="customer-account-table"><thead><tr><th>客户名称</th><th>账号</th><th>联系电话</th><th>${fxTableSelectHeader("状态", "customerStatus", ["全部状态", "启用", "禁用"], state.customerStatus)}</th><th>总量</th><th>已激活</th><th>绑定申请中</th><th>剩余可用</th><th class="action-column">账号操作</th></tr></thead><tbody>${rows.length ? rows.map(item => { const summary = fxCustomerCodeSummary(item.name); return `<tr><td><div class="cell-main">${fxEscape(item.name)}</div></td><td class="mono">${fxEscape(item.account)}</td><td>${fxEscape(item.phone)}</td><td>${status(item.status)}</td><td>${formatNumber(summary.total)}</td><td>${formatNumber(summary.active)}</td><td>${formatNumber(summary.pending)}</td><td>${formatNumber(summary.available)}</td><td class="action-column"><div class="table-actions"><button class="text-action" data-action="fx-view-customer-detail" data-id="${item.id}">详情</button><button class="text-action" data-action="fx-edit-customer" data-id="${item.id}">编辑</button><button class="text-action" data-action="fx-customer-create-order" data-id="${item.id}">创建订单</button><button class="text-action ${item.status === "启用" ? "danger-text" : "success-text"}" data-action="fx-toggle-customer" data-id="${item.id}">${item.status === "启用" ? "禁用" : "启用"}</button></div></td></tr>`; }).join("") : fxEmpty(9, "未找到客户")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  function fxCustomerPickerLabel(item) { return item.name; }
  function fxRecentCustomers(limit = 5) {
    const seen = new Set();
    const recent = [];
    [...orders].sort((left, right) => String(right.createdAt || right.created || "").localeCompare(String(left.createdAt || left.created || ""))).forEach(order => {
      const customer = customers.find(item => item.name === order.customer && item.status === "启用");
      if (customer && !seen.has(customer.id)) { seen.add(customer.id); recent.push(customer); }
    });
    return recent.slice(0, limit);
  }
  function fxCustomerPickerOptions(prefix, rawTerm = "") {
    const term = String(rawTerm || "").trim().toLowerCase();
    const matches = term
      ? customers.filter(item => item.status === "启用" && `${item.name} ${item.account}`.toLowerCase().includes(term)).slice(0, 10)
      : fxRecentCustomers();
    if (!matches.length) return `<div class="customer-picker-empty">${term ? "未找到客户账号" : "暂无最近使用的客户账号"}</div>`;
    const caption = term ? "搜索结果" : "最近使用";
    return `<div class="customer-picker-caption">${caption}</div>${matches.map(item => `<button type="button" class="customer-picker-option" role="option" data-action="fx-select-customer" data-prefix="${prefix}" data-id="${item.id}"><span class="customer-picker-option-copy"><strong>${fxEscape(item.name)}</strong></span><span class="customer-picker-account mono">${fxEscape(item.account)}</span></button>`).join("")}`;
  }
  function fxCustomerPicker(prefix, selectedId = null) {
    const selected = customers.find(item => item.id === Number(selectedId) && item.status === "启用");
    return `<div class="field full customer-picker"><label class="required" for="${prefix}-search">客户名称</label><div class="customer-picker-control"><input id="${prefix}-search" class="customer-picker-search" type="search" value="${fxEscape(selected ? fxCustomerPickerLabel(selected) : "")}" placeholder="搜索客户名称" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="${prefix}-options" aria-expanded="false"><div id="${prefix}-options" class="customer-picker-options" role="listbox">${fxCustomerPickerOptions(prefix)}</div></div><input id="${prefix}" type="hidden" value="${selected?.id || ""}"></div>`;
  }
  function fxQrRangeData(rawAmount = state.qrDraft.amount) {
    const customer = customers.find(item => item.id === Number(state.qrDraft.customerId) && item.status === "启用");
    const amount = Math.max(1, Math.trunc(Number(rawAmount) || 1));
    if (!customer) return { customer: null, amount, range: "选择客户后生成" };
    const prefix = fxOrderPrefix(customer);
    const used = orders.filter(order => order.customer === customer.name).reduce((sum, order) => sum + order.total, 0);
    return { customer, amount, range: `${fxSerial(prefix, used + 1)} – ${fxSerial(prefix, used + amount)}` };
  }

  function fxQrStylePreviewContent() {
    return `${qrMarkup("order-style-preview", { style: state.qrDraft.style, size: state.qrDraft.size, label: "产品名称：示例产品" })}<div class="qr-style-preview-meta"><strong>${fxEscape(state.qrDraft.style)}</strong><span>${fxEscape(state.qrDraft.size)}</span></div>`;
  }

  function fxRefreshQrStylePreview() {
    const preview = document.getElementById("fx-qr-style-preview");
    if (preview) preview.innerHTML = fxQrStylePreviewContent();
  }

  qrStepContent = function () {
    const { customer, amount, range } = fxQrRangeData();
    if (state.generatedOrderNo) {
      const order = orders.find(item => item.no === state.generatedOrderNo);
      return `<div class="result-center"><div class="success-mark">${icon("check", "✓", "icon-lg")}</div><h2>订单与二维码已生成</h2><p class="muted">订单 ${order?.no || "-"}，共 ${formatNumber(order?.total || 0)} 枚。</p></div>`;
    }
    return `<div class="order-create-form"><section class="order-create-section"><h2>客户信息</h2><div class="form-grid">${fxCustomerPicker("fx-qr-customer", state.qrDraft.customerId)}</div></section><section class="order-create-section"><h2>订单信息</h2><div class="form-grid"><div class="field qr-order-field"><label class="required" for="fx-qr-amount">生成数量</label><input id="fx-qr-amount" type="number" min="1" step="1" value="${amount}"></div><div class="field qr-order-field"><label for="fx-qr-note">订单备注</label><input id="fx-qr-note" value="${fxEscape(state.qrDraft.note)}" placeholder="例如：7 月第二批包装"></div><div class="field full"><label for="fx-qr-range-preview">序列号预览</label><input id="fx-qr-range-preview" class="mono immutable-input" value="${range}" readonly aria-readonly="true" aria-live="polite"></div></div></section><section class="order-create-section"><h2>二维码样式</h2><div class="form-grid"><div class="field"><label class="required" for="fx-qr-style">二维码样式</label><select id="fx-qr-style">${["标准方形 · 黑白", "圆角方形 · 黑白", "带产品名称留白"].map(value => `<option ${value === state.qrDraft.style ? "selected" : ""}>${value}</option>`).join("")}</select></div><div class="field"><label class="required" for="fx-qr-size">印刷尺寸</label><select id="fx-qr-size">${["25 × 25 mm", "30 × 30 mm", "40 × 40 mm"].map(value => `<option ${value === state.qrDraft.size ? "selected" : ""}>${value}</option>`).join("")}</select></div><div class="field full"><label>二维码样式预览</label><div id="fx-qr-style-preview" class="qr-style-preview" aria-live="polite">${fxQrStylePreviewContent()}</div></div></div></section></div>`;
  };

  opsCodes = function () {
    return `<div class="page">${pageHeader("创建订单", "填写订单信息并生成连续二维码")}<section class="wizard-shell"><div class="wizard-content">${qrStepContent()}</div><div class="wizard-actions"><div></div><div>${state.generatedOrderNo ? `<button class="button" data-action="fx-view-generated-order">查看该订单</button><button class="button" data-action="fx-download-qr">${icon("download", "↓")}下载压缩包</button><button class="button primary" data-action="fx-finish-order">完成</button>` : `<button class="button primary" data-action="fx-create-order">${icon("receipt-text", "+")}创建订单</button>`}</div></div></section></div>`;
  };

  opsOrders = function () {
    const term = state.orderFilter.trim().toLowerCase(); let rows = orders.filter(item => (!term || `${item.customer} ${item.no} ${item.note || ""}`.toLowerCase().includes(term)) && (!state.orderFrom || item.created >= state.orderFrom) && (!state.orderTo || item.created <= state.orderTo)); rows = fxSortedRows(rows, "order", item => item.createdAt || item.created);
    return `<div class="page">${pageHeader("订单码量台账", "核对订单序列号范围、码量余额与每批激活记录", `<button class="button primary" data-action="go-codes">${icon("qr-code", "▦")}创建订单</button><button class="button" data-action="fx-export-orders">${icon("download", "↓")}导出台账</button>`)}<div class="toolbar"><div class="filters">${fxFilterInput("fx-order-search", state.orderFilter, "客户名称、订单号或备注")}</div></div><div class="table-shell"><div class="table-scroll"><table class="order-table"><thead><tr><th>订单号</th><th>客户名称</th><th>${fxOrderCreatedHeader()}</th><th>序列号范围</th><th>${fxSortHeader("总量", "order", "total")}</th><th>${fxSortHeader("已激活", "order", "active")}</th><th>${fxSortHeader("绑定申请中", "order", "pending")}</th><th>${fxSortHeader("剩余可用", "order", "remaining")}</th><th class="action-column">操作</th></tr></thead><tbody>${rows.length ? rows.map(item => { const pendingRequests = fxOrderPendingRequests(item.no); const pending = fxOrderPendingAmount(item); const remaining = fxOrderAvailableAmount(item); const pendingCell = pendingRequests.length ? `<button class="text-action" data-action="fx-view-order-bind-requests" data-no="${fxEscape(item.no)}" aria-label="查看绑定申请中数量 ${formatNumber(pending)}">${formatNumber(pending)}</button>` : "0"; return `<tr class="${state.highlightOrderNo === item.no ? "order-focus-row" : ""}" data-order-no="${fxEscape(item.no)}"><td><div class="cell-main mono">${item.no}</div></td><td><button class="text-action" data-action="fx-find-customer-account" data-customer="${fxEscape(item.customer)}">${fxEscape(item.customer)}</button></td><td>${fxEscape(item.createdAt)}</td><td class="mono">${item.range}</td><td>${formatNumber(item.total)}</td><td>${formatNumber(item.active)}</td><td>${pendingCell}</td><td>${formatNumber(remaining)}</td><td class="action-column"><div class="table-actions">${remaining > 0 ? `<button class="text-action" data-action="fx-ops-bind-order" data-no="${fxEscape(item.no)}">绑定产品</button>` : ""}<button class="text-action" data-action="fx-order-detail" data-no="${fxEscape(item.no)}">详情</button></div></td></tr>`; }).join("") : fxEmpty(9, "未找到订单")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  function opsBindRequests() {
    const term = state.bindRequestFilter.trim().toLowerCase();
    const rows = fxNewestRows(bindRequests.filter(item =>
      (!term || `${item.orderNo} ${item.customer} ${item.product} ${item.batch}`.toLowerCase().includes(term)) &&
      (state.bindRequestStatus === "全部状态" || item.status === state.bindRequestStatus) &&
      fxMatchesCustomerDate(item.time, "bindRequest")
    ), item => item.time);
    return `<div class="page">${pageHeader("绑定审核", "审核客户提交的产品与订单码段绑定申请")}<div class="toolbar"><div class="filters">${fxFilterInput("fx-bind-request-search", state.bindRequestFilter, "客户、订单或产品", "bind-requests")}</div></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>产品名称</th><th>产品批次</th><th>客户名称</th><th>订单号</th><th>申请数量</th><th>${fxCustomerDateHeader("申请时间", "bindRequest")}</th><th>${fxTableSelectHeader("状态", "bindRequestStatus", ["全部状态", "待审批", "已通过", "已驳回"], state.bindRequestStatus)}</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(request => `<tr><td>${fxEscape(request.product)}</td><td class="mono">${fxEscape(request.batch || "—")}</td><td>${fxEscape(request.customer)}</td><td><button class="text-action mono" data-action="fx-order-detail" data-no="${fxEscape(request.orderNo)}">${fxEscape(request.orderNo)}</button></td><td>${formatNumber(request.amount)}</td><td>${fxEscape(request.time || "—")}</td><td>${status(request.status)}</td><td class="action-column"><div class="table-actions">${request.status === "待审批" ? `<button class="text-action success-text" data-action="fx-approve-bind-request" data-id="${request.id}">通过</button><button class="text-action danger-text" data-action="fx-reject-bind-request" data-id="${request.id}">驳回</button>` : `<button class="text-action" data-action="fx-view-bind-request" data-id="${request.id}">查看</button>`}</div></td></tr>`).join("") : fxEmpty(8, "未找到绑定申请")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  }

  function fxFilteredReviews() {
    const term = state.filter.trim().toLowerCase();
    return fxNewestRows(products.filter(item => ["待审核", "已激活", "已驳回"].includes(item.status) && (!term || `${item.name} ${item.company} ${item.batch}`.toLowerCase().includes(term)) && (state.reviewStatus === "全部状态" || item.status === state.reviewStatus) && (state.productCategory === "全部大类" || item.category === state.productCategory) && fxMatchesCustomerDate(item.submitted, "review")), item => item.submitted);
  }
  function fxBindProductPicker(prefix, activated, allowCreate = false, selectedId = null) {
    const selected = activated.find(item => item.id === Number(selectedId));
    return `<div class="field full bind-product-picker" data-allow-create="${allowCreate}"><label class="required" for="${prefix}-search">产品名称</label><input id="${prefix}-search" class="bind-product-search" type="search" value="${fxEscape(selected?.name || "")}" placeholder="搜索产品名称或产品批次" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="${prefix}-options" aria-expanded="false"><div id="${prefix}-options" class="bind-product-options" role="listbox">${fxBindProductPickerOptions(prefix, activated, "", allowCreate)}</div><input id="${prefix}" type="hidden" value="${selected?.id || ""}"></div><div class="field full"><label for="${prefix}-batch">产品批次</label><input id="${prefix}-batch" class="immutable-input" value="${fxEscape(selected?.batch || "")}" placeholder="选择产品后自动获取" readonly aria-readonly="true"></div>`;
  }
  function fxBindProductPickerOptions(prefix, activated, rawTerm = "", allowCreate = false) {
    const term = String(rawTerm || "").trim().toLowerCase();
    const matches = (term ? activated.filter(item => `${item.name} ${item.batch || ""}`.toLowerCase().includes(term)) : activated).slice(0, term ? 10 : 5);
    const caption = matches.length ? `<div class="bind-product-caption">${term ? "搜索结果" : "可选产品"}</div>` : `<div class="bind-product-empty">${term ? "未找到匹配产品" : "暂无可选产品"}</div>`;
    const options = matches.map(item => `<button type="button" class="bind-product-option" role="option" data-action="fx-select-bind-product" data-prefix="${prefix}" data-id="${item.id}" data-name="${fxEscape(item.name)}" data-batch="${fxEscape(item.batch || "—")}"><span>${fxEscape(item.name)}</span><small>${fxEscape(item.batch || "—")}</small></button>`).join("");
    const createOption = allowCreate ? `<button type="button" class="bind-product-option create-option" role="option" data-action="fx-customer-new-product-for-order"><span>＋ 新建产品并绑定</span></button>` : "";
    return `${caption}${options}${createOption}`;
  }
  opsReviews = function () {
    const rows = fxFilteredReviews();
    return `<div class="page">${pageHeader("产品审核", "审核客户已提交的产品资料，并维护已激活产品内容")}<div class="toolbar"><div class="filters">${fxFilterInput("fx-review-search", state.filter, "产品、客户或批次")}</div><button class="button" data-action="fx-export-products">${icon("download", "↓")}导出</button></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>产品名称</th><th>产品批次</th><th>${fxTableSelectHeader("产品大类", "productCategory", ["全部大类", "农产品", "养殖品", "加工食品", "工业品", "医疗卫生用品"], state.productCategory)}</th><th>客户名称</th><th>${fxCustomerDateHeader("产品提交时间", "review")}</th><th>${fxTableSelectHeader("状态", "reviewStatus", ["全部状态", "待审核", "已激活", "已驳回"], state.reviewStatus)}</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(item => { const reviewAction = `<button class="text-action" data-action="open-review" data-id="${item.id}">${item.status === "待审核" ? "审核" : "查看"}</button>`; const editAction = ["待审核", "已激活"].includes(item.status) ? `<button class="text-action" data-action="fx-ops-edit-product" data-id="${item.id}">编辑</button>` : ""; return `<tr><td><div class="cell-main">${fxEscape(item.name)}</div></td><td class="mono">${item.batch}</td><td>${item.category}</td><td>${fxEscape(item.company)}</td><td>${fxEscape(item.submitted || "—")}</td><td>${status(item.status)}</td><td class="action-column"><div class="table-actions">${reviewAction}${editAction}</div></td></tr>`; }).join("") : fxEmpty(7, "未找到产品")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  opsWithdrawals = function () {
    const term = state.withdrawalFilter.trim().toLowerCase();
    const rows = fxNewestRows(withdrawals.map((item, index) => ({ ...item, index })).filter(item => (!term || `${item.no} ${item.product} ${item.customer}`.toLowerCase().includes(term)) && (state.withdrawalStatus === "全部状态" || item.status === state.withdrawalStatus) && fxMatchesCustomerDate(item.time, "opsWithdrawal")), item => item.time);
    return `<div class="page">${pageHeader("撤回审核", "审批已激活产品的全量撤回，处理结果自动通知客户")}<div class="toolbar"><div class="filters">${fxFilterInput("fx-withdrawal-search", state.withdrawalFilter, "申请编号、产品或客户")}</div></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>申请编号</th><th>产品名称</th><th>产品批次</th><th>客户名称</th><th>撤回原因</th><th>${fxCustomerDateHeader("申请时间", "opsWithdrawal")}</th><th>${fxTableSelectHeader("状态", "withdrawalStatus", ["全部状态", "待审批", "已通过", "已驳回"], state.withdrawalStatus)}</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(item => { const product = products.find(row => row.name === item.product && row.company === item.customer && (!item.batch || row.batch === item.batch)); return `<tr><td class="mono">${item.no}</td><td>${fxEscape(item.product)}</td><td class="mono">${fxEscape(item.batch || product?.batch || "—")}</td><td>${fxEscape(item.customer)}</td><td>${fxEscape(item.reason)}</td><td>${fxEscape(item.time || "—")}</td><td>${status(item.status)}</td><td>${item.status === "待审批" ? `<button class="text-action success-text" data-action="fx-approve-withdrawal" data-index="${item.index}">通过</button><button class="text-action danger-text" data-action="fx-reject-withdrawal" data-index="${item.index}">驳回</button>` : `<button class="text-action" data-action="fx-view-withdrawal" data-index="${item.index}">查看</button>`}</td></tr>`; }).join("") : fxEmpty(8, "未找到撤回申请")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  function fxMessageHeader(label, filter, customerScope = false) {
    const current = fxMessageFilterValue(filter);
    const active = !String(current).startsWith("全部");
    if (filter === "time") return `<div class="table-heading"><span>${label}</span><button type="button" class="header-filter-control message-date-trigger date-filter-trigger ${active ? "active" : ""}" data-action="fx-open-message-calendar" aria-label="筛选${label}" aria-expanded="${state.messageCalendarOpen}" title="筛选${label}">${icon("calendar-range", "▦")}</button></div>`;
    const options = fxMessageFilterOptions(filter, customerScope).map(value => `<option value="${fxEscape(value)}" ${value === current ? "selected" : ""}>${fxEscape(value)}</option>`).join("");
    return `<div class="table-heading"><span>${label}</span><label class="header-filter-control ${active ? "active" : ""}" title="筛选${label}">${icon("list-filter", "≡")}<select data-message-filter="${filter}" aria-label="筛选${label}">${options}</select></label></div>`;
  }
  function fxCustomerDatePrefix(context) {
    return { order: "customerOrder", product: "customerProduct", review: "review", withdrawal: "customerWithdrawal", opsWithdrawal: "withdrawal", bindRequest: "bindRequest" }[context] || "customerOrder";
  }
  function fxCustomerDateRange(context, draft = false) {
    const prefix = fxCustomerDatePrefix(context); const infix = draft ? "DateDraft" : "Date";
    return { from: state[`${prefix}${infix}From`] || "", to: state[`${prefix}${infix}To`] || "" };
  }
  function fxSetCustomerDateRange(context, draft, from, to) {
    const prefix = fxCustomerDatePrefix(context); const infix = draft ? "DateDraft" : "Date";
    state[`${prefix}${infix}From`] = from; state[`${prefix}${infix}To`] = to;
  }
  function fxCustomerDateHeader(label, context) {
    const range = fxCustomerDateRange(context); const active = Boolean(range.from || range.to); const open = state.customerCalendarOpen && state.customerCalendarContext === context;
    return `<div class="table-heading"><span>${label}</span><button type="button" class="header-filter-control date-filter-trigger ${active ? "active" : ""}" data-action="fx-open-customer-calendar" data-date-context="${context}" aria-label="筛选${label}" aria-expanded="${open}" title="筛选${label}">${icon("calendar-range", "▦")}</button></div>`;
  }
  function fxMatchesCustomerDate(value, context) {
    const date = String(value || "").slice(0, 10); const range = fxCustomerDateRange(context);
    return (!range.from || date >= range.from) && (!range.to || date <= range.to);
  }
  function fxDateValue(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
  function fxMonthValue(value) { return `${String(value).slice(0, 7)}-01`; }
  function fxShiftMonth(value, amount) {
    const date = new Date(`${fxMonthValue(value)}T00:00:00`); date.setMonth(date.getMonth() + amount);
    return fxDateValue(new Date(date.getFullYear(), date.getMonth(), 1));
  }
  function fxMonthDistance(left, right) {
    const start = new Date(`${fxMonthValue(left)}T00:00:00`); const end = new Date(`${fxMonthValue(right)}T00:00:00`);
    return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  }
  function fxCalendarMonthKeys(scope) {
    if (scope === "operator") return ["operatorCalendarLeftMonth", "operatorCalendarRightMonth"];
    if (scope === "order") return ["orderCalendarLeftMonth", "orderCalendarRightMonth"];
    if (scope === "customer") return ["customerCalendarLeftMonth", "customerCalendarRightMonth"];
    return ["messageCalendarLeftMonth", "messageCalendarRightMonth"];
  }
  function fxSetCalendarMonthsFromRange(scope, from, to) {
    const [leftKey, rightKey] = fxCalendarMonthKeys(scope); const left = from ? fxMonthValue(from) : "2026-06-01";
    const endMonth = to ? fxMonthValue(to) : ""; state[leftKey] = left; state[rightKey] = endMonth > left ? endMonth : fxShiftMonth(left, 1);
  }
  function fxMoveCalendarPanel(scope, side, amount) {
    const [leftKey, rightKey] = fxCalendarMonthKeys(scope); let left = state[leftKey]; let right = state[rightKey];
    if (side === "left") { left = fxShiftMonth(left, amount); if (left >= right) right = fxShiftMonth(left, 1); }
    else { right = fxShiftMonth(right, amount); if (right <= left) left = fxShiftMonth(right, -1); }
    state[leftKey] = left; state[rightKey] = right;
  }
  function fxFocusCalendarCurrentMonth(scope, side) {
    const [leftKey, rightKey] = fxCalendarMonthKeys(scope); let left = state[leftKey]; let right = state[rightKey];
    const current = "2026-07-01"; const gap = Math.max(1, fxMonthDistance(left, right));
    if (side === "left") { if (left === current) return; left = current; if (right <= left) right = fxShiftMonth(left, gap); }
    else { if (right === current) return; right = current; if (left >= right) left = fxShiftMonth(right, -gap); }
    state[leftKey] = left; state[rightKey] = right;
  }
  function fxCalendarMonthMarkup(monthDate, scope = "message", side = "left") {
    const year = monthDate.getFullYear(); const month = monthDate.getMonth();
    const currentMonth = year === 2026 && month === 6;
    const operator = scope === "operator"; const order = scope === "order"; const customer = scope === "customer"; const actionPrefix = operator ? "fx-operator-calendar" : order ? "fx-order-calendar" : customer ? "fx-customer-calendar" : "fx-message-calendar";
    const first = new Date(year, month, 1); const gridStart = new Date(year, month, 1 - first.getDay());
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart); date.setDate(gridStart.getDate() + index);
      const value = fxDateValue(date); const outside = date.getMonth() !== month; const today = value === "2026-07-29";
      const customerRange = customer ? fxCustomerDateRange(state.customerCalendarContext, true) : null;
      const from = operator ? state.operatorDateDraftFrom : order ? state.orderDateDraftFrom : customer ? customerRange.from : state.messageDateDraftFrom;
      const to = operator ? state.operatorDateDraftTo : order ? state.orderDateDraftTo : customer ? customerRange.to : state.messageDateDraftTo;
      const selectedStart = value === from; const selectedEnd = value === (to || from);
      const inRange = Boolean(from && to && value > from && value < to);
      return `<button type="button" class="calendar-day ${outside ? "outside" : ""} ${today ? "today" : ""} ${inRange ? "in-range" : ""} ${selectedStart ? "range-start" : ""} ${selectedEnd ? "range-end" : ""}" data-action="${actionPrefix}-day" data-date="${value}" aria-label="${value}" aria-pressed="${selectedStart || selectedEnd}">${date.getDate()}</button>`;
    }).join("");
    return `<section class="calendar-month" data-calendar-side="${side}"><header class="calendar-month-header"><h3>${year} 年 ${month + 1} 月</h3><div><button type="button" data-action="${actionPrefix}-prev" data-calendar-side="${side}" aria-label="上一个月">${icon("chevron-left", "‹")}</button><button type="button" class="calendar-current-button ${currentMonth ? "active" : ""}" data-action="${actionPrefix}-current" data-calendar-side="${side}" aria-label="回到当前月份" aria-pressed="${currentMonth}">${currentMonth ? "●" : "○"}</button><button type="button" data-action="${actionPrefix}-next" data-calendar-side="${side}" aria-label="下一个月">${icon("chevron-right", "›")}</button></div></header><div class="calendar-weekdays">${["日", "一", "二", "三", "四", "五", "六"].map(day => `<span>${day}</span>`).join("")}</div><div class="calendar-days">${days}</div></section>`;
  }
  function fxMessageCalendar() {
    if (!state.messageCalendarOpen) return "";
    const left = new Date(`${state.messageCalendarLeftMonth}T00:00:00`); const right = new Date(`${state.messageCalendarRightMonth}T00:00:00`);
    const rangeText = state.messageDateDraftFrom ? `${state.messageDateDraftFrom}${state.messageDateDraftTo ? ` — ${state.messageDateDraftTo}` : ""}` : "请选择日期范围";
    return `<div class="message-calendar-layer date-calendar-layer" data-action="fx-close-message-calendar"><section class="message-date-popover date-filter-popover" role="dialog" aria-label="发送时间筛选" data-action="fx-calendar-panel"><div class="calendar-months">${fxCalendarMonthMarkup(left, "message", "left")}${fxCalendarMonthMarkup(right, "message", "right")}</div><footer class="calendar-footer"><span class="calendar-range-text">${rangeText}</span><div><button type="button" class="button" data-action="fx-clear-message-calendar">清除</button><button type="button" class="button primary" data-action="fx-apply-message-calendar" ${state.messageDateDraftFrom ? "" : "disabled"}>确定</button></div></footer></section></div>`;
  }
  function fxOperatorCalendar() {
    if (!state.operatorCalendarOpen) return "";
    const left = new Date(`${state.operatorCalendarLeftMonth}T00:00:00`); const right = new Date(`${state.operatorCalendarRightMonth}T00:00:00`);
    const rangeText = state.operatorDateDraftFrom ? `${state.operatorDateDraftFrom}${state.operatorDateDraftTo ? ` — ${state.operatorDateDraftTo}` : ""}` : "请选择日期范围";
    return `<div class="message-calendar-layer date-calendar-layer" data-action="fx-close-operator-calendar"><section class="message-date-popover date-filter-popover" role="dialog" aria-label="最近登录时间筛选" data-action="fx-operator-calendar-panel"><div class="calendar-months">${fxCalendarMonthMarkup(left, "operator", "left")}${fxCalendarMonthMarkup(right, "operator", "right")}</div><footer class="calendar-footer"><span class="calendar-range-text">${rangeText}</span><div><button type="button" class="button" data-action="fx-clear-operator-calendar">清除</button><button type="button" class="button primary" data-action="fx-apply-operator-calendar" ${state.operatorDateDraftFrom ? "" : "disabled"}>确定</button></div></footer></section></div>`;
  }
  function fxOrderCalendar() {
    if (!state.orderCalendarOpen) return "";
    const left = new Date(`${state.orderCalendarLeftMonth}T00:00:00`); const right = new Date(`${state.orderCalendarRightMonth}T00:00:00`);
    const rangeText = state.orderDateDraftFrom ? `${state.orderDateDraftFrom}${state.orderDateDraftTo ? ` — ${state.orderDateDraftTo}` : ""}` : "请选择日期范围";
    return `<div class="message-calendar-layer date-calendar-layer" data-action="fx-close-order-calendar"><section class="message-date-popover date-filter-popover" role="dialog" aria-label="创建时间筛选" data-action="fx-order-calendar-panel"><div class="calendar-months">${fxCalendarMonthMarkup(left, "order", "left")}${fxCalendarMonthMarkup(right, "order", "right")}</div><footer class="calendar-footer"><span class="calendar-range-text">${rangeText}</span><div><button type="button" class="button" data-action="fx-clear-order-calendar">清除</button><button type="button" class="button primary" data-action="fx-apply-order-calendar" ${state.orderDateDraftFrom ? "" : "disabled"}>确定</button></div></footer></section></div>`;
  }
  function fxCustomerCalendar() {
    if (!state.customerCalendarOpen) return "";
    const context = state.customerCalendarContext; const range = fxCustomerDateRange(context, true);
    const left = new Date(`${state.customerCalendarLeftMonth}T00:00:00`); const right = new Date(`${state.customerCalendarRightMonth}T00:00:00`);
    const rangeText = range.from ? `${range.from}${range.to ? ` — ${range.to}` : ""}` : "请选择日期范围";
    const label = { order: "创建时间筛选", product: "提交时间筛选", review: "产品提交时间筛选", withdrawal: "申请时间筛选", opsWithdrawal: "申请时间筛选" }[context] || "时间筛选";
    return `<div class="message-calendar-layer date-calendar-layer" data-action="fx-close-customer-calendar"><section class="message-date-popover date-filter-popover" role="dialog" aria-label="${label}" data-action="fx-customer-calendar-panel"><div class="calendar-months">${fxCalendarMonthMarkup(left, "customer", "left")}${fxCalendarMonthMarkup(right, "customer", "right")}</div><footer class="calendar-footer"><span class="calendar-range-text">${rangeText}</span><div><button type="button" class="button" data-action="fx-clear-customer-calendar">清除</button><button type="button" class="button primary" data-action="fx-apply-customer-calendar" ${range.from ? "" : "disabled"}>确定</button></div></footer></section></div>`;
  }
  function fxSyncMessageSelection(root) {
    const selectAll = root.querySelector("#fx-message-select-all");
    if (!selectAll) return;
    const visibleIds = (state.portal === "customer" ? fxFilteredCustomerMessages() : fxFilteredOpsMessages()).map(item => item.id);
    const selected = new Set(state.selectedMessageIds.map(Number));
    const selectedVisible = visibleIds.filter(id => selected.has(Number(id))).length;
    selectAll.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
  }
  function fxPositionDateCalendar(root) {
    const trigger = root.querySelector(".date-filter-trigger"); const popover = root.querySelector(".date-filter-popover");
    if (!trigger || !popover || !trigger.getBoundingClientRect) return;
    const rect = trigger.getBoundingClientRect(); const width = Math.min(580, Math.max(320, window.innerWidth - 24));
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
    popover.style.left = `${left}px`; popover.style.top = `${Math.min(window.innerHeight - 24, rect.bottom + 6)}px`;
  }

  messagesPage = function (isCustomer = false) {
    const rows = isCustomer ? fxFilteredCustomerMessages() : fxFilteredOpsMessages();
    const selected = new Set(state.selectedMessageIds.map(Number));
    const customerReadFilter = isCustomer ? `<label class="message-toolbar-filter" aria-label="阅读状态筛选"><select data-message-filter="read" aria-label="阅读状态筛选"><option value="全部阅读状态" ${state.messageReadFilter === "全部阅读状态" ? "selected" : ""}>全部</option><option value="未读" ${state.messageReadFilter === "未读" ? "selected" : ""}>未读</option><option value="已读" ${state.messageReadFilter === "已读" ? "selected" : ""}>已读</option></select></label>` : "";
    const customerReadActions = isCustomer ? `<button type="button" class="button" data-action="fx-mark-selected-read" ${state.selectedMessageIds.length ? "" : "disabled"}>${icon("mail-check", "✓")}标记为已读</button><button type="button" class="button" data-action="fx-mark-read" ${messages.some(item => item.recipient === fxCurrentCustomer().name && item.unread) ? "" : "disabled"}>${icon("check-check", "✓")}全部标为已读</button>` : "";
    const recipientHeader = isCustomer ? "" : `<th>${fxMessageHeader("接收方", "recipient")}</th>`;
    const recipientCell = item => isCustomer ? "" : `<td>${fxEscape(item.recipient)}</td>`;
    const tableColumns = isCustomer ? 5 : 7;
    const colgroup = `<col class="message-checkbox-column"><col><col>${isCustomer ? "" : "<col>"}<col><col>${isCustomer ? "" : "<col>"}`;
    return `<div class="page">${pageHeader("站内信", isCustomer ? "查看审核、激活与撤回处理结果" : "查看系统向客户发送的通知记录")}<div class="toolbar message-toolbar">${customerReadFilter}<div class="message-toolbar-actions"><button type="button" class="button danger" data-action="fx-delete-selected-messages" ${state.selectedMessageIds.length ? "" : "disabled"}>${icon("trash-2", "×")}删除${state.selectedMessageIds.length ? ` (${state.selectedMessageIds.length})` : ""}</button>${customerReadActions}${fxFilterInput("fx-message-search", state.messageSearch, "搜索消息标题或内容摘要")}</div></div><section class="panel"><div class="table-scroll"><table class="message-table" data-sequence="off"><colgroup>${colgroup}</colgroup><thead><tr><th class="message-checkbox-cell"><input id="fx-message-select-all" type="checkbox" aria-label="勾选当前筛选的全部消息"></th><th>消息标题</th><th>内容摘要</th>${recipientHeader}<th>${fxMessageHeader(isCustomer ? "接收时间" : "发送时间", "time", isCustomer)}</th><th>${fxMessageHeader("消息类型", "type", isCustomer)}</th>${isCustomer ? "" : `<th>${fxMessageHeader("客户阅读状态", "read")}</th>`}</tr></thead><tbody>${rows.length ? rows.map(item => `<tr class="${item.unread ? "unread-row" : ""}"><td class="message-checkbox-cell"><input type="checkbox" data-message-select value="${item.id}" aria-label="勾选消息：${fxEscape(item.title)}" ${selected.has(Number(item.id)) ? "checked" : ""}></td><td><button class="message-link message-title-link ${isCustomer ? `message-title-with-state${item.unread ? "" : " is-read"}` : ""}" data-action="fx-read-message" data-id="${item.id}" title="${fxEscape(item.title)}" ${isCustomer ? `aria-label="${item.unread ? "未读" : "已读"}消息：${fxEscape(item.title)}"` : ""}>${isCustomer ? `<span class="message-state-icon ${item.unread ? "unread" : "read"}">${icon(item.unread ? "mail" : "mail-open", item.unread ? "✉" : "▱")}</span>` : ""}<span>${fxEscape(item.title)}</span></button></td><td><button class="message-link message-summary-link" data-action="fx-read-message" data-id="${item.id}" title="${fxEscape(item.detail)}">${fxEscape(item.detail)}</button></td>${recipientCell(item)}<td>${item.time}</td><td>${fxEscape(item.type)}</td>${isCustomer ? "" : `<td>${item.unread ? `<span class="unread-dot"></span>未读` : "已读"}</td>`}</tr>`).join("") : fxEmpty(tableColumns, "未找到匹配消息")}</tbody></table></div></section></div>`;
  };

  settingsPage = function (isCustomer = false) {
    const user = isCustomer ? fxCurrentCustomer() : fxCurrentOperator();
    return `<div class="page">${pageHeader("个人设置", isCustomer ? "客户账号安全设置" : "运营账号安全设置")}<div class="section-row"><section class="panel"><div class="panel-header"><h2>修改登录密码</h2></div><div class="panel-body"><div class="form-grid"><div class="field full"><label class="required">当前密码</label><input id="fx-current-password" type="password" placeholder="输入当前密码"></div><div class="field"><label class="required">新密码</label><input id="fx-new-password" type="password" placeholder="至少 8 位，包含字母与数字"></div><div class="field"><label class="required">确认新密码</label><input id="fx-confirm-password" type="password" placeholder="再次输入新密码"></div><div class="field full"><button class="button primary" data-action="fx-save-password">保存密码</button></div></div></div></section><aside class="panel"><div class="panel-header"><h2>当前账号</h2></div><div class="panel-body"><div class="list-item"><span class="avatar">${fxEscape(user.name.slice(0, 2))}</span><div class="list-content"><div class="list-title">${fxEscape(user.name)}</div><div class="list-meta">${fxEscape(user.account)} · ${fxEscape(user.status)}</div></div></div><p class="field-help">修改成功后将用于下一次登录验证。</p></div></aside></div></div>`;
  };

  function fxCustomerOrders() { return orders.filter(item => item.customer === fxCurrentCustomer().name); }
  const fxBindRequests = bindRequests;
  function fxPendingBindRequest(orderNo, productId, batch) {
    return bindRequests.find(item => item.status === "待审批" && item.orderNo === orderNo && Number(item.productId) === Number(productId) && item.batch === batch);
  }
  function fxNextBindRequestNo() {
    const max = bindRequests.reduce((value, item) => Math.max(value, Number(String(item.no || "").split("-").pop()) || 0), 0);
    return `BR-202608-${String(max + 1).padStart(3, "0")}`;
  }
  function fxBindRequestLabel(statusValue) {
    return statusValue === "待审批" ? "待审批" : statusValue === "已通过" ? "已通过" : "已驳回";
  }
  function fxCustomerProductStatus(value) { return value === "已驳回" ? "已退回" : value; }
