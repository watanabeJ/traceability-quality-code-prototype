"use strict";

render = function () {
    if (!fxApplyingStorageUpdate) fxSaveBusiness();
    const app = document.getElementById("app"); if (!app) return;
    if (entryPortal === "ops" && state.authenticated) {
      const current = fxOperators.find(item => item.account === state.currentAccount);
      if (!current || current.status !== "启用") {
        state.authenticated = false;
        fxStore.sessionSet(`trace-auth-${entryPortal}`, "0");
      }
    }
    if (entryPortal !== "scan" && !state.authenticated) app.innerHTML = fxLoginPage(entryPortal);
    else app.innerHTML = state.portal === "ops" ? renderOps() : state.portal === "customer" ? renderCustomer() : renderScan();
    if ((state.portal === "ops" && state.opsPage === "messages") || (state.portal === "customer" && state.customerPage === "messages")) app.insertAdjacentHTML("beforeend", fxMessageCalendar());
    if (state.portal === "ops" && state.opsPage === "operators") app.insertAdjacentHTML("beforeend", fxOperatorCalendar());
    if (state.portal === "ops" && state.opsPage === "orders") app.insertAdjacentHTML("beforeend", fxOrderCalendar());
    if ((state.portal === "ops" && ["bind-requests", "withdrawals", "reviews"].includes(state.opsPage)) || (state.portal === "customer" && ["orders", "products", "withdrawals"].includes(state.customerPage))) app.insertAdjacentHTML("beforeend", fxCustomerCalendar());
    normalizeRenderedControls(app);
    numberRenderedTables(app);
    numberRenderedLists(app);
    applyRenderedPagination(app);
    fxSyncMessageSelection(app);
    fxPositionDateCalendar(app);
    syncCurrentRoute();
    if (window.lucide) { window.lucide.createIcons({ attrs: { "aria-hidden": "true" } }); document.documentElement.classList.add("icons-loaded"); }
    restorePortalSwitcherPosition();
  };

  window.addEventListener("storage", event => {
    if (![fxBusinessStorage.messages, fxBusinessStorage.products].includes(event.key) || !event.newValue) return;
    try {
      const syncedItems = JSON.parse(event.newValue);
      if (!Array.isArray(syncedItems)) return;
      if (event.key === fxBusinessStorage.messages) {
        messages.splice(0, messages.length, ...syncedItems);
        const availableIds = new Set(fxVisibleMessages().map(item => Number(item.id)));
        state.selectedMessageIds = state.selectedMessageIds.filter(id => availableIds.has(Number(id)));
      } else {
        products.splice(0, products.length, ...syncedItems);
        products.forEach(product => { if (!product.details) product.details = fxDefaultDetails(product); fxNormalizeDetails(product.details); if (product.status === "草稿") product.submitted = ""; });
        const openedProduct = products.find(product => product.id === state.drawerProductId);
        if (state.portal === "ops" && openedProduct?.status === "草稿") {
          state.drawerProductId = null;
          if (["fx-activation", "fx-reject"].includes(state.modal)) state.modal = null;
        }
      }
      fxRenderFromStorage();
    } catch (_) {}
  });

  function fxRead(id) { return document.getElementById(id)?.value?.trim() || ""; }
  function fxOpenConfirm(data) { state.modalData = data; state.modal = "fx-confirm"; render(); }
  function fxResetListFilters(context) {
    const resets = {
      operators: { operatorFilter: "", operatorStatus: "全部状态", operatorDateFrom: "", operatorDateTo: "", operatorDateDraftFrom: "", operatorDateDraftTo: "", operatorCalendarOpen: false },
      customers: { customerFilter: "", customerStatus: "全部状态" },
      orders: { orderFilter: "", orderFrom: "", orderTo: "", orderDateDraftFrom: "", orderDateDraftTo: "", orderCalendarOpen: false, highlightOrderNo: null },
      reviews: { filter: "", productCategory: "全部大类", reviewStatus: "全部状态", reviewDateFrom: "", reviewDateTo: "", reviewDateDraftFrom: "", reviewDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
      "bind-requests": { bindRequestFilter: "", bindRequestStatus: "全部状态", bindRequestDateFrom: "", bindRequestDateTo: "", bindRequestDateDraftFrom: "", bindRequestDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
      withdrawals: { withdrawalFilter: "", withdrawalStatus: "全部状态", withdrawalDateFrom: "", withdrawalDateTo: "", withdrawalDateDraftFrom: "", withdrawalDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
      messages: { messageSearch: "", messageReadFilter: "全部阅读状态", messageRecipientFilter: "全部接收方", messageTimeFilter: "全部发送时间", messageTypeFilter: "全部消息类型", messageDateFrom: "", messageDateTo: "", messageDateDraftFrom: "", messageDateDraftTo: "", messageCalendarOpen: false, selectedMessageIds: [] },
      "customer-products": { customerProductFilter: "", customerProductStatus: "全部状态", customerProductCategory: "全部大类", customerProductDateFrom: "", customerProductDateTo: "", customerProductDateDraftFrom: "", customerProductDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
    };
    if (!resets[context]) return false;
    Object.assign(state, resets[context]);
    return true;
  }
  function fxClearEditorBinding() {
    state.editorTargetOrderNo = null;
    state.editorRequestedSourceRange = "";
    state.editorRequestedRange = "";
    state.editorRequestedAmount = 0;
  }
  function fxOpenEditor(product, owner = "customer", targetOrderNo = null, initialStep = 0, includeBinding = true) {
    state.editorProductId = product?.id || null;
    state.editorDraft = fxNormalizeDetails(product ? fxClone(product.details || fxDefaultDetails(product)) : fxNewDraft());
    state.editorReadonly = Boolean(product && (owner === "customer" ? ["待审核", "已激活"].includes(product.status) : product.status === "已驳回"));
    state.editorOwner = owner;
    state.editorTargetOrderNo = includeBinding ? (targetOrderNo || product?.requestedOrderNo || product?.preferredOrderNo || null) : null;
    state.editorRequestedSourceRange = product?.requestedSourceRange || "";
    state.editorRequestedRange = product?.requestedRange || "";
    state.editorRequestedAmount = Number(product?.requestedAmount || 0);
    fxInitializeEditorBinding(product);
    state.editorAddingField = null;
    state.productStep = Math.min(fxEditorSteps().length - 1, Math.max(0, Number(initialStep) || 0));
    if (owner === "ops") { state.drawerProductId = product?.id || null; state.reviewEditing = true; state.opsPage = "review-detail"; }
    else state.customerPage = "editor";
    render();
  }
  function fxPersistDraft(submit = false) {
    const draft = state.editorDraft; if (!draft.productName.trim() || !draft.batch.trim()) { showToast("请先填写产品名称和产品批次"); return false; }
    const unnamedContent = fxEditorModules.flatMap((module, moduleIndex) => (draft.custom?.[module] || []).map(row => ({ module, moduleIndex, row }))).find(({ row }) => !String(row.name || "").trim() && (String(row.value || "").trim() || row.files?.length));
    if (unnamedContent) { state.productStep = unnamedContent.moduleIndex; render(); showToast("新增字段必须先填写字段名称"); return false; }
    let product = products.find(item => item.id === state.editorProductId);
    if (!product) { product = { id: Math.max(0, ...products.map(item => item.id)) + 1, name: draft.productName, company: fxCurrentCustomer().name, category: draft.category, batch: draft.batch, status: "草稿", submitted: "", amount: 0, details: fxClone(draft), preferredOrderNo: state.editorTargetOrderNo || null }; products.unshift(product); state.editorProductId = product.id; }
    const combined = Boolean(state.editorTargetOrderNo);
    if (submit && combined) {
      const order = orders.find(item => item.no === state.editorTargetOrderNo && item.customer === product.company);
      if (!order) { showToast("关联订单不存在，请返回订单台账重新发起申请"); return false; }
      if (!state.editorRequestedSourceRange) { state.productStep = fxEditorSteps().length - 1; render(); showToast("请选择可用码段区间"); return false; }
      if (!Number.isSafeInteger(Number(state.editorRequestedAmount)) || Number(state.editorRequestedAmount) < 1) { state.productStep = fxEditorSteps().length - 1; render(); showToast("请输入有效的申请绑定数量"); return false; }
      if (!fxRequestedRangeIsAvailable(order, state.editorRequestedSourceRange, state.editorRequestedRange, state.editorRequestedAmount, product.id)) { state.productStep = fxEditorSteps().length - 1; fxInitializeEditorBinding(product); render(); showToast("所选码段已发生变化，请重新选择"); return false; }
    }
    Object.assign(product, {
      name: draft.productName,
      category: draft.category,
      batch: draft.batch,
      details: fxClone(draft),
      preferredOrderNo: combined ? state.editorTargetOrderNo : null,
      applicationType: combined ? "新建产品并绑定" : "",
      requestedOrderNo: combined ? state.editorTargetOrderNo : "",
      requestedSourceRange: combined ? state.editorRequestedSourceRange : "",
      requestedRange: combined ? state.editorRequestedRange : "",
      requestedAmount: combined ? Number(state.editorRequestedAmount || 0) : 0,
    });
    if (submit) { product.status = "待审核"; product.submitted = fxNow(); product.rejectionReason = ""; }
    else if (product.status !== "待审核" && product.status !== "已激活") { product.status = "草稿"; product.submitted = ""; }
    return true;
  }

  document.addEventListener("click", async event => {
    const target = event.target.closest("[data-action]"); if (!target) return; const action = target.dataset.action; if (!action?.startsWith("fx-")) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (action === "fx-reset-list") { if (fxResetListFilters(target.dataset.resetContext)) render(); return; }
    if (action === "fx-replace-customer-file") { document.getElementById(target.dataset.target)?.click(); return; }
    if (action === "fx-select-bind-product") {
      const prefix = target.dataset.prefix;
      const search = document.getElementById(`${prefix}-search`);
      const value = document.getElementById(prefix);
      const batch = document.getElementById(`${prefix}-batch`);
      if (search) search.value = target.dataset.name || "";
      if (search) search.setAttribute("aria-expanded", "false");
      if (value) value.value = target.dataset.id || "";
      if (batch) batch.value = target.dataset.batch || "—";
      target.blur();
      if (prefix === "fx-withdraw-product" && state.modalData?.withdrawalMode === "segments") {
        state.modalData.withdrawalProductId = Number(target.dataset.id) || null;
        const product = products.find(item => item.id === state.modalData.withdrawalProductId);
        const currentField = document.querySelector(".withdrawal-segment-field");
        if (currentField) {
          const template = document.createElement("template");
          template.innerHTML = fxWithdrawalSegmentPicker(product);
          const replacement = template.content.firstElementChild;
          if (replacement) currentField.replaceWith(replacement);
        }
        return;
      }
      return;
    }
    if (action === "fx-select-activation-order") {
      const orderNo = target.dataset.no || "";
      const availableAmount = Math.max(0, Number(target.dataset.available) || 0);
      const search = document.getElementById("fx-activation-order-search");
      const value = document.getElementById("fx-activation-order");
      const amount = document.getElementById("fx-activation-amount");
      const available = document.getElementById("fx-activation-available");
      if (search) { search.value = orderNo; search.setAttribute("aria-expanded", "false"); }
      if (value) value.value = orderNo;
      if (amount) { amount.max = String(availableAmount); amount.value = String(availableAmount); }
      if (available) available.textContent = `可用码量：${formatNumber(availableAmount)} 枚`;
      fxSyncActivationRangePreview();
      target.blur();
      return;
    }
    if (action === "fx-select-customer") {
      const customer = customers.find(item => item.id === Number(target.dataset.id) && item.status === "启用");
      const prefix = target.dataset.prefix;
      if (!customer || !prefix) return;
      const search = document.getElementById(`${prefix}-search`);
      const value = document.getElementById(prefix);
      if (search) { search.value = fxCustomerPickerLabel(customer); search.setAttribute("aria-expanded", "false"); }
      if (value) value.value = customer.id;
      if (prefix === "fx-qr-customer") {
        state.qrDraft.customerId = customer.id;
        const rangePreview = document.getElementById("fx-qr-range-preview");
        if (rangePreview) rangePreview.value = fxQrRangeData().range;
      }
      target.blur();
      return;
    }
    if (action === "fx-toggle-scan-fields") { const module = target.dataset.module; state.scanExpandedModules = { ...(state.scanExpandedModules || {}), [module]: !state.scanExpandedModules?.[module] }; return render(); }
    if (action === "fx-login") { const account = fxRead("fx-login-account"), password = fxRead("fx-login-password"); const list = entryPortal === "ops" ? fxOperators : customers; const user = list.find(item => item.account === account); if (!user || user.password !== password) return showToast("账号或密码错误"); if (user.status !== "启用") return showToast("该账号已禁用，请联系管理员"); state.authenticated = true; state.currentAccount = user.account; fxStore.sessionSet(`trace-auth-${entryPortal}`, "1"); fxStore.sessionSet(`trace-account-${entryPortal}`, user.account); render(); return showToast("登录成功"); }
    if (action === "fx-logout") { state.authenticated = false; fxStore.sessionSet(`trace-auth-${entryPortal}`, "0"); render(); return; }
    if (action === "fx-new-operator") { if (entryPortal !== "ops") return showToast("当前账号无权执行此操作"); state.selectedOperatorId = null; state.modal = "fx-operator"; return render(); }
    if (action === "fx-edit-operator") { if (entryPortal !== "ops") return showToast("当前账号无权执行此操作"); state.selectedOperatorId = Number(target.dataset.id); state.modal = "fx-operator"; return render(); }
    if (action === "fx-confirm-operator") {
      if (entryPortal !== "ops") return showToast("当前账号无权执行此操作");
      const name = fxRead("fx-operator-name"); let item = fxOperators.find(row => row.id === state.selectedOperatorId); const account = item?.account || fxRead("fx-operator-account");
      if (!name || !account) return showToast("请填写姓名和登录账号");
      if (item) {
        if (fxIsCurrentOperator(item)) {
          item.name = name;
        } else {
          const nextStatus = fxRead("fx-operator-edit-status");
          if (!["启用", "禁用"].includes(nextStatus)) return showToast("请选择账号状态");
          if (nextStatus !== item.status) {
            state.modalData = { kind: "update-operator", id: item.id, name, nextStatus, requiresPassword: nextStatus === "禁用", title: `${nextStatus}运营账号`, subtitle: nextStatus === "禁用" ? "保存前，需要验证当前登录密码。" : "此操作需要二次确认。", subject: `${item.name}（${item.account}）`, operation: nextStatus === "禁用" ? "保存资料并禁用该账号" : "保存资料并恢复后台登录权限", danger: nextStatus === "禁用" };
            state.modal = "fx-confirm"; return render();
          }
          item.name = name;
        }
      } else {
        if (fxOperators.some(row => row.account === account)) return showToast("登录账号已存在");
        const password = fxRead("fx-operator-password"); if (password.length < 8) return showToast("初始密码至少 8 位");
        fxOperators.unshift({ id: Date.now(), name, account, password, status: "启用", lastLogin: "尚未登录" });
      }
      fxSaveOperators(); state.modal = null; render(); return showToast("运营账号已保存");
    }
    if (action === "fx-reset-operator-password") { if (entryPortal !== "ops") return showToast("当前账号无权执行此操作"); const item = fxOperators.find(row => row.id === Number(target.dataset.id)); if (!item) return showToast("运营账号不存在"); if (fxIsCurrentOperator(item)) return showToast("当前账号请在个人设置中修改密码"); state.modalData = { kind: "reset-operator", id: item.id, requiresPassword: true, title: "重置运营账号密码", subtitle: "重置其他运营账号密码前，需要验证当前登录密码。", subject: `${item.name}（${item.account}）`, operation: "重置为初始密码 Trace@2026", danger: true }; state.modal = "fx-confirm"; return render(); }
    if (action === "fx-toggle-operator") {
      if (entryPortal !== "ops") return showToast("当前账号无权执行此操作");
      const item = fxOperators.find(row => row.id === Number(target.dataset.id));
      if (!item) return showToast("运营账号不存在");
      if (fxIsCurrentOperator(item)) return showToast("当前登录账号不能更改自身状态");
      const nextStatus = item.status === "启用" ? "禁用" : "启用";
      state.modalData = { kind: "toggle-operator", id: item.id, nextStatus, requiresPassword: nextStatus === "禁用", title: `${nextStatus}运营账号`, subtitle: nextStatus === "禁用" ? "禁用其他运营账号前，需要验证当前登录密码。" : "此操作需要二次确认。", subject: `${item.name}（${item.account}）`, operation: nextStatus === "禁用" ? "禁用后该账号无法登录" : "恢复后台登录权限", danger: nextStatus === "禁用" };
      state.modal = "fx-confirm"; return render();
    }
    if (action === "fx-new-customer") { state.selectedCustomerId = null; state.modal = "fx-customer"; return render(); }
    if (action === "fx-view-customer-detail") { state.selectedCustomerId = Number(target.dataset.id); state.modal = null; state.opsPage = "customer-detail"; return render(); }
    if (action === "fx-back-customers") { state.selectedCustomerId = null; state.opsPage = "customers"; return render(); }
    if (action === "fx-back-reviews") { state.drawerProductId = null; state.modal = null; state.reviewEditing = false; state.editorProductId = null; state.editorDraft = null; fxClearEditorBinding(); state.opsPage = "reviews"; return render(); }
    if (action === "fx-cancel-ops-edit") { state.reviewEditing = false; state.editorProductId = null; state.editorDraft = null; state.editorReadonly = false; state.editorAddingField = null; return render(); }
    if (action === "fx-edit-customer") { state.selectedCustomerId = Number(target.dataset.id); state.modal = "fx-customer"; return render(); }
    if (action === "fx-customer-create-order") { const item = customers.find(row => row.id === Number(target.dataset.id)); if (!item || item.status !== "启用") return showToast("仅启用中的客户可以创建订单"); state.modal = null; state.qrDraft.customerId = item.id; state.qrStep = 1; state.generatedOrderNo = null; state.opsPage = "codes"; render(); return showToast(`已选择客户：${item.name}`); }
    if (action === "fx-customer-view-orders") { const item = customers.find(row => row.id === Number(target.dataset.id)); if (!item) return showToast("客户账号不存在"); state.modal = null; state.orderFilter = item.name; state.opsPage = "orders"; render(); return showToast(`正在查看 ${item.name} 的订单`); }
    if (action === "fx-focus-customer-order") {
      if (state.portal !== "customer") return;
      const order = fxCustomerOrders().find(item => item.no === target.dataset.no);
      if (!order) return showToast("订单不存在");
      state.modal = null;
      state.customerOrderDateFrom = "";
      state.customerOrderDateTo = "";
      state.customerOrderDateDraftFrom = "";
      state.customerOrderDateDraftTo = "";
      state.customerCalendarOpen = false;
      state.highlightOrderNo = order.no;
      state.customerPage = "orders";
      render();
      state.highlightOrderNo = null;
      const focusedRow = [...document.querySelectorAll("[data-order-no]")].find(row => row.dataset.orderNo === order.no);
      setTimeout(() => focusedRow?.classList.remove("order-focus-row"), 1500);
      return;
    }
    if (action === "fx-focus-order") {
      if (state.portal !== "ops") return showToast("当前账号无权执行此操作");
      const order = orders.find(item => item.no === target.dataset.no);
      if (!order) return showToast("订单不存在");
      state.modal = null;
      state.orderFilter = "";
      state.orderFrom = "";
      state.orderTo = "";
      state.highlightOrderNo = order.no;
      state.opsPage = "orders";
      render();
      return showToast(`已定位订单 ${order.no}`);
    }
    if (action === "fx-view-customer-products") { const item = customers.find(row => row.name === target.dataset.customer); if (!item) return showToast("客户账号不存在"); state.modal = null; state.filter = item.name; state.reviewStatus = "已激活"; state.productCategory = "全部大类"; state.opsPage = "reviews"; render(); return showToast(`正在查看 ${item.name} 的已激活产品`); }
    if (action === "fx-find-customer-account") { const item = customers.find(row => row.name === target.dataset.customer); if (!item) return showToast("客户账号不存在"); state.customerFilter = item.name; state.opsPage = "customers"; render(); return; }
    if (action === "fx-confirm-customer") { const name = fxRead("fx-customer-name"), phone = fxRead("fx-customer-phone"); let item = customers.find(row => row.id === state.selectedCustomerId); const account = item?.account || fxRead("fx-customer-account"); if (!name || !account || !phone) return showToast("请完整填写客户名称、账号和联系电话"); const licenseFile = document.getElementById("fx-customer-license")?.files?.[0]; const legalFile = document.getElementById("fx-customer-legal")?.files?.[0]; const selectedFiles = [licenseFile, legalFile].filter(Boolean); const invalid = selectedFiles.find(file => !(file.type.startsWith("image/") || file.type === "application/pdf" || /\.pdf$/i.test(file.name))); if (invalid) return showToast(`不支持证照文件：${invalid.name}`); const oversized = selectedFiles.find(file => file.size > 10 * 1024 * 1024); if (oversized) return showToast(`证照文件超过 10 MB：${oversized.name}`); if (!item && (!licenseFile || !legalFile)) return showToast("请上传营业执照和法人身份证"); if (!item && customers.some(row => row.account === account)) return showToast("客户登录账号已存在"); const password = item ? item.password : fxRead("fx-customer-password"); if (!item && password.length < 8) return showToast("初始密码至少 8 位"); try { const toAttachment = async file => file ? { name: file.name, type: file.type || fxFileType(file.name), size: file.size, src: await fxReadFileData(file) } : null; const license = await toAttachment(licenseFile); const legal = await toAttachment(legalFile); if (item) Object.assign(item, { name, phone, license: license || item.license, legalId: legal || item.legalId }); else { item = { id: Date.now(), name, account, phone, password, status: "启用", total: 0, active: 0, license, legalId: legal }; customers.unshift(item); } state.modal = null; render(); return showToast("客户账号与真实证照附件已保存"); } catch (_) { return showToast("证照文件读取失败，请重新选择"); } }
    if (action === "fx-reset-customer-password") { const item = customers.find(row => row.id === Number(target.dataset.id)); state.modalData = { kind: "reset-customer", id: item.id, title: "重置客户账号密码", subject: `${item.name}（${item.account}）`, operation: "重置为初始密码 Trace@2026", danger: true }; state.modal = "fx-confirm"; return render(); }
    if (action === "fx-toggle-customer") { const item = customers.find(row => row.id === Number(target.dataset.id)); state.modalData = { kind: "toggle-customer", id: item.id, title: `${item.status === "启用" ? "禁用" : "启用"}客户账号`, subject: item.name, operation: item.status === "启用" ? "禁用后客户无法登录" : "恢复客户后台登录权限", danger: item.status === "启用" }; state.modal = "fx-confirm"; return render(); }
    if (action === "fx-open-operator-calendar") {
      state.operatorDateDraftFrom = state.operatorDateFrom; state.operatorDateDraftTo = state.operatorDateTo;
      fxSetCalendarMonthsFromRange("operator", state.operatorDateFrom, state.operatorDateTo);
      state.operatorCalendarOpen = true; return render();
    }
    if (action === "fx-operator-calendar-panel") return;
    if (action === "fx-close-operator-calendar") { state.operatorCalendarOpen = false; return render(); }
    if (action === "fx-operator-calendar-prev" || action === "fx-operator-calendar-next") {
      fxMoveCalendarPanel("operator", target.dataset.calendarSide, action === "fx-operator-calendar-prev" ? -1 : 1); return render();
    }
    if (action === "fx-operator-calendar-current") { fxFocusCalendarCurrentMonth("operator", target.dataset.calendarSide); return render(); }
    if (action === "fx-operator-calendar-day") {
      const value = target.dataset.date;
      if (!state.operatorDateDraftFrom || state.operatorDateDraftTo) { state.operatorDateDraftFrom = value; state.operatorDateDraftTo = ""; }
      else if (value < state.operatorDateDraftFrom) { state.operatorDateDraftTo = state.operatorDateDraftFrom; state.operatorDateDraftFrom = value; }
      else state.operatorDateDraftTo = value;
      return render();
    }
    if (action === "fx-clear-operator-calendar") {
      state.operatorDateFrom = ""; state.operatorDateTo = ""; state.operatorDateDraftFrom = ""; state.operatorDateDraftTo = ""; state.operatorCalendarOpen = false; return render();
    }
    if (action === "fx-apply-operator-calendar") {
      if (!state.operatorDateDraftFrom) return;
      state.operatorDateFrom = state.operatorDateDraftFrom; state.operatorDateTo = state.operatorDateDraftTo || state.operatorDateDraftFrom; state.operatorCalendarOpen = false; return render();
    }
    if (action === "fx-open-order-calendar") {
      state.orderDateDraftFrom = state.orderFrom; state.orderDateDraftTo = state.orderTo;
      fxSetCalendarMonthsFromRange("order", state.orderFrom, state.orderTo); state.orderCalendarOpen = true; return render();
    }
    if (action === "fx-order-calendar-panel") return;
    if (action === "fx-close-order-calendar") { state.orderCalendarOpen = false; return render(); }
    if (action === "fx-order-calendar-prev" || action === "fx-order-calendar-next") {
      fxMoveCalendarPanel("order", target.dataset.calendarSide, action === "fx-order-calendar-prev" ? -1 : 1); return render();
    }
    if (action === "fx-order-calendar-current") { fxFocusCalendarCurrentMonth("order", target.dataset.calendarSide); return render(); }
    if (action === "fx-order-calendar-day") {
      const value = target.dataset.date;
      if (!state.orderDateDraftFrom || state.orderDateDraftTo) { state.orderDateDraftFrom = value; state.orderDateDraftTo = ""; }
      else if (value < state.orderDateDraftFrom) { state.orderDateDraftTo = state.orderDateDraftFrom; state.orderDateDraftFrom = value; }
      else state.orderDateDraftTo = value;
      return render();
    }
    if (action === "fx-clear-order-calendar") {
      state.orderFrom = ""; state.orderTo = ""; state.orderDateDraftFrom = ""; state.orderDateDraftTo = ""; state.orderCalendarOpen = false; return render();
    }
    if (action === "fx-apply-order-calendar") {
      if (!state.orderDateDraftFrom) return;
      state.orderFrom = state.orderDateDraftFrom; state.orderTo = state.orderDateDraftTo || state.orderDateDraftFrom; state.orderCalendarOpen = false; return render();
    }
    if (action === "fx-open-customer-calendar") {
      const context = target.dataset.dateContext; const range = fxCustomerDateRange(context);
      state.customerCalendarContext = context; fxSetCustomerDateRange(context, true, range.from, range.to);
      fxSetCalendarMonthsFromRange("customer", range.from, range.to); state.customerCalendarOpen = true; return render();
    }
    if (action === "fx-customer-calendar-panel") return;
    if (action === "fx-close-customer-calendar") { state.customerCalendarOpen = false; return render(); }
    if (action === "fx-customer-calendar-prev" || action === "fx-customer-calendar-next") {
      fxMoveCalendarPanel("customer", target.dataset.calendarSide, action === "fx-customer-calendar-prev" ? -1 : 1); return render();
    }
    if (action === "fx-customer-calendar-current") { fxFocusCalendarCurrentMonth("customer", target.dataset.calendarSide); return render(); }
    if (action === "fx-customer-calendar-day") {
      const value = target.dataset.date; const context = state.customerCalendarContext; const range = fxCustomerDateRange(context, true);
      if (!range.from || range.to) fxSetCustomerDateRange(context, true, value, "");
      else if (value < range.from) fxSetCustomerDateRange(context, true, value, range.from);
      else fxSetCustomerDateRange(context, true, range.from, value);
      return render();
    }
    if (action === "fx-clear-customer-calendar") {
      const context = state.customerCalendarContext; fxSetCustomerDateRange(context, false, "", ""); fxSetCustomerDateRange(context, true, "", ""); state.customerCalendarOpen = false; return render();
    }
    if (action === "fx-apply-customer-calendar") {
      const context = state.customerCalendarContext; const range = fxCustomerDateRange(context, true); if (!range.from) return;
      fxSetCustomerDateRange(context, false, range.from, range.to || range.from); state.customerCalendarOpen = false; return render();
    }
    if (action === "fx-open-message-calendar") {
      state.messageDateDraftFrom = state.messageDateFrom; state.messageDateDraftTo = state.messageDateTo;
      fxSetCalendarMonthsFromRange("message", state.messageDateFrom, state.messageDateTo);
      state.messageCalendarOpen = true; return render();
    }
    if (action === "fx-calendar-panel") return;
    if (action === "fx-close-message-calendar") { state.messageCalendarOpen = false; return render(); }
    if (action === "fx-message-calendar-prev" || action === "fx-message-calendar-next") {
      fxMoveCalendarPanel("message", target.dataset.calendarSide, action === "fx-message-calendar-prev" ? -1 : 1); return render();
    }
    if (action === "fx-message-calendar-current") { fxFocusCalendarCurrentMonth("message", target.dataset.calendarSide); return render(); }
    if (action === "fx-message-calendar-day") {
      const value = target.dataset.date;
      if (!state.messageDateDraftFrom || state.messageDateDraftTo) { state.messageDateDraftFrom = value; state.messageDateDraftTo = ""; }
      else if (value < state.messageDateDraftFrom) { state.messageDateDraftTo = state.messageDateDraftFrom; state.messageDateDraftFrom = value; }
      else state.messageDateDraftTo = value;
      return render();
    }
    if (action === "fx-clear-message-calendar") {
      state.messageDateFrom = ""; state.messageDateTo = ""; state.messageDateDraftFrom = ""; state.messageDateDraftTo = ""; state.messageCalendarOpen = false; return render();
    }
    if (action === "fx-apply-message-calendar") {
      if (!state.messageDateDraftFrom) return;
      state.messageDateFrom = state.messageDateDraftFrom; state.messageDateTo = state.messageDateDraftTo || state.messageDateDraftFrom; state.messageCalendarOpen = false; return render();
    }
    if (action === "fx-sort-customers") { fxToggleSort("customer", target.dataset.sort); return render(); }
    if (action === "fx-sort-orders") { fxToggleSort("order", target.dataset.sort); return render(); }
    if (action === "fx-sort-customerOrders") { fxToggleSort("customerOrder", target.dataset.sort); return render(); }
    if (action === "fx-sort-customerProducts") { fxToggleSort("customerProduct", target.dataset.sort); return render(); }
    if (action === "fx-withdraw-review-edit") {
      if (state.portal !== "customer") return showToast("当前账号无权执行此操作");
      const product = products.find(item => item.id === Number(target.dataset.id) && item.company === fxCurrentCustomer().name);
      if (!product || product.status !== "待审核") return showToast("该产品当前不在待审核状态");
      state.modalData = { kind: "withdraw-review-edit", id: product.id, title: "撤回审核并修改", subtitle: "撤回后，运营端将不再审核当前提交版本。", subject: `${product.name}（${product.batch}）`, operation: "恢复为草稿并进入编辑，保留待关联订单信息", danger: true };
      state.modal = "fx-confirm";
      return render();
    }
    if (action === "fx-delete-selected-messages") {
      if (!state.selectedMessageIds.length) return showToast("请先勾选需要删除的消息");
      state.modalData = { kind: "delete-messages", title: "删除站内信", subject: `已选择 ${state.selectedMessageIds.length} 条消息`, operation: "删除后无法恢复", danger: true };
      state.modal = "fx-confirm";
      return render();
    }
    if (action === "fx-mark-selected-read") {
      if (state.portal !== "customer" || !state.selectedMessageIds.length) return showToast("请先勾选需要标记的消息");
      const ids = new Set(state.selectedMessageIds.map(Number));
      messages.filter(item => item.recipient === fxCurrentCustomer().name && ids.has(Number(item.id))).forEach(item => item.unread = false);
      state.selectedMessageIds = []; render(); return showToast("所选消息已标记为已读");
    }
    if (action === "fx-confirm-generic") {
      const data = state.modalData || {};
      if (data.kind === "withdraw-review-edit") {
        if (state.portal !== "customer") return showToast("当前账号无权执行此操作");
        const product = products.find(item => item.id === Number(data.id) && item.company === fxCurrentCustomer().name);
        if (!product || product.status !== "待审核") return showToast("该产品状态已变化，请刷新后重试");
        const withdrawnAt = fxNow();
        product.status = "草稿";
        product.submitted = "";
        product.reviewWithdrawnAt = withdrawnAt;
        product.reviewHistory = [...(Array.isArray(product.reviewHistory) ? product.reviewHistory : []), { action: "客户撤回审核", time: withdrawnAt, operator: fxCurrentCustomer().name }];
        state.modal = null;
        fxOpenEditor(product, "customer");
        return showToast("审核申请已撤回，可修改后重新提交");
      }
      if (data.kind === "reset-operator") {
        if (entryPortal !== "ops") return showToast("当前账号无权执行此操作");
        const current = fxOperators.find(row => row.account === state.currentAccount);
        if (!current || current.status !== "启用") return showToast("当前登录账号状态异常，请重新登录");
        const item = fxOperators.find(row => row.id === Number(data.id));
        if (!item) return showToast("运营账号不存在");
        if (fxIsCurrentOperator(item)) return showToast("当前账号请在个人设置中修改密码");
        if (fxRead("fx-operator-action-password") !== current.password) return showToast("当前登录密码不正确");
        item.password = "Trace@2026";
      }
      if (["toggle-operator", "update-operator"].includes(data.kind)) {
        if (entryPortal !== "ops") return showToast("当前账号无权执行此操作");
        const current = fxOperators.find(row => row.account === state.currentAccount);
        if (!current || current.status !== "启用") return showToast("当前登录账号状态异常，请重新登录");
        const item = fxOperators.find(row => row.id === Number(data.id));
        if (!item) return showToast("运营账号不存在");
        if (fxIsCurrentOperator(item)) return showToast("当前登录账号不能更改自身状态");
        if (!["启用", "禁用"].includes(data.nextStatus)) return showToast("账号状态操作无效");
        if (data.nextStatus === "禁用" && fxRead("fx-operator-action-password") !== current.password) return showToast("当前登录密码不正确");
        if (data.kind === "update-operator") {
          const name = String(data.name || "").trim();
          if (!name) return showToast("请填写姓名");
          item.name = name;
        }
        item.status = data.nextStatus;
      }
      if (data.kind === "reset-customer") customers.find(item => item.id === data.id).password = "Trace@2026";
      if (data.kind === "toggle-customer") { const item = customers.find(row => row.id === data.id); item.status = item.status === "启用" ? "禁用" : "启用"; }
      if (data.kind === "delete-messages") {
        const ids = new Set(state.selectedMessageIds.map(Number));
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          const allowed = state.portal === "customer" ? messages[index].recipient === fxCurrentCustomer().name : fxIsCustomerMessage(messages[index]);
          if (ids.has(Number(messages[index].id)) && allowed) messages.splice(index, 1);
        }
        state.selectedMessageIds = [];
      }
      fxSaveOperators(); state.modal = null; render(); return showToast("操作已完成");
    }
    if (action === "fx-export-customers") { fxDownloadExcel(`客户列表_${fxToday}.xls`, ["客户名称", "账号", "电话", "状态", "总量", "已激活", "绑定申请中", "剩余可用"], customers.map(item => { const summary = fxCustomerCodeSummary(item.name); return [item.name, item.account, item.phone, item.status, summary.total, summary.active, summary.pending, summary.available]; })); return showToast("客户列表已导出"); }
    if (action === "fx-new-qr") { state.qrStep = 1; state.qrDraft.amount = 500; state.qrDraft.note = ""; state.generatedOrderNo = null; return render(); }
    if (action === "fx-finish-order") { state.orderFilter = ""; state.highlightOrderNo = null; state.generatedOrderNo = null; state.opsPage = "orders"; return render(); }
    if (action === "fx-view-generated-order") { if (!state.generatedOrderNo) return showToast("尚未生成订单"); state.orderFilter = state.generatedOrderNo; state.opsPage = "orders"; return render(); }
    if (action === "fx-create-order") {
      if (state.portal !== "ops") return showToast("当前账号无权创建订单");
      const customerInput = document.getElementById("fx-qr-customer-search");
      const customer = customers.find(item => item.id === Number(fxRead("fx-qr-customer")) && item.status === "启用");
      if (!customer) { customerInput?.focus(); return showToast("请从搜索结果中选择已启用的客户账号"); }
      const amount = Number(fxRead("fx-qr-amount"));
      if (!Number.isSafeInteger(amount) || amount < 1) return showToast("生成数量必须为大于 0 的整数");
      state.qrDraft.customerId = customer.id;
      state.qrDraft.amount = amount;
      state.qrDraft.note = fxRead("fx-qr-note");
      state.qrDraft.style = fxRead("fx-qr-style") || state.qrDraft.style;
      state.qrDraft.size = fxRead("fx-qr-size") || state.qrDraft.size;
      const prefix = fxOrderPrefix(customer);
      const used = orders.filter(order => order.customer === customer.name).reduce((sum, order) => sum + order.total, 0);
      const no = `ORD-202607-${String(orders.length + 32).padStart(3, "0")}`;
      const order = { id: Date.now(), no, customer: customer.name, range: `${fxSerial(prefix, used + 1)}–${fxSerial(prefix, used + amount)}`, total: amount, active: 0, created: fxToday, createdAt: fxNow(), activations: [], style: state.qrDraft.style, size: state.qrDraft.size, note: state.qrDraft.note };
      orders.unshift(order); customer.total += amount; state.generatedOrderNo = no; state.qrStep = 4; render();
      return showToast("订单已创建，二维码已生成");
    }
    if (action === "fx-download-qr") { const order = orders.find(item => item.no === state.generatedOrderNo); if (order) fxDownloadQrPackage(order); return showToast("二维码压缩包已开始下载"); }
    if (action === "fx-export-orders") { const term = state.orderFilter.trim().toLowerCase(); const rows = fxSortedRows(orders.filter(item => (!term || `${item.customer} ${item.no} ${item.note || ""}`.toLowerCase().includes(term)) && (!state.orderFrom || item.created >= state.orderFrom) && (!state.orderTo || item.created <= state.orderTo)), "order", item => item.createdAt || item.created); fxDownloadExcel(`订单码量台账_${fxToday}.xls`, ["订单号", "客户名称", "创建时间", "序列号范围", "订单备注", "总量", "已激活", "绑定申请中", "剩余可用"], rows.map(item => [item.no, item.customer, item.createdAt, item.range, item.note || "", item.total, item.active, fxOrderPendingAmount(item), fxOrderAvailableAmount(item)])); return showToast(`已导出当前筛选结果，共 ${rows.length} 条`); }
    if (action === "fx-order-detail") {
      const order = orders.find(item => item.no === target.dataset.no);
      if (!order || (state.portal === "customer" && order.customer !== fxCurrentCustomer().name)) return showToast("订单不存在");
      state.selectedOrderNo = order.no;
      state.modal = null;
      if (state.portal === "customer") state.customerPage = "order-detail";
      else state.opsPage = "order-detail";
      return render();
    }
    if (action === "fx-back-orders") {
      state.modal = null;
      state.selectedOrderNo = null;
      if (state.portal === "customer") state.customerPage = "orders";
      else state.opsPage = "orders";
      return render();
    }
    if (action === "fx-ops-bind-order") {
      if (state.portal !== "ops") return showToast("当前账号无权执行此操作");
      const order = orders.find(item => item.no === target.dataset.no);
      if (!order || fxOrderAvailableAmount(order) < 1) return showToast("当前订单没有可绑定的可用码量");
      state.selectedOrderNo = order.no;
      state.modal = "fx-ops-bind-order";
      return render();
    }
    if (action === "fx-view-order-bind-requests") {
      state.selectedOrderNo = target.dataset.no;
      state.modal = "fx-order-bind-requests";
      return render();
    }
    if (action === "fx-view-bind-request") {
      state.selectedBindRequestId = Number(target.dataset.id);
      state.modal = "fx-bind-request-detail";
      return render();
    }
    if (action === "fx-open-combined-product") {
      const product = products.find(item => item.id === Number(target.dataset.id));
      if (!product) return showToast("组合申请对应的产品不存在");
      state.modal = null;
      if (state.portal === "ops") {
        state.drawerProductId = product.id;
        state.reviewEditing = false;
        state.editorProductId = null;
        state.editorDraft = null;
        state.opsPage = "review-detail";
      } else {
        return fxOpenEditor(product, "customer", product.requestedOrderNo, fxEditorSteps().length - 1);
      }
      return render();
    }
    if (action === "fx-approve-bind-request") {
      if (state.portal !== "ops") return showToast("当前账号无权处理绑定申请");
      const request = bindRequests.find(item => item.id === Number(target.dataset.id) && item.status === "待审批");
      const order = request && orders.find(item => item.no === request.orderNo && item.customer === request.customer);
      const product = request && products.find(item => item.id === Number(request.productId) && item.company === request.customer && item.batch === request.batch);
      const amount = Number(request?.amount || 0);
      if (!request || !order || !product || product.status !== "已激活") return showToast("申请关联的产品或订单已不可用");
      const otherPendingAmount = Math.max(0, fxOrderPendingAmount(order) - amount);
      const approvableAmount = Math.max(0, Number(order.total || 0) - Number(order.active || 0) - otherPendingAmount);
      if (amount < 1 || amount > approvableAmount) return showToast("申请数量已超出订单可用码量");
      const range = request.range || fxActivationRange(order, amount, null, request.id);
      if (!range) return showToast("当前订单没有足够的连续可用码段");
      order.active += amount;
      order.activations.unshift({ batch: product.batch, amount, range, time: fxNow(), product: product.name, operator: fxCurrentOperator().name, status: "有效", bindRequestNo: request.no });
      product.amount = Number(product.amount || 0) + amount;
      const customer = customers.find(item => item.name === request.customer);
      if (customer) customer.active = Number(customer.active || 0) + amount;
      request.status = "已通过";
      request.decidedAt = fxNow();
      request.decisionNote = `已分配码段 ${range}`;
      fxAddMessage({ type: "绑定申请结果", title: `${request.product}（${request.batch || "—"}）绑定申请已通过`, detail: `产品批次：${request.batch || "—"}；订单 ${request.orderNo} 已分配 ${formatNumber(amount)} 枚码，码段 ${range}。`, recipient: request.customer, customer: request.customer });
      fxSaveBusiness();
      render();
      return showToast("绑定申请已通过，码段已分配");
    }
    if (action === "fx-reject-bind-request") {
      if (state.portal !== "ops") return showToast("当前账号无权处理绑定申请");
      state.selectedBindRequestId = Number(target.dataset.id);
      state.modal = "fx-bind-request-reject";
      return render();
    }
    if (action === "fx-confirm-bind-request-reject") {
      if (state.portal !== "ops") return showToast("当前账号无权处理绑定申请");
      const request = bindRequests.find(item => item.id === state.selectedBindRequestId && item.status === "待审批");
      const reason = fxRead("fx-bind-request-reason").trim();
      if (!request) return showToast("绑定申请不存在或已处理");
      if (!reason) return showToast("请填写驳回原因");
      request.status = "已驳回";
      request.decidedAt = fxNow();
      request.rejectReason = reason;
      fxAddMessage({ type: "绑定申请结果", title: `${request.product}（${request.batch || "—"}）绑定申请已驳回`, detail: `产品批次：${request.batch || "—"}；${reason}`, recipient: request.customer, customer: request.customer });
      fxSaveBusiness();
      state.modal = null;
      state.selectedBindRequestId = null;
      render();
      return showToast("绑定申请已驳回并通知客户");
    }
    if (action === "fx-confirm-ops-bind") {
      if (state.portal !== "ops") return showToast("当前账号无权执行此操作");
      const order = orders.find(item => item.no === state.selectedOrderNo);
      const product = products.find(item => item.id === Number(fxRead("fx-ops-bind-product")));
      const amount = Number(fxRead("fx-ops-bind-amount"));
      if (!order || !product || product.company !== order.customer || product.status !== "已激活") return showToast("请选择该客户的已激活产品");
      if (amount < 1 || amount > fxOrderAvailableAmount(order)) return showToast("绑定数量必须在订单可用码量内");
      const range = fxActivationRange(order, amount);
      if (!range) return showToast("当前订单没有足够的连续可用码段");
      order.active += amount;
      order.activations.unshift({ batch: product.batch, amount, range, time: fxNow(), product: product.name, operator: fxCurrentOperator().name, status: "有效" });
      product.amount += amount;
      const customer = customers.find(item => item.name === order.customer);
      if (customer) customer.active += amount;
      state.modal = null;
      render();
      return showToast(`已为 ${product.name} 绑定并激活 ${formatNumber(amount)} 枚码`);
    }
    if (action === "fx-customer-bind-order") { const order = orders.find(item => item.no === target.dataset.no && item.customer === fxCurrentCustomer().name); if (!order || fxOrderAvailableAmount(order) < 1) return showToast("当前订单没有可用码量"); state.selectedOrderNo = order.no; state.modal = "fx-customer-bind-choice"; return render(); }
    if (action === "fx-customer-select-existing-binding") { state.modal = "fx-customer-bind-order"; return render(); }
    if (action === "fx-customer-back-bind-choice") { state.modal = "fx-customer-bind-choice"; return render(); }
    if (action === "fx-customer-new-product-for-order") { const orderNo = target.dataset.no || state.selectedOrderNo; const order = orders.find(item => item.no === orderNo && item.customer === fxCurrentCustomer().name); if (!order || fxOrderAvailableAmount(order) < 1) return showToast("当前订单没有可关联的可用码量"); state.modal = null; return fxOpenEditor(null, "customer", order.no); }
    if (action === "fx-confirm-customer-bind") {
      const requestOrder = orders.find(item => item.no === state.selectedOrderNo && item.customer === fxCurrentCustomer().name);
      const requestProduct = products.find(item => item.id === Number(fxRead("fx-customer-bind-product")));
      const requestAmount = Number(fxRead("fx-customer-bind-amount"));
      if (!requestOrder || !requestProduct || requestProduct.company !== fxCurrentCustomer().name || requestProduct.status !== "已激活") return showToast("请选择当前账号下的已激活产品");
      if (requestAmount < 1 || requestAmount > fxOrderAvailableAmount(requestOrder)) return showToast("申请数量必须在订单可用码量内");
      if (fxPendingBindRequest(requestOrder.no, requestProduct.id, requestProduct.batch)) return showToast("该产品已有待审批的绑定申请");
      const requestRange = fxActivationRange(requestOrder, requestAmount);
      if (!requestRange) return showToast("当前订单没有足够的连续可用码段");
      bindRequests.unshift({ id: Date.now(), no: fxNextBindRequestNo(), orderNo: requestOrder.no, customer: requestOrder.customer, productId: requestProduct.id, product: requestProduct.name, batch: requestProduct.batch, range: requestRange, amount: requestAmount, status: "待审批", time: fxNow(), decidedAt: "", rejectReason: "" });
      fxSaveBusiness();
      state.modal = null;
      render();
      return showToast("绑定申请已提交，等待运营端审核");
    }
    if (action === "fx-open-activation-product") { const order = orders.find(item => item.no === state.selectedOrderNo); const product = products.find(item => item.name === target.dataset.product && (!target.dataset.batch || item.batch === target.dataset.batch) && (!order || item.company === order.customer)); if (!product) return showToast("关联产品不存在"); state.modal = null; if (state.portal === "customer") { state.customerProductFilter = product.name; state.customerPage = "products"; } else { state.filter = product.name; state.opsPage = "reviews"; } render(); return; }
    if (action === "fx-view-activation-withdrawal") { state.modalData = { withdrawalNo: target.dataset.withdrawalNo }; state.modal = "fx-reset-history"; return render(); }
    if (action === "fx-back-order-detail") { state.modal = null; if (state.portal === "customer") state.customerPage = "order-detail"; else state.opsPage = "order-detail"; return render(); }
    if (action === "fx-export-products") { fxDownloadExcel(`产品信息_${fxToday}.xls`, ["产品名称", "产品批次", "产品大类", "客户名称", "产品提交时间", "审核状态"], fxFilteredReviews().map(item => [item.name, item.batch, item.category, item.company, item.submitted || "", item.status])); return showToast("产品信息已导出"); }
    if (action === "fx-ops-edit-product") { const product = products.find(item => item.id === Number(target.dataset.id)); if (!product || !["待审核", "已激活"].includes(product.status)) return showToast("当前状态不支持运营编辑"); const initialStep = state.opsPage === "review-detail" && state.drawerProductId === product.id ? state.productStep : 0; return fxOpenEditor(product, "ops", null, initialStep, false); }
    if (action === "fx-open-activation") { state.drawerProductId = Number(target.dataset.id); state.modal = "fx-activation"; return render(); }
    if (action === "fx-confirm-activation") {
      const product = products.find(item => item.id === state.drawerProductId);
      const combined = product?.applicationType === "新建产品并绑定";
      const order = orders.find(item => item.no === fxRead("fx-activation-order"));
      const amount = Number(fxRead("fx-activation-amount"));
      if (!product || !order || order.customer !== product.company || !Number.isSafeInteger(amount) || amount < 1 || amount > fxOrderAvailableAmount(order, combined ? product.id : null)) return showToast("激活数量必须在该客户订单可用余额内");
      const range = fxReviewActivationRange(order, amount, product);
      if (!range) return showToast("当前订单没有足够的连续可用码段");
      order.active += amount;
      order.activations.unshift({ batch: product.batch, amount, range, time: fxNow(), product: product.name, operator: fxCurrentOperator().name, status: "有效" });
      const customer = customers.find(item => item.name === product.company); if (customer) customer.active += amount; product.status = "已激活"; product.amount += amount; product.preferredOrderNo = null; fxClearEditorBinding();
      fxAddMessage({ ...fxReviewMessageCopy(product, true, `已关联订单 ${order.no}，激活 ${formatNumber(amount)} 枚，码段 ${range}。`), recipient: product.company, customer: product.company });
      state.modal = null; state.drawerProductId = null; state.opsPage = "reviews"; render(); return showToast("审核通过，连续码段已激活");
    }
    if (action === "fx-open-reject") { state.drawerProductId = Number(target.dataset.id); state.modal = "fx-reject"; return render(); }
    if (action === "fx-confirm-reject") { const reason = fxRead("fx-reject-reason"); if (!reason) return showToast("请填写驳回原因"); const product = products.find(item => item.id === state.drawerProductId); const released = product?.applicationType === "新建产品并绑定" ? "；申请码段已释放" : ""; product.status = "已驳回"; product.rejectionReason = reason; fxAddMessage({ ...fxReviewMessageCopy(product, false, `${reason}${released}`), recipient: product.company, customer: product.company }); state.modal = null; state.drawerProductId = null; state.opsPage = "reviews"; render(); return showToast(`产品已驳回并通知客户${released}`); }
    if (action === "fx-approve-withdrawal" || action === "fx-reject-withdrawal") { state.selectedWithdrawalIndex = Number(target.dataset.index); state.modalData = { decision: action === "fx-reject-withdrawal" ? "reject" : "approve" }; state.modal = "fx-withdraw-decision"; return render(); }
    if (action === "fx-confirm-withdraw-decision") {
      const item = withdrawals[state.selectedWithdrawalIndex]; const reject = state.modalData?.decision === "reject"; item.decidedAt = fxNow();
      if (reject) { const reason = fxRead("fx-withdraw-reject-reason"); if (!reason) return showToast("请填写驳回原因"); item.status = "已驳回"; item.rejectReason = reason; }
      else {
        const product = products.find(row => row.name === item.product && row.company === item.customer && (!item.batch || row.batch === item.batch));
        const requestedSegments = Array.isArray(item.segments) && item.segments.length ? item.segments : null;
        let rollbackAmount = 0; const resetRanges = [];
        if (product) {
          orders.forEach(order => {
            const requestedForOrder = requestedSegments?.filter(segment => segment.orderNo === order.no) || null;
            const matched = (order.activations || []).filter(activation => {
              if (!fxProductMatchesActivation(product, activation)) return false;
              if (!requestedSegments) return true;
              return requestedForOrder.some(segment => segment.key === fxWithdrawalSegmentKey(order, activation) || (segment.range === activation.range && (!segment.time || segment.time === activation.time)));
            });
            const amount = matched.reduce((sum, activation) => sum + Number(activation.amount || 0), 0);
            if (!amount) return;
            rollbackAmount += amount;
            resetRanges.push(...matched.map(activation => activation.range).filter(Boolean));
            order.active = Math.max(0, order.active - amount);
            matched.forEach(activation => Object.assign(activation, { status: "已重置", resetTime: item.decidedAt, withdrawalNo: item.no, withdrawalReason: item.reason, resetOperator: fxCurrentOperator().name }));
          });
          const customer = customers.find(row => row.name === product.company);
          if (customer) customer.active = Math.max(0, customer.active - rollbackAmount);
          const remainingAmount = orders.reduce((sum, order) => sum + (order.activations || []).filter(activation => fxProductMatchesActivation(product, activation)).reduce((subtotal, activation) => subtotal + Number(activation.amount || 0), 0), 0);
          product.amount = remainingAmount;
          if (!remainingAmount) { product.status = "草稿"; product.submitted = ""; }
        }
        if (!rollbackAmount) return showToast("申请中的码段已不可撤回，请重新核对");
        item.status = "已通过"; item.rollbackAmount = rollbackAmount; item.resetRanges = resetRanges; item.rejectReason = `已选码段已重置为空白状态，共回滚 ${formatNumber(rollbackAmount)} 枚`;
      }
      fxAddMessage({ type: reject ? "产品撤回驳回" : "产品撤回通过", title: `${item.product}${item.scope === "segments" ? "码段" : "产品"}撤回申请${reject ? "已驳回" : "已通过"}`, detail: reject ? item.rejectReason : `${item.rejectReason}${item.resetRanges?.length ? `；重置码段 ${item.resetRanges.join("、")}` : ""}`, recipient: item.customer, customer: item.customer }); state.modal = null; render(); return showToast(`撤回申请已${reject ? "驳回" : "通过"}`);
    }
    if (action === "fx-view-withdrawal") { state.selectedWithdrawalIndex = Number(target.dataset.index); state.modal = "fx-withdrawal-detail"; return render(); }
    if (action === "fx-mark-read") { if (state.portal !== "customer") return; messages.filter(item => item.recipient === fxCurrentCustomer().name).forEach(item => item.unread = false); render(); return showToast("全部消息已标记为已读"); }
    if (action === "fx-read-message") { const item = messages.find(row => row.id === Number(target.dataset.id)); if (state.portal === "customer") item.unread = false; state.selectedMessageId = item.id; state.modal = "fx-message"; return render(); }
    if (action === "fx-save-password") { const current = fxRead("fx-current-password"), next = fxRead("fx-new-password"), confirm = fxRead("fx-confirm-password"); const account = entryPortal === "ops" ? fxOperators.find(item => item.account === state.currentAccount) : fxCurrentCustomer(); if (!account || (entryPortal === "ops" && account.status !== "启用")) return showToast("当前登录账号状态异常，请重新登录"); if (current !== account.password) return showToast("当前密码不正确"); if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return showToast("新密码至少 8 位且包含字母和数字"); if (next !== confirm) return showToast("两次输入的新密码不一致"); account.password = next; fxSaveOperators(); fxSaveBusiness(); return showToast("登录密码已更新"); }
    if (action === "fx-export-customer-orders") { const rows = fxCustomerOrders(); fxDownloadExcel(`订单台账_${fxToday}.xls`, ["订单号", "总量", "已激活", "绑定申请中", "剩余可用"], rows.map(item => [item.no, item.total, item.active, fxOrderPendingAmount(item), fxOrderAvailableAmount(item)])); return showToast("订单台账已导出"); }
    if (action === "fx-customer-product-status") { state.customerProductStatus = target.dataset.status; state.customerPage = "products"; return render(); }
    if (action === "fx-new-product") return fxOpenEditor(null, "customer");
    if (action === "fx-submit-product-row") {
      const product = products.find(item => item.id === Number(target.dataset.id) && item.company === fxCurrentCustomer().name && item.status === "草稿");
      if (!product) return showToast("仅草稿产品可以直接提交审核");
      state.editorProductId = product.id;
      state.editorDraft = fxNormalizeDetails(fxClone(product.details || fxDefaultDetails(product)));
      state.editorOwner = "customer";
      state.editorReadonly = false;
      state.editorTargetOrderNo = product.requestedOrderNo || product.preferredOrderNo || null;
      state.editorRequestedSourceRange = product.requestedSourceRange || "";
      state.editorRequestedRange = product.requestedRange || "";
      state.editorRequestedAmount = Number(product.requestedAmount || 0);
      fxInitializeEditorBinding(product);
      state.modal = "fx-submit";
      return render();
    }
    if (action === "fx-back-customer-products") { if (state.portal !== "customer") return; state.customerPage = "products"; state.editorProductId = null; state.editorDraft = null; state.editorReadonly = false; fxClearEditorBinding(); state.productStep = 0; return render(); }
    if (action === "fx-edit-product") { const product = products.find(item => item.id === Number(target.dataset.id)); return fxOpenEditor(product, "customer", null, 0, false); }
    if (action === "fx-clear-editor-order") { const product = products.find(item => item.id === state.editorProductId); if (product) Object.assign(product, { preferredOrderNo: null, applicationType: "", requestedOrderNo: "", requestedSourceRange: "", requestedRange: "", requestedAmount: 0 }); fxClearEditorBinding(); state.productStep = Math.min(state.productStep, productSteps.length - 1); return render(); }
    if (action === "fx-preview-product") { const product = products.find(item => item.id === Number(target.dataset.id)); state.editorProductId = product.id; state.editorDraft = fxClone(product.details); state.modal = "fx-preview"; return render(); }
    if (action === "fx-save-draft") { if (state.editorReadonly) return showToast("已提交资料不可编辑"); if (!fxPersistDraft(false)) return; if (state.editorOwner === "customer") { state.customerPage = "products"; render(); } return showToast("草稿已保存，可在产品列表中继续编辑"); }
    if (action === "fx-editor-next") { if (!state.editorReadonly && state.editorOwner === "customer" && !fxPersistDraft(false)) return; if (state.productStep < fxEditorSteps().length - 1) state.productStep += 1; render(); return showToast(state.editorOwner === "ops" ? "已切换到下一模块" : "当前模块已保存"); }
    if (action === "fx-open-submit") { if (!fxPersistDraft(false)) return; state.modal = "fx-submit"; return render(); }
    if (action === "fx-confirm-submit") { if (!fxPersistDraft(true)) return; state.modal = null; state.customerPage = "products"; state.editorReadonly = true; render(); return showToast("产品资料已提交审核"); }
    if (action === "fx-save-ops-product") { const productId = state.editorProductId; if (!fxPersistDraft(false)) return; state.reviewEditing = false; state.editorProductId = null; state.editorDraft = null; state.editorReadonly = false; state.drawerProductId = productId; state.opsPage = "review-detail"; render(); return showToast("产品全部资料已由运营方更新"); }
    if (action === "fx-preview-current") { state.modal = "fx-preview"; return render(); }
    if (action === "fx-open-add-field") { const module = target.dataset.module; const row = { id: `custom-${Date.now()}-${state.editorDraft.custom[module].length + 1}`, name: "", type: "mixed", value: "", files: [] }; state.editorDraft.custom[module].push(row); state.editorDraft.fieldOrder[module].push(`custom:${row.id}`); state.editorAddingField = null; return render(); }
    if (action === "fx-cancel-add-field") { state.editorAddingField = null; return render(); }
    if (action === "fx-add-custom") { const module = target.dataset.module; const row = { id: `custom-${Date.now()}-${state.editorDraft.custom[module].length + 1}`, name: "", type: "mixed", value: "", files: [] }; state.editorDraft.custom[module].push(row); state.editorDraft.fieldOrder[module].push(`custom:${row.id}`); state.editorAddingField = null; return render(); }
    if (action === "fx-remove-custom") { const module = target.dataset.module; const row = state.editorDraft.custom[module][Number(target.dataset.index)]; state.editorDraft.custom[module].splice(Number(target.dataset.index), 1); state.editorDraft.fieldOrder[module] = state.editorDraft.fieldOrder[module].filter(token => token !== `custom:${row.id}`); return render(); }
    if (action === "fx-add-trace") { state.editorDraft.trace.push({ id: `trace-${Date.now()}-${state.editorDraft.trace.length + 1}`, date: fxToday, content: "" }); return render(); }
    if (action === "fx-remove-trace") { state.editorDraft.trace.splice(Number(target.dataset.index), 1); return render(); }
    if (action === "fx-remove-standard-file") { state.editorDraft.fieldMedia?.[target.dataset.mediaKey]?.splice(Number(target.dataset.fileIndex), 1); return render(); }
    if (action === "fx-preview-custom-file") { const file = state.editorDraft.custom[target.dataset.module][Number(target.dataset.index)]?.files?.[Number(target.dataset.fileIndex)]; if (!file) return; state.modalData = { name: fxFileName(file), type: fxFileType(file), src: fxFileSrc(file, /\.(png|jpe?g|webp)$/i.test(fxFileName(file)) ? "assets/tea-field.jpg" : "") }; state.modal = "fx-file"; return render(); }
    if (action === "fx-remove-custom-file") { state.editorDraft.custom[target.dataset.module][Number(target.dataset.index)]?.files?.splice(Number(target.dataset.fileIndex), 1); return render(); }
    if (action === "fx-open-withdraw" || action === "fx-customer-withdraw") { const productId = Number(target.dataset.id) || null; state.editorProductId = productId; state.modalData = { withdrawalMode: action === "fx-open-withdraw" ? "segments" : "product", withdrawalProductId: productId }; state.modal = "fx-customer-withdraw"; return render(); }
    if (action === "fx-confirm-customer-withdraw") {
      const product = products.find(item => item.id === Number(fxRead("fx-withdraw-product")));
      const reason = fxRead("fx-withdraw-reason");
      const segmentMode = state.modalData?.withdrawalMode === "segments";
      if (!product || !reason) return showToast("请选择产品并填写撤回原因");
      const availableSegments = fxProductActiveSegments(product);
      const selectedKeys = segmentMode ? new Set([...document.querySelectorAll("[data-withdraw-segment]:checked")].map(input => input.value)) : new Set(availableSegments.map(segment => segment.key));
      const segments = availableSegments.filter(segment => selectedKeys.has(segment.key));
      if (!segments.length) return showToast(segmentMode ? "请至少选择一个已绑码段" : "该产品暂无可撤回的已绑码段");
      withdrawals.unshift({ id: Date.now(), no: `WD-202607-${String(withdrawals.length + 9).padStart(3, "0")}`, product: product.name, batch: product.batch, customer: product.company, scope: segmentMode ? "segments" : "product", segments, requestedAmount: segments.reduce((sum, segment) => sum + Number(segment.amount || 0), 0), reason, status: "待审批", time: fxNow(), rejectReason: "" });
      state.modal = null; state.customerPage = "withdrawals"; render(); return showToast(segmentMode ? "码段撤回申请已提交" : "全量撤回申请已提交");
    }
    if (action === "fx-scan-image") { state.modalData = { name: target.querySelector("img")?.alt || "产品图片", src: target.dataset.src || target.closest("[data-src]")?.dataset.src }; state.modal = "fx-scan-image"; return render(); }
    if (action === "fx-lightbox-content") return;
    if (action === "fx-scan-pdf") { state.modalData = { name: target.dataset.name || "附件.pdf", type: "application/pdf", src: target.dataset.src || "" }; state.modal = "fx-file"; return render(); }
  }, true);

  const fxSearchFilters = { "fx-operator-search": "operatorFilter", "fx-customer-search": "customerFilter", "fx-order-search": "orderFilter", "fx-bind-request-search": "bindRequestFilter", "fx-review-search": "filter", "fx-withdrawal-search": "withdrawalFilter", "fx-customer-product-search": "customerProductFilter", "fx-message-search": "messageSearch" };
  const fxComposingSearchInputs = new WeakSet();
  function fxCommitSearchInput(target) {
    const key = fxSearchFilters[target.id];
    if (!key) return false;
    state[key] = target.value;
    if (key === "orderFilter") state.highlightOrderNo = null;
    const cursor = target.selectionStart;
    render();
    const replacement = document.getElementById(target.id);
    if (replacement) { replacement.focus(); replacement.setSelectionRange(cursor, cursor); }
    return true;
  }
  function fxUpdateCustomerPickerSearch(target) {
    const prefix = target.id.replace(/-search$/, "");
    const value = document.getElementById(prefix);
    const options = document.getElementById(`${prefix}-options`);
    if (value) value.value = "";
    if (options) options.innerHTML = fxCustomerPickerOptions(prefix, target.value);
    if (prefix === "fx-qr-customer") {
      state.qrDraft.customerId = null;
      const rangePreview = document.getElementById("fx-qr-range-preview");
      if (rangePreview) rangePreview.value = fxQrRangeData().range;
    }
  }
  function fxUpdateBindProductSearch(target) {
    const prefix = target.id.replace(/-search$/, "");
    const picker = target.closest(".bind-product-picker");
    const order = orders.find(item => item.no === state.selectedOrderNo);
    const activated = prefix === "fx-withdraw-product"
      ? products.filter(item => item.company === fxCurrentCustomer().name && item.status === "已激活" && fxProductActiveSegments(item).length && (state.modalData?.withdrawalMode === "segments" || !withdrawals.some(withdrawal => withdrawal.status === "待审批" && withdrawal.customer === item.company && withdrawal.product === item.name && (!withdrawal.batch || withdrawal.batch === item.batch))))
      : order ? products.filter(item => item.company === order.customer && item.status === "已激活") : [];
    const value = document.getElementById(prefix);
    const batch = document.getElementById(`${prefix}-batch`);
    const options = document.getElementById(`${prefix}-options`);
    if (value) value.value = "";
    if (batch) batch.value = "";
    if (options) options.innerHTML = fxBindProductPickerOptions(prefix, activated, target.value, picker?.dataset.allowCreate === "true");
  }
  function fxSyncCustomFieldNameState(target, nameReady) {
    const fieldRow = target.closest(".editor-field-row.is-custom"); if (!fieldRow) return;
    fieldRow.classList.toggle("needs-name", !nameReady);
    const valueInput = fieldRow.querySelector("[data-fx-custom-value]");
    if (valueInput) { valueInput.disabled = !nameReady; valueInput.placeholder = nameReady ? "字段文字内容" : "请先填写字段名称"; }
    fieldRow.querySelectorAll("[data-fx-custom-upload]").forEach(input => { input.disabled = !nameReady; input.closest("label")?.classList.toggle("is-disabled", !nameReady); input.closest("label")?.setAttribute("aria-disabled", String(!nameReady)); });
    const empty = fieldRow.querySelector(".custom-field-file-empty");
    if (empty) empty.textContent = nameReady ? "尚未添加图片或附件" : "填写字段名称后可添加图片或附件";
  }
  document.addEventListener("compositionstart", event => {
    if (fxSearchFilters[event.target.id] || event.target.classList.contains("customer-picker-search") || event.target.classList.contains("bind-product-search")) fxComposingSearchInputs.add(event.target);
  });
  document.addEventListener("compositionend", event => {
    if (event.target.classList.contains("customer-picker-search")) {
      fxComposingSearchInputs.delete(event.target);
      fxUpdateCustomerPickerSearch(event.target);
      return;
    }
    if (event.target.classList.contains("bind-product-search")) {
      fxComposingSearchInputs.delete(event.target);
      fxUpdateBindProductSearch(event.target);
      return;
    }
    if (!fxSearchFilters[event.target.id]) return;
    fxComposingSearchInputs.delete(event.target);
    fxCommitSearchInput(event.target);
  });
  document.addEventListener("input", event => {
    const target = event.target;
    if (target.classList.contains("customer-picker-search")) {
      if (event.isComposing || fxComposingSearchInputs.has(target)) return;
      fxUpdateCustomerPickerSearch(target);
      return;
    }
    if (target.classList.contains("bind-product-search")) {
      if (event.isComposing || fxComposingSearchInputs.has(target)) return;
      fxUpdateBindProductSearch(target);
      return;
    }
    if (fxSearchFilters[target.id]) {
      if (event.isComposing || fxComposingSearchInputs.has(target)) return;
      fxCommitSearchInput(target);
      return;
    }
    if (target.dataset.fxField && state.editorDraft) state.editorDraft[target.dataset.fxField] = target.value;
    if (target.dataset.fxCustomName) { const [module, index] = target.dataset.fxCustomName.split(":"); state.editorDraft.custom[module][Number(index)].name = target.value; fxSyncCustomFieldNameState(target, Boolean(target.value.trim())); }
    if (target.dataset.fxCustomValue) { const [module, index] = target.dataset.fxCustomValue.split(":"); const row = state.editorDraft.custom[module][Number(index)]; if (!String(row.name || "").trim()) { target.value = ""; row.value = ""; return showToast("请先填写字段名称"); } row.value = target.value; }
    if (target.dataset.fxTraceDate) state.editorDraft.trace[Number(target.dataset.fxTraceDate)].date = target.value.replace("T", " ");
    if (target.dataset.fxTraceContent) state.editorDraft.trace[Number(target.dataset.fxTraceContent)].content = target.value;
    if (target.id === "fx-qr-amount") {
      state.qrDraft.amount = Number(target.value);
      const preview = document.getElementById("fx-qr-range-preview");
      if (preview) preview.value = fxQrRangeData(target.value).range;
    }
    if (target.id === "fx-qr-note") state.qrDraft.note = target.value;
    if (target.id === "fx-editor-bind-amount") {
      state.editorRequestedAmount = Number(target.value);
      fxSyncEditorBindingPreview();
    }
    if (target.id === "fx-customer-bind-amount") {
      fxSyncCustomerBindRangePreview();
    }
    if (target.id === "fx-activation-amount") {
      fxSyncActivationRangePreview();
    }
  });
  document.addEventListener("focusin", event => {
    if (event.target.classList.contains("customer-picker-search") || event.target.classList.contains("bind-product-search")) event.target.setAttribute("aria-expanded", "true");
  });
  document.addEventListener("focusout", event => {
    if (!event.target.classList.contains("customer-picker-search") && !event.target.classList.contains("bind-product-search")) return;
    setTimeout(() => {
      const picker = event.target.closest(".customer-picker, .bind-product-picker");
      if (picker && !picker.contains(document.activeElement)) event.target.setAttribute("aria-expanded", "false");
    }, 0);
  });
  document.addEventListener("keydown", event => {
    const target = event.target;
    if (target.classList.contains("clickable-table-row") && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      target.click();
      return;
    }
    if ((target.classList.contains("customer-picker-search") || target.classList.contains("bind-product-search")) && event.key === "ArrowDown") {
      const isProduct = target.classList.contains("bind-product-search");
      const picker = target.closest(isProduct ? ".bind-product-picker" : ".customer-picker");
      const option = picker?.querySelector(isProduct ? ".bind-product-option" : ".customer-picker-option:not(:disabled)");
      if (option) { event.preventDefault(); option.focus(); }
      return;
    }
    const isCustomerOption = target.classList.contains("customer-picker-option");
    const isProductOption = target.classList.contains("bind-product-option");
    if ((!isCustomerOption && !isProductOption) || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const picker = target.closest(isProductOption ? ".bind-product-picker" : ".customer-picker");
    const options = [...(picker?.querySelectorAll(isProductOption ? ".bind-product-option" : ".customer-picker-option:not(:disabled)") || [])];
    const index = options.indexOf(target);
    const next = options[index + (event.key === "ArrowDown" ? 1 : -1)];
    if (next) { event.preventDefault(); next.focus(); }
  });
  document.addEventListener("change", async event => {
    const target = event.target;
    if (target.id === "fx-withdraw-select-all") {
      document.querySelectorAll("[data-withdraw-segment]").forEach(input => { input.checked = target.checked; });
      fxSyncWithdrawalSegmentSelection();
      return;
    }
    if (target.matches("[data-withdraw-segment]")) {
      fxSyncWithdrawalSegmentSelection();
      return;
    }
    if (target.classList.contains("file-input-hidden") && target.files?.[0]) {
      const row = target.previousElementSibling;
      const name = row?.querySelector(".attachment-existing-name");
      if (name) name.innerHTML = `${icon("file-check-2", "✓")}${fxEscape(target.files[0].name)}`;
      row?.classList.remove("is-empty");
      const button = row?.querySelector("[data-action='fx-replace-customer-file']");
      if (button) button.textContent = "更换";
      return;
    }
    if (target.dataset.tableFilter) {
      const tableFilters = { operatorStatus: "operatorStatus", customerStatus: "customerStatus", productCategory: "productCategory", reviewStatus: "reviewStatus", bindRequestStatus: "bindRequestStatus", withdrawalStatus: "withdrawalStatus", customerProductStatus: "customerProductStatus", customerProductCategory: "customerProductCategory", customerWithdrawalStatus: "customerWithdrawalStatus" };
      const key = tableFilters[target.dataset.tableFilter]; if (key) state[key] = target.value; return render();
    }
    if (target.dataset.messageFilter) {
      const filterState = { recipient: "messageRecipientFilter", time: "messageTimeFilter", type: "messageTypeFilter", read: "messageReadFilter" };
      const key = filterState[target.dataset.messageFilter];
      if (key) state[key] = target.value;
      return render();
    }
    if (target.id === "fx-message-select-all") {
      const visibleIds = (state.portal === "customer" ? fxFilteredCustomerMessages() : fxFilteredOpsMessages()).map(item => Number(item.id));
      const selected = new Set(state.selectedMessageIds.map(Number));
      if (target.checked) visibleIds.forEach(id => selected.add(id));
      else visibleIds.forEach(id => selected.delete(id));
      state.selectedMessageIds = [...selected];
      return render();
    }
    if (target.matches("[data-message-select]")) {
      const id = Number(target.value);
      const selected = new Set(state.selectedMessageIds.map(Number));
      if (target.checked) selected.add(id);
      else selected.delete(id);
      state.selectedMessageIds = [...selected];
      return render();
    }
    if (target.id === "fx-qr-style") { state.qrDraft.style = target.value; fxRefreshQrStylePreview(); }
    if (target.id === "fx-qr-size") { state.qrDraft.size = target.value; fxRefreshQrStylePreview(); }
    if (target.id === "fx-editor-range-source") {
      state.editorRequestedSourceRange = target.value;
      const order = orders.find(item => item.no === state.editorTargetOrderNo);
      const product = products.find(item => item.id === state.editorProductId);
      const selected = fxOrderFreeRanges(order, product?.id || state.editorProductId).find(item => item.range === target.value);
      const maximum = selected ? Math.min(selected.amount, fxOrderAvailableAmount(order, product?.id || state.editorProductId)) : 0;
      state.editorRequestedAmount = maximum ? Math.max(1, Math.min(Number(state.editorRequestedAmount) || Math.min(1000, maximum), maximum)) : 0;
      state.editorRequestedRange = fxRequestedRange(state.editorRequestedSourceRange, state.editorRequestedAmount);
      return render();
    }
    if (target.dataset.fxField && state.editorDraft) state.editorDraft[target.dataset.fxField] = target.value;
    if (target.dataset.fxStandardUpload && target.files?.length) {
      const mediaKey = target.dataset.fxStandardUpload; const selected = [...target.files]; const acceptsPdf = target.dataset.fxStandardTypes?.includes("pdf");
      const limit = fxStandardMediaLimit(mediaKey); const limitMessage = limit === 1 ? "该字段最多上传 1 个文件" : `该字段图片与 PDF 合计最多上传 ${limit} 个`;
      const invalid = selected.find(file => !(file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name) || (acceptsPdf && (file.type === "application/pdf" || /\.pdf$/i.test(file.name))))); if (invalid) { target.value = ""; return showToast(`${acceptsPdf ? "该字段仅支持图片或 PDF" : "该字段仅支持图片"}：${invalid.name}`); }
      const oversized = selected.find(file => file.size > 2 * 1024 * 1024); if (oversized) { target.value = ""; return showToast(`文件超过 2 MB：${oversized.name}`); }
      try {
        const saved = []; for (const file of selected) saved.push({ name: file.name, type: file.type || fxFileType(file.name), size: file.size, src: await fxReadFileData(file) });
        state.editorDraft.fieldMedia ||= {}; const merged = fxUniqueFiles([...(state.editorDraft.fieldMedia[mediaKey] || []), ...saved]);
        if (merged.length > limit) { target.value = ""; return showToast(limitMessage); }
        const addedCount = merged.length - (state.editorDraft.fieldMedia[mediaKey] || []).length;
        state.editorDraft.fieldMedia[mediaKey] = merged; render(); showToast(addedCount ? `字段文件已保存 ${addedCount} 项` : "所选文件已存在");
      } catch (_) { target.value = ""; showToast("文件读取失败，请重新选择"); }
      return;
    }
    if (target.dataset.fxCustomUpload && target.files?.length) {
      const [module, indexText] = target.dataset.fxCustomUpload.split(":"); const row = state.editorDraft.custom[module]?.[Number(indexText)]; const selected = [...target.files];
      if (!String(row?.name || "").trim()) { target.value = ""; return showToast("请先填写字段名称"); }
      const invalid = selected.find(file => !(file.type.startsWith("image/") || file.type === "application/pdf" || /\.pdf$/i.test(file.name))); if (invalid) { target.value = ""; return showToast(`不支持文件：${invalid.name}`); }
      const oversized = selected.find(file => file.size > 2 * 1024 * 1024); if (oversized) { target.value = ""; return showToast(`文件超过 2 MB：${oversized.name}`); }
      try {
        const saved = []; for (const file of selected) saved.push({ name: file.name, type: file.type || fxFileType(file.name), size: file.size, src: await fxReadFileData(file) });
        const merged = fxUniqueFiles([...(row.files || []), ...saved]);
        if (merged.length > fxCustomMediaLimit) { target.value = ""; return showToast(`该字段图片与 PDF 合计最多上传 ${fxCustomMediaLimit} 个`); }
        const addedCount = merged.length - (row.files || []).length;
        row.files = merged; render(); showToast(addedCount ? `字段附件已保存 ${addedCount} 项` : "所选文件已存在");
      } catch (_) { target.value = ""; showToast("附件读取失败，请重新选择"); }
      return;
    }
  });

  let fxDraggedEditorField = null;
  document.addEventListener("dragstart", event => {
    const handle = event.target.closest(".editor-drag-handle"); const row = handle?.closest("[data-fx-field-row]"); if (!row || state.editorReadonly) return;
    fxDraggedEditorField = { module: row.dataset.module, token: row.dataset.fxFieldRow };
    row.classList.add("is-dragging");
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", fxDraggedEditorField.token); }
  });
  document.addEventListener("dragover", event => {
    const row = event.target.closest("[data-fx-field-row]"); if (!row || !fxDraggedEditorField || row.dataset.module !== fxDraggedEditorField.module) return;
    event.preventDefault(); row.classList.add("is-drop-target");
  });
  document.addEventListener("dragleave", event => { event.target.closest("[data-fx-field-row]")?.classList.remove("is-drop-target"); });
  document.addEventListener("drop", event => {
    const row = event.target.closest("[data-fx-field-row]"); if (!row || !fxDraggedEditorField || row.dataset.module !== fxDraggedEditorField.module) return;
    event.preventDefault(); const order = state.editorDraft.fieldOrder[fxDraggedEditorField.module]; const from = order.indexOf(fxDraggedEditorField.token); const to = order.indexOf(row.dataset.fxFieldRow);
    if (from >= 0 && to >= 0 && from !== to) { const [token] = order.splice(from, 1); order.splice(to, 0, token); }
    fxDraggedEditorField = null; render();
  });
  document.addEventListener("dragend", () => { fxDraggedEditorField = null; document.querySelectorAll(".editor-field-row.is-dragging, .editor-field-row.is-drop-target").forEach(row => row.classList.remove("is-dragging", "is-drop-target")); });

  let fxDraggedCustomFile = null;
  function fxSameMediaField(item, dragged) {
    if (!item || !dragged || item.dataset.fxMediaModule !== dragged.module) return false;
    return dragged.field ? item.dataset.fxMediaField === dragged.field : !item.dataset.fxMediaField && Number(item.dataset.fxMediaRow) === dragged.rowIndex;
  }
  function fxDraggedMediaFiles(dragged) {
    return dragged.field ? state.editorDraft.fieldMedia?.[dragged.field] || [] : state.editorDraft.custom[dragged.module]?.[dragged.rowIndex]?.files || [];
  }
  document.addEventListener("dragstart", event => {
    const item = event.target.closest("[data-fx-media-index]"); if (!item || state.editorReadonly) return;
    fxDraggedCustomFile = { module: item.dataset.fxMediaModule, field: item.dataset.fxMediaField || "", rowIndex: Number(item.dataset.fxMediaRow), fileIndex: Number(item.dataset.fxMediaIndex) };
    item.classList.add("is-dragging");
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", `media:${fxDraggedCustomFile.fileIndex}`); }
  });
  document.addEventListener("dragover", event => {
    const item = event.target.closest("[data-fx-media-index]"); if (!fxSameMediaField(item, fxDraggedCustomFile)) return;
    event.preventDefault(); item.classList.add("is-drop-target");
  });
  document.addEventListener("dragleave", event => { event.target.closest("[data-fx-media-index]")?.classList.remove("is-drop-target"); });
  document.addEventListener("drop", event => {
    const item = event.target.closest("[data-fx-media-index]"); if (!fxSameMediaField(item, fxDraggedCustomFile)) return;
    event.preventDefault(); const files = fxDraggedMediaFiles(fxDraggedCustomFile); const to = Number(item.dataset.fxMediaIndex); const from = fxDraggedCustomFile.fileIndex;
    if (from >= 0 && to >= 0 && from < files.length && to < files.length && from !== to) { const [file] = files.splice(from, 1); files.splice(to, 0, file); }
    fxDraggedCustomFile = null; render();
  });
  document.addEventListener("dragend", () => { fxDraggedCustomFile = null; document.querySelectorAll(".editor-inline-media-item.is-dragging, .editor-inline-media-item.is-drop-target").forEach(item => item.classList.remove("is-dragging", "is-drop-target")); });

  restoreFromLocation();
  render();
