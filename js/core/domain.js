"use strict";

const fxToday = "2026-07-27";
  const fxNow = () => `${fxToday} ${new Date().toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" })}`;
  const fxEscape = (value = "") => String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const fxClone = value => JSON.parse(JSON.stringify(value));
  const fxStore = {
    get(key, fallback = null) { try { const value = localStorage.getItem(key); return value == null ? fallback : JSON.parse(value); } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} },
    sessionGet(key, fallback = null) { try { const value = sessionStorage.getItem(key); return value == null ? fallback : value; } catch (_) { return fallback; } },
    sessionSet(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} },
  };

  const fxOperators = fxStore.get("trace-operators-v2", [
    { id: 1, name: "平台管理员", account: "operator_01", password: "Trace@2026", status: "启用", lastLogin: "2026-07-27 09:18" },
    { id: 2, name: "审核专员", account: "review_02", password: "Trace@2026", status: "启用", lastLogin: "2026-07-27 08:42" },
    { id: 3, name: "订单专员", account: "order_03", password: "Trace@2026", status: "禁用", lastLogin: "2026-07-24 16:20" },
  ]);
  const fxEditorModules = ["product", "company", "production", "quality", "trace"];
  const fxModuleFileFieldLabels = { product: "产品图片与附件", company: "企业图片与附件", production: "生产图片与附件", quality: "质量图片与附件", trace: "追溯图片与附件" };
  const fxProductFieldSchemaVersion = 2;
  const fxCompanyFieldSchemaVersion = 1;
  const fxProductionFieldSchemaVersion = 1;
  const fxQualityFieldSchemaVersion = 1;
  const fxStandardFieldDefs = {
    product: [
      { key: "productName", label: "产品名称", required: true },
      { key: "brand", label: "产品品牌", required: true, mediaKey: "brand", mediaLabel: "品牌图片" },
      { key: "category", label: "产品大类", type: "select", options: ["农产品", "养殖品", "加工食品", "工业品", "医疗卫生用品"], scan: false },
      { key: "subcategory", label: "产品子类", scan: false },
      { key: "trademark", label: "产品商标", mediaKey: "trademark", mediaLabel: "商标图片" },
      { key: "productImages", label: "产品图片", mediaKey: "productImages", mediaLabel: "产品图片" },
      { key: "intro", label: "产品介绍", type: "textarea" },
      { key: "specification", label: "产品规格" },
      { key: "origin", label: "产品产地" },
      { key: "batch", label: "产品批次", required: true },
      { key: "productionDate", label: "产品生产日期", type: "date" },
      { key: "shelfLife", label: "产品保质期" },
      { key: "storage", label: "储存条件" },
      { key: "standard", label: "执行标准" },
    ],
    company: [
      { key: "companyName", label: "公司名称", required: true },
      { key: "companyAddress", label: "公司地址" },
      { key: "companyIntro", label: "公司介绍", type: "textarea" },
      { key: "companyPhone", label: "公司电话" },
      { key: "businessLicense", label: "营业执照", mediaKey: "businessLicense", mediaLabel: "营业执照", mediaOnly: true, mediaTypes: ["image", "pdf"] },
      { key: "qualificationProof", label: "资质证明（生产许可、体系认证、荣誉证书等证书）", mediaKey: "qualificationProof", mediaLabel: "资质证明图片与 PDF", mediaTypes: ["image", "pdf"] },
      { key: "productionEnvironment", label: "生产环境", mediaKey: "productionEnvironment", mediaLabel: "生产环境图片", mediaTypes: ["image"] },
    ],
    production: [
      { key: "productionUnit", label: "生产单位", required: true },
      { key: "productionAddress", label: "生产地址" },
      { key: "productionSiteEnvironment", label: "生产环境", mediaKey: "productionSiteEnvironment", mediaLabel: "生产环境图片", mediaTypes: ["image"] },
      { key: "qualificationDocuments", label: "资质证件", mediaKey: "qualificationDocuments", mediaLabel: "资质证件图片与 PDF", mediaTypes: ["image", "pdf"] },
      { key: "process", label: "独特工艺流程", type: "textarea", mediaKey: "process", mediaLabel: "独特工艺流程图片", mediaTypes: ["image"] },
      { key: "equipment", label: "关键生产设备", mediaKey: "equipment", mediaLabel: "关键生产设备图片", mediaTypes: ["image"] },
      { key: "productionLicense", label: "生产许可证书及认证证书", mediaKey: "productionLicense", mediaLabel: "生产许可证书及认证证书图片与 PDF", mediaTypes: ["image", "pdf"] },
    ],
    quality: [
      { key: "productHonorCertificate", label: "产品荣誉证", mediaKey: "productHonorCertificate", mediaLabel: "产品荣誉证图片与 PDF", mediaTypes: ["image", "pdf"] },
      { key: "productCertificationCertificate", label: "产品认证证书", mediaKey: "productCertificationCertificate", mediaLabel: "产品认证证书图片与 PDF", mediaTypes: ["image", "pdf"] },
      { key: "onSiteVerificationCertificate", label: "实地验证证书", mediaKey: "onSiteVerificationCertificate", mediaLabel: "实地验证证书图片与 PDF", mediaTypes: ["image", "pdf"] },
      { key: "productInspectionReport", label: "产品检测报告（同批次六个月以内报告）", type: "textarea", mediaKey: "productInspectionReport", mediaLabel: "产品检测报告图片与 PDF", mediaTypes: ["image", "pdf"] },
    ],
    trace: [],
  };

  customers.forEach((item, index) => Object.assign(item, {
    id: item.id || index + 1,
    password: item.password || "Trace@2026",
    license: item.license || (index === 0 ? "营业执照_云岭生态农业.pdf" : "已上传"),
    legalId: item.legalId || (index === 0 ? "法人身份证_云岭.jpg" : "已上传"),
  }));
  orders.forEach((item, index) => Object.assign(item, {
    id: item.id || index + 1,
    created: item.created || ["2026-07-22", "2026-07-19", "2026-07-15", "2026-06-28"][index] || fxToday,
    createdAt: item.createdAt || `${item.created || ["2026-07-22", "2026-07-19", "2026-07-15", "2026-06-28"][index] || fxToday} ${["10:19", "09:42", "15:06", "11:28"][index] || "09:00"}`,
    activations: item.activations || (item.active ? [{ batch: item.range.split("–")[0], amount: item.active, time: `${item.created || fxToday} 14:20`, product: index === 0 ? "云岭高山绿茶" : index === 1 ? "有机稻花香米" : "历史产品", operator: "平台管理员" }] : []),
  }));

  const fxDefaultDetails = product => ({
    productName: product.name,
    brand: product.id === 2 ? "北辰良田" : "云岭春芽",
    category: product.category,
    subcategory: product.category === "农产品" ? "茶叶" : "食品",
    trademark: product.id === 2 ? "北辰良田" : "云岭春芽",
    productImages: `${product.name}产品与包装图片`,
    intro: "精选高山生态原料，经标准化工艺加工并完成批次质量检验。",
    specification: "100 g / 盒",
    origin: "云南省临沧市双江县",
    batch: product.batch,
    productionDate: "2026-07-18",
    shelfLife: "18 个月",
    storage: "阴凉干燥处密封保存",
    standard: "GB/T 14456.1-2017",
    companyName: product.company,
    companyPhone: "0883-661 2098",
    companyAddress: "云南省临沧市双江县勐库镇茶山路 18 号",
    companyIntro: "专注生态种植、加工和批次品质管理，建立完整生产记录。",
    businessLicense: "",
    qualificationProof: "已取得食品生产许可及质量管理体系认证",
    productionEnvironment: "标准化生产车间与生态原料基地",
    productionUnit: `${product.company.replace("有限公司", "")}生产中心`,
    productionAddress: "双江县勐库镇大雪山村",
    productionSiteEnvironment: "生态原料基地与标准化清洁生产车间",
    qualificationDocuments: "已取得食品生产相关资质证件",
    process: "原料验收 → 标准化加工 → 检验 → 包装入库",
    equipment: "自动化加工与检测设备",
    productionLicense: "SC11453092501826",
    qualityReport: `${product.batch}_产品检测报告.pdf`,
    certification: "有机产品认证",
    certificateNo: "ORG-CN-2026-1886",
    qualityNote: "本批次检测项目符合执行标准要求。",
    productHonorCertificate: "区域公用品牌优质产品荣誉",
    productCertificationCertificate: "有机产品认证；证书编号 ORG-CN-2026-1886",
    onSiteVerificationCertificate: "生产基地及加工现场已完成实地验证",
    productInspectionReport: `${product.batch}_产品检测报告.pdf；本批次检测项目符合执行标准要求。`,
    trace: [
      { date: "2026-03-12", content: "完成生产基地春季管护记录" },
      { date: "2026-07-18", content: "原料采收并完成入厂验收" },
      { date: "2026-07-20", content: "批次检测合格并包装入库" },
    ],
    fieldMedia: { brand: [], trademark: [], productImages: [], businessLicense: [], qualificationProof: [], productionEnvironment: [], productionSiteEnvironment: [], qualificationDocuments: [], process: [], equipment: [], productionLicense: [], productHonorCertificate: [], productCertificationCertificate: [], onSiteVerificationCertificate: [], productInspectionReport: [] },
    custom: { product: [], company: [], production: [], quality: [], trace: [] },
    files: { product: ["产品主图.jpg"], company: ["营业执照.pdf", "资质证明.pdf"], production: ["生产环境.jpg"], quality: [`${product.batch}_产品检测报告.pdf`], trace: [] },
  });
  products.forEach(product => {
    if (!product.details) product.details = fxDefaultDetails(product);
    fxNormalizeDetails(product.details);
    if (product.status === "草稿") product.submitted = "";
  });
  withdrawals.forEach((item, index) => Object.assign(item, { id: item.id || index + 1, rejectReason: item.rejectReason || (item.status === "已驳回" ? "资料可由运营方直接修改，无需重置码段" : "") }));
  messages.splice(0, messages.length,
    { id: 1, type: "产品审核申请", title: "云岭高山绿茶等待审核", detail: "客户已提交五个资料模块，请及时处理。", time: "2026-07-27 10:32", unread: true, recipient: "运营方", customer: "云岭生态农业有限公司" },
    { id: 2, type: "产品撤回申请", title: "有机稻花香米发起全量撤回", detail: "涉及 20,000 枚已激活码，等待运营方审批。", time: "2026-07-27 09:18", unread: true, recipient: "运营方", customer: "北辰农产有限公司" },
    { id: 3, type: "产品审核通过", title: "云岭春芽红茶已通过并激活", detail: "审核通过，已激活 18,000 枚溯源质控码。", time: "2026-07-24 15:18", unread: false, recipient: "云岭生态农业有限公司", customer: "云岭生态农业有限公司" },
    { id: 4, type: "产品撤回驳回", title: "古树晒青毛茶撤回申请已驳回", detail: "处理说明：请联系运营方直接修改产品信息。", time: "2026-06-18 13:06", unread: true, recipient: "云岭生态农业有限公司", customer: "云岭生态农业有限公司" }
  );

  const fxBusinessStorage = {
    customers: "trace-customers-v3",
    orders: "trace-orders-v3",
    bindRequests: "trace-bind-requests-v2",
    products: "trace-products-v3",
    withdrawals: "trace-withdrawals-v3",
    messages: "trace-messages-v3",
  };
  const fxLegacyBusinessStorage = {
    customers: "trace-customers-v2",
    orders: "trace-orders-v2",
    bindRequests: "trace-bind-requests-v1",
    products: "trace-products-v2",
    withdrawals: "trace-withdrawals-v2",
    messages: "trace-messages-v2",
  };
  let fxProductsMigratedFromLegacy = false;
  function fxRestoreList(name, list) {
    let saved = fxStore.get(fxBusinessStorage[name], null);
    if (!Array.isArray(saved)) {
      saved = fxStore.get(fxLegacyBusinessStorage[name], null);
      if (name === "products") fxProductsMigratedFromLegacy = true;
    }
    if (Array.isArray(saved)) list.splice(0, list.length, ...saved);
  }
  Object.keys(fxBusinessStorage).forEach(name => {
    const list = { customers, orders, bindRequests, products, withdrawals, messages }[name];
    fxRestoreList(name, list);
  });
  function fxRemoveRequestedProducts() {
    const removed = products.filter(item => ["健康", "发额"].some(prefix => String(item.name || "").startsWith(prefix)));
    if (removed.length) {
      const removedIds = new Set(removed.map(item => Number(item.id)));
      const removedNames = new Set(removed.map(item => String(item.name || "")));
      products.splice(0, products.length, ...products.filter(item => !removedIds.has(Number(item.id))));
      bindRequests.splice(0, bindRequests.length, ...bindRequests.filter(item => !removedIds.has(Number(item.productId)) && !removedNames.has(String(item.product || ""))));
      withdrawals.splice(0, withdrawals.length, ...withdrawals.filter(item => !removedNames.has(String(item.product || ""))));
      messages.splice(0, messages.length, ...messages.filter(item => ![...removedNames].some(name => `${item.title || ""} ${item.detail || ""}`.includes(name))));
    }
  }
  if (fxProductsMigratedFromLegacy) fxRemoveRequestedProducts();
  customers.forEach((item, index) => Object.assign(item, {
    id: item.id || index + 1,
    password: item.password || "Trace@2026",
    license: item.license || "已上传",
    legalId: item.legalId || "已上传",
  }));
  orders.forEach((item, index) => Object.assign(item, {
    id: item.id || index + 1,
    created: item.created || fxToday,
    createdAt: item.createdAt || `${item.created || fxToday} ${["10:19", "09:42", "15:06", "11:28"][index] || "09:00"}`,
    activations: Array.isArray(item.activations) ? item.activations : [],
  }));
  products.forEach(product => { if (!product.details) product.details = fxDefaultDetails(product); fxNormalizeDetails(product.details); if (product.status === "草稿") product.submitted = ""; });
  orders.forEach(order => {
    let allocated = 0; const start = fxParseCode(String(order.range || "").split("–")[0]);
    order.activations = (order.activations || []).map(row => { const amount = Number(row.amount || 0); const range = row.range || (start && amount ? fxCodeAt(start, start.number + allocated) + "–" + fxCodeAt(start, start.number + allocated + amount - 1) : ""); allocated += amount; return { ...row, amount, range, status: row.status || "有效" }; });
  });
  withdrawals.forEach((item, index) => Object.assign(item, { id: item.id || index + 1, rejectReason: item.rejectReason || "" }));
  bindRequests.forEach((item, index) => Object.assign(item, {
    id: item.id || `BR-${Date.now()}-${index}`,
    no: item.no || `BR-202608-${String(index + 1).padStart(3, "0")}`,
    status: item.status || "待审批",
    time: item.time || fxNow(),
  }));
  const fxLegacyMessageTypes = {
    审核提醒: "产品审核申请",
    撤回申请: "产品撤回申请",
    激活通知: "产品审核通过",
    审核与激活: "产品审核通过",
    审核驳回: "产品审核驳回",
  };
  function fxReviewMessageCopy(product, approved, rawExplanation = "") {
    const batch = product?.batch || "—";
    const explanation = String(rawExplanation || "")
      .replace(/^产品批次：[^；;]+[；;]\s*/, "")
      .replace(/^处理说明：\s*/, "")
      .replace(/^审核通过[，,]\s*/, "")
      .trim() || (approved ? "审核通过并已完成码段激活。" : "请根据审核意见修改后重新提交。");
    return {
      type: approved ? "产品审核通过" : "产品审核驳回",
      title: `您申请的产品${product?.name || "—"}批次${batch}${approved ? "审核通过" : "审核未通过"}`,
      detail: `处理说明：${explanation}`,
    };
  }
  messages.forEach(item => {
    if (fxLegacyMessageTypes[item.type]) item.type = fxLegacyMessageTypes[item.type];
    else if (["撤回审批", "撤回结果"].includes(item.type)) item.type = String(item.title).includes("驳回") ? "产品撤回驳回" : "产品撤回通过";
    if (["产品审核通过", "产品审核驳回"].includes(item.type)) {
      const product = [...products].sort((left, right) => right.name.length - left.name.length).find(row =>
        String(item.title).includes(row.name) && (row.company === item.recipient || row.company === item.customer)
      );
      if (!product?.batch) return;
      Object.assign(item, fxReviewMessageCopy(product, item.type === "产品审核通过", item.detail));
      return;
    }
    if (item.type !== "绑定申请结果") return;
    const rejected = String(item.title).includes("驳回");
    const matchingRequests = bindRequests.filter(request =>
      String(item.title).includes(request.product) &&
      request.customer === item.recipient &&
      request.status === (rejected ? "已驳回" : "已通过")
    );
    const request = matchingRequests.find(row => row.decidedAt === item.time) || matchingRequests.find(row => String(item.detail).includes(row.orderNo)) || matchingRequests[0];
    if (!request?.batch || String(item.title).includes(`（${request.batch}）`)) return;
    item.title = `${request.product}（${request.batch}）绑定申请${rejected ? "已驳回" : "已通过"}`;
    item.detail = `产品批次：${request.batch}；${item.detail}`;
  });
  const fxDemoCaseVersion = 7;
  function fxCompleteDemoDetails() {
    return fxNormalizeDetails({
      productName: "云岭高山有机绿茶",
      brand: "云岭春芽",
      category: "农产品",
      subcategory: "茶叶 · 绿茶",
      trademark: "云岭春芽注册商标",
      productImages: "包装、冲泡与干茶细节图片",
      intro: "精选海拔 1,800 米以上生态茶园春季一芽一叶鲜叶，经摊青、杀青、揉捻、整形和低温干燥制成。茶汤嫩绿清亮，栗香持久，滋味鲜爽回甘。",
      specification: "100 g / 盒；净含量误差符合国家标准",
      origin: "云南省临沧市双江县勐库镇大雪山茶区",
      batch: "YL20260726",
      productionDate: "2026-07-26",
      shelfLife: "18 个月",
      storage: "密封、避光、防潮、防异味，建议 5-25 摄氏度保存",
      standard: "GB/T 14456.1-2017",
      companyName: "云岭生态农业有限公司",
      companyPhone: "0883-661 2098",
      companyAddress: "云南省临沧市双江县勐库镇茶山路 18 号",
      companyIntro: "企业建立 126.5 亩高山生态茶园、标准化初制所和批次质量实验室，实行从地块、采摘、生产、检验、包装到赋码入库的全过程记录。",
      businessLicense: "",
      qualificationProof: "食品生产许可证、有机产品认证证书及企业荣誉证书",
      productionEnvironment: "海拔 1,800 米以上生态茶园与标准化清洁生产车间",
      productionUnit: "云岭生态农业有限公司勐库初制所",
      productionAddress: "云南省临沧市双江县勐库镇大雪山村 6 组",
      productionSiteEnvironment: "海拔 1,800 米以上生态茶园与标准化清洁生产车间",
      qualificationDocuments: "食品生产单位主体资质、场地及从业人员证件齐全",
      process: "鲜叶验收 → 摊青 → 杀青 → 揉捻 → 整形 → 低温干燥 → 分级 → 检验 → 包装赋码",
      equipment: "连续式滚筒杀青机、智能揉捻机、低温热风干燥机、色选机、金属检测仪、自动称量包装线",
      productionLicense: "SC11453092501826；有机生产及质量管理体系认证",
      qualityReport: "YL-QA-20260726-018 产品质量检验报告",
      certification: "有机产品认证",
      certificateNo: "ORG-CN-2026-1886",
      qualityNote: "本批次水分、总灰分、粉末、铅及农药残留等项目均符合执行标准要求，样品封样状态完好，判定合格。",
      productHonorCertificate: "临沧市高原特色优质农产品荣誉",
      productCertificationCertificate: "有机产品认证；证书编号 ORG-CN-2026-1886",
      onSiteVerificationCertificate: "生态茶园、初制所及批次质量实验室已完成实地验证",
      productInspectionReport: "YL-QA-20260726-018 产品质量检验报告；报告出具时间为本批次六个月以内，所检项目符合执行标准要求。",
      trace: [
        { date: "2026-03-12", content: "茶园春季管护：完成有机肥施用和病虫害巡查，地块 YL-CY-07 未使用禁限用投入品" },
        { date: "2026-07-23 06:40", content: "鲜叶采收：14 名采摘人员完成一芽一叶鲜叶采收 328 kg" },
        { date: "2026-07-23 08:26", content: "鲜叶入厂：运输用时 46 分钟，嫩度、洁净度和含水状态验收合格" },
        { date: "2026-07-23 09:10", content: "初制加工：摊青、杀青、揉捻和低温干燥关键参数均在工艺控制范围内" },
        { date: "2026-07-25 14:30", content: "质量检验：批次抽样完成，检验报告 YL-QA-20260726-018 判定合格" },
        { date: "2026-07-26 10:18", content: "包装赋码：分装 820 盒，完成质控码关联并入库至 A-03 库位" },
      ],
      fieldMedia: {
        brand: [{ name: "云岭春芽品牌标识.jpg", type: "image/jpeg", src: "assets/demo-case/product-package-v2.jpg" }],
        trademark: [{ name: "云岭春芽商标.jpg", type: "image/jpeg", src: "assets/demo-case/product-package.jpg" }],
        productImages: [
          { name: "云岭高山有机绿茶包装主图.jpg", type: "image/jpeg", src: "assets/demo-case/product-package-final.jpg" },
          { name: "云岭高山有机绿茶冲泡图.jpg", type: "image/jpeg", src: "assets/demo-case/product-brew-detail.jpg" },
          { name: "本批次干茶细节.jpg", type: "image/jpeg", src: "assets/demo-case/product-dry-leaves.jpg" },
        ],
        businessLicense: [{ name: "企业营业执照信息示例.pdf", type: "application/pdf", src: "assets/demo-case/business-license.pdf" }],
        qualificationProof: [{ name: "有机产品认证证书示例.pdf", type: "application/pdf", src: "assets/demo-case/organic-certificate.pdf" }],
        productionEnvironment: [{ name: "云岭高山生态茶园.jpg", type: "image/jpeg", src: "assets/tea-field.jpg" }],
        productionSiteEnvironment: [{ name: "勐库高山生产基地.jpg", type: "image/jpeg", src: "assets/demo-case/production-base.jpg" }],
        qualificationDocuments: [{ name: "生产单位资质证件.pdf", type: "application/pdf", src: "assets/demo-case/production-license.pdf" }],
        process: [{ name: "茶叶加工工艺.jpg", type: "image/jpeg", src: "assets/demo-case/production-craft.jpg" }],
        equipment: [{ name: "智能生产设备.jpg", type: "image/jpeg", src: "assets/demo-case/production-craft-v2.jpg" }],
        productionLicense: [{ name: "有机生产认证证书.pdf", type: "application/pdf", src: "assets/demo-case/organic-certificate.pdf" }],
        productHonorCertificate: [{ name: "优质农产品荣誉证书.pdf", type: "application/pdf", src: "assets/demo-case/product-spec.pdf" }],
        productCertificationCertificate: [{ name: "有机产品认证证书.pdf", type: "application/pdf", src: "assets/demo-case/organic-certificate.pdf" }],
        onSiteVerificationCertificate: [{ name: "实地验证记录.jpg", type: "image/jpeg", src: "assets/demo-case/quality-lab.jpg" }],
        productInspectionReport: [{ name: "YL20260726 产品质量检验报告.pdf", type: "application/pdf", src: "assets/demo-case/quality-report.pdf" }],
      },
      custom: {
        product: [
          { id: "demo-picking-standard", name: "采摘标准", type: "mixed", value: "一芽一叶，晴天露水干后分区采摘", files: [
            { name: "本批次鲜叶采摘标准.jpg", type: "image/jpeg", src: "assets/demo-case/product-leaves.jpg" },
            { name: "云岭高山有机绿茶产品说明书.pdf", type: "application/pdf", src: "assets/demo-case/product-spec.pdf" },
          ] },
          { id: "demo-net-content", name: "净含量", type: "text", value: "100 g / 盒" },
          { id: "demo-brewing-temperature", name: "建议冲泡水温", type: "text", value: "85 摄氏度" },
        ],
        company: [{ name: "茶园面积", value: "126.5 亩" }, { name: "统一社会信用代码", value: "91530925MA6K7Y2X8P" }],
        production: [{ name: "生产负责人", value: "李春芽" }, { name: "当批成品", value: "82 kg / 820 盒" }],
        quality: [{ name: "水分", value: "5.8%" }, { name: "总灰分", value: "4.6%" }, { name: "农残筛查", value: "所检项目未检出" }],
        trace: [{ id: "demo-storage-record", name: "仓储库位", type: "mixed", value: "A-03 恒温干燥成品库", files: [
          { name: "批次生产追溯记录.pdf", type: "application/pdf", src: "assets/demo-case/trace-record.pdf" },
        ] }],
      },
      files: {
        product: [],
        company: [],
        production: [],
        quality: [],
        trace: [],
      },
    });
  }
  function fxEnsureCompleteDemoCase() {
    const marker = Number(fxStore.get("trace-complete-demo-case-version", 0));
    let product = products.find(item => item.demoCase === "complete-tea");
    let order = orders.find(item => item.demoCase === "complete-tea");
    let withdrawal = withdrawals.find(item => item.demoCase === "complete-tea");
    if (marker < fxDemoCaseVersion || !product || !order || !withdrawal) {
      const productData = { id: 1001, demoCase: "complete-tea", name: "云岭高山有机绿茶", company: "云岭生态农业有限公司", category: "农产品", batch: "YL20260726", status: "已激活", submitted: "2026-07-26 10:32", amount: 12000, details: fxCompleteDemoDetails() };
      if (product) Object.assign(product, productData); else { product = productData; products.unshift(product); }
      const orderData = { id: 1001, demoCase: "complete-tea", no: "ORD-202607-088", customer: "云岭生态农业有限公司", range: "YL00880001–YL00910000", total: 30000, active: 12000, created: "2026-07-26", createdAt: "2026-07-26 10:18", style: "标准方形 · 黑白", size: "30 × 30 mm", note: "完整案例：春季特级有机绿茶首批包装赋码", activations: [{ batch: "YL20260726", range: "YL00880001–YL00892000", amount: 12000, time: "2026-07-26 10:32", product: "云岭高山有机绿茶", operator: "平台管理员", status: "有效" }] };
      if (order) Object.assign(order, orderData); else { order = orderData; orders.unshift(order); }
      const withdrawalData = { id: 1001, demoCase: "complete-tea", no: "WD-202607-018", product: "云岭高山有机绿茶", customer: "云岭生态农业有限公司", reason: "演示撤回审批流程并核对附件版本", status: "已驳回", time: "2026-07-27 09:06", decidedAt: "2026-07-27 09:28", rejectReason: "当前产品资料和质检附件均为最新版本，无需撤回或重置关联码" };
      if (withdrawal) Object.assign(withdrawal, withdrawalData); else { withdrawal = withdrawalData; withdrawals.unshift(withdrawal); }
      const demoMessages = [
        { id: 1001, demoCase: "complete-tea-approval", type: "产品审核通过", title: "您申请的产品云岭高山有机绿茶批次YL20260726审核通过", detail: "处理说明：已关联订单 ORD-202607-088，激活 12,000 枚，码段 YL00880001–YL00892000。", time: "2026-07-26 10:32", unread: false, recipient: "云岭生态农业有限公司", customer: "云岭生态农业有限公司" },
        { id: 1002, demoCase: "complete-tea-withdrawal", type: "产品撤回驳回", title: "云岭高山有机绿茶撤回申请已驳回", detail: "当前产品资料和质检附件均为最新版本，无需撤回或重置关联码。", time: "2026-07-27 09:28", unread: true, recipient: "云岭生态农业有限公司", customer: "云岭生态农业有限公司" },
      ];
      demoMessages.reverse().forEach(message => { const existing = messages.find(item => item.demoCase === message.demoCase); if (existing) Object.assign(existing, message); else messages.unshift(message); });
      const customer = customers.find(item => item.name === "云岭生态农业有限公司");
      if (customer) { const ownOrders = orders.filter(item => item.customer === customer.name); customer.total = ownOrders.reduce((sum, item) => sum + Number(item.total || 0), 0); customer.active = ownOrders.reduce((sum, item) => sum + Number(item.active || 0), 0); }
      fxStore.set("trace-complete-demo-case-version", fxDemoCaseVersion);
    }
  }
  fxEnsureCompleteDemoCase();
  function fxSaveBusiness() {
    fxStore.set(fxBusinessStorage.customers, customers);
    fxStore.set(fxBusinessStorage.orders, orders);
    fxStore.set(fxBusinessStorage.bindRequests, bindRequests);
    fxStore.set(fxBusinessStorage.products, products);
    fxStore.set(fxBusinessStorage.withdrawals, withdrawals);
    fxStore.set(fxBusinessStorage.messages, messages);
  }
  let fxApplyingStorageUpdate = false;
  let fxStorageRenderPending = false;
  function fxRenderFromStorage() {
    if (fxStorageRenderPending) return;
    fxStorageRenderPending = true;
    requestAnimationFrame(() => {
      fxStorageRenderPending = false;
      fxApplyingStorageUpdate = true;
      try {
        render();
      } finally {
        fxApplyingStorageUpdate = false;
      }
    });
  }
  function fxCurrentCustomer() {
    return customers.find(item => item.account === state.currentAccount) || customers[0];
  }
  function fxCurrentOperator() {
    return fxOperators.find(item => item.account === state.currentAccount) || fxOperators[0];
  }
  function fxIsCurrentOperator(item) {
    return Boolean(item && item.account === state.currentAccount);
  }

  nav.ops.splice(0, nav.ops.length,
    ["customers", "building-2", "客户列表"],
    ["orders", "receipt-text", "订单台账"],
    ["reviews", "clipboard-check", "产品审核"],
    ["bind-requests", "link-2", "绑定审核"],
    ["withdrawals", "rotate-ccw", "撤回审核"],
    ["operators", "users-round", "运营账号管理"],
    ["messages", "mail", "站内信"],
    ["settings", "settings", "个人设置"]
  );
  if (!nav.customer.some(item => item[0] === "orders")) nav.customer.splice(1, 0, ["orders", "receipt-text", "订单台账"]);
  const fxCustomerOrderNav = nav.customer.find(item => item[0] === "orders");
  if (fxCustomerOrderNav) fxCustomerOrderNav[2] = "订单台账";
  Object.assign(state, {
    authenticated: entryPortal === "scan" || fxStore.sessionGet(`trace-auth-${entryPortal}`, "0") === "1",
    currentAccount: fxStore.sessionGet(`trace-account-${entryPortal}`, entryPortal === "customer" ? customers[0].account : fxOperators[0].account),
    operatorFilter: "", operatorStatus: "全部状态",
    operatorDateFrom: "", operatorDateTo: "", operatorDateDraftFrom: "", operatorDateDraftTo: "",
    operatorCalendarOpen: false, operatorCalendarLeftMonth: "2026-06-01", operatorCalendarRightMonth: "2026-07-01",
    customerFilter: "", customerStatus: "全部状态", customerSortKey: "", customerSortDirection: "asc",
    orderFilter: "", orderFrom: "", orderTo: "", orderSortKey: "", orderSortDirection: "asc",
    orderDateDraftFrom: "", orderDateDraftTo: "", orderCalendarOpen: false,
    orderCalendarLeftMonth: "2026-06-01", orderCalendarRightMonth: "2026-07-01",
    bindRequestFilter: "", bindRequestStatus: "全部状态",
    bindRequestDateFrom: "", bindRequestDateTo: "", bindRequestDateDraftFrom: "", bindRequestDateDraftTo: "",
    productCategory: "全部大类",
    reviewDateFrom: "", reviewDateTo: "", reviewDateDraftFrom: "", reviewDateDraftTo: "",
    withdrawalFilter: "", withdrawalStatus: "全部状态",
    withdrawalDateFrom: "", withdrawalDateTo: "", withdrawalDateDraftFrom: "", withdrawalDateDraftTo: "",
    customerOrderSortKey: "", customerOrderSortDirection: "asc",
    customerProductFilter: "", customerProductStatus: "全部状态", customerProductCategory: "全部大类",
    customerProductSortKey: "", customerProductSortDirection: "asc",
    customerWithdrawalStatus: "全部状态",
    customerOrderDateFrom: "", customerOrderDateTo: "", customerOrderDateDraftFrom: "", customerOrderDateDraftTo: "",
    customerProductDateFrom: "", customerProductDateTo: "", customerProductDateDraftFrom: "", customerProductDateDraftTo: "",
    customerWithdrawalDateFrom: "", customerWithdrawalDateTo: "", customerWithdrawalDateDraftFrom: "", customerWithdrawalDateDraftTo: "",
    customerCalendarOpen: false, customerCalendarContext: "", customerCalendarLeftMonth: "2026-06-01", customerCalendarRightMonth: "2026-07-01",
    messageSearch: "", messageReadFilter: "全部阅读状态", messageRecipientFilter: "全部接收方",
    messageTimeFilter: "全部发送时间", messageTypeFilter: "全部消息类型",
    messageDateFrom: "", messageDateTo: "", messageDateDraftFrom: "", messageDateDraftTo: "",
    messageCalendarOpen: false, messageCalendarLeftMonth: "2026-06-01", messageCalendarRightMonth: "2026-07-01",
    selectedMessageIds: [],
    selectedOperatorId: null, selectedCustomerId: null, selectedOrderNo: null, highlightOrderNo: null,
    selectedWithdrawalIndex: null, selectedMessageId: null, selectedBindRequestId: null,
    editorProductId: null, editorDraft: null, editorReadonly: false, editorOwner: "customer", editorTargetOrderNo: null,
    editorRequestedSourceRange: "", editorRequestedRange: "", editorRequestedAmount: 0, reviewEditing: false,
    qrDraft: { customerId: null, style: "标准方形 · 黑白", size: "25 × 25 mm", amount: 500, note: "" },
    generatedOrderNo: null, previewVersion: 1,
    scanExpandedModules: {},
  });
  const fxDirectPageParams = new URLSearchParams(location.search);
  if (fxDirectPageParams.get("order")) {
    state.selectedOrderNo = fxDirectPageParams.get("order");
    if (state.customerPage === "editor") state.editorTargetOrderNo = fxDirectPageParams.get("order");
  }
  if (fxDirectPageParams.get("customer")) state.selectedCustomerId = Number(fxDirectPageParams.get("customer"));
  if (fxDirectPageParams.get("product")) {
    const productId = Number(fxDirectPageParams.get("product"));
    if (state.opsPage === "review-detail") state.drawerProductId = productId;
    if (state.customerPage === "editor") state.editorProductId = productId;
  }
  if (fxDirectPageParams.get("step")) state.productStep = Math.max(0, Math.min(5, Number(fxDirectPageParams.get("step")) || 0));
  if (new URLSearchParams(location.search).has("login") && entryPortal !== "scan") state.authenticated = false;

  function fxSaveOperators() { fxStore.set("trace-operators-v2", fxOperators); }
  function fxOperatorMatchesLoginTime(operator) {
    const loginDate = String(operator.lastLogin || "").slice(0, 10);
    if (!state.operatorDateFrom && !state.operatorDateTo) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(loginDate)) return false;
    return (!state.operatorDateFrom || loginDate >= state.operatorDateFrom) && (!state.operatorDateTo || loginDate <= state.operatorDateTo);
  }
  function fxFilteredOperators() {
    const term = state.operatorFilter.trim().toLowerCase();
    return fxNewestRows(fxOperators.filter(item => (!term || `${item.name} ${item.account}`.toLowerCase().includes(term)) && (state.operatorStatus === "全部状态" || item.status === state.operatorStatus) && fxOperatorMatchesLoginTime(item)), item => item.lastLogin);
  }
  function fxAddMessage(message) { messages.unshift({ id: Date.now(), time: fxNow(), unread: true, ...message }); }
  function fxIsApplicationSubmissionMessage(message) { return ["产品审核申请", "产品撤回申请", "绑定申请"].includes(message.type); }
  function fxIsCustomerMessage(message) { return customers.some(customer => customer.name === message.recipient); }
  function fxCustomerMessages() { return messages.filter(item => fxIsCustomerMessage(item) && !fxIsApplicationSubmissionMessage(item)); }
  function fxVisibleMessages(portal = state.portal) {
    if (portal === "customer") return messages.filter(item => item.recipient === fxCurrentCustomer().name && !fxIsApplicationSubmissionMessage(item));
    if (portal === "ops") return fxCustomerMessages();
    return [];
  }
  function fxUnreadMessageCount(portal = state.portal) { return fxVisibleMessages(portal).filter(item => item.unread).length; }
  function fxMessageMatchesTime(message) {
    const sentDate = String(message.time).slice(0, 10);
    if (!state.messageDateFrom && !state.messageDateTo) return true;
    return (!state.messageDateFrom || sentDate >= state.messageDateFrom) && (!state.messageDateTo || sentDate <= state.messageDateTo);
  }
  function fxFilteredOpsMessages() {
    const term = state.messageSearch.trim().toLowerCase();
    return fxNewestRows(fxCustomerMessages().filter(item =>
      (!term || `${item.title} ${item.detail}`.toLowerCase().includes(term)) &&
      (state.messageReadFilter === "全部阅读状态" || (state.messageReadFilter === "未读" ? item.unread : !item.unread)) &&
      (state.messageRecipientFilter === "全部接收方" || item.recipient === state.messageRecipientFilter) &&
      (state.messageTypeFilter === "全部消息类型" || item.type === state.messageTypeFilter) &&
      fxMessageMatchesTime(item)
    ), item => item.time);
  }
  function fxFilteredCustomerMessages() {
    const term = state.messageSearch.trim().toLowerCase();
    return fxNewestRows(messages.filter(item => item.recipient === fxCurrentCustomer().name && !fxIsApplicationSubmissionMessage(item) &&
      (!term || `${item.title} ${item.detail}`.toLowerCase().includes(term)) &&
      (state.messageReadFilter === "全部阅读状态" || (state.messageReadFilter === "未读" ? item.unread : !item.unread)) &&
      (state.messageTypeFilter === "全部消息类型" || item.type === state.messageTypeFilter) &&
      fxMessageMatchesTime(item)
    ), item => item.time);
  }
  function fxMessageFilterValue(filter) {
    return { recipient: state.messageRecipientFilter, time: state.messageDateFrom || state.messageDateTo ? "自定义日期" : "全部发送时间", type: state.messageTypeFilter, read: state.messageReadFilter }[filter];
  }
  function fxMessageFilterOptions(filter, customerScope = false) {
    const scopedMessages = customerScope ? fxVisibleMessages("customer") : fxCustomerMessages();
    if (filter === "recipient") return ["全部接收方", ...new Set(scopedMessages.map(item => item.recipient))];
    if (filter === "type") return ["全部消息类型", ...new Set(scopedMessages.map(item => item.type))];
    return ["全部阅读状态", "未读", "已读"];
  }
  function fxDownloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function fxDownloadExcel(filename, headers, rows) {
    const numberedHeaders = ["序号", ...headers];
    const numberedRows = rows.map((row, index) => [index + 1, ...row]);
    const head = numberedHeaders.map(value => `<th>${fxEscape(value)}</th>`).join("");
    const body = numberedRows.map(row => `<tr>${row.map(value => `<td>${fxEscape(value)}</td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><meta charset="utf-8"><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    fxDownloadBlob(filename, new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }));
  }
  function fxSerial(prefix, value) { return `${prefix}${String(value).padStart(8, "0")}`; }
  function fxOrderPrefix(customer) { return customer.account.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "QR"; }
  function fxParseCode(code = "") {
    const match = String(code).trim().match(/^([A-Za-z]+)(\d+)$/);
    return match ? { prefix: match[1].toUpperCase(), number: Number(match[2]), width: match[2].length } : null;
  }
  function fxCodeAt(parts, number) { return parts ? parts.prefix + String(number).padStart(parts.width, "0") : ""; }
  function fxCodeInRange(code, range = "") {
    const value = fxParseCode(code); const [startCode, endCode] = String(range).split("–"); const start = fxParseCode(startCode); const end = fxParseCode(endCode);
    return Boolean(value && start && end && value.prefix === start.prefix && value.prefix === end.prefix && value.number >= start.number && value.number <= end.number);
  }
  function fxActivationRange(order, amount) {
    const [startCode, endCode] = String(order.range || "").split("–");
    const start = fxParseCode(startCode); const end = fxParseCode(endCode); const needed = Number(amount || 0);
    if (!start || !end || needed < 1 || start.prefix !== end.prefix) return "";
    const reservedRows = fxCombinedPendingProducts(order.no).map(product => ({ range: product.requestedRange, status: "有效" }));
    const occupied = [...(order.activations || []), ...reservedRows].filter(row => row.status !== "已重置" && row.range).map(row => {
      const [rowStartCode, rowEndCode] = String(row.range).split("–");
      const rowStart = fxParseCode(rowStartCode); const rowEnd = fxParseCode(rowEndCode);
      return rowStart && rowEnd && rowStart.prefix === start.prefix && rowEnd.prefix === start.prefix
        ? { first: Math.max(start.number, rowStart.number), last: Math.min(end.number, rowEnd.number) }
        : null;
    }).filter(row => row && row.first <= row.last).sort((a, b) => a.first - b.first);
    let first = start.number;
    for (const interval of occupied) {
      if (interval.first - first >= needed) return `${fxCodeAt(start, first)}–${fxCodeAt(start, first + needed - 1)}`;
      first = Math.max(first, interval.last + 1);
    }
    return end.number - first + 1 >= needed ? `${fxCodeAt(start, first)}–${fxCodeAt(start, first + needed - 1)}` : "";
  }
  function fxOrderFreeRanges(order, excludeProductId = null) {
    const [startCode, endCode] = String(order?.range || "").split("–");
    const start = fxParseCode(startCode); const end = fxParseCode(endCode);
    if (!start || !end || start.prefix !== end.prefix) return [];
    const reservedRows = fxCombinedPendingProducts(order.no, excludeProductId).map(product => ({ range: product.requestedRange, status: "有效" }));
    const occupied = [...(order.activations || []), ...reservedRows].filter(row => row.status !== "已重置" && row.range).map(row => {
      const [rowStartCode, rowEndCode] = String(row.range).split("–");
      const rowStart = fxParseCode(rowStartCode); const rowEnd = fxParseCode(rowEndCode);
      return rowStart && rowEnd && rowStart.prefix === start.prefix && rowEnd.prefix === start.prefix
        ? { first: Math.max(start.number, rowStart.number), last: Math.min(end.number, rowEnd.number) }
        : null;
    }).filter(row => row && row.first <= row.last).sort((left, right) => left.first - right.first);
    const merged = [];
    occupied.forEach(interval => {
      const previous = merged[merged.length - 1];
      if (previous && interval.first <= previous.last + 1) previous.last = Math.max(previous.last, interval.last);
      else merged.push({ ...interval });
    });
    const ranges = [];
    let first = start.number;
    merged.forEach(interval => {
      if (interval.first > first) ranges.push({ first, last: interval.first - 1 });
      first = Math.max(first, interval.last + 1);
    });
    if (first <= end.number) ranges.push({ first, last: end.number });
    return ranges.map(range => ({
      range: `${fxCodeAt(start, range.first)}–${fxCodeAt(start, range.last)}`,
      first: fxCodeAt(start, range.first),
      last: fxCodeAt(start, range.last),
      amount: range.last - range.first + 1,
      start,
      firstNumber: range.first,
      lastNumber: range.last,
    }));
  }
  function fxRequestedRange(sourceRange, amount) {
    const [startCode, endCode] = String(sourceRange || "").split("–");
    const start = fxParseCode(startCode); const end = fxParseCode(endCode); const requestedAmount = Number(amount || 0);
    if (!start || !end || start.prefix !== end.prefix || !Number.isSafeInteger(requestedAmount) || requestedAmount < 1 || requestedAmount > end.number - start.number + 1) return "";
    return `${fxCodeAt(start, start.number)}–${fxCodeAt(start, start.number + requestedAmount - 1)}`;
  }
  function fxRequestedRangeIsAvailable(order, sourceRange, requestedRange, amount, excludeProductId = null) {
    const availableAmount = fxOrderAvailableAmount(order, excludeProductId);
    if (!Number.isSafeInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > availableAmount) return false;
    const source = fxOrderFreeRanges(order, excludeProductId).find(item => item.range === sourceRange);
    return Boolean(source && Number(amount) <= source.amount && fxRequestedRange(source.range, Number(amount)) === requestedRange);
  }
  function fxFileName(file) { return typeof file === "string" ? file : file?.name || "附件"; }
  function fxFileType(file) { return typeof file === "string" ? (/\.pdf$/i.test(file) ? "application/pdf" : "image/*") : file?.type || (/\.pdf$/i.test(file?.name || "") ? "application/pdf" : "image/*"); }
  function fxFileSrc(file, fallback = "") { return typeof file === "object" && file?.src ? file.src : fallback; }
  function fxNormalizeStoredFile(file) { return typeof file === "string" ? { name: file, type: fxFileType(file), src: "" } : { name: fxFileName(file), type: fxFileType(file), size: Number(file.size || 0), src: file.src || "" }; }
  function fxIsImageFile(file) { return fxFileType(file).startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(fxFileName(file)); }
  function fxUniqueFiles(files) {
    const seen = new Set();
    return files.map(fxNormalizeStoredFile).filter(file => { const key = `${file.name}\u0000${file.src}\u0000${file.size || 0}`; if (seen.has(key)) return false; seen.add(key); return true; });
  }
  function fxNormalizeDetails(details) {
    details.custom ||= {}; details.files ||= {}; details.fieldOrder ||= {}; details.fieldMedia ||= {};
    Object.values(fxStandardFieldDefs).flat().filter(field => field.mediaKey).forEach(field => {
      if (!Array.isArray(details.fieldMedia[field.mediaKey])) details.fieldMedia[field.mediaKey] = [];
      details.fieldMedia[field.mediaKey] = fxUniqueFiles(details.fieldMedia[field.mediaKey]);
    });
    if (!Array.isArray(details.trace)) details.trace = [];
    details.trace = details.trace.map((row, index) => ({ ...row, id: row.id || `trace-${index + 1}` }));
    fxEditorModules.forEach(module => {
      if (!Array.isArray(details.custom[module])) details.custom[module] = [];
      if (!Array.isArray(details.files[module])) details.files[module] = [];
      details.files[module] = details.files[module].map(fxNormalizeStoredFile);
      details.custom[module] = details.custom[module].map((row, index) => ({
        ...row,
        id: row.id || `custom-${module}-${index + 1}`,
        type: row.type === "file" ? "file" : row.type === "mixed" ? "mixed" : "text",
        value: row.value || "",
        files: Array.isArray(row.files) ? row.files.map(fxNormalizeStoredFile) : [],
      }));
      if (module === "product") {
        const migratedId = "module-files-product";
        let migrated = details.custom.product.find(row => row.id === migratedId);
        const legacyFiles = fxUniqueFiles([...(migrated?.files || []), ...details.files.product]);
        details.fieldMedia.productImages = fxUniqueFiles([...details.fieldMedia.productImages, ...legacyFiles.filter(fxIsImageFile)]);
        const legacyAttachments = legacyFiles.filter(file => !fxIsImageFile(file));
        if (legacyAttachments.length) {
          if (!migrated) { migrated = { id: migratedId, name: "产品附件", type: "file", value: "", files: [] }; details.custom.product.push(migrated); }
          if (!migrated.name || migrated.name === fxModuleFileFieldLabels.product) migrated.name = "产品附件";
          migrated.files = legacyAttachments;
        } else if (migrated) {
          details.custom.product = details.custom.product.filter(row => row.id !== migratedId);
        }
        details.files.product = [];
      } else if (module === "company") {
        const migratedId = "module-files-company";
        const migrated = details.custom.company.find(row => row.id === migratedId);
        const legacyFiles = fxUniqueFiles([...(migrated?.files || []), ...details.files.company]);
        legacyFiles.forEach(file => {
          const name = fxFileName(file);
          const targetKey = /营业执照/.test(name)
            ? "businessLicense"
            : /(许可|认证|资质|证书|荣誉)/.test(name)
              ? "qualificationProof"
              : fxIsImageFile(file)
                ? "productionEnvironment"
                : "qualificationProof";
          details.fieldMedia[targetKey] = fxUniqueFiles([...(details.fieldMedia[targetKey] || []), file]);
        });
        details.custom.company = details.custom.company.filter(row => row.id !== migratedId);
      details.files.company = [];
      } else if (module === "production") {
        const migratedId = "module-files-production";
        const migrated = details.custom.production.find(row => row.id === migratedId);
        const legacyFiles = fxUniqueFiles([...(migrated?.files || []), ...details.files.production]);
        legacyFiles.forEach(file => {
          const name = fxFileName(file);
          const targetKey = /生产环境|生产基地|厂房|车间|场地|环境|基地/.test(name)
            ? "productionSiteEnvironment"
            : /(工艺|流程)/.test(name) && fxIsImageFile(file)
              ? "process"
              : /(设备|生产线|机台)/.test(name) && fxIsImageFile(file)
                ? "equipment"
                : /(生产[-_ ]?许可|许可证|认证|证书|production[-_ ]?license|permit)/i.test(name)
                  ? "productionLicense"
                  : "qualificationDocuments";
          details.fieldMedia[targetKey] = fxUniqueFiles([...(details.fieldMedia[targetKey] || []), file]);
        });
        details.custom.production = details.custom.production.filter(row => row.id !== migratedId);
        details.files.production = [];
      } else if (module === "quality") {
        const legacyCertification = [details.certification, details.certificateNo].filter(Boolean).join("；");
        const legacyInspection = [details.qualityReport, details.qualityNote].filter(Boolean).join("；");
        if (!details.productCertificationCertificate && legacyCertification) details.productCertificationCertificate = legacyCertification;
        if (!details.productInspectionReport && legacyInspection) details.productInspectionReport = legacyInspection;
        delete details.certification;
        delete details.certificateNo;
        delete details.qualityReport;
        delete details.qualityNote;

        const migratedId = "module-files-quality";
        const migrated = details.custom.quality.find(row => row.id === migratedId);
        const legacyFiles = fxUniqueFiles([...(migrated?.files || []), ...details.files.quality]);
        legacyFiles.forEach(file => {
          const name = fxFileName(file);
          const targetKey = /(荣誉|获奖|奖项|奖状)/.test(name)
            ? "productHonorCertificate"
            : /(实地|现场|验证|基地)/.test(name)
              ? "onSiteVerificationCertificate"
              : /(检测|检验|报告)/.test(name)
                ? "productInspectionReport"
                : "productCertificationCertificate";
          details.fieldMedia[targetKey] = fxUniqueFiles([...(details.fieldMedia[targetKey] || []), file]);
        });
        details.custom.quality = details.custom.quality.filter(row => row.id !== migratedId);
        details.files.quality = [];
      } else if (details.files[module].length) {
        const migratedId = `module-files-${module}`;
        let migrated = details.custom[module].find(row => row.id === migratedId);
        if (!migrated) { migrated = { id: migratedId, name: fxModuleFileFieldLabels[module], type: "file", value: "", files: [] }; details.custom[module].push(migrated); }
        migrated.files = fxUniqueFiles([...migrated.files, ...details.files[module]]);
        details.files[module] = [];
      }
      const tokens = [
        ...(fxStandardFieldDefs[module] || []).map(field => `field:${field.key}`),
        ...(module === "trace" ? ["trace:timeline"] : []),
        ...details.custom[module].map(row => `custom:${row.id}`),
      ];
      let saved = Array.isArray(details.fieldOrder[module]) ? details.fieldOrder[module] : [];
      if (module === "product" && Number(details.productFieldSchemaVersion || 0) < fxProductFieldSchemaVersion) {
        const standardTokens = fxStandardFieldDefs.product.map(field => `field:${field.key}`);
        const customTokens = [...saved, ...tokens].filter(token => token.startsWith("custom:") && tokens.includes(token));
        saved = [...standardTokens, ...new Set(customTokens)];
        details.productFieldSchemaVersion = fxProductFieldSchemaVersion;
      }
      if (module === "company" && Number(details.companyFieldSchemaVersion || 0) < fxCompanyFieldSchemaVersion) {
        const standardTokens = fxStandardFieldDefs.company.map(field => `field:${field.key}`);
        const customTokens = [...saved, ...tokens].filter(token => token.startsWith("custom:") && tokens.includes(token));
        saved = [...standardTokens, ...new Set(customTokens)];
        details.companyFieldSchemaVersion = fxCompanyFieldSchemaVersion;
      }
      if (module === "production" && Number(details.productionFieldSchemaVersion || 0) < fxProductionFieldSchemaVersion) {
        const standardTokens = fxStandardFieldDefs.production.map(field => `field:${field.key}`);
        const customTokens = [...saved, ...tokens].filter(token => token.startsWith("custom:") && tokens.includes(token));
        saved = [...standardTokens, ...new Set(customTokens)];
        details.productionFieldSchemaVersion = fxProductionFieldSchemaVersion;
      }
      if (module === "quality" && Number(details.qualityFieldSchemaVersion || 0) < fxQualityFieldSchemaVersion) {
        const standardTokens = fxStandardFieldDefs.quality.map(field => `field:${field.key}`);
        const customTokens = [...saved, ...tokens].filter(token => token.startsWith("custom:") && tokens.includes(token));
        saved = [...standardTokens, ...new Set(customTokens)];
        details.qualityFieldSchemaVersion = fxQualityFieldSchemaVersion;
      }
      if (module === "trace") {
        saved = saved.map(token => token.startsWith("trace:") ? "trace:timeline" : token);
        if (!saved.includes("trace:timeline")) saved.unshift("trace:timeline");
      }
      details.fieldOrder[module] = [...new Set([...saved.filter(token => tokens.includes(token)), ...tokens])];
    });
    return details;
  }
  function fxDetailFiles(details) { return [...Object.values(details?.fieldMedia || {}).flatMap(files => files || []), ...Object.values(details?.custom || {}).flatMap(rows => (rows || []).flatMap(row => row.files || []))]; }
  function fxReadFileData(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(reader.error || new Error("文件读取失败")); reader.readAsDataURL(file); }); }

  let fxCrcTable;
  function fxCrc32(bytes) {
    if (!fxCrcTable) fxCrcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    let crc = 0xffffffff; for (const byte of bytes) crc = fxCrcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0;
  }
  const fxU16 = value => new Uint8Array([value & 255, (value >>> 8) & 255]);
  const fxU32 = value => new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
  function fxJoin(parts) { const size = parts.reduce((sum, part) => sum + part.length, 0); const out = new Uint8Array(size); let offset = 0; for (const part of parts) { out.set(part, offset); offset += part.length; } return out; }
  function fxZip(entries) {
    const enc = new TextEncoder(); const locals = []; const centrals = []; let offset = 0;
    entries.forEach(entry => {
      const name = enc.encode(entry.name); const data = typeof entry.data === "string" ? enc.encode(entry.data) : entry.data; const crc = fxCrc32(data);
      const local = fxJoin([fxU32(0x04034b50), fxU16(20), fxU16(0), fxU16(0), fxU16(0), fxU16(0), fxU32(crc), fxU32(data.length), fxU32(data.length), fxU16(name.length), fxU16(0), name, data]);
      const central = fxJoin([fxU32(0x02014b50), fxU16(20), fxU16(20), fxU16(0), fxU16(0), fxU16(0), fxU16(0), fxU32(crc), fxU32(data.length), fxU32(data.length), fxU16(name.length), fxU16(0), fxU16(0), fxU16(0), fxU16(0), fxU32(0), fxU32(offset), name]);
      locals.push(local); centrals.push(central); offset += local.length;
    });
    const centralData = fxJoin(centrals); return fxJoin([...locals, centralData, fxU32(0x06054b50), fxU16(0), fxU16(0), fxU16(entries.length), fxU16(entries.length), fxU32(centralData.length), fxU32(offset), fxU16(0)]);
  }
  function fxQrSvg(code, payload = new URL(`pages/scan/active.html?serial=${encodeURIComponent(code)}`, document.baseURI).href, options = {}) {
    if (typeof window.qrcode === "function") {
      const qr = window.qrcode(0, "M");
      qr.addData(payload);
      qr.make();
      const count = qr.getModuleCount(); const cells = []; const rounded = String(options.style || "").includes("圆角"); const sizeMm = Number.parseFloat(options.size) || 25; const label = String(options.style || "").includes("产品名称留白") ? (options.label || "产品名称：____________") : code;
      for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) cells.push(`<rect x="${col + 4}" y="${row + 4}" width="1" height="1"${rounded ? ' rx="0.28"' : ""}/>`);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizeMm}mm" height="${Math.round(sizeMm * (count + 13) / (count + 8) * 10) / 10}mm" viewBox="0 0 ${count + 8} ${count + 13}"><rect width="100%" height="100%" fill="white"/><g fill="black">${cells.join("")}</g><text x="${(count + 8) / 2}" y="${count + 11}" text-anchor="middle" font-family="sans-serif" font-size="1.8">${fxEscape(label)}</text></svg>`;
    }
    throw new Error("标准二维码组件未加载，无法生成可扫码二维码");
  }
  function fxDownloadQrPackage(order) {
    const [startCode] = order.range.split("–"); const prefix = startCode.match(/^[A-Z]+/)?.[0] || "QR"; const start = Number(startCode.replace(/\D/g, ""));
    const manifest = ["序列号,订单号,客户,状态", ...Array.from({ length: order.total }, (_, i) => `${fxSerial(prefix, start + i)},${order.no},${order.customer},未激活`)].join("\n");
    const samples = order.total; const entries = [
      { name: "manifest.csv", data: `\ufeff${manifest}` },
      { name: "README.txt", data: `订单：${order.no}\n客户：${order.customer}\n码量：${order.total}\n序列范围：${order.range}\n压缩包包含完整序列清单和全部 ${samples} 张可扫描 SVG 二维码。` },
      ...Array.from({ length: samples }, (_, i) => { const code = fxSerial(prefix, start + i); return { name: `codes/${code}.svg`, data: fxQrSvg(code, undefined, { style: order.style, size: order.size }) }; }),
    ];
    fxDownloadBlob(`${order.no}_二维码压缩包.zip`, new Blob([fxZip(entries)], { type: "application/zip" }));
  }
