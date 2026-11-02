"use strict";

// Additive prototype fixtures, installed once per browser origin before any view resolves.
const traceDemoVersion = "connected-demo-20261030-v1";
const traceDemoMarker = "trace-connected-demo-v1";
async function traceInstallDemoFixtures() {
  return omLock(async () => {
    const lists = { customers, orders, products, bindRequests, withdrawals, messages };
    for (const [name, list] of Object.entries(lists)) {
      const saved = fxStore.get(fxBusinessStorage[name], null);
      if (Array.isArray(saved)) list.splice(0, list.length, ...saved);
    }
    const installed = fxStore.get(traceDemoMarker);
    if (installed?.version === traceDemoVersion) {
      window.TRACE_DEMO_DATA = installed;
      return installed;
    }
    const before = Object.fromEntries(Object.entries(lists).map(([name, list]) => [name, fxClone(list)]));
    const previousCategories = fxCategories();
    const categories = fxClone(previousCategories);
    const payloads = [];
    const uid = () => crypto.randomUUID();
    const at = (day, hour = 9) => `2026-10-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:00:00`;
    const tag = (key, fields) => ({ demoTag: traceDemoVersion, demoKey: key, ...fields });
    const nextId = list => Math.max(860000, ...list.map(row => Number(row.id) || 0)) + 1;
    const attachment = (name, src, type = "application/pdf") => ({ name, type, src });
    function category(name) {
      let item = categories.find(row => row.name === name && row.status === "启用");
      if (!item) {
        const occupied = new Set([...categories.map(row => row.productNumber),
          ...orders.flatMap(order => (order.lines || []).map(line => line.productNumber))]);
        const productNumber = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, "0"))
          .find(number => !occupied.has(number));
        if (!productNumber) throw new Error("测试数据初始化需要至少一个可用产品号");
        item = tag(name, { id: uid(), name, productNumber, status: "启用", createdAt: at(1), operator: "平台管理员" });
        categories.push(item);
      }
      return item;
    }
    function owner(account, name, status = "启用", empty = false) {
      let item = customers.find(row => row.account === account);
      if (item) return item;
      const sharedNumbers = fxSharedNumbers();
      const occupied = new Set([...customers.map(row => row.companyNumber), ...sharedNumbers]);
      const companyNumber = empty && sharedNumbers.length ? sharedNumbers[0] : Array.from({ length: 99999 }, (_, i) => String(i + 1).padStart(5, "0"))
        .find(number => !occupied.has(number));
      if (!companyNumber) throw new Error("测试客户没有可用的公司号");
      item = tag(account, { id: nextId(customers), name, account, status, password: "Trace@2026",
        companyNumber, companyNumberType: sharedNumbers.includes(companyNumber) ? "共享" : "专属",
        phone: "13800000000", total: 0, active: 0, createdAt: at(1), changeHistory: [],
        license: attachment("测试营业执照.pdf", "assets/demo-case/business-license.pdf"),
        legalId: attachment("测试证照样张.jpg", "assets/demo-case/quality-lab.jpg", "image/jpeg") });
      customers.push(item);
      return item;
    }
    const occupied = new Map();
    async function numbers(productNumber, quantity) {
      if (!occupied.has(productNumber)) {
        const used = new Set();
        for (const order of orders.filter(omOccupiesNumbers)) {
          const lines = order.lines.filter(line => line.productNumber === productNumber);
          if (!lines.length) continue;
          const payload = await omPayload(order.no);
          if (!payload) throw new Error(`订单 ${order.no} 的本地码包缺失，请先恢复码包再初始化测试数据`);
          for (const line of lines) {
            const randoms = payload.lines.find(row => row.id === line.id)?.randoms;
            if (!randoms || randoms.length !== line.quantity) throw new Error(`订单 ${order.no} 的本地码包不完整`);
            for (const value of randoms) used.add(value);
          }
        }
        occupied.set(productNumber, used);
      }
      const used = occupied.get(productNumber);
      const randoms = new Uint32Array(quantity);
      for (let index = 0; index < quantity; index++) {
        let value;
        do { value = crypto.getRandomValues(new Uint32Array(1))[0] % 99999999 + 1; } while (used.has(value));
        used.add(value);
        randoms[index] = value;
      }
      return randoms;
    }
    const samples = {};
    let serial = 0;
    function product(order, line, label, status, first = 1, amount = 4, newProduct = false) {
      const id = nextId(products);
      const batch = `DEMO-1030-${id}`;
      const name = `${order.customer.replace(/有限公司$/, "")}·${label}绿茶（测试）`;
      const details = fxCompleteDemoDetails();
      Object.assign(details, { productName: name, companyName: order.customer, category: line.category,
        subcategory: "高山绿茶", batch, productionDate: "2026-10-01",
        intro: `【测试产品】${label}场景。高山鲜叶经杀青、揉捻、干燥、检验和包装入库，用于验证图文、证书、批次和扫码展示。`,
        companyIntro: `${order.customer}的演示资料，仅用于原型联调，证照与检测报告均为测试样张。`,
        productInspectionReport: `【测试样张】批次 ${batch} 的检验记录，检验时间 2026-10-02。`,
        trace: [
          { date: at(1), content: "【测试】鲜叶采收与原料验收，记录地块、采摘人及入库批次" },
          { date: at(2), content: "【测试】杀青、揉捻、低温干燥，关键工艺参数复核完成" },
          { date: at(3), content: `【测试】批次 ${batch} 抽样检验，报告样张已归档` },
          { date: order.createdAt, content: `【测试】包装赋码，对应订单 ${order.no}` },
        ],
      });
      const item = tag(`${order.demoKey}:${label}`, { id, customerId: order.customerId, company: order.customer,
        name, batch, categoryId: line.categoryId, category: line.category, productNumber: line.productNumber,
        orderLineId: line.id, status, details, amount: 0, submitted: status === "草稿" ? "" : at(25),
        decidedAt: ["已激活", "已驳回"].includes(status) ? at(26) : "",
        operator: ["已激活", "已驳回"].includes(status) ? "审核专员" : "" });
      if (newProduct) Object.assign(item, { applicationType: "新建产品并绑定", requestedOrderNo: order.no,
        preferredOrderNo: order.no, requestedSourceRange: omRange(first, line.last),
        requestedRange: omRange(first, first + amount - 1), requestedAmount: amount,
        rejectionReason: status === "已驳回" ? "【测试】本批次检测报告缺少签章，请补充后重新提交" : "" });
      products.push(item);
      return item;
    }
    function request(order, item, status, first = 1, amount = 4) {
      const row = tag(`${order.demoKey}:${status}:${first}`, { id: nextId(bindRequests), no: `BR-DEMO-${uid().slice(0, 8).toUpperCase()}`,
        orderNo: order.no, orderLineId: item.orderLineId, customerId: order.customerId, customer: order.customer,
        productId: item.id, product: item.name, batch: item.batch, categoryId: item.categoryId,
        applicationType: "已有产品追加绑定", range: omRange(first, first + amount - 1), amount,
        status, time: status === "草稿" ? "" : at(25), submittedBy: order.customer,
        decidedAt: ["已通过", "已驳回", "已撤回"].includes(status) ? at(26) : "",
        operator: status === "已撤回" ? order.customer : ["已通过", "已驳回"].includes(status) ? "审核专员" : "",
        rejectReason: status === "已驳回" ? "【测试】申请数量与批次包装数量不一致，请核实后重新提交" : "" });
      bindRequests.push(row);
      return row;
    }
    function activate(order, item, first, amount, req) {
      const row = tag(`${order.demoKey}:activation:${first}`, { activationId: uid(), productId: item.id,
        customerId: order.customerId, product: item.name, batch: item.batch, range: omRange(first, first + amount - 1),
        amount, time: at(26), operator: "审核专员", status: "有效", bindRequestNo: req?.no || "" });
      order.activations.push(row);
      return row;
    }
    function withdrawal(order, item, activation, status) {
      const row = tag(`${order.demoKey}:withdrawal`, { id: nextId(withdrawals), no: `WD-DEMO-${uid().slice(0, 8).toUpperCase()}`,
        customerId: order.customerId, customer: order.customer, productId: item.id, product: item.name,
        batch: item.batch, status, scope: "segments", reason: "【测试】包装资料调整，申请撤回本订单所选绑定范围",
        segments: [{ activationId: activation.activationId, key: activation.activationId, orderNo: order.no,
          range: activation.range, amount: activation.amount, time: activation.time }],
        requestedAmount: activation.amount, time: at(27), decidedAt: status === "待审批" ? "" : at(28),
        operator: status === "待审批" ? "" : "审核专员",
        rejectReason: status === "已驳回" ? "【测试】撤回理由不完整，请补充具体调整内容" : "" });
      if (status === "已通过") {
        Object.assign(activation, { status: "已重置", resetTime: at(28), resetOperator: "审核专员", withdrawalNo: row.no });
        Object.assign(row, { resetRanges: [activation.range], resetSegments: fxClone(row.segments), rollbackAmount: activation.amount });
      }
      withdrawals.push(row);
      return row;
    }
    function message(order, type, title, recipient, reference = {}) {
      messages.push(tag(`${order.demoKey}:message:${messages.length}`, { id: nextId(messages), type,
        title: `【测试】${title}`, detail: `订单号：${order.no}；客户：${order.customer}。${reference.reason || "请查看关联业务记录核对产品、批次和序号。"}`,
        time: at(type.includes("申请") ? 25 : 28, 10), unread: messages.length % 3 !== 0,
        recipient, customer: order.customer, customerId: order.customerId, orderNo: order.no, ...reference }));
    }
    async function scenario(customer, key, kind, tea, craft) {
      serial++;
      const no = `ORD-202610${String(4 + serial % 20).padStart(2, "0")}-D${String(serial).padStart(7, "0")}`;
      if (orders.some(order => order.no === no)) throw new Error(`测试订单号冲突：${no}`);
      const lines = [{ id: uid(), categoryId: tea.id, category: tea.name, productNumber: tea.productNumber,
        categorySnapshot: { name: tea.name, productNumber: tea.productNumber }, first: 1, last: 40, quantity: 40, remark: `${key}测试批次` }];
      if (kind === "mixed") lines.push(
        { ...fxClone(lines[0]), id: uid(), first: 41, last: 60, quantity: 20, remark: "同品类第二条明细" },
        { id: uid(), categoryId: craft.id, category: craft.name, productNumber: craft.productNumber,
          categorySnapshot: { name: craft.name, productNumber: craft.productNumber },
          first: 61, last: 90, quantity: 30, remark: "跨品类隔离，仅绑定同品类产品" });
      const total = lines.at(-1).last;
      const order = tag(`${customer.account}:${kind}`, { id: uid(), no, codeFormat: "random16", recordType: "random-order",
        customerId: customer.id, customer: customer.name, companyNumber: customer.companyNumber,
        customerSnapshot: { name: customer.name, companyNumber: customer.companyNumber, companyNumberType: customer.companyNumberType },
        version: String(1 + serial % 3), total, active: 0, lines, range: omRange(1, total),
        allocationSegments: lines.map(line => ({ range: omRange(line.first, line.last), amount: line.quantity })),
        allocationStatus: "已分配", created: at(4 + serial % 20).slice(0, 10), createdAt: at(4 + serial % 20),
        allocatedAt: at(4 + serial % 20), allocatedBy: "订单专员（测试数据）",
        note: `【联通测试】${key}`, activations: [], downloads: [], cancellationRecords: [],
        scanBase: new URL("pages/scan/active.html", document.baseURI).href });
      const payload = { no, lines: [] };
      for (const line of lines) payload.lines.push({ id: line.id, randoms: await numbers(line.productNumber, line.quantity) });
      payloads.push(payload);
      const line = lines[0];
      if (kind.startsWith("new-")) {
        const item = product(order, line, key, { "new-draft": "草稿", "new-pending": "待审核",
          "new-rejected": "已驳回", "new-active": "已激活" }[kind], 1, 4, true);
        if (kind === "new-active") activate(order, item, 1, 4);
      } else if (["draft", "pending", "rejected", "withdrawn", "cancel-rejected"].includes(kind)) {
        const item = product(order, line, key, "已激活");
        request(order, item, { draft: "草稿", pending: "待审批", rejected: "已驳回", withdrawn: "已撤回", "cancel-rejected": "已驳回" }[kind]);
      } else if (["partial", "full", "reset", "withdrawal-pending", "withdrawal-rejected", "mixed"].includes(kind)) {
        const item = product(order, line, key, "已激活");
        const amount = kind === "full" ? 40 : 6;
        const req = request(order, item, "已通过", 1, amount);
        const activation = activate(order, item, 1, amount, req);
        if (kind === "reset" || kind.startsWith("withdrawal-")) withdrawal(order, item, activation,
          { reset: "已通过", "withdrawal-pending": "待审批", "withdrawal-rejected": "已驳回" }[kind]);
        if (kind === "mixed") {
          for (const [status, first] of [["草稿", 7], ["待审批", 11], ["已驳回", 15], ["已撤回", 19]]) {
            request(order, product(order, line, status, "已激活"), status, first, 4);
          }
          product(order, lines[1], "新建产品待提交", "草稿", 41, 4, true);
        }
      }
      if (["full", "partial", "cancel-locked", "mixed"].includes(kind)) {
        order.downloads.push(tag(`${order.demoKey}:download`, { id: uid(), orderNo: no, simulated: true,
          scope: "前 5 个码（模拟下载）", first: 1, last: 5, amount: 5, format: "xls", operator: "平台管理员", time: at(24) }));
      }
      if (kind.startsWith("cancel-")) {
        Object.assign(order, { allocationStatus: "已撤销", recalledAt: at(28), recalledBy: "平台管理员", recallReason: `【测试】${key}` });
        order.cancellationRecords.push({ time: at(28), operator: "平台管理员", reason: order.recallReason,
          poolAction: order.downloads.length ? "保留全部号码" : "释放全部号码" });
      }
      orders.push(order);
      const ownRequests = bindRequests.filter(row => row.orderNo === no);
      for (const req of ownRequests.filter(row => row.status !== "草稿")) {
        const pending = req.status === "待审批";
        message(order, pending ? "绑定申请" : "绑定审核结果", `${req.product}：${req.status}`,
          pending ? "运营方" : customer.name, { productId: req.productId, bindRequestNo: req.no, reason: req.rejectReason });
      }
      for (const item of products.filter(row => row.requestedOrderNo === no && row.status !== "草稿")) {
        message(order, item.status === "待审核" ? "产品审核申请" : "绑定审核结果", `${item.name}：${item.status}`,
          item.status === "待审核" ? "运营方" : customer.name, { productId: item.id, reason: item.rejectionReason });
      }
      const wd = withdrawals.find(row => row.demoKey === `${order.demoKey}:withdrawal`);
      if (wd) message(order, wd.status === "待审批" ? "产品撤回申请" : "撤回审核结果",
        `${wd.product}撤回：${wd.status}`, wd.status === "待审批" ? "运营方" : customer.name,
        { productId: wd.productId, withdrawalNo: wd.no, reason: wd.rejectReason });
      const sampleKind = { partial: "active", pending: "pending", reset: "reset", empty: "unbound", "cancel-locked": "cancelled" }[kind];
      if (sampleKind && !samples[sampleKind]) samples[sampleKind] = { code: omCode(order, line, payload.lines[0].randoms[0]),
        orderNo: no, customerId: customer.id, account: customer.account, kind: sampleKind };
      return order;
    }
    try {
      const tea = category("茶叶");
      const craft = category("手工艺品");
      const yunling = owner("yunling", "云岭生态农业有限公司");
      const primary = yunling.status === "启用" ? yunling : owner("demo_main", "主流程茶业测试有限公司");
      const secondary = owner("beichen", "北辰农产有限公司");
      const third = owner("songye", "松野食品科技有限公司");
      const shared = owner("demo_shared", "共享号茶业测试有限公司", "启用", true);
      owner("demo_empty", "暂无订单测试有限公司", "启用", true);
      owner("demo_disabled", "禁用账号测试有限公司", "禁用", true);
      const scenarios = [
        ["刚创建，暂无绑定", "empty"], ["新产品待提交", "new-draft"], ["新产品待审核", "new-pending"],
        ["新产品已驳回", "new-rejected"], ["新产品审核通过", "new-active"],
        ["已有产品申请草稿", "draft"], ["已有产品待审批", "pending"],
        ["已有产品申请被驳回", "rejected"], ["申请已撤回", "withdrawn"], ["部分绑定，含扫码记录", "partial"],
        ["整单已绑定", "full"], ["产品撤回待审批", "withdrawal-pending"], ["产品撤回已驳回", "withdrawal-rejected"],
        ["产品撤回通过，码已重置", "reset"], ["未下载撤销，号码释放", "cancel-free"],
        ["已下载撤销，号码锁定", "cancel-locked"], ["首次申请驳回后撤销", "cancel-rejected"],
        ["多品类多状态综合订单", "mixed"],
      ];
      for (const [label, kind] of scenarios) await scenario(primary, label, kind, tea, craft);
      for (const customer of [secondary, third, shared]) {
        // Existing disabled accounts retain their status and receive no new orders.
        if (customer.status !== "启用") continue;
        for (const [label, kind] of scenarios.filter(([, kind]) =>
          ["empty", "pending", "partial", "reset", "mixed"].includes(kind))) await scenario(customer, label, kind, tea, craft);
      }
      for (const payload of payloads) await omPayload(payload.no, payload);
      const scanRecords = fxStore.get("trace-scan-records-v2", {});
      for (const sample of Object.values(samples).filter(row => row.kind === "active")) {
        const records = [
          { time: at(29, 9), ip: "192.0.2.18", region: "云南省昆明市", mock: true },
          { time: at(29, 12), ip: "2001:db8::1030", region: "广东省深圳市", mock: true },
          { time: at(30, 8), ip: "", region: "", mock: true },
        ];
        scanRecords[sample.code] = { count: records.length, times: records.map(row => row.time), records, mock: true };
      }
      fxReconcileActivationStatistics();
      const report = { version: traceDemoVersion, installedAt: omNow(), samples,
        counts: Object.fromEntries(Object.entries(lists).map(([name, list]) => [name, list.filter(row => row.demoTag === traceDemoVersion).length])) };
      // Commit metadata after payloads; failure restores the pre-install data and leaves no completion marker.
      for (const [name, list] of Object.entries(lists)) localStorage.setItem(`copy-20261022:${fxBusinessStorage[name]}`, JSON.stringify(list));
      localStorage.setItem(`copy-20261022:${fxCategoryKey}`, JSON.stringify(categories));
      localStorage.setItem("copy-20261022:trace-scan-records-v2", JSON.stringify(scanRecords));
      localStorage.setItem(`copy-20261022:${traceDemoMarker}`, JSON.stringify(report));
      window.TRACE_DEMO_DATA = report;
      return report;
    } catch (error) {
      for (const [name, list] of Object.entries(lists)) {
        list.splice(0, list.length, ...before[name]);
        localStorage.setItem(`copy-20261022:${fxBusinessStorage[name]}`, JSON.stringify(before[name]));
      }
      localStorage.setItem(`copy-20261022:${fxCategoryKey}`, JSON.stringify(previousCategories));
      for (const payload of payloads) await omPayload(payload.no, null, true).catch(() => {});
      throw error;
    }
  });
}
