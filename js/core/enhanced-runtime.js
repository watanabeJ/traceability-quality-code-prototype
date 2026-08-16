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
    if (entryPortal === "customer" && state.authenticated) {
      const current = customers.find(item => item.account === state.currentAccount);
      if (!current || current.status !== "启用") {
        state.authenticated = false;
        fxStore.sessionSet(`trace-auth-${entryPortal}`, "0");
      }
    }
    if (entryPortal !== "scan" && !state.authenticated) app.innerHTML = fxLoginPage(entryPortal);
    else app.innerHTML = state.portal === "ops" ? renderOps() : state.portal === "customer" ? renderCustomer() : renderScan();
    if ((state.portal === "ops" && state.opsPage === "messages") || (state.portal === "customer" && state.customerPage === "messages")) app.insertAdjacentHTML("beforeend", fxMessageCalendar());
    if (state.portal === "ops" && state.opsPage === "operators") app.insertAdjacentHTML("beforeend", fxOperatorCalendar());
    if (state.portal === "ops" && ["inventory", "orders"].includes(state.opsPage)) app.insertAdjacentHTML("beforeend", fxOrderCalendar());
    if ((state.portal === "ops" && ["inventory-detail", "bind-requests", "withdrawals", "reviews", "order-detail"].includes(state.opsPage)) || (state.portal === "customer" && ["orders", "products", "withdrawals"].includes(state.customerPage))) app.insertAdjacentHTML("beforeend", fxCustomerCalendar());
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
    const syncedBusinessKeys = new Set([
      fxBusinessStorage.customers,
      fxBusinessStorage.orders,
      fxBusinessStorage.codeBatches,
      fxBusinessStorage.bindRequests,
      fxBusinessStorage.products,
      fxBusinessStorage.withdrawals,
      fxBusinessStorage.messages,
    ]);
    if (!syncedBusinessKeys.has(event.key) || !event.newValue) return;
    try {
      const syncedItems = JSON.parse(event.newValue);
      if (!Array.isArray(syncedItems)) return;
      if (event.key === fxBusinessStorage.messages) {
        messages.splice(0, messages.length, ...syncedItems);
        const availableIds = new Set(fxVisibleMessages().map(item => Number(item.id)));
        state.selectedMessageIds = state.selectedMessageIds.filter(id => availableIds.has(Number(id)));
      } else if (event.key === fxBusinessStorage.products) {
        products.splice(0, products.length, ...syncedItems);
        products.forEach(product => { if (!product.details) product.details = fxDefaultDetails(product); fxNormalizeDetails(product.details); if (product.status === "草稿") product.submitted = ""; });
        const openedProduct = products.find(product => product.id === state.drawerProductId);
        if (state.portal === "ops" && (!openedProduct || (["fx-activation", "fx-reject"].includes(state.modal) && openedProduct.status !== "待审核") || openedProduct.status === "草稿")) {
          state.drawerProductId = null;
          if (["fx-activation", "fx-reject"].includes(state.modal)) state.modal = null;
        }
      } else if (event.key === fxBusinessStorage.customers) {
        customers.splice(0, customers.length, ...syncedItems);
        customers.forEach((customer, index) => Object.assign(customer, {
          id: customer.id || index + 1,
          password: customer.password || "Trace@2026",
          license: customer.license || "已上传",
          legalId: customer.legalId || "已上传",
        }));
      } else if (event.key === fxBusinessStorage.orders) {
        orders.splice(0, orders.length, ...syncedItems);
        orders.forEach(fxNormalizeAllocationOrder);
        if (state.selectedOrderNo && !orders.some(order => order.no === state.selectedOrderNo)) {
          state.selectedOrderNo = null;
          if (state.modal === "fx-order-bind-requests") state.modal = null;
        }
      } else if (event.key === fxBusinessStorage.codeBatches) {
        codeBatches.splice(0, codeBatches.length, ...syncedItems);
        codeBatches.forEach(fxNormalizeCodeBatch);
        if (state.selectedCodeBatchNo && !codeBatches.some(batch => batch.no === state.selectedCodeBatchNo)) {
          state.selectedCodeBatchNo = null;
          state.allocationCustomerId = null;
          if (state.modal === "fx-code-allocation") state.modal = null;
        }
      } else if (event.key === fxBusinessStorage.bindRequests) {
        bindRequests.splice(0, bindRequests.length, ...syncedItems);
        bindRequests.forEach((item, index) => Object.assign(item, {
          id: item.id || `BR-${Date.now()}-${index}`,
          no: item.no || `BR-202608-${String(index + 1).padStart(3, "0")}`,
          status: item.status || "待审批",
          time: item.time || fxNow(),
          customerId: fxCustomerForRecord(item)?.id || item.customerId || null,
        }));
        const selectedRequest = bindRequests.find(item => fxSameId(item.id, state.selectedBindRequestId));
        if (state.selectedBindRequestId && !selectedRequest) {
          state.selectedBindRequestId = null;
          state.drawerProductId = null;
          if (["fx-bind-request-detail", "fx-bind-request-reject"].includes(state.modal)) state.modal = null;
        } else if (state.modal === "fx-bind-request-reject" && selectedRequest?.status !== "待审批") {
          state.selectedBindRequestId = null;
          state.drawerProductId = null;
          state.modal = null;
        }
        const editingRequest = bindRequests.find(item => fxSameId(item.id, state.editorBindRequestId));
        if (state.editorBindRequestId && (!editingRequest || !["草稿", "已驳回"].includes(editingRequest.status))) {
          state.editorBindRequestId = null;
          state.editorReadonly = true;
          if (state.portal === "customer" && state.customerPage === "editor") {
            state.customerPage = "order-detail";
            state.editorProductId = null;
            state.editorDraft = null;
            fxClearEditorBinding();
          }
          if (state.modal === "fx-submit") state.modal = null;
        }
      } else if (event.key === fxBusinessStorage.withdrawals) {
        const selectedWithdrawalId = withdrawals[state.selectedWithdrawalIndex]?.id;
        withdrawals.splice(0, withdrawals.length, ...syncedItems);
        withdrawals.forEach((item, index) => {
          const legacySegments = fxLegacyWithdrawalSegments[item.no] || [];
          if ((!Array.isArray(item.segments) || !item.segments.length) && !item.resetRanges?.length && legacySegments.length) {
            item.segments = legacySegments.map(segment => ({ ...segment, key: `${segment.orderNo}::${segment.range}::` }));
            item.requestedAmount ||= legacySegments.reduce((sum, segment) => sum + Number(segment.amount || 0), 0);
          }
          Object.assign(item, { id: item.id || index + 1, rejectReason: item.rejectReason || "" });
          const customer = fxCustomerForRecord(item);
          if (customer) item.customerId = customer.id;
        });
        if (selectedWithdrawalId !== undefined && selectedWithdrawalId !== null) {
          const selectedIndex = withdrawals.findIndex(item => String(item.id) === String(selectedWithdrawalId));
          state.selectedWithdrawalIndex = selectedIndex >= 0 ? selectedIndex : null;
          if (selectedIndex < 0 && state.modal === "fx-withdrawal-detail") state.modal = null;
        }
        if (state.modal === "fx-withdraw-decision") {
          const pendingRequest = withdrawals.find(item => String(item.id) === String(state.modalData?.withdrawalId));
          if (!pendingRequest || pendingRequest.status !== "待审批") {
            state.selectedWithdrawalIndex = null;
            state.modalData = null;
            state.modal = null;
          }
        }
      }
      fxRenderFromStorage();
    } catch (_) {}
  });

  function fxRead(id) { return document.getElementById(id)?.value?.trim() || ""; }
  function fxOpenConfirm(data) { state.modalData = data; state.modal = "fx-confirm"; render(); }
  function fxGeneratedBatchNo() { return state.generatedCodeBatchNo || state.generatedOrderNo || ""; }
  function fxSetGeneratedBatchNo(value) {
    state.generatedCodeBatchNo = value || null;
    state.generatedOrderNo = value || null;
  }
  function fxCurrentDateParts() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date()).reduce((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
    return { date: `${parts.year}-${parts.month}-${parts.day}`, month: `${parts.year}${parts.month}` };
  }
  function fxNextBusinessNo(prefix, records) {
    const month = fxCurrentDateParts().month;
    const expression = new RegExp(`^${prefix}-${month}-(\\d+)$`);
    const sequence = records.reduce((maximum, record) => {
      const match = String(record.no || "").match(expression);
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 0) + 1;
    return `${prefix}-${month}-${String(sequence).padStart(3, "0")}`;
  }
  function fxNextAllocationOrderNo() {
    return fxNextBusinessNo("ALLOC", orders);
  }
  function fxNextCodeBatchNo() {
    return fxNextBusinessNo("BATCH", codeBatches);
  }
  function fxNextWithdrawalNo() {
    return fxNextBusinessNo("WD", withdrawals);
  }
  function fxRangeParts(range = "") {
    const [startCode, endCode] = String(range).split("–");
    const start = fxParseCode(startCode);
    const end = fxParseCode(endCode);
    return start && end && start.prefix === end.prefix ? { start, end } : null;
  }
  function fxRangeIntersection(parentRange, requestedRange) {
    const parent = fxRangeParts(parentRange);
    const requested = fxRangeParts(requestedRange);
    if (!parent || !requested || parent.start.prefix !== requested.start.prefix) return null;
    const first = Math.max(parent.start.number, requested.start.number);
    const last = Math.min(parent.end.number, requested.end.number);
    if (first > last) return null;
    return {
      first,
      last,
      amount: last - first + 1,
      range: `${fxCodeAt(parent.start, first)}–${fxCodeAt(parent.start, last)}`,
      parent,
    };
  }
  function fxActivationIdentityMatches(product, activation, includeReset = false) {
    if (!product || !activation || (!includeReset && activation.status === "已重置")) return false;
    return fxActivationBelongsToProduct(activation, product);
  }
  function fxEnabledOperatorSession() {
    return entryPortal === "ops" && state.portal === "ops" && state.authenticated && fxCurrentOperator()?.status === "启用";
  }
  function fxEnabledCustomerSession() {
    return entryPortal === "customer" && state.portal === "customer" && state.authenticated && fxCurrentCustomer()?.status === "启用";
  }
  function fxWithdrawalSegmentMatchesActivation(order, activation, segment) {
    if (!segment || segment.orderNo !== order.no || !segment.range) return null;
    if (segment.activationId) {
      if (!activation.activationId || segment.activationId !== activation.activationId) return null;
    } else if (segment.key && segment.key !== fxWithdrawalSegmentKey(order, activation)) {
      const legacyKey = `${order.no}::${segment.range}::`;
      if (segment.key !== legacyKey || segment.time) return null;
    }
    if (!segment.key && segment.time && segment.time !== activation.time) return null;
    const intersection = fxRangeIntersection(activation.range, segment.range);
    if (!intersection || intersection.range !== segment.range) return null;
    const requestedAmount = Number(segment.amount || 0);
    if (requestedAmount > 0 && requestedAmount !== intersection.amount) return null;
    return intersection;
  }
  function fxResetActivationRange(order, activation, intersection, item, product, resetTime) {
    const originalIndex = order.activations.indexOf(activation);
    if (originalIndex < 0 || !intersection?.amount) return 0;
    const parts = intersection.parent;
    const remaining = [];
    if (parts.start.number < intersection.first) {
      const leftRemainder = {
        ...activation,
        amount: intersection.first - parts.start.number,
        range: `${fxCodeAt(parts.start, parts.start.number)}–${fxCodeAt(parts.start, intersection.first - 1)}`,
      };
      fxRenewActivationId(order, leftRemainder, `${activation.activationId || "activation"}:left`);
      remaining.push(leftRemainder);
    }
    const resetActivation = {
      ...activation,
      productId: activation.productId || product.id,
      customerId: activation.customerId || fxCustomerForRecord(product)?.id || null,
      amount: intersection.amount,
      range: intersection.range,
      status: "已重置",
      resetTime,
      withdrawalNo: item.no,
      withdrawalReason: item.reason,
      resetOperator: fxCurrentOperator().name,
    };
    if (intersection.last < parts.end.number) {
      const rightRemainder = {
        ...activation,
        amount: parts.end.number - intersection.last,
        range: `${fxCodeAt(parts.start, intersection.last + 1)}–${fxCodeAt(parts.start, parts.end.number)}`,
      };
      fxRenewActivationId(order, rightRemainder, `${activation.activationId || "activation"}:right`);
      remaining.push(rightRemainder);
    }
    order.activations.splice(originalIndex, 1, ...remaining, resetActivation);
    return intersection.amount;
  }
  function fxAllocationPreviewRange(rawAmount) {
    const batch = codeBatches.find(item => item.no === state.selectedCodeBatchNo);
    return batch ? fxCodeBatchAllocationRange(batch, Number(rawAmount || 0), state.allocationSourceRange || "") : "";
  }
  function fxSyncCodeAllocationPreview(rawAmount = fxRead("fx-allocation-amount")) {
    const preview = document.getElementById("fx-allocation-range-preview");
    if (preview) preview.value = fxAllocationPreviewRange(rawAmount) || "暂无可分配的连续码段";
  }
  function fxResetListFilters(context) {
    const resets = {
      operators: { operatorNameFilter: "", operatorAccountFilter: "", operatorStatus: "全部状态", operatorDateFrom: "", operatorDateTo: "", operatorDateDraftFrom: "", operatorDateDraftTo: "", operatorCalendarOpen: false },
      customers: { customerNameFilter: "", customerAccountFilter: "", customerPhoneFilter: "", customerStatus: "全部状态", customerSortKey: "", customerSortDirection: "asc" },
      "customer-detail-orders": { customerDetailOrderFilter: "", customerDetailOrderSortKey: "", customerDetailOrderSortDirection: "asc" },
      inventory: { inventoryRangeFilter: "", inventoryStatus: "全部状态", orderFrom: "", orderTo: "", orderDateDraftFrom: "", orderDateDraftTo: "", orderCalendarOpen: false, orderSortKey: "", orderSortDirection: "asc" },
      "inventory-allocations": { inventoryAllocationCustomerFilter: "", inventoryAllocationOrderFilter: "", inventoryAllocationSortKey: "", inventoryAllocationSortDirection: "asc", inventoryAllocationDateFrom: "", inventoryAllocationDateTo: "", inventoryAllocationDateDraftFrom: "", inventoryAllocationDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
      orders: { orderCustomerFilter: "", orderNumberFilter: "", orderFrom: "", orderTo: "", orderDateDraftFrom: "", orderDateDraftTo: "", orderCalendarOpen: false, orderSortKey: "", orderSortDirection: "asc", highlightOrderNo: null },
      reviews: { filter: "", productCategory: "全部大类", reviewStatus: "全部状态", reviewDateFrom: "", reviewDateTo: "", reviewDateDraftFrom: "", reviewDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
      "bind-requests": { bindRequestCustomerFilter: "", bindRequestOrderFilter: "", bindRequestProductFilter: "", bindRequestBatchFilter: "", bindRequestStatus: "全部状态", bindRequestCategory: "全部大类", bindRequestSortKey: "", bindRequestSortDirection: "asc", bindRequestDateFrom: "", bindRequestDateTo: "", bindRequestDateDraftFrom: "", bindRequestDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
      "order-bindings": { orderBindingProductFilter: "", orderBindingBatchFilter: "", orderBindingCategory: "全部大类", orderBindingStatus: "全部状态", orderBindingSortKey: "", orderBindingSortDirection: "asc", orderBindingRequestedDateFrom: "", orderBindingRequestedDateTo: "", orderBindingRequestedDateDraftFrom: "", orderBindingRequestedDateDraftTo: "", orderBindingProcessedDateFrom: "", orderBindingProcessedDateTo: "", orderBindingProcessedDateDraftFrom: "", orderBindingProcessedDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
      withdrawals: { withdrawalNoFilter: "", withdrawalProductFilter: "", withdrawalCustomerFilter: "", withdrawalStatus: "全部状态", withdrawalDateFrom: "", withdrawalDateTo: "", withdrawalDateDraftFrom: "", withdrawalDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
      messages: { messageTitleSearch: "", messageContentSearch: "", messageReadFilter: "全部阅读状态", messageRecipientFilter: "全部接收方", messageTimeFilter: "全部发送时间", messageTypeFilter: "全部消息类型", messageDateFrom: "", messageDateTo: "", messageDateDraftFrom: "", messageDateDraftTo: "", messageCalendarOpen: false, selectedMessageIds: [] },
      "customer-products": { customerProductFilter: "", customerProductStatus: "全部状态", customerProductCategory: "全部大类", customerProductDateFrom: "", customerProductDateTo: "", customerProductDateDraftFrom: "", customerProductDateDraftTo: "", customerCalendarOpen: false, customerCalendarContext: "" },
    };
    if (!resets[context]) return false;
    Object.assign(state, resets[context]);
    return true;
  }
  function fxClearEditorBinding() {
    state.editorTargetOrderNo = null;
    state.editorBindRequestId = null;
    state.editorRequestedSourceRange = "";
    state.editorRequestedRange = "";
    state.editorRequestedAmount = 0;
  }
  function fxOpenEditor(product, owner = "customer", targetOrderNo = null, initialStep = 0, includeBinding = true) {
    if (owner === "customer") {
      if (!fxEnabledCustomerSession()) return showToast("当前客户账号状态异常，请重新登录");
      const currentCustomer = fxCurrentCustomer();
      const effectiveOrderNo = targetOrderNo || product?.requestedOrderNo || product?.preferredOrderNo || null;
      const targetOrder = effectiveOrderNo ? orders.find(item => item.no === effectiveOrderNo && fxRecordBelongsToCustomer(item, currentCustomer) && item.allocationStatus !== "已撤销") : null;
      if ((product && !fxRecordBelongsToCustomer(product, currentCustomer)) || !targetOrder) return showToast("请从订单台账选择有效订单后编辑产品与绑定申请");
      targetOrderNo = effectiveOrderNo;
    } else {
      if (!fxEnabledOperatorSession()) return showToast("当前运营账号状态异常，请重新登录");
      if (!product || !products.some(item => Number(item.id) === Number(product.id))) return showToast("运营端只能编辑已有产品资料");
    }
    state.editorProductId = product?.id || null;
    state.editorDraft = fxNormalizeDetails(product ? fxClone(product.details || fxDefaultDetails(product)) : fxNewDraft());
    state.editorReadonly = Boolean(product && (owner === "customer" ? ["待审核", "已激活"].includes(product.status) : product.status === "已驳回"));
    state.editorOwner = owner;
    state.editorBindRequestId = null;
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
  function fxOpenBindingRecordEditor(product, options = {}) {
    if (!fxEnabledCustomerSession()) return showToast("当前客户账号状态异常，请重新登录");
    const order = orders.find(item => item.no === options.orderNo && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.allocationStatus !== "已撤销");
    if (!product || !fxRecordBelongsToCustomer(product, fxCurrentCustomer()) || !order) return showToast("绑定记录关联的产品或订单不存在");
    const readonly = Boolean(options.readonly);
    state.editorProductId = product.id;
    state.editorDraft = fxNormalizeDetails(fxClone(product.details || fxDefaultDetails(product)));
    state.editorReadonly = readonly;
    state.editorOwner = "customer";
    state.selectedOrderNo = order.no;
    state.editorTargetOrderNo = order.no;
    state.editorBindRequestId = !readonly && options.requestSource === "binding" ? options.requestId || null : null;
    if (readonly) {
      state.editorRequestedSourceRange = options.range || "";
      state.editorRequestedRange = options.range || "";
      state.editorRequestedAmount = Number(options.amount || 0);
    } else {
      const ranges = fxOrderFreeRanges(order, product.id);
      if (!ranges.length || fxOrderAvailableAmount(order, product.id) < 1) return showToast("当前订单没有可重新申请的连续码段");
      const selected = ranges.find(item => {
        const [requestedStart, requestedEnd] = String(options.range || "").split("–");
        return requestedStart && requestedEnd && fxCodeInRange(requestedStart, item.range) && fxCodeInRange(requestedEnd, item.range);
      }) || ranges[0];
      const maximum = selected ? Math.min(selected.amount, fxOrderAvailableAmount(order, product.id)) : 0;
      const amount = maximum ? Math.max(1, Math.min(Number(options.amount || 0) || Math.min(1000, maximum), maximum)) : 0;
      state.editorRequestedSourceRange = selected?.range || "";
      state.editorRequestedAmount = amount;
      state.editorRequestedRange = selected ? fxRequestedRange(selected.range, amount) : "";
    }
    state.editorAddingField = null;
    state.productStep = 0;
    state.customerPage = "editor";
    state.modal = options.openSubmit ? "fx-submit" : null;
    render();
  }
  function fxPersistDraft(submit = false) {
    const draft = state.editorDraft;
    if (!draft) return showToast("产品编辑上下文已失效，请重新进入"), false;
    if (state.editorOwner === "customer" && !fxEnabledCustomerSession()) return showToast("当前客户账号状态异常，请重新登录"), false;
    if (state.editorOwner === "ops" && !fxEnabledOperatorSession()) return showToast("当前运营账号状态异常，请重新登录"), false;
    if (!draft.productName.trim() || !draft.batch.trim()) { showToast("请先填写产品名称和产品批次"); return false; }
    const unnamedContent = fxEditorModules.flatMap((module, moduleIndex) => (draft.custom?.[module] || []).map(row => ({ module, moduleIndex, row }))).find(({ row }) => !String(row.name || "").trim() && (String(row.value || "").trim() || row.files?.length));
    if (unnamedContent) { state.productStep = unnamedContent.moduleIndex; render(); showToast("新增字段必须先填写字段名称"); return false; }
    let product = products.find(item => item.id === state.editorProductId);
    if (state.editorOwner === "ops" && (!product || !["待审核", "已激活"].includes(product.status))) { showToast("运营端只能修改待审核或已激活的已有产品资料"); return false; }
    if (state.editorOwner === "customer" && product && !fxRecordBelongsToCustomer(product, fxCurrentCustomer())) { showToast("无权修改其他客户的产品资料"); return false; }
    const customerOrder = state.editorOwner === "customer" && state.editorTargetOrderNo
      ? orders.find(item => item.no === state.editorTargetOrderNo && item.allocationStatus !== "已撤销" && fxRecordBelongsToCustomer(item, fxCurrentCustomer()))
      : null;
    if (state.editorOwner === "customer" && !customerOrder) { showToast("请从订单台账选择有效订单后编辑产品与绑定申请"); return false; }
    if (!product) { product = { id: Math.max(0, ...products.map(item => item.id)) + 1, customerId: fxCurrentCustomer().id, name: draft.productName, company: fxCurrentCustomer().name, category: draft.category, batch: draft.batch, status: "草稿", submitted: "", amount: 0, details: fxClone(draft), preferredOrderNo: state.editorTargetOrderNo || null }; products.unshift(product); state.editorProductId = product.id; }
    const combined = Boolean(state.editorTargetOrderNo);
    if (submit && combined) {
      const order = orders.find(item => item.no === state.editorTargetOrderNo && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.allocationStatus !== "已撤销");
      if (!order) { showToast("关联订单不存在，请返回订单台账重新发起申请"); return false; }
      if (!state.editorRequestedSourceRange) { state.productStep = fxEditorSteps().length - 1; render(); showToast("请选择可用码段区间"); return false; }
      if (!Number.isSafeInteger(Number(state.editorRequestedAmount)) || Number(state.editorRequestedAmount) < 1) { state.productStep = fxEditorSteps().length - 1; render(); showToast("请输入有效的申请绑定数量"); return false; }
      if (!fxRequestedRangeIsAvailable(order, state.editorRequestedSourceRange, state.editorRequestedRange, state.editorRequestedAmount, product.id)) { state.productStep = fxEditorSteps().length - 1; fxInitializeEditorBinding(product); render(); showToast("所选码段已发生变化，请重新选择"); return false; }
    }
    const bindingContext = state.editorOwner === "ops"
      ? {
          preferredOrderNo: product.preferredOrderNo || null,
          applicationType: product.applicationType || "",
          requestedOrderNo: product.requestedOrderNo || "",
          requestedSourceRange: product.requestedSourceRange || "",
          requestedRange: product.requestedRange || "",
          requestedAmount: Number(product.requestedAmount || 0),
        }
      : {
          preferredOrderNo: combined ? state.editorTargetOrderNo : null,
          applicationType: combined ? "新建产品并绑定" : "",
          requestedOrderNo: combined ? state.editorTargetOrderNo : "",
          requestedSourceRange: combined ? state.editorRequestedSourceRange : "",
          requestedRange: combined ? state.editorRequestedRange : "",
          requestedAmount: combined ? Number(state.editorRequestedAmount || 0) : 0,
        };
    Object.assign(product, {
      name: draft.productName,
      category: draft.category,
      batch: draft.batch,
      details: fxClone(draft),
      ...bindingContext,
    });
    if (submit) { product.status = "待审核"; product.submitted = fxNow(); product.rejectionReason = ""; product.operator = ""; }
    else if (product.status !== "待审核" && product.status !== "已激活") { product.status = "草稿"; product.submitted = ""; product.operator = ""; }
    fxSaveBusiness();
    return true;
  }
  function fxPersistExistingBindEdit(submit = false, saveAsDraft = false) {
    if (!fxEnabledCustomerSession()) return showToast("当前客户账号状态异常，请重新登录"), false;
    const request = bindRequests.find(item => fxSameId(item.id, state.editorBindRequestId) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && ["已驳回", "草稿"].includes(item.status));
    const linkedProduct = fxProductForRecord(request);
    const product = linkedProduct && Number(linkedProduct.id) === Number(state.editorProductId) ? linkedProduct : null;
    const order = request && orders.find(item => item.no === state.editorTargetOrderNo && item.allocationStatus !== "已撤销" && fxRecordBelongsToCustomer(item, fxCurrentCustomer()));
    const draft = state.editorDraft;
    if (!request || !product || !order || !draft) return showToast("绑定申请上下文已失效"), false;
    if (!draft.productName.trim() || !draft.batch.trim()) return showToast("请先填写产品名称和产品批次"), false;
    const unnamedContent = fxEditorModules.flatMap((module, moduleIndex) => (draft.custom?.[module] || []).map(row => ({ module, moduleIndex, row }))).find(({ row }) => !String(row.name || "").trim() && (String(row.value || "").trim() || row.files?.length));
    if (unnamedContent) { state.productStep = unnamedContent.moduleIndex; render(); showToast("新增字段必须先填写字段名称"); return false; }
    const amount = Number(state.editorRequestedAmount || 0);
    if (submit && (!state.editorRequestedSourceRange || !Number.isSafeInteger(amount) || amount < 1 || !fxRequestedRangeIsAvailable(order, state.editorRequestedSourceRange, state.editorRequestedRange, amount, product.id, request.id))) {
      state.productStep = fxEditorSteps().length - 1;
      render();
      showToast("请填写有效的绑定数量和码段");
      return false;
    }
    const previousName = product.name; const previousBatch = product.batch;
    const previousProductIdentity = { id: product.id, name: previousName, batch: previousBatch };
    const productCustomer = fxCustomerForRecord(product);
    Object.assign(product, { name: draft.productName, category: draft.category, batch: draft.batch, details: fxClone(draft) });
    orders.forEach(item => (item.activations || []).forEach(activation => {
      if ((!productCustomer || fxRecordBelongsToCustomer(item, productCustomer)) && fxActivationIdentityMatches(previousProductIdentity, activation, true)) {
        Object.assign(activation, { productId: product.id, customerId: productCustomer?.id || activation.customerId || null, product: product.name, batch: product.batch });
      }
    }));
    withdrawals.forEach(item => {
      const hasProductId = item.productId !== undefined && item.productId !== null && item.productId !== "";
      const sameProduct = hasProductId
        ? Number(item.productId) === Number(product.id)
        : item.product === previousName && item.batch === previousBatch;
      if (sameProduct && productCustomer && fxRecordBelongsToCustomer(item, productCustomer)) Object.assign(item, { productId: product.id, product: product.name, batch: product.batch });
    });
    Object.assign(request, { customerId: fxCurrentCustomer().id, customer: fxCurrentCustomer().name, productId: product.id, product: product.name, batch: product.batch, orderNo: order.no, amount, range: state.editorRequestedRange });
    if (submit) Object.assign(request, { status: "待审批", time: fxNow(), decidedAt: "", operator: "", rejectReason: "", decisionNote: "" });
    else if (saveAsDraft) Object.assign(request, { status: "草稿", time: "", decidedAt: "", operator: "", rejectReason: "", decisionNote: "" });
    fxSaveBusiness();
    return true;
  }

  const fxOpsOnlyActions = new Set([
    "fx-select-activation-order", "fx-select-customer", "fx-select-allocation-range", "fx-replace-customer-file",
    "fx-new-operator", "fx-edit-operator", "fx-confirm-operator", "fx-reset-operator-password", "fx-toggle-operator",
    "fx-new-customer", "fx-view-customer-detail", "fx-back-customers", "fx-back-reviews", "fx-cancel-ops-edit",
    "fx-edit-customer", "fx-customer-view-orders", "fx-focus-order", "fx-view-customer-products", "fx-find-customer-account",
    "fx-confirm-customer", "fx-reset-customer-password", "fx-toggle-customer", "fx-export-customers",
    "fx-new-qr", "fx-finish-order", "fx-view-generated-order", "fx-create-order", "fx-download-qr", "fx-export-orders",
    "fx-open-code-allocation", "fx-choose-allocation-batch", "fx-cancel-allocation-target", "fx-open-code-batch-detail", "fx-confirm-code-allocation",
    "fx-open-allocation-recall", "fx-confirm-allocation-recall",
    "fx-ops-bind-order", "fx-confirm-ops-bind",
    "fx-open-binding-review-product", "fx-edit-binding-review-product", "fx-approve-bind-request", "fx-reject-bind-request",
    "fx-confirm-bind-request-reject", "fx-export-products", "fx-ops-edit-product", "fx-open-activation", "fx-confirm-activation",
    "fx-open-reject", "fx-confirm-reject", "fx-approve-withdrawal", "fx-reject-withdrawal", "fx-confirm-withdraw-decision", "fx-toggle-withdrawal-ranges",
    "fx-sort-customers", "fx-sort-orders", "fx-sort-bindRequests",
  ]);
  const fxCustomerOnlyActions = new Set([
    "fx-focus-customer-order", "fx-withdraw-review-edit", "fx-mark-selected-read", "fx-view-binding-product",
    "fx-edit-binding-product", "fx-withdraw-binding-application", "fx-submit-binding-draft", "fx-submit-existing-bind-draft",
    "fx-customer-bind-order", "fx-customer-select-existing-binding", "fx-customer-back-bind-choice", "fx-customer-new-product-for-order",
    "fx-confirm-customer-bind", "fx-mark-read", "fx-export-customer-orders", "fx-customer-product-status", "fx-new-product",
    "fx-submit-product-row", "fx-back-customer-products", "fx-edit-product", "fx-clear-editor-order", "fx-save-draft",
    "fx-open-submit", "fx-confirm-submit", "fx-open-withdraw", "fx-customer-withdraw", "fx-confirm-customer-withdraw",
  ]);
  const fxScanOnlyActions = new Set(["fx-toggle-scan-fields", "fx-scan-image", "fx-lightbox-content", "fx-scan-pdf"]);

  document.addEventListener("click", async event => {
    const target = event.target.closest("[data-action]"); if (!target) return; const action = target.dataset.action; if (!action?.startsWith("fx-")) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (fxOpsOnlyActions.has(action) && entryPortal !== "ops") return showToast("该操作仅可在运营端执行");
    if (fxCustomerOnlyActions.has(action) && entryPortal !== "customer") return showToast("该操作仅可在客户端执行");
    if (fxScanOnlyActions.has(action) && entryPortal !== "scan") return showToast("该操作仅可在扫码端执行");
    if (entryPortal === "scan" && !fxScanOnlyActions.has(action)) return;
    if (!["fx-login", "fx-logout"].includes(action) && !fxScanOnlyActions.has(action)) {
      if (entryPortal === "ops" && !fxEnabledOperatorSession()) return showToast("当前运营账号状态异常，请重新登录");
      if (entryPortal === "customer" && !fxEnabledCustomerSession()) return showToast("当前客户账号状态异常，请重新登录");
    }
    if (action === "fx-toggle-withdrawal-ranges") {
      const popover = document.getElementById(target.dataset.popoverId || "");
      if (!popover || typeof popover.showPopover !== "function") return;
      if (popover.matches(":popover-open")) popover.hidePopover();
      else popover.showPopover();
      return;
    }
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
      if (prefix === "fx-withdraw-product") {
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
      if (amount) {
        const currentAmount = Number(amount.value);
        amount.max = String(availableAmount);
        amount.value = String(Math.min(availableAmount, Number.isSafeInteger(currentAmount) && currentAmount > 0 ? currentAmount : availableAmount));
      }
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
      if (prefix === "fx-allocation-customer") state.allocationCustomerId = customer.id;
      target.blur();
      return;
    }
    if (action === "fx-select-allocation-range") return;
    if (action === "fx-toggle-scan-fields") { const module = target.dataset.module; state.scanExpandedModules = { ...(state.scanExpandedModules || {}), [module]: !state.scanExpandedModules?.[module] }; return render(); }
    if (action === "fx-login") { const account = fxRead("fx-login-account"), password = fxRead("fx-login-password"); const list = entryPortal === "ops" ? fxOperators : customers; const user = list.find(item => item.account === account); if (!user || user.password !== password) return showToast("账号或密码错误"); if (user.status !== "启用") return showToast("该账号已禁用，请联系管理员"); state.authenticated = true; state.currentAccount = user.account; fxStore.sessionSet(`trace-auth-${entryPortal}`, "1"); fxStore.sessionSet(`trace-account-${entryPortal}`, user.account); state.modal = null; state.modalData = null; state.selectedOrderNo = null; state.selectedBindRequestId = null; state.selectedWithdrawalIndex = null; state.drawerProductId = null; state.editorProductId = null; state.editorDraft = null; fxClearEditorBinding(); restoreFromLocation(); render(); return showToast("登录成功"); }
    if (action === "fx-logout") { state.authenticated = false; fxStore.sessionSet(`trace-auth-${entryPortal}`, "0"); state.modal = null; state.modalData = null; state.selectedOrderNo = null; state.selectedBindRequestId = null; state.selectedWithdrawalIndex = null; state.drawerProductId = null; state.editorProductId = null; state.editorDraft = null; fxClearEditorBinding(); render(); return; }
    if (action === "fx-new-operator") { if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作"); state.selectedOperatorId = null; state.modal = "fx-operator"; return render(); }
    if (action === "fx-edit-operator") { if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作"); state.selectedOperatorId = Number(target.dataset.id); state.modal = "fx-operator"; return render(); }
    if (action === "fx-confirm-operator") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
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
    if (action === "fx-reset-operator-password") { if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作"); const item = fxOperators.find(row => row.id === Number(target.dataset.id)); if (!item) return showToast("运营账号不存在"); if (fxIsCurrentOperator(item)) return showToast("当前账号请在个人设置中修改密码"); state.modalData = { kind: "reset-operator", id: item.id, requiresPassword: true, title: "重置运营账号密码", subtitle: "重置其他运营账号密码前，需要验证当前登录密码。", subject: `${item.name}（${item.account}）`, operation: "重置为初始密码 Trace@2026", danger: true }; state.modal = "fx-confirm"; return render(); }
    if (action === "fx-toggle-operator") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
      const item = fxOperators.find(row => row.id === Number(target.dataset.id));
      if (!item) return showToast("运营账号不存在");
      if (fxIsCurrentOperator(item)) return showToast("当前登录账号不能更改自身状态");
      const nextStatus = item.status === "启用" ? "禁用" : "启用";
      state.modalData = { kind: "toggle-operator", id: item.id, nextStatus, requiresPassword: nextStatus === "禁用", title: `${nextStatus}运营账号`, subtitle: nextStatus === "禁用" ? "禁用其他运营账号前，需要验证当前登录密码。" : "此操作需要二次确认。", subject: `${item.name}（${item.account}）`, operation: nextStatus === "禁用" ? "禁用后该账号无法登录" : "恢复后台登录权限", danger: nextStatus === "禁用" };
      state.modal = "fx-confirm"; return render();
    }
    if (action === "fx-new-customer") { if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作"); state.selectedCustomerId = null; state.modal = "fx-customer"; return render(); }
    if (action === "fx-view-customer-detail") { state.selectedCustomerId = Number(target.dataset.id); state.modal = null; state.opsPage = "customer-detail"; return render(); }
    if (action === "fx-back-customers") { state.selectedCustomerId = null; state.opsPage = "customers"; return render(); }
    if (action === "fx-back-reviews") { state.drawerProductId = null; state.selectedBindRequestId = null; state.modal = null; state.reviewEditing = false; state.editorProductId = null; state.editorDraft = null; fxClearEditorBinding(); state.opsPage = "bind-requests"; return render(); }
    if (action === "fx-cancel-ops-edit") { state.reviewEditing = false; state.editorProductId = null; state.editorDraft = null; state.editorReadonly = false; state.editorAddingField = null; return render(); }
    if (action === "fx-edit-customer") { if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作"); state.selectedCustomerId = Number(target.dataset.id); state.modal = "fx-customer"; return render(); }
    if (action === "fx-customer-view-orders") { const item = customers.find(row => row.id === Number(target.dataset.id)); if (!item) return showToast("客户账号不存在"); state.modal = null; state.orderCustomerFilter = item.name; state.orderNumberFilter = ""; state.opsPage = "orders"; render(); return showToast(`正在查看 ${item.name} 的订单`); }
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
      state.selectedOrderNo = order.no;
      state.customerPage = "order-detail";
      return render();
    }
    if (action === "fx-focus-order") { if (state.portal !== "ops") return showToast("当前账号无权执行此操作"); const order = orders.find(item => item.no === target.dataset.no && item.allocationStatus !== "已撤销"); if (!order) return showToast("订单不存在"); state.selectedOrderNo = order.no; state.modal = null; state.opsPage = "order-detail"; return render(); }
    if (action === "fx-view-customer-products") { const item = customers.find(row => row.name === target.dataset.customer); if (!item) return showToast("客户账号不存在"); state.modal = null; state.bindRequestCustomerFilter = item.name; state.bindRequestOrderFilter = ""; state.bindRequestProductFilter = ""; state.bindRequestBatchFilter = ""; state.bindRequestStatus = "全部状态"; state.opsPage = "bind-requests"; render(); return showToast(`正在查看 ${item.name} 的绑定申请`); }
    if (action === "fx-find-customer-account") { const item = customers.find(row => row.name === target.dataset.customer); if (!item) return showToast("客户账号不存在"); state.customerNameFilter = item.name; state.customerAccountFilter = ""; state.customerPhoneFilter = ""; state.opsPage = "customers"; render(); return; }
    if (["fx-confirm-customer", "fx-reset-customer-password", "fx-toggle-customer"].includes(action) && !fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
    if (action === "fx-confirm-customer") { const name = fxRead("fx-customer-name"), phone = fxRead("fx-customer-phone"); let item = customers.find(row => row.id === state.selectedCustomerId); const account = item?.account || fxRead("fx-customer-account"); if (!name || !account || !phone) return showToast("请完整填写客户名称、账号和联系电话"); const licenseFile = document.getElementById("fx-customer-license")?.files?.[0]; const legalFile = document.getElementById("fx-customer-legal")?.files?.[0]; const selectedFiles = [licenseFile, legalFile].filter(Boolean); const invalid = selectedFiles.find(file => !(file.type.startsWith("image/") || file.type === "application/pdf" || /\.pdf$/i.test(file.name))); if (invalid) return showToast(`不支持证照文件：${invalid.name}`); const oversized = selectedFiles.find(file => file.size > 10 * 1024 * 1024); if (oversized) return showToast(`证照文件超过 10 MB：${oversized.name}`); if (!item && (!licenseFile || !legalFile)) return showToast("请上传营业执照和法人身份证"); if (!item && customers.some(row => row.account === account)) return showToast("客户登录账号已存在"); const password = item ? item.password : fxRead("fx-customer-password"); if (!item && password.length < 8) return showToast("初始密码至少 8 位"); try { const toAttachment = async file => file ? { name: file.name, type: file.type || fxFileType(file.name), size: file.size, src: await fxReadFileData(file) } : null; const license = await toAttachment(licenseFile); const legal = await toAttachment(legalFile); if (item) { const previousName = item.name; Object.assign(item, { name, phone, license: license || item.license, legalId: legal || item.legalId }); if (previousName !== name) { orders.forEach(record => { if (fxRecordBelongsToCustomer(record, item) || record.customer === previousName) Object.assign(record, { customerId: item.id, customer: name }); }); products.forEach(record => { if (fxRecordBelongsToCustomer(record, item) || record.company === previousName) Object.assign(record, { customerId: item.id, company: name }); }); bindRequests.forEach(record => { if (fxRecordBelongsToCustomer(record, item) || record.customer === previousName) Object.assign(record, { customerId: item.id, customer: name }); }); withdrawals.forEach(record => { if (fxRecordBelongsToCustomer(record, item) || record.customer === previousName) Object.assign(record, { customerId: item.id, customer: name }); }); messages.forEach(record => { if (fxRecordBelongsToCustomer(record, item) || record.recipient === previousName || record.customer === previousName) Object.assign(record, { customerId: item.id, recipient: record.recipient === previousName ? name : record.recipient, customer: record.customer === previousName ? name : record.customer }); }); } } else { item = { id: Date.now(), name, account, phone, password, status: "启用", total: 0, active: 0, license, legalId: legal }; customers.unshift(item); } state.modal = null; render(); return showToast("客户账号与真实证照附件已保存"); } catch (_) { return showToast("证照文件读取失败，请重新选择"); } }
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
    if (action === "fx-sort-customerDetailOrders") { fxToggleSort("customerDetailOrder", target.dataset.sort); return render(); }
    if (action === "fx-sort-orders") { fxToggleSort("order", target.dataset.sort); return render(); }
    if (action === "fx-sort-inventoryAllocations") { fxToggleSort("inventoryAllocation", target.dataset.sort); return render(); }
    if (action === "fx-sort-bindRequests") { fxToggleSort("bindRequest", target.dataset.sort); return render(); }
    if (action === "fx-sort-orderBindings") { fxToggleSort("orderBinding", target.dataset.sort); return render(); }
    if (action === "fx-sort-customerOrders") { fxToggleSort("customerOrder", target.dataset.sort); return render(); }
    if (action === "fx-sort-customerProducts") { fxToggleSort("customerProduct", target.dataset.sort); return render(); }
    if (action === "fx-withdraw-review-edit") {
      if (state.portal !== "customer") return showToast("当前账号无权执行此操作");
      const product = products.find(item => item.id === Number(target.dataset.id) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()));
      if (!product || product.status !== "待审核") return showToast("该产品当前不在待审核状态");
      state.modalData = { kind: "withdraw-review-edit", id: product.id, title: "撤回审核并修改", subtitle: "撤回后，运营端将不再审核当前提交版本。", subject: `${product.name}（${product.batch}）`, operation: "恢复为草稿并进入编辑，保留待关联订单", danger: true };
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
      messages.filter(item => fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && ids.has(Number(item.id))).forEach(item => item.unread = false);
      state.selectedMessageIds = []; fxSaveBusiness(); render(); return showToast("所选消息已标记为已读");
    }
    if (action === "fx-confirm-generic") {
      const data = state.modalData || {};
      const allowedKinds = new Set(["withdraw-review-edit", "withdraw-bind-request", "reset-operator", "toggle-operator", "update-operator", "reset-customer", "toggle-customer", "delete-messages"]);
      if (state.modal !== "fx-confirm" || !allowedKinds.has(data.kind)) return showToast("确认操作已失效，请重新发起");
      if (data.kind === "withdraw-review-edit") {
        if (!fxEnabledCustomerSession()) return showToast("当前账号无权执行此操作");
        const product = products.find(item => item.id === Number(data.id) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()));
        if (!product || product.status !== "待审核") return showToast("该产品状态已变化，请刷新后重试");
        const withdrawnAt = fxNow();
        product.status = "草稿";
        product.submitted = "";
        product.reviewWithdrawnAt = withdrawnAt;
        product.reviewHistory = [...(Array.isArray(product.reviewHistory) ? product.reviewHistory : []), { action: "客户撤回审核", time: withdrawnAt, operator: fxCurrentCustomer().name }];
        state.modal = null;
        fxSaveBusiness();
        fxOpenEditor(product, "customer", product.requestedOrderNo || product.preferredOrderNo || null);
        return showToast("审核申请已撤回，可修改后重新提交");
      }
      if (data.kind === "withdraw-bind-request") {
        if (!fxEnabledCustomerSession()) return showToast("当前账号无权执行此操作");
        const index = bindRequests.findIndex(item => fxSameId(item.id, data.id) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.status === "待审批");
        if (index < 0) return showToast("申请状态已变化，请刷新后重试");
        bindRequests.splice(index, 1);
        fxSaveBusiness();
        state.modal = null;
        render();
        return showToast("绑定申请已撤回");
      }
      if (data.kind === "reset-operator") {
        if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
        const current = fxOperators.find(row => row.account === state.currentAccount);
        if (!current || current.status !== "启用") return showToast("当前登录账号状态异常，请重新登录");
        const item = fxOperators.find(row => row.id === Number(data.id));
        if (!item) return showToast("运营账号不存在");
        if (fxIsCurrentOperator(item)) return showToast("当前账号请在个人设置中修改密码");
        if (fxRead("fx-operator-action-password") !== current.password) return showToast("当前登录密码不正确");
        item.password = "Trace@2026";
      }
      if (["toggle-operator", "update-operator"].includes(data.kind)) {
        if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
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
      if (data.kind === "reset-customer") {
        if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
        const item = customers.find(candidate => candidate.id === data.id);
        if (!item) return showToast("客户账号不存在");
        item.password = "Trace@2026";
      }
      if (data.kind === "toggle-customer") {
        if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
        const item = customers.find(row => row.id === data.id);
        if (!item) return showToast("客户账号不存在");
        item.status = item.status === "启用" ? "禁用" : "启用";
      }
      if (data.kind === "delete-messages") {
        if (entryPortal === "ops" ? !fxEnabledOperatorSession() : !fxEnabledCustomerSession()) return showToast("当前账号无权执行此操作");
        const ids = new Set(state.selectedMessageIds.map(Number));
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          const allowed = state.portal === "customer" ? fxRecordBelongsToCustomer(messages[index], fxCurrentCustomer()) : fxIsCustomerMessage(messages[index]);
          if (ids.has(Number(messages[index].id)) && allowed) messages.splice(index, 1);
        }
        state.selectedMessageIds = [];
      }
      fxSaveOperators(); fxSaveBusiness(); state.modal = null; render(); return showToast("操作已完成");
    }
    if (action === "fx-export-customers") { fxDownloadExcel(`客户列表_${fxToday}.xls`, ["客户名称", "账号", "联系电话", "状态", "订单码量", "已激活", "绑定申请中", "剩余可用"], customers.map(item => { const summary = fxCustomerCodeSummary(item.name); return [item.name, item.account, item.phone, item.status, summary.total, summary.active, summary.pending, summary.available]; })); return showToast("客户列表已导出"); }
    if (action === "fx-new-qr") { if (!fxEnabledOperatorSession()) return showToast("仅运营端可以生成码段"); state.qrStep = 1; state.qrDraft.amount = 500; state.qrDraft.note = ""; state.qrDraft.size = "custom"; state.qrDraft.customWidth = 25; state.qrDraft.customHeight = 25; fxSetGeneratedBatchNo(null); return render(); }
    if (action === "fx-finish-order") { state.inventoryRangeFilter = ""; state.highlightOrderNo = null; fxSetGeneratedBatchNo(null); state.opsPage = "inventory"; return render(); }
    if (action === "fx-view-generated-order") { const no = fxGeneratedBatchNo(); if (!no) return showToast("尚未生成码段"); const batch = codeBatches.find(item => item.no === no); state.inventoryRangeFilter = batch?.range || ""; state.opsPage = "inventory"; return render(); }
    if (action === "fx-create-order") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权生成码段");
      const amount = Number(fxRead("fx-qr-amount"));
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) return showToast("单个批次生成数量必须为 1–10,000,000 枚");
      state.qrDraft.amount = amount;
      state.qrDraft.note = fxRead("fx-qr-note");
      const customWidth = Number(fxRead("fx-qr-width")); const customHeight = Number(fxRead("fx-qr-height"));
      if (!Number.isFinite(customWidth) || !Number.isFinite(customHeight) || customWidth < 8 || customHeight < 8 || customWidth > 300 || customHeight > 300) return showToast("输出宽高必须在 8–300 mm 之间");
      state.qrDraft.size = "custom";
      state.qrDraft.customWidth = customWidth;
      state.qrDraft.customHeight = customHeight;
      const prefix = state.qrDraft.prefix || "QR";
      const start = fxNextCodeSerialNumber(prefix);
      const no = fxNextCodeBatchNo();
      const currentDate = fxCurrentDateParts().date;
      const size = `${state.qrDraft.customWidth} × ${state.qrDraft.customHeight} mm`;
      const batch = fxNormalizeCodeBatch({ id: Date.now(), no, range: `${fxSerial(prefix, start)}–${fxSerial(prefix, start + amount - 1)}`, total: amount, created: currentDate, createdAt: fxNow(), style: "二维码核心区块", size, customWidth: state.qrDraft.customWidth, customHeight: state.qrDraft.customHeight, note: state.qrDraft.note }, codeBatches.length);
      codeBatches.unshift(batch); fxSetGeneratedBatchNo(no); state.qrStep = 4; fxSaveBusiness(); render();
      return showToast("码段已生成，当前状态为未分配");
    }
    if (action === "fx-download-qr") {
      const batch = codeBatches.find(item => item.no === fxGeneratedBatchNo());
      if (!batch) return showToast("码段不存在");
      const result = fxDownloadQrPackage(batch);
      return showToast(result === "queued" ? `已创建 ${formatNumber(batch.total)} 枚二维码完整下载任务，不限制码量` : "二维码核心区块压缩包已开始下载");
    }
    if (action === "fx-export-orders") {
      const rangeTerm = state.inventoryRangeFilter.trim().toLowerCase();
      const preparedRows = codeBatches.map(item => ({ ...item, allocated: fxCodeBatchAllocatedAmount(item), remaining: fxCodeBatchAvailableAmount(item) }));
      const rows = fxSortedRows(preparedRows.filter(item => {
        const created = item.created || String(item.createdAt || "").slice(0, 10);
        return (!rangeTerm || String(item.range || "").toLowerCase().includes(rangeTerm)) && (state.inventoryStatus === "全部状态" || fxCodeBatchStatus(item) === state.inventoryStatus) && (!state.orderFrom || created >= state.orderFrom) && (!state.orderTo || created <= state.orderTo);
      }), "order", item => item.createdAt || item.created);
      fxDownloadExcel(`码段库存_${fxToday}.xls`, ["生成时间", "序列号范围", "备注", "生成数量", "已分配", "剩余库存", "分配状态"], rows.map(item => [item.createdAt || item.created || "", item.range, item.note || "", item.total, fxCodeBatchAllocatedAmount(item), fxCodeBatchAvailableAmount(item), fxCodeBatchAllocationStatus(item)]));
      return showToast(`已导出当前筛选结果，共 ${rows.length} 条`);
    }
    if (action === "fx-export-order-ledger") {
      const customerTerm = state.orderCustomerFilter.trim().toLowerCase(); const numberTerm = state.orderNumberFilter.trim().toLowerCase();
      const rows = orders.filter(item => item.allocationStatus !== "已撤销" && (!customerTerm || String(item.customer || "").toLowerCase().includes(customerTerm)) && (!numberTerm || String(item.no || "").toLowerCase().includes(numberTerm)));
      fxDownloadExcel(`订单台账_${fxToday}.xls`, ["订单号", "客户名称", "分配时间", "序列号范围", "订单码量", "已激活", "绑定申请中", "剩余可用"], rows.map(item => [item.no, item.customer || "", item.allocatedAt || item.createdAt || item.created || "", item.range, item.total, item.active, fxOrderPendingAmount(item), fxOrderAvailableAmount(item)]));
      return showToast(`已导出当前订单台账，共 ${rows.length} 条`);
    }
    if (action === "fx-open-code-allocation") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权分配码段");
      const batch = codeBatches.find(item => item.no === target.dataset.no);
      if (!batch || fxCodeBatchAvailableAmount(batch) < 1) return showToast("当前码段没有可分配库存");
      const requestedCustomer = customers.find(item => item.id === Number(target.dataset.customerId) && item.status === "启用");
      state.selectedCodeBatchNo = batch.no; state.allocationCustomerId = requestedCustomer?.id || null; state.allocationSourceRange = fxCodeBatchFreeRanges(batch)[0]?.range || ""; state.modal = "fx-code-allocation"; return render();
    }
    if (action === "fx-choose-allocation-batch") { if (!fxEnabledOperatorSession()) return showToast("请由运营端分配码段"); const customer = customers.find(item => item.id === Number(target.dataset.customerId) && item.status === "启用"); if (!customer) return showToast("客户账号不存在或已禁用"); state.allocationCustomerId = customer.id; state.inventoryRangeFilter = ""; state.opsPage = "inventory"; return render(); }
    if (action === "fx-cancel-allocation-target") { state.allocationCustomerId = null; state.allocationSourceRange = ""; return render(); }
    if (action === "fx-open-code-batch-detail") {
      if (!fxEnabledOperatorSession()) return showToast("库存码段详情仅运营端可查看");
      const batch = codeBatches.find(item => item.no === target.dataset.no);
      if (!batch) return showToast("库存码段不存在");
      state.selectedCodeBatchNo = batch.no; state.modal = null; state.opsPage = "inventory-detail"; return render();
    }
    if (action === "fx-open-allocation-recall") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权撤销码段分配");
      if (state.opsPage !== "inventory-detail") return showToast("请在库存码段详情中撤销分配");
      const order = orders.find(item => item.no === target.dataset.no && item.allocationStatus !== "已撤销");
      if (!order) return showToast("分配记录不存在或已经撤销");
      const reason = fxCodeAllocationRecallBlockReason(order);
      if (reason) return showToast(reason);
      state.selectedOrderNo = order.no; state.modal = "fx-allocation-recall"; return render();
    }
    if (action === "fx-confirm-allocation-recall") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权撤销码段分配");
      if (state.opsPage !== "inventory-detail") return showToast("请在库存码段详情中撤销分配");
      const latestOrders = fxStore.get(fxBusinessStorage.orders, null);
      if (Array.isArray(latestOrders)) { orders.splice(0, orders.length, ...latestOrders); orders.forEach(fxNormalizeAllocationOrder); }
      const order = orders.find(item => item.no === state.selectedOrderNo && item.allocationStatus !== "已撤销");
      if (!order) return showToast("分配记录不存在或已经撤销");
      const blockReason = fxCodeAllocationRecallBlockReason(order);
      if (blockReason) { state.modal = null; render(); return showToast(blockReason); }
      const recallReason = fxRead("fx-allocation-recall-reason").trim();
      if (!recallReason) return showToast("请输入撤销原因");
      const recalledAt = fxNow();
      const recalledBy = fxCurrentOperator().name;
      const linkedRequests = bindRequests.filter(request => request.orderNo === order.no && request.status !== "已撤回");
      linkedRequests.forEach(request => Object.assign(request, { status: "已撤回", withdrawnAt: recalledAt, withdrawnBy: recalledBy, withdrawalReason: recallReason }));
      const linkedProducts = products.filter(product => product.applicationType === "新建产品并绑定" && product.requestedOrderNo === order.no);
      linkedProducts.forEach(product => Object.assign(product, {
        status: product.status === "已激活" ? "已激活" : "草稿",
        applicationType: "",
        preferredOrderNo: null,
        requestedOrderNo: "",
        requestedSourceRange: "",
        requestedRange: "",
        requestedAmount: 0,
        submitted: product.status === "已激活" ? product.submitted : "",
        allocationRecallCancelledAt: recalledAt,
        allocationRecallCancelledBy: recalledBy,
        allocationRecallReason: recallReason,
      }));
      Object.assign(order, { allocationStatus: "已撤销", recalledAt, recalledBy, recallReason });
      const sourceBatchNo = order.sourceBatchNo;
      state.modal = null; state.selectedOrderNo = null; state.orderDetailReturnPage = "";
      state.selectedCodeBatchNo = codeBatches.some(batch => batch.no === sourceBatchNo) ? sourceBatchNo : null;
      state.opsPage = state.selectedCodeBatchNo ? "inventory-detail" : "inventory";
      fxSaveBusiness(); render();
      const cancelledCount = linkedRequests.length + linkedProducts.length;
      return showToast(`订单 ${order.no} 已撤销分配，${formatNumber(order.total || 0)} 枚码已归还库存${cancelledCount ? `，${cancelledCount} 条关联绑定流程已取消` : ""}`);
    }
    if (action === "fx-confirm-code-allocation") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权分配码段");
      const latestOrders = fxStore.get(fxBusinessStorage.orders, null);
      const latestBatches = fxStore.get(fxBusinessStorage.codeBatches, null);
      if (Array.isArray(latestOrders)) { orders.splice(0, orders.length, ...latestOrders); orders.forEach(fxNormalizeAllocationOrder); }
      if (Array.isArray(latestBatches)) { codeBatches.splice(0, codeBatches.length, ...latestBatches); codeBatches.forEach(fxNormalizeCodeBatch); }
      const batch = codeBatches.find(item => item.no === state.selectedCodeBatchNo);
      const customer = customers.find(item => item.id === Number(fxRead("fx-allocation-customer")) && item.status === "启用");
      const amount = Number(fxRead("fx-allocation-amount"));
      const sourceRange = fxRead("fx-allocation-source-range") || state.allocationSourceRange || "";
      const note = fxRead("fx-allocation-note").trim();
      if (!batch) return showToast("库存码段不存在");
      if (!customer) return showToast("请选择启用状态的客户账号");
      const selectedFreeRange = fxCodeBatchFreeRanges(batch).find(item => item.range === sourceRange);
      if (!selectedFreeRange) return showToast("所选连续区间已发生变化，请重新选择");
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > selectedFreeRange.amount) return showToast("分配数量必须在所选连续区间内");
      const range = fxRequestedRange(selectedFreeRange.range, amount);
      if (!range || fxCodeBatchAllocationRange(batch, amount, sourceRange) !== range) return showToast("所选码段已被占用，请重新分配");
      const allocatedAt = fxNow(); const orderNo = fxNextAllocationOrderNo();
      const order = fxNormalizeAllocationOrder({ id: Date.now(), no: orderNo, sourceBatchNo: batch.no, customer: customer.name, customerId: customer.id, range, total: amount, active: 0, created: fxCurrentDateParts().date, createdAt: allocatedAt, allocatedAt, allocatedBy: fxCurrentOperator().name, allocationStatus: "已分配", activations: [], note }, orders.length);
      orders.unshift(order);
      state.modal = null; state.selectedCodeBatchNo = batch.no; state.selectedOrderNo = order.no; state.allocationCustomerId = null; state.allocationSourceRange = ""; state.opsPage = "order-detail"; fxSaveBusiness(); render();
      return showToast(`已向 ${customer.name} 分配 ${formatNumber(amount)} 枚码`);
    }
    if (action === "fx-order-detail") {
      if (state.portal === "ops" && !fxEnabledOperatorSession()) return showToast("当前账号无权查看订单");
      if (state.portal === "customer" && !fxEnabledCustomerSession()) return showToast("当前账号无权查看订单");
      const order = orders.find(item => item.no === target.dataset.no);
      if (!order || order.allocationStatus === "已撤销" || (state.portal === "customer" && !fxRecordBelongsToCustomer(order, fxCurrentCustomer()))) return showToast("订单不存在");
      state.orderDetailReturnPage = state.portal === "ops" && ["customer-detail", "inventory-detail"].includes(state.opsPage) ? state.opsPage : "";
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
      else state.opsPage = state.orderDetailReturnPage || "orders";
      state.orderDetailReturnPage = "";
      return render();
    }
    if (action === "fx-ops-bind-order") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
      const order = orders.find(item => item.no === target.dataset.no && item.allocationStatus !== "已撤销");
      if (!order || fxOrderAvailableAmount(order) < 1) return showToast("当前订单没有可绑定的可用码量");
      state.selectedOrderNo = order.no;
      state.modal = "fx-ops-bind-order";
      return render();
    }
    if (action === "fx-view-order-bind-requests") {
      const order = orders.find(item => item.no === target.dataset.no && item.allocationStatus !== "已撤销" && (fxEnabledOperatorSession() || (fxEnabledCustomerSession() && fxRecordBelongsToCustomer(item, fxCurrentCustomer()))));
      if (!order) return showToast("订单不存在或无权查看");
      state.selectedOrderNo = order.no;
      state.modal = "fx-order-bind-requests";
      return render();
    }
    if (action === "fx-view-bind-request") {
      const request = bindRequests.find(item => fxSameId(item.id, target.dataset.id) && (fxEnabledOperatorSession() || (fxEnabledCustomerSession() && fxRecordBelongsToCustomer(item, fxCurrentCustomer()))));
      if (!request) return showToast("绑定申请不存在或无权查看");
      state.selectedBindRequestId = request.id;
      state.modal = "fx-bind-request-detail";
      return render();
    }
    if (action === "fx-view-binding-product") {
      if (!fxEnabledCustomerSession()) return showToast("当前账号无权执行此操作");
      const product = products.find(item => item.id === Number(target.dataset.id) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()));
      if (!product || !["待审核", "已激活"].includes(product.status)) return showToast("产品状态已变化，请刷新后重试");
      return fxOpenBindingRecordEditor(product, { orderNo: target.dataset.orderNo, range: target.dataset.range, amount: target.dataset.amount, requestId: target.dataset.requestId, requestSource: target.dataset.requestSource, readonly: true });
    }
    if (action === "fx-edit-binding-product") {
      if (!fxEnabledCustomerSession()) return showToast("当前账号无权执行此操作");
      const product = products.find(item => item.id === Number(target.dataset.id) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()));
      if (!product || !["草稿", "已驳回", "已激活"].includes(product.status)) return showToast("产品状态已变化，请刷新后重试");
      return fxOpenBindingRecordEditor(product, { orderNo: target.dataset.orderNo, range: target.dataset.range, amount: target.dataset.amount, requestId: target.dataset.requestId, requestSource: target.dataset.requestSource, readonly: false });
    }
    if (action === "fx-withdraw-binding-application") {
      if (!fxEnabledCustomerSession()) return showToast("当前账号无权执行此操作");
      if (target.dataset.source === "product-review") {
        const product = products.find(item => item.id === Number(target.dataset.productId) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.status === "待审核");
        if (!product) return showToast("申请状态已变化，请刷新后重试");
        state.modalData = { kind: "withdraw-review-edit", id: product.id, title: "撤回申请", subtitle: "撤回后，运营端将不再审核当前提交版本。", subject: `${product.name}（${product.batch || "—"}）`, operation: "恢复为待提交状态并保留当前资料", danger: true };
      } else {
        const request = bindRequests.find(item => fxSameId(item.id, target.dataset.requestId) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.status === "待审批");
        if (!request) return showToast("申请状态已变化，请刷新后重试");
        state.modalData = { kind: "withdraw-bind-request", id: request.id, title: "撤回申请", subtitle: "撤回后，运营端将不再处理本次绑定申请。", subject: `${request.product}（${request.batch || "—"}）`, operation: `取消订单 ${request.orderNo} 的本次绑定申请`, danger: true };
      }
      state.modal = "fx-confirm";
      return render();
    }
    if (action === "fx-submit-binding-draft") {
      if (!fxEnabledCustomerSession()) return showToast("当前账号无权执行此操作");
      const product = products.find(item => item.id === Number(target.dataset.id) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.status === "草稿" && item.applicationType === "新建产品并绑定");
      if (!product?.requestedOrderNo) return showToast("待提交的绑定申请不存在");
      fxOpenEditor(product, "customer", product.requestedOrderNo, productSteps.length);
      if (!Number.isSafeInteger(Number(state.editorRequestedAmount)) || Number(state.editorRequestedAmount) < 1 || !state.editorRequestedRange) return showToast("请先完成绑定设置后再提交审核");
      state.modal = "fx-submit";
      return render();
    }
    if (action === "fx-submit-existing-bind-draft") {
      if (!fxEnabledCustomerSession()) return showToast("当前账号无权执行此操作");
      const request = bindRequests.find(item => fxSameId(item.id, target.dataset.requestId) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.status === "草稿");
      const linkedProduct = fxProductForRecord(request);
      const product = linkedProduct && Number(linkedProduct.id) === Number(target.dataset.id) ? linkedProduct : null;
      if (!request || !product) return showToast("待提交的绑定申请不存在");
      return fxOpenBindingRecordEditor(product, { orderNo: target.dataset.orderNo, range: target.dataset.range, amount: target.dataset.amount, requestId: request.id, requestSource: "binding", readonly: false, openSubmit: true });
    }
    if (action === "fx-open-binding-review-product" || action === "fx-edit-binding-review-product") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
      const bindingRequest = target.dataset.source === "binding" ? bindRequests.find(item => fxSameId(item.id, target.dataset.requestId)) : null;
      const product = bindingRequest
        ? fxProductForRecord(bindingRequest)
        : fxProductForRecord({
          productId: target.dataset.productId,
          product: target.dataset.productName,
          batch: target.dataset.productBatch,
          customerId: target.dataset.customerId,
        });
      const requestCustomer = bindingRequest ? fxCustomerForRecord(bindingRequest) : fxCustomerForRecord(product);
      if (!product || !requestCustomer || !fxRecordBelongsToCustomer(product, requestCustomer) || (target.dataset.source === "binding" && !bindingRequest)) return showToast("绑定审核关联的产品或客户不存在");
      const reviewStatus = bindingRequest ? fxBindingReviewStatus(bindingRequest.status) : product.status;
      if (action === "fx-edit-binding-review-product" && !["待审核", "已激活"].includes(reviewStatus)) return showToast("当前状态不支持编辑产品资料");
      state.selectedBindRequestId = bindingRequest?.id || null;
      state.drawerProductId = product.id;
      state.modal = null;
      state.reviewEditing = false;
      state.editorProductId = null;
      state.editorDraft = null;
      state.opsPage = "review-detail";
      if (action === "fx-edit-binding-review-product") return fxOpenEditor(product, "ops", product.requestedOrderNo || null, 0, true);
      return render();
    }
    if (action === "fx-open-combined-product") {
      const product = products.find(item => item.id === Number(target.dataset.id));
      if (!product) return showToast("组合申请对应的产品不存在");
      state.modal = null;
      if (state.portal === "ops") {
        if (!fxEnabledOperatorSession()) return showToast("当前账号无权查看绑定审核");
        state.drawerProductId = product.id;
        state.reviewEditing = false;
        state.editorProductId = null;
        state.editorDraft = null;
        state.opsPage = "review-detail";
      } else {
        if (!fxEnabledCustomerSession() || !fxRecordBelongsToCustomer(product, fxCurrentCustomer())) return showToast("当前账号无权查看该产品");
        state.selectedOrderNo = product.requestedOrderNo;
        return fxOpenEditor(product, "customer", product.requestedOrderNo, productSteps.length);
      }
      return render();
    }
    if (action === "fx-approve-bind-request") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权处理绑定申请");
      const request = bindRequests.find(item => fxSameId(item.id, target.dataset.id) && item.status === "待审批");
      const requestCustomer = fxCustomerForRecord(request);
      const order = request && requestCustomer && orders.find(item => item.no === request.orderNo && item.allocationStatus !== "已撤销" && fxRecordBelongsToCustomer(item, requestCustomer));
      const product = fxProductForRecord(request);
      const amount = Number(request?.amount || 0);
      if (!request || !requestCustomer || !order || !product || !fxRecordBelongsToCustomer(product, requestCustomer) || product.status !== "已激活") return showToast("申请关联的产品、客户或订单已不可用");
      const otherPendingAmount = Math.max(0, fxOrderPendingAmount(order) - amount);
      const approvableAmount = Math.max(0, Number(order.total || 0) - Number(order.active || 0) - otherPendingAmount);
      if (amount < 1 || amount > approvableAmount) return showToast("申请数量已超出订单可用码量");
      const range = request.range || fxActivationRange(order, amount, null, request.id);
      if (!range || !fxBindingRequestRangeIsAvailable(order, { ...request, range })) return showToast("申请码段已发生变化，请重新提交申请");
      order.active = Number(order.active || 0) + amount;
      const activation = { productId: product.id, customerId: requestCustomer.id, batch: product.batch, amount, range, time: fxNow(), product: product.name, operator: fxCurrentOperator().name, status: "有效", bindRequestNo: request.no };
      fxEnsureActivationId(order, activation, request.no || "binding-request");
      order.activations.unshift(activation);
      product.amount = Number(product.amount || 0) + amount;
      requestCustomer.active = Number(requestCustomer.active || 0) + amount;
      request.status = "已通过";
      request.decidedAt = fxNow();
      request.operator = fxCurrentOperator().name;
      request.decisionNote = `已绑定并激活码段 ${range}`;
      fxAddMessage({ ...fxBindingResultMessage({ productId: request.productId, customerId: request.customerId, product: request.product, batch: request.batch, orderNo: request.orderNo, amount, range, bindRequestNo: request.no }, true), recipient: request.customer, customer: request.customer, customerId: request.customerId });
      fxSaveBusiness();
      state.selectedBindRequestId = null;
      state.drawerProductId = null;
      state.modal = null;
      state.opsPage = "bind-requests";
      render();
      return showToast("绑定申请已通过，码段已绑定并激活");
    }
    if (action === "fx-reject-bind-request") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权处理绑定申请");
      state.selectedBindRequestId = target.dataset.id;
      state.modal = "fx-bind-request-reject";
      return render();
    }
    if (action === "fx-confirm-bind-request-reject") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权处理绑定申请");
      const request = bindRequests.find(item => fxSameId(item.id, state.selectedBindRequestId) && item.status === "待审批");
      const reason = fxRead("fx-bind-request-reason").trim();
      if (!request) return showToast("绑定申请不存在或已处理");
      if (!reason) return showToast("请填写驳回原因");
      request.status = "已驳回";
      request.decidedAt = fxNow();
      request.operator = fxCurrentOperator().name;
      request.rejectReason = reason;
      fxAddMessage({ ...fxBindingResultMessage({ productId: request.productId, customerId: request.customerId, product: request.product, batch: request.batch, orderNo: request.orderNo, amount: request.amount, range: request.range, reason, bindRequestNo: request.no }, false), recipient: request.customer, customer: request.customer, customerId: request.customerId });
      fxSaveBusiness();
      state.modal = null;
      state.selectedBindRequestId = null;
      state.drawerProductId = null;
      state.opsPage = "bind-requests";
      render();
      return showToast("绑定申请已驳回并通知客户");
    }
    if (action === "fx-confirm-ops-bind") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权执行此操作");
      const order = orders.find(item => item.no === state.selectedOrderNo && item.allocationStatus !== "已撤销");
      const product = products.find(item => item.id === Number(fxRead("fx-ops-bind-product")));
      const amount = Number(fxRead("fx-ops-bind-amount"));
      const orderCustomer = fxCustomerForRecord(order);
      if (!order || !orderCustomer || !product || !fxRecordBelongsToCustomer(product, orderCustomer) || product.status !== "已激活") return showToast("请选择该客户的已激活产品");
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > fxOrderAvailableAmount(order)) return showToast("绑定数量必须在订单可用码量内");
      const range = fxActivationRange(order, amount);
      if (!range) return showToast("当前订单没有足够的连续可用码段");
      const boundAt = fxNow();
      const activation = { productId: product.id, customerId: orderCustomer.id, batch: product.batch, amount, range, time: boundAt, product: product.name, operator: fxCurrentOperator().name, status: "有效" };
      fxEnsureActivationId(order, activation, "ops-direct-bind");
      order.activations.unshift(activation);
      order.active = Number(order.active || 0) + amount;
      product.amount = Number(product.amount || 0) + amount;
      orderCustomer.active = Number(orderCustomer.active || 0) + amount;
      fxAddMessage({ ...fxBindingResultMessage({ productId: product.id, customerId: orderCustomer.id, product: product.name, batch: product.batch, orderNo: order.no, amount, range }, true), title: `${fxMessageProductSubject(product.name, product.batch)}已由运营端绑定`, recipient: orderCustomer.name, customer: orderCustomer.name, customerId: orderCustomer.id, time: boundAt });
      fxSaveBusiness();
      state.modal = null;
      render();
      return showToast(`已为 ${product.name} 绑定并激活 ${formatNumber(amount)} 枚码`);
    }
    if (action === "fx-customer-bind-order") { if (!fxEnabledCustomerSession()) return showToast("当前账号无权发起绑定申请"); const order = orders.find(item => item.no === target.dataset.no && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.allocationStatus !== "已撤销"); if (!order || fxOrderAvailableAmount(order) < 1) return showToast("当前订单没有可用码量"); state.selectedOrderNo = order.no; state.modal = "fx-customer-bind-choice"; return render(); }
    if (action === "fx-customer-select-existing-binding") { state.modal = "fx-customer-bind-order"; return render(); }
    if (action === "fx-customer-back-bind-choice") { state.modal = "fx-customer-bind-choice"; return render(); }
    if (action === "fx-customer-new-product-for-order") { if (!fxEnabledCustomerSession()) return showToast("当前账号无权发起绑定申请"); const orderNo = target.dataset.no || state.selectedOrderNo; const order = orders.find(item => item.no === orderNo && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.allocationStatus !== "已撤销"); if (!order || fxOrderAvailableAmount(order) < 1) return showToast("当前订单没有可关联的可用码量"); state.modal = null; return fxOpenEditor(null, "customer", order.no); }
    if (action === "fx-confirm-customer-bind") {
      if (!fxEnabledCustomerSession()) return showToast("当前账号无权发起绑定申请");
      const requestOrder = orders.find(item => item.no === state.selectedOrderNo && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.allocationStatus !== "已撤销");
      const requestProduct = products.find(item => item.id === Number(fxRead("fx-customer-bind-product")));
      const requestAmount = Number(fxRead("fx-customer-bind-amount"));
      if (!requestOrder || !requestProduct || !fxRecordBelongsToCustomer(requestProduct, fxCurrentCustomer()) || requestProduct.status !== "已激活") return showToast("请选择当前账号下的已激活产品");
      if (requestAmount < 1 || requestAmount > fxOrderAvailableAmount(requestOrder)) return showToast("申请数量必须在订单可用码量内");
      if (fxPendingBindRequest(requestOrder.no, requestProduct.id, requestProduct.batch)) return showToast("该产品已有待审批的绑定申请");
      const requestRange = fxActivationRange(requestOrder, requestAmount);
      if (!requestRange) return showToast("当前订单没有足够的连续可用码段");
      bindRequests.unshift({ id: Date.now(), no: fxNextBindRequestNo(), orderNo: requestOrder.no, customerId: fxCurrentCustomer().id, customer: requestOrder.customer, productId: requestProduct.id, product: requestProduct.name, batch: requestProduct.batch, range: requestRange, amount: requestAmount, status: "待审批", time: fxNow(), decidedAt: "", operator: "", rejectReason: "" });
      fxSaveBusiness();
      state.modal = null;
      render();
      return showToast("绑定申请已提交，等待运营端审核");
    }
    if (action === "fx-open-activation-product") { const order = orders.find(item => item.no === state.selectedOrderNo && item.allocationStatus !== "已撤销" && (fxEnabledOperatorSession() || (fxEnabledCustomerSession() && fxRecordBelongsToCustomer(item, fxCurrentCustomer())))); const orderCustomer = fxCustomerForRecord(order); const product = fxProductForRecord({ product: target.dataset.product, batch: target.dataset.batch, customerId: orderCustomer?.id, customer: orderCustomer?.name }); if (!order || !product || (fxEnabledCustomerSession() && !fxRecordBelongsToCustomer(product, fxCurrentCustomer()))) return showToast("关联产品不存在或无权查看"); state.modal = null; if (state.portal === "customer") return fxOpenEditor(product, "customer", order.no, 0, true); state.drawerProductId = product.id; state.reviewEditing = false; state.editorProductId = null; state.editorDraft = null; state.opsPage = "review-detail"; return render(); }
    if (action === "fx-view-activation-withdrawal") { const item = withdrawals.find(row => row.no === target.dataset.withdrawalNo && (fxEnabledOperatorSession() || (fxEnabledCustomerSession() && fxRecordBelongsToCustomer(row, fxCurrentCustomer())))); if (!item) return showToast("撤回记录不存在或无权查看"); state.modalData = { withdrawalNo: item.no }; state.modal = "fx-reset-history"; return render(); }
    if (action === "fx-back-order-detail") { state.modal = null; if (state.portal === "customer") state.customerPage = "order-detail"; else state.opsPage = "order-detail"; return render(); }
    if (action === "fx-export-products") { fxDownloadExcel(`产品信息_${fxToday}.xls`, ["产品名称", "产品批次", "产品大类", "客户名称", "产品提交时间", "审核状态"], fxFilteredReviews().map(item => [item.name, item.batch, item.category, item.company, item.submitted || "", item.status])); return showToast("产品信息已导出"); }
    if (action === "fx-ops-edit-product") { if (!fxEnabledOperatorSession()) return showToast("当前账号无权编辑产品资料"); const product = products.find(item => item.id === Number(target.dataset.id)); const bindingRequest = bindRequests.find(item => fxSameId(item.id, state.selectedBindRequestId) && Number(item.productId) === Number(product?.id)); const reviewStatus = bindingRequest ? fxBindingReviewStatus(bindingRequest.status) : product?.status; if (!product || !["待审核", "已激活"].includes(reviewStatus)) return showToast("当前状态不支持编辑产品资料"); const initialStep = state.opsPage === "review-detail" && state.drawerProductId === product.id ? state.productStep : 0; return fxOpenEditor(product, "ops", product.requestedOrderNo || null, initialStep, true); }
    if (action === "fx-open-activation") { if (!fxEnabledOperatorSession()) return showToast("当前账号无权处理绑定审核"); const product = products.find(item => item.id === Number(target.dataset.id) && item.status === "待审核"); if (!product) return showToast("绑定审核状态已发生变化，请刷新后重试"); state.drawerProductId = product.id; state.modal = "fx-activation"; return render(); }
    if (action === "fx-confirm-activation") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权处理绑定申请");
      const product = products.find(item => item.id === state.drawerProductId);
      const combined = product?.applicationType === "新建产品并绑定";
      const order = orders.find(item => item.no === fxRead("fx-activation-order") && item.allocationStatus !== "已撤销");
      const amount = Number(fxRead("fx-activation-amount"));
      const productCustomer = fxCustomerForRecord(product);
      if (!product || product.status !== "待审核") return showToast("绑定审核状态已发生变化，请刷新后重试");
      if (!combined) return showToast("当前产品没有待审核的绑定申请");
      if (!order || !productCustomer || !fxRecordBelongsToCustomer(order, productCustomer)) return showToast("只能选择该客户名下的有效订单");
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > fxOrderAvailableAmount(order, product.id)) return showToast("激活数量必须在该客户订单的可用余额内");
      const range = fxReviewActivationRange(order, amount, product);
      const sourceRange = fxOrderFreeRanges(order, product.id).find(source => {
        const [rangeStart, rangeEnd] = String(range || "").split("–");
        return rangeStart && rangeEnd && fxCodeInRange(rangeStart, source.range) && fxCodeInRange(rangeEnd, source.range);
      });
      if (!range || !sourceRange || !fxRequestedRangeIsAvailable(order, sourceRange.range, range, amount, product.id)) return showToast("所选订单的空闲码段已发生变化，请重新选择");
      const activatedAt = fxNow();
      order.active = Number(order.active || 0) + amount;
      const activation = { productId: product.id, customerId: productCustomer.id, batch: product.batch, amount, range, time: activatedAt, product: product.name, operator: fxCurrentOperator().name, status: "有效" };
      fxEnsureActivationId(order, activation, product.requestedOrderNo || "combined-review");
      order.activations.unshift(activation);
      productCustomer.active = Number(productCustomer.active || 0) + amount;
      Object.assign(product, {
        status: "已激活",
        amount: Number(product.amount || 0) + amount,
        preferredOrderNo: null,
        requestedOrderNo: order.no,
        requestedSourceRange: sourceRange.range,
        requestedRange: range,
        requestedAmount: amount,
      });
      fxClearEditorBinding();
      fxAddMessage({ ...fxReviewMessageCopy(product, true, { orderNo: order.no, amount, range }), recipient: productCustomer.name, customer: productCustomer.name, customerId: productCustomer.id });
      product.decidedAt = activatedAt; product.operator = fxCurrentOperator().name; fxSaveBusiness(); state.modal = null; state.drawerProductId = null; state.opsPage = "bind-requests"; render(); return showToast("绑定审核已通过，产品与连续码段已激活");
    }
    if (action === "fx-open-reject") { if (!fxEnabledOperatorSession()) return showToast("当前账号无权处理绑定审核"); const product = products.find(item => item.id === Number(target.dataset.id) && item.status === "待审核"); if (!product) return showToast("绑定审核状态已发生变化，请刷新后重试"); state.drawerProductId = product.id; state.modal = "fx-reject"; return render(); }
    if (action === "fx-confirm-reject") { if (!fxEnabledOperatorSession()) return showToast("当前账号无权处理绑定申请"); const reason = fxRead("fx-reject-reason"); if (!reason) return showToast("请填写驳回原因"); const product = products.find(item => item.id === state.drawerProductId && item.status === "待审核"); if (!product) return showToast("绑定审核状态已发生变化，请刷新后重试"); const customer = fxCustomerForRecord(product); if (!customer) return showToast("申请关联的客户账号不存在"); const released = product.applicationType === "新建产品并绑定" ? "；申请码段已释放" : ""; product.status = "已驳回"; product.decidedAt = fxNow(); product.operator = fxCurrentOperator().name; product.rejectionReason = reason; fxAddMessage({ ...fxReviewMessageCopy(product, false, { reason: `${reason}${released}` }), recipient: customer.name, customer: customer.name, customerId: customer.id }); fxSaveBusiness(); state.modal = null; state.drawerProductId = null; state.opsPage = "bind-requests"; render(); return showToast(`产品与绑定申请已驳回并通知客户${released}`); }
    if (action === "fx-approve-withdrawal" || action === "fx-reject-withdrawal") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权处理撤回申请");
      const selectedIndex = Number(target.dataset.index);
      const item = withdrawals[selectedIndex];
      if (!item || item.status !== "待审批") return showToast("撤回申请状态已发生变化，请刷新后重试");
      state.selectedWithdrawalIndex = selectedIndex;
      const resolvedSegments = fxResolvedWithdrawalSegments(item);
      if (!resolvedSegments.length) return showToast("未找到本次申请对应的具体码段，请先核对关联订单");
      if (!Array.isArray(item.segments) || !item.segments.length) item.segments = resolvedSegments.map(segment => ({ ...segment }));
      item.requestedAmount ||= resolvedSegments.reduce((sum, segment) => sum + Number(segment.amount || 0), 0);
      state.modalData = { decision: action === "fx-reject-withdrawal" ? "reject" : "approve", withdrawalId: item.id };
      state.modal = "fx-withdraw-decision";
      return render();
    }
    if (action === "fx-confirm-withdraw-decision") {
      if (!fxEnabledOperatorSession()) return showToast("当前账号无权处理撤回申请");
      const item = withdrawals.find(row => String(row.id) === String(state.modalData?.withdrawalId));
      const reject = state.modalData?.decision === "reject";
      if (!item || item.status !== "待审批") return showToast("撤回申请不存在或已处理");
      const decidedAt = fxNow();
      if (reject) { const reason = fxRead("fx-withdraw-reject-reason"); if (!reason) return showToast("请填写驳回原因"); item.decidedAt = decidedAt; item.status = "已驳回"; item.rejectReason = reason; }
      else {
        const product = fxProductForRecord(item);
        const customer = fxCustomerForRecord(item) || fxCustomerForRecord(product);
        if (!product || !customer || !fxRecordBelongsToCustomer(product, customer)) return showToast("申请关联的产品或客户已不可用");
        const requestedSegments = (Array.isArray(item.segments) ? item.segments : []).filter(segment => segment.orderNo && segment.range);
        if (!requestedSegments.length) return showToast("未找到本次申请对应的具体码段，请先核对关联订单");
        const matchedSegmentKeys = new Set();
        const usedActivations = new Set();
        const resetPlan = [];
        for (const segment of requestedSegments) {
          const key = segment.activationId || segment.key || `${segment.orderNo}::${segment.range}::${segment.time || ""}`;
          if (matchedSegmentKeys.has(key)) continue;
          const order = orders.find(candidate => candidate.no === segment.orderNo && candidate.allocationStatus !== "已撤销" && fxRecordBelongsToCustomer(candidate, customer));
          const activationEntry = order && (order.activations || []).map(activation => ({ order, activation })).find(({ activation }) => {
            if (usedActivations.has(activation) || !fxActivationIdentityMatches(product, activation)) return false;
            return Boolean(fxWithdrawalSegmentMatchesActivation(order, activation, segment));
          });
          if (!activationEntry) return showToast("申请中的码段已发生变化，请刷新后重新核对");
          const intersection = fxWithdrawalSegmentMatchesActivation(activationEntry.order, activationEntry.activation, segment);
          if (!intersection) return showToast("申请中的码段与当前激活记录不匹配");
          matchedSegmentKeys.add(key);
          usedActivations.add(activationEntry.activation);
          resetPlan.push({ ...activationEntry, intersection, key });
        }
        if (matchedSegmentKeys.size !== requestedSegments.length || !resetPlan.length) return showToast("申请中的码段已发生变化，请刷新后重新核对");
        let rollbackAmount = 0; const resetRanges = [];
        resetPlan.forEach(({ order, activation, intersection }) => {
          const amount = fxResetActivationRange(order, activation, intersection, item, product, decidedAt);
          rollbackAmount += amount;
          resetRanges.push(intersection.range);
          order.active = Math.max(0, Number(order.active || 0) - amount);
        });
        if (!rollbackAmount) return showToast("申请中的码段已不可撤回，请重新核对");
        customer.active = Math.max(0, Number(customer.active || 0) - rollbackAmount);
        const remainingAmount = orders.filter(order => order.allocationStatus !== "已撤销" && fxRecordBelongsToCustomer(order, customer)).reduce((sum, order) => sum + (order.activations || []).filter(activation => activation.range && fxActivationIdentityMatches(product, activation)).reduce((subtotal, activation) => subtotal + Number(activation.amount || 0), 0), 0);
        product.amount = remainingAmount;
        if (!remainingAmount) { product.status = "草稿"; product.submitted = ""; }
        item.decidedAt = decidedAt; item.status = "已通过"; item.rollbackAmount = rollbackAmount; item.resetRanges = resetRanges; item.rejectReason = `已选码段已重置为空白状态，共回滚 ${formatNumber(rollbackAmount)} 枚`;
      }
      const messageCustomer = fxCustomerForRecord(item);
      fxAddMessage({ ...fxWithdrawalResultMessage(item, !reject), recipient: messageCustomer?.name || item.customer, customer: messageCustomer?.name || item.customer, customerId: messageCustomer?.id || item.customerId || null }); fxSaveBusiness(); state.modal = null; render(); return showToast(`撤回申请已${reject ? "驳回" : "通过"}`);
    }
    if (action === "fx-view-withdrawal") { const index = Number(target.dataset.index); const item = withdrawals[index]; if (!item || (fxEnabledCustomerSession() && !fxRecordBelongsToCustomer(item, fxCurrentCustomer()))) return showToast("撤回申请不存在或无权查看"); state.selectedWithdrawalIndex = index; state.modal = "fx-withdrawal-detail"; return render(); }
    if (action === "fx-mark-read") { if (!fxEnabledCustomerSession()) return showToast("当前账号无权执行此操作"); messages.filter(item => fxRecordBelongsToCustomer(item, fxCurrentCustomer())).forEach(item => item.unread = false); fxSaveBusiness(); render(); return showToast("全部消息已标记为已读"); }
    if (action === "fx-read-message") { const item = messages.find(row => row.id === Number(target.dataset.id) && (fxEnabledOperatorSession() ? fxIsCustomerMessage(row) : fxEnabledCustomerSession() && fxRecordBelongsToCustomer(row, fxCurrentCustomer()) && !fxIsApplicationSubmissionMessage(row))); if (!item) return showToast("站内信不存在或无权查看"); if (fxEnabledCustomerSession()) { item.unread = false; fxSaveBusiness(); } state.selectedMessageId = item.id; state.modal = "fx-message"; return render(); }
    if (action === "fx-save-password") { const current = fxRead("fx-current-password"), next = fxRead("fx-new-password"), confirm = fxRead("fx-confirm-password"); const account = entryPortal === "ops" ? (fxEnabledOperatorSession() ? fxCurrentOperator() : null) : (fxEnabledCustomerSession() ? fxCurrentCustomer() : null); if (!account) return showToast("当前登录账号状态异常，请重新登录"); if (current !== account.password) return showToast("当前密码不正确"); if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return showToast("新密码至少 8 位且包含字母和数字"); if (next !== confirm) return showToast("两次输入的新密码不一致"); account.password = next; fxSaveOperators(); fxSaveBusiness(); return showToast("登录密码已更新"); }
    if (action === "fx-export-customer-orders") { const rows = fxCustomerOrders(); fxDownloadExcel(`订单台账_${fxToday}.xls`, ["订单号", "分配时间", "序列号范围", "订单码量", "已激活", "绑定申请中", "剩余可用"], rows.map(item => [item.no, item.allocatedAt || item.createdAt || item.created || "", item.range, item.total, item.active, fxOrderPendingAmount(item), fxOrderAvailableAmount(item)])); return showToast("订单台账已导出"); }
    if (action === "fx-customer-product-status") { state.customerPage = "orders"; return render(); }
    if (action === "fx-new-product") return showToast("请从订单台账选择订单后发起新建产品绑定申请");
    if (action === "fx-submit-product-row") {
      if (!fxEnabledCustomerSession()) return showToast("当前账号无权提交绑定申请");
      const product = products.find(item => item.id === Number(target.dataset.id) && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.status === "草稿");
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
    if (action === "fx-back-customer-products") { if (state.portal !== "customer") return; state.customerPage = state.selectedOrderNo ? "order-detail" : "orders"; state.editorProductId = null; state.editorDraft = null; state.editorReadonly = false; fxClearEditorBinding(); state.productStep = 0; return render(); }
    if (action === "fx-edit-product") { if (!fxEnabledCustomerSession()) return showToast("当前账号无权编辑产品资料"); const product = products.find(item => item.id === Number(target.dataset.id) && fxRecordBelongsToCustomer(item, fxCurrentCustomer())); if (!product) return showToast("产品不存在或无权访问"); return fxOpenEditor(product, "customer", product.requestedOrderNo || product.preferredOrderNo || null, 0, true); }
    if (action === "fx-clear-editor-order") return showToast("绑定设置来自当前订单，不可在产品编辑页解除");
    if (action === "fx-preview-product") { const product = products.find(item => item.id === Number(target.dataset.id) && (fxEnabledOperatorSession() || (fxEnabledCustomerSession() && fxRecordBelongsToCustomer(item, fxCurrentCustomer())))); if (!product) return showToast("产品不存在或无权访问"); state.editorProductId = product.id; state.editorDraft = fxClone(product.details); state.modal = "fx-preview"; return render(); }
    if (action === "fx-save-draft") { if (state.editorReadonly) return showToast("已提交资料不可编辑"); if (!(state.editorBindRequestId ? fxPersistExistingBindEdit(false, true) : fxPersistDraft(false))) return; render(); return showToast("草稿已保存，可从订单详情继续填写"); }
    if (action === "fx-editor-next") { if (!state.editorReadonly && state.editorOwner === "customer" && !(state.editorBindRequestId ? fxPersistExistingBindEdit(false) : fxPersistDraft(false))) return; if (state.productStep < fxEditorSteps().length - 1) state.productStep += 1; render(); return showToast(state.editorOwner === "ops" ? "已切换到下一模块" : "当前模块已保存"); }
    if (action === "fx-open-submit") { if (!state.editorTargetOrderNo) return showToast("请从我的码段发起新建产品绑定申请"); if (!(state.editorBindRequestId ? fxPersistExistingBindEdit(false) : fxPersistDraft(false))) return; state.modal = "fx-submit"; return render(); }
    if (action === "fx-confirm-submit") { if (!state.editorTargetOrderNo) return showToast("订单不存在，请重新发起申请"); const existingBinding = Boolean(state.editorBindRequestId); if (!(existingBinding ? fxPersistExistingBindEdit(true) : fxPersistDraft(true))) return; state.selectedOrderNo = state.editorTargetOrderNo; state.modal = null; state.customerPage = "order-detail"; state.editorReadonly = true; fxSaveBusiness(); render(); return showToast(existingBinding ? "绑定申请已提交审核" : "产品与绑定申请已提交审核"); }
    if (action === "fx-save-ops-product") { if (!fxEnabledOperatorSession() || state.editorOwner !== "ops") return showToast("当前账号无权编辑产品资料"); const productId = state.editorProductId; if (!fxPersistDraft(false)) return; state.reviewEditing = false; state.editorProductId = null; state.editorDraft = null; state.editorReadonly = false; state.drawerProductId = productId; state.opsPage = "review-detail"; render(); return showToast("产品全部资料已由运营方更新"); }
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
    if (action === "fx-open-withdraw") { if (!fxEnabledCustomerSession()) return showToast("当前账号无权发起撤回申请"); state.editorProductId = null; state.modalData = { withdrawalMode: "segments", withdrawalProductId: null }; state.modal = "fx-customer-withdraw"; return render(); }
     if (action === "fx-customer-withdraw") { if (!fxEnabledCustomerSession()) return showToast("当前账号无权发起撤回申请"); const productId = Number(target.dataset.id) || null; const product = products.find(item => item.id === productId && fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.status === "已激活" && fxProductActiveSegments(item).length); if (!product) return showToast("当前产品没有可撤回的码段"); state.editorProductId = product.id; state.modalData = { withdrawalMode: "product", withdrawalProductId: product.id }; state.modal = "fx-customer-withdraw"; return render(); }
    if (action === "fx-confirm-customer-withdraw") {
      if (!fxEnabledCustomerSession()) return showToast("当前账号无权发起撤回申请");
      const productMode = state.modalData?.withdrawalMode === "product";
      const productId = productMode ? Number(state.modalData?.withdrawalProductId) : Number(fxRead("fx-withdraw-product"));
      const product = products.find(item => item.id === productId && fxRecordBelongsToCustomer(item, fxCurrentCustomer()));
      const reason = fxRead("fx-withdraw-reason");
      if (!product || !reason) return showToast("请选择产品并填写撤回原因");
      const availableSegments = fxProductActiveSegments(product);
      const selectedKeys = new Set([...document.querySelectorAll("[data-withdraw-segment]:checked")].map(input => input.value));
      const segments = availableSegments.filter(segment => selectedKeys.has(segment.key));
      if (!segments.length) return showToast("请至少选择一个撤回码段");
      const customer = fxCustomerForRecord(product);
      if (!customer || customer.id !== fxCurrentCustomer().id) return showToast("产品归属已发生变化，请刷新后重试");
      withdrawals.unshift({ id: Date.now(), no: fxNextWithdrawalNo(), productId: product.id, customerId: customer.id, product: product.name, batch: product.batch, customer: customer.name, scope: "segments", segments, requestedAmount: segments.reduce((sum, segment) => sum + Number(segment.amount || 0), 0), reason, status: "待审批", time: fxNow(), rejectReason: "" });
      fxSaveBusiness(); state.modal = null; state.customerPage = "withdrawals"; render(); return showToast(productMode ? "产品撤回申请已提交" : "码段撤回申请已提交");
    }
    if (action === "fx-scan-image") { state.modalData = { name: target.querySelector("img")?.alt || "产品图片", src: target.dataset.src || target.closest("[data-src]")?.dataset.src }; state.modal = "fx-scan-image"; return render(); }
    if (action === "fx-lightbox-content") return;
    if (action === "fx-scan-pdf") { state.modalData = { name: target.dataset.name || "附件.pdf", type: "application/pdf", src: target.dataset.src || "" }; state.modal = "fx-file"; return render(); }
  }, true);

  const fxSearchFilters = {
    "fx-operator-name-search": "operatorNameFilter",
    "fx-operator-account-search": "operatorAccountFilter",
    "fx-customer-name-search": "customerNameFilter",
    "fx-customer-account-search": "customerAccountFilter",
    "fx-customer-phone-search": "customerPhoneFilter",
    "fx-customer-detail-order-search": "customerDetailOrderFilter",
    "fx-inventory-range-search": "inventoryRangeFilter",
    "fx-inventory-allocation-customer-search": "inventoryAllocationCustomerFilter",
    "fx-inventory-allocation-order-search": "inventoryAllocationOrderFilter",
    "fx-order-customer-search": "orderCustomerFilter",
    "fx-order-number-search": "orderNumberFilter",
    "fx-bind-request-customer-search": "bindRequestCustomerFilter",
    "fx-bind-request-order-search": "bindRequestOrderFilter",
    "fx-bind-request-product-search": "bindRequestProductFilter",
    "fx-bind-request-batch-search": "bindRequestBatchFilter",
    "fx-order-binding-product-search": "orderBindingProductFilter",
    "fx-order-binding-batch-search": "orderBindingBatchFilter",
    "fx-review-search": "filter",
    "fx-withdrawal-no-search": "withdrawalNoFilter",
    "fx-withdrawal-product-search": "withdrawalProductFilter",
    "fx-withdrawal-customer-search": "withdrawalCustomerFilter",
    "fx-customer-product-search": "customerProductFilter",
    "fx-message-title-search": "messageTitleSearch",
    "fx-message-content-search": "messageContentSearch"
  };
  const fxComposingSearchInputs = new WeakSet();
  function fxCommitSearchInput(target) {
    const key = fxSearchFilters[target.id];
    if (!key) return false;
    state[key] = target.value;
    if (key === "orderCustomerFilter" || key === "orderNumberFilter") state.highlightOrderNo = null;
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
  }
  function fxUpdateBindProductSearch(target) {
    const prefix = target.id.replace(/-search$/, "");
    const picker = target.closest(".bind-product-picker");
    const order = orders.find(item => item.no === state.selectedOrderNo);
    const orderCustomer = fxCustomerForRecord(order);
    const activated = prefix === "fx-withdraw-product"
      ? products.filter(item => fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.status === "已激活" && fxProductActiveSegments(item).length)
      : orderCustomer ? products.filter(item => fxRecordBelongsToCustomer(item, orderCustomer) && item.status === "已激活") : [];
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
    if (target.id === "fx-qr-width") { state.qrDraft.customWidth = Number(target.value) || 25; fxRefreshQrCorePreview(); }
    if (target.id === "fx-qr-height") { state.qrDraft.customHeight = Number(target.value) || 25; fxRefreshQrCorePreview(); }
    if (target.id === "fx-allocation-amount") {
      fxSyncCodeAllocationPreview(target.value);
    }
    if (target.id === "fx-editor-bind-amount") {
      state.editorRequestedAmount = Number(target.value);
      fxSyncEditorBindingPreview();
    }
    if (["fx-customer-bind-amount", "fx-ops-bind-amount"].includes(target.id)) {
      fxSyncCustomerBindRangePreview();
    }
    if (target.id === "fx-edit-bind-request-amount") {
      const request = bindRequests.find(item => fxSameId(item.id, state.selectedBindRequestId));
      const order = request && orders.find(item => item.no === request.orderNo && item.allocationStatus !== "已撤销");
      const preview = document.getElementById("fx-edit-bind-request-range");
      const range = order ? fxActivationRange(order, Number(target.value), null, request.id) : "";
      if (preview) preview.value = range || "暂无可分配码段";
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
    if (entryPortal === "ops" && !fxEnabledOperatorSession()) return;
    if (entryPortal === "customer" && !fxEnabledCustomerSession()) return;
    if (entryPortal === "scan") return;
    if (target.id === "fx-allocation-source-range") {
      const batch = codeBatches.find(item => item.no === state.selectedCodeBatchNo);
      const source = batch ? fxCodeBatchFreeRanges(batch).find(item => item.range === target.value) : null;
      state.allocationSourceRange = source?.range || "";
      const amount = document.getElementById("fx-allocation-amount");
      if (amount && source) {
        amount.max = String(source.amount);
        amount.dataset.sourceRange = source.range;
        amount.value = String(Math.min(Math.max(1, Number(amount.value) || 1), source.amount));
      }
      const available = document.getElementById("fx-allocation-available");
      if (available) available.textContent = `可用数量：${formatNumber(source?.amount || 0)} 枚`;
      fxSyncCodeAllocationPreview(amount?.value);
      return;
    }
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
      const tableFilters = { operatorStatus: "operatorStatus", customerStatus: "customerStatus", inventoryStatus: "inventoryStatus", productCategory: "productCategory", reviewStatus: "reviewStatus", bindRequestStatus: "bindRequestStatus", bindRequestCategory: "bindRequestCategory", orderBindingStatus: "orderBindingStatus", orderBindingCategory: "orderBindingCategory", withdrawalStatus: "withdrawalStatus", customerProductStatus: "customerProductStatus", customerProductCategory: "customerProductCategory", customerWithdrawalStatus: "customerWithdrawalStatus" };
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
    const handle = event.target.closest(".editor-drag-handle"); const row = handle?.closest("[data-fx-field-row]"); if (!row || state.editorReadonly || (entryPortal === "ops" ? !fxEnabledOperatorSession() : !fxEnabledCustomerSession())) return;
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
    const item = event.target.closest("[data-fx-media-index]"); if (!item || state.editorReadonly || (entryPortal === "ops" ? !fxEnabledOperatorSession() : !fxEnabledCustomerSession())) return;
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
