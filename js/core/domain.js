"use strict";

const fxToday = "2026-07-27";
  const fxNow = () => `${fxToday} ${new Date().toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" })}`;
  const fxEscape = (value = "") => String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const fxClone = value => JSON.parse(JSON.stringify(value));
  const fxSameId = (left, right) => left !== undefined && left !== null && right !== undefined && right !== null && String(left) === String(right);
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
      { key: "category", label: "产品大类", scan: false },
      { key: "subcategory", label: "产品子类", scan: false },
      { key: "productName", label: "产品名称", required: true },
      { key: "brand", label: "产品品牌", required: true, mediaKey: "brand", mediaLabel: "品牌图片" },
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
  const fxSingleMediaKeys = new Set(["brand", "trademark", "businessLicense", "productInspectionReport"]);
  const fxCustomMediaLimit = 10;
  function fxStandardMediaLimit(mediaKey) { return fxSingleMediaKeys.has(mediaKey) ? 1 : 10; }

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
  function fxCompleteProductDetails(product) {
    const customer = fxCustomerForRecord(product);
    const company = customer?.name || product.company || "示例生产企业";
    const shortCompany = company.replace(/有限责任公司|股份有限公司|有限公司|科技公司|公司/g, "") || company;
    const companyProfiles = {
      "云岭生态农业有限公司": { phone: "0883-661 2098", address: "云南省临沧市双江县勐库镇茶山路 18 号", productionAddress: "云南省临沧市双江县勐库镇大雪山村 6 组" },
      "北辰农产有限公司": { phone: "0451-5588 3106", address: "黑龙江省哈尔滨市五常市民乐乡北辰路 16 号", productionAddress: "黑龙江省哈尔滨市五常市民乐乡现代农业园 2 号" },
      "松野食品科技有限公司": { phone: "0871-6560 2088", address: "云南省昆明市经开区林溪路 28 号", productionAddress: "云南省昆明市经开区食品产业园 8 号" },
      "安护医疗用品有限公司": { phone: "0512-6683 6799", address: "江苏省苏州市工业园区启明路 66 号", productionAddress: "江苏省苏州市工业园区医疗器械产业园 3 号" },
    };
    const companyProfile = companyProfiles[company] || { phone: "400-800-2026", address: "企业备案经营地址", productionAddress: "企业备案生产地址" };
    const categoryProfiles = {
      农产品: { subcategory: "初级农产品", specification: "500 g / 袋", origin: companyProfile.productionAddress, shelfLife: "18 个月", storage: "阴凉、干燥、通风处密封保存", standard: "符合产品标示及国家相关质量标准", process: "原料验收 → 分选 → 加工 → 检验 → 包装 → 赋码入库", equipment: "原料分选设备、加工设备、质量检测设备和自动包装线" },
      养殖品: { subcategory: "养殖产品", specification: "按包装标示", origin: companyProfile.productionAddress, shelfLife: "以包装标示为准", storage: "按产品标示温度贮存并保持冷链", standard: "符合养殖产品质量安全相关标准", process: "养殖记录 → 检疫检验 → 分级加工 → 包装 → 赋码入库", equipment: "环境监测设备、检验设备、分级设备和冷链设施" },
      加工食品: { subcategory: "预包装食品", specification: "按包装标示", origin: companyProfile.productionAddress, shelfLife: "12 个月", storage: "常温避光保存，开封后尽快食用", standard: "符合食品安全国家标准及产品执行标准", process: "原辅料验收 → 配料 → 加工 → 杀菌 → 检验 → 包装赋码", equipment: "自动配料设备、加工生产线、杀菌设备和质量检测仪器" },
      工业品: { subcategory: "工业制成品", specification: "按产品技术规格", origin: companyProfile.productionAddress, shelfLife: "按产品说明书", storage: "按产品说明书要求贮存", standard: "符合产品技术规范及相关行业标准", process: "原料检验 → 生产加工 → 过程检验 → 成品检验 → 包装赋码", equipment: "自动化生产线、过程监控设备和成品检测设备" },
      医疗卫生用品: { subcategory: "医疗卫生用品", specification: "按注册或备案规格", origin: companyProfile.productionAddress, shelfLife: "36 个月", storage: "清洁、干燥、通风且无腐蚀性气体环境保存", standard: "符合医疗器械产品技术要求及相关国家标准", process: "原料检验 → 洁净生产 → 灭菌或消毒 → 成品检验 → 包装赋码", equipment: "洁净生产线、灭菌设备、无菌检测设备和自动包装线" },
    };
    const categoryProfile = categoryProfiles[product.category] || categoryProfiles.工业品;
    const template = fxDefaultDetails({ ...product, company });
    Object.assign(template, {
      productName: product.name,
      brand: shortCompany,
      category: product.category || "工业品",
      subcategory: categoryProfile.subcategory,
      trademark: shortCompany,
      productImages: `${product.name}产品、包装及批次实物图片`,
      intro: `${product.name}由${company}生产或经营，本批次已建立从生产、质量检验到赋码入库的完整记录。`,
      specification: categoryProfile.specification,
      origin: categoryProfile.origin,
      batch: product.batch,
      productionDate: String(product.submitted || fxToday).slice(0, 10),
      shelfLife: categoryProfile.shelfLife,
      storage: categoryProfile.storage,
      standard: categoryProfile.standard,
      companyName: company,
      companyPhone: companyProfile.phone,
      companyAddress: companyProfile.address,
      companyIntro: `${company}建立了产品批次、生产过程、质量检验和赋码入库管理制度，相关记录可按批次追溯。`,
      qualificationProof: "企业主体资质、生产或经营许可及质量管理文件齐全",
      productionEnvironment: "生产区域按产品类别分区管理，环境检查记录完整",
      productionUnit: `${shortCompany}生产中心`,
      productionAddress: companyProfile.productionAddress,
      productionSiteEnvironment: "生产现场清洁，关键区域实施温湿度与卫生状态监测",
      qualificationDocuments: "生产单位主体资质、场地及从业人员资料已备案",
      process: categoryProfile.process,
      equipment: categoryProfile.equipment,
      productionLicense: `生产或经营许可备案（批次：${product.batch}）`,
      productHonorCertificate: "企业质量信誉与产品荣誉资料已归档",
      productCertificationCertificate: "产品合格证明及相关认证资料已归档",
      onSiteVerificationCertificate: "生产场地与质量管理情况已完成现场核验",
      productInspectionReport: `${product.batch} 批次产品检验报告；检验结论符合产品执行标准。`,
      trace: [
        { date: String(product.submitted || fxToday).slice(0, 10), content: "完成本批次生产任务下达及原辅料验收" },
        { date: String(product.submitted || fxToday).slice(0, 10), content: "完成生产加工、过程检查和成品检验" },
        { date: String(product.decidedAt || product.submitted || fxToday).slice(0, 10), content: "完成产品包装、质控码关联及成品入库" },
      ],
    });
    const details = product.details && typeof product.details === "object" ? product.details : {};
    const hasLegacyTeaTemplate = details.intro === "精选高山生态原料，经标准化工艺加工并完成批次质量检验。"
      && details.origin === "云南省临沧市双江县"
      && details.standard === "GB/T 14456.1-2017";
    const productIsTea = /茶|普洱|红茶|绿茶|毛茶/.test(String(product.name || ""));
    if (hasLegacyTeaTemplate && (company !== "云岭生态农业有限公司" || !productIsTea)) {
      [
        "brand", "category", "subcategory", "trademark", "productImages", "intro", "specification", "origin", "batch",
        "productionDate", "shelfLife", "storage", "standard", "companyName", "companyPhone", "companyAddress", "companyIntro",
        "qualificationProof", "productionEnvironment", "productionUnit", "productionAddress", "productionSiteEnvironment",
        "qualificationDocuments", "process", "equipment", "productionLicense", "productHonorCertificate",
        "productCertificationCertificate", "onSiteVerificationCertificate", "productInspectionReport", "trace",
      ].forEach(key => { details[key] = fxClone(template[key]); });
    }
    Object.entries(template).forEach(([key, value]) => {
      if (["custom", "files", "fieldMedia", "fieldOrder", "trace"].includes(key)) return;
      if (details[key] === undefined || details[key] === null || String(details[key]).trim() === "") details[key] = fxClone(value);
    });
    if (!Array.isArray(details.trace) || !details.trace.some(row => String(row?.date || "").trim() || String(row?.content || "").trim())) details.trace = fxClone(template.trace);
    details.custom ||= fxClone(template.custom);
    details.files ||= fxClone(template.files);
    details.fieldMedia ||= fxClone(template.fieldMedia);
    return fxNormalizeDetails(details);
  }
  products.forEach(product => {
    if (!product.details) product.details = fxDefaultDetails(product);
    fxNormalizeDetails(product.details);
    if (product.status === "草稿") product.submitted = "";
  });
  const fxLegacyWithdrawalSegments = {
    "WD-202607-008": [{ orderNo: "ORD-202607-028", range: "BC00150001–BC00170000", amount: 20000 }],
    "WD-202607-006": [{ orderNo: "ORD-202607-031", range: "YL00880001–YL00892000", amount: 12000 }],
    "WD-202607-003": [{ orderNo: "ORD-202607-021", range: "SY00030001–SY00042000", amount: 12000 }],
  };
  withdrawals.forEach((item, index) => {
    const legacySegments = fxLegacyWithdrawalSegments[item.no] || [];
    if ((!Array.isArray(item.segments) || !item.segments.length) && !item.resetRanges?.length && legacySegments.length) {
      item.segments = legacySegments.map(segment => ({ ...segment, key: `${segment.orderNo}::${segment.range}::` }));
      item.requestedAmount ||= legacySegments.reduce((sum, segment) => sum + Number(segment.amount || 0), 0);
    }
    Object.assign(item, { id: item.id || index + 1, rejectReason: item.rejectReason || (item.status === "已驳回" ? "资料可由运营方直接修改，无需重置码段" : "") });
  });
  messages.splice(0, messages.length,
    { id: 1, type: "产品审核申请", title: "云岭高山绿茶等待审核", detail: "客户已提交五个资料模块，请及时处理。", time: "2026-07-27 10:32", unread: true, recipient: "运营方", customer: "云岭生态农业有限公司" },
    { id: 2, type: "产品撤回申请", title: "有机稻花香米发起全量撤回", detail: "涉及 20,000 枚已激活码，等待运营方审批。", time: "2026-07-27 09:18", unread: true, recipient: "运营方", customer: "北辰农产有限公司" },
    { id: 3, type: "绑定审核结果", title: "云岭春芽红茶（批次：YL20260724）绑定审核已通过", detail: "订单号：ORD-202607-024；绑定数量：18,000 枚；绑定码段：YL00060001–YL00078000。", time: "2026-07-24 15:18", unread: false, recipient: "云岭生态农业有限公司", customer: "云岭生态农业有限公司" },
    { id: 4, type: "撤回审核结果", title: "古树晒青毛茶（批次：YL20260618）产品撤回审核已驳回", detail: "申请码段：YL00893001–YL00909000；驳回原因：请联系运营方直接修改产品信息。", time: "2026-06-18 13:06", unread: true, recipient: "云岭生态农业有限公司", customer: "云岭生态农业有限公司" }
  );

  const fxBusinessStorage = {
    customers: "trace-customers-v3",
    orders: "trace-orders-v3",
    codeBatches: "trace-code-batches-v1",
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
      const legacyKey = fxLegacyBusinessStorage[name];
      saved = legacyKey ? fxStore.get(legacyKey, null) : null;
      if (name === "products") fxProductsMigratedFromLegacy = true;
    }
    if (Array.isArray(saved)) list.splice(0, list.length, ...saved);
  }
  Object.keys(fxBusinessStorage).forEach(name => {
    const list = { customers, orders, codeBatches, bindRequests, products, withdrawals, messages }[name];
    fxRestoreList(name, list);
  });
  if (messages.some(item => item.type === "码段分配通知")) {
    messages.splice(0, messages.length, ...messages.filter(item => item.type !== "码段分配通知"));
    fxStore.set(fxBusinessStorage.messages, messages);
  }

  function fxNormalizeContinuousCodeRange(range, total) {
    const [startCode, endCode] = String(range || "").split("–");
    const start = fxParseCode(startCode); const end = fxParseCode(endCode); const amount = Number(total || 0);
    if (!start || !end || start.prefix !== end.prefix || !Number.isSafeInteger(amount) || amount < 1) return String(range || "");
    return `${fxCodeAt(start, start.number)}–${fxCodeAt(start, start.number + amount - 1)}`;
  }
  function fxNormalizeCodeBatch(item, index = 0) {
    const created = item.created || fxToday;
    const total = Math.max(0, Math.trunc(Number(item.total || 0)));
    return Object.assign(item, {
      id: item.id || `code-batch-${index + 1}`,
      no: item.no || `BATCH-${String(index + 1).padStart(3, "0")}`,
      recordType: "codeBatch",
      range: fxNormalizeContinuousCodeRange(item.range, total),
      total,
      created,
      createdAt: item.createdAt || `${created} 09:00`,
      style: item.style || "二维码核心区块",
      size: item.size || "25 × 25 mm",
      note: item.note || "",
    });
  }
  function fxIsLegacyInventoryOrder(item) {
    const customerName = String(item?.customer || "").trim();
    return ["codeBatch", "inventory"].includes(item?.recordType)
      || item?.allocationStatus === "库存中"
      || !customerName
      || customerName === "未分配";
  }
  let fxActivationIdsChanged = false;
  let fxWithdrawalActivationIdsChanged = false;
  function fxActivationIdHash(value) {
    let hash = 0x811c9dc5;
    for (const character of String(value || "")) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
  }
  function fxActivationIdSeed(order, activation, hint = "") {
    return JSON.stringify([
      order?.no || order?.id || "allocation",
      activation?.bindRequestNo || "",
      activation?.productId || activation?.product || "",
      activation?.batch || "",
      activation?.range || "",
      Number(activation?.amount || 0),
      activation?.time || "",
      activation?.status || "有效",
      activation?.withdrawalNo || "",
      activation?.resetTime || "",
      hint,
    ]);
  }
  function fxActivationIdInUse(id, excludedActivation = null) {
    return Boolean(id) && orders.some(order => (order.activations || []).some(activation => activation !== excludedActivation && activation.activationId === id));
  }
  function fxCreateActivationId(order, activation, hint = "") {
    const seed = fxActivationIdSeed(order, activation, hint);
    let attempt = 0;
    let candidate = "";
    do {
      candidate = `ACT-${fxActivationIdHash(`${seed}:${attempt}`)}`;
      attempt += 1;
    } while (fxActivationIdInUse(candidate, activation));
    return candidate;
  }
  function fxEnsureActivationId(order, activation, hint = "") {
    if (!activation) return "";
    const current = String(activation.activationId || "").trim();
    if (current && !fxActivationIdInUse(current, activation)) return current;
    activation.activationId = fxCreateActivationId(order, activation, hint);
    fxActivationIdsChanged = true;
    return activation.activationId;
  }
  function fxRenewActivationId(order, activation, hint = "") {
    if (!activation) return "";
    activation.activationId = fxCreateActivationId(order, activation, hint || "derived");
    fxActivationIdsChanged = true;
    return activation.activationId;
  }
  function fxNormalizeActivationIds(order) {
    const activations = order?.activations || [];
    const existingGroups = new Map();
    activations.forEach(activation => {
      const id = String(activation.activationId || "").trim();
      if (!id) return;
      if (!existingGroups.has(id)) existingGroups.set(id, []);
      existingGroups.get(id).push(activation);
    });
    existingGroups.forEach(group => {
      if (group.length < 2) return;
      const keeper = group.find(activation => activation.status === "已重置" || activation.withdrawalNo) || group[0];
      group.filter(activation => activation !== keeper).forEach((activation, index) => fxRenewActivationId(order, activation, `derived-${index + 1}`));
    });
    activations.forEach((activation, index) => fxEnsureActivationId(order, activation, `legacy-${index + 1}`));
  }
  function fxNormalizeAllocationOrder(item, index = 0) {
    const created = item.created || fxToday;
    const linkedCustomer = customers.find(customer => Number(customer.id) === Number(item.customerId))
      || customers.find(customer => customer.name === item.customer);
    Object.assign(item, {
      id: item.id || index + 1,
      created,
      createdAt: item.createdAt || `${created} ${["10:19", "09:42", "15:06", "11:28"][index] || "09:00"}`,
      activations: Array.isArray(item.activations) ? item.activations : [],
      recordType: "allocation",
      allocationStatus: item.allocationStatus === "已撤销" ? "已撤销" : "已分配",
      sourceBatchNo: item.sourceBatchNo || "",
      allocatedAt: item.allocatedAt || item.createdAt || `${created} 09:00`,
      allocatedBy: item.allocatedBy || "历史数据",
      customerId: linkedCustomer?.id || item.customerId || null,
    });
    fxNormalizeActivationIds(item);
    return item;
  }
  function fxRecordBelongsToCustomer(record, customer) {
    if (!record || !customer) return false;
    if (record.customerId !== undefined && record.customerId !== null && record.customerId !== "") {
      const linkedCustomer = customers.find(item => Number(item.id) === Number(record.customerId));
      if (linkedCustomer) return Number(linkedCustomer.id) === Number(customer.id);
    }
    return [record.customer, record.company, record.recipient].includes(customer.name);
  }
  function fxCustomerForRecord(record) {
    if (!record) return null;
    const linkedCustomer = record.customerId !== undefined && record.customerId !== null && record.customerId !== ""
      ? customers.find(item => Number(item.id) === Number(record.customerId))
      : null;
    if (linkedCustomer) return linkedCustomer;
    return customers.find(item => [record.customer, record.company, record.recipient].includes(item.name)) || null;
  }
  function fxProductForRecord(record) {
    if (!record) return null;
    const customer = fxCustomerForRecord(record);
    const productName = String(record.product || record.name || "").trim();
    const batch = String(record.batch || "").trim();
    const hasProductId = record.productId !== undefined && record.productId !== null && record.productId !== "";
    if (hasProductId) {
      const productId = Number(record.productId);
      const byId = Number.isFinite(productId) ? products.find(item => Number(item.id) === productId) : null;
      const identityMatches = byId && (!productName || byId.name === productName) && (!batch || byId.batch === batch);
      if (identityMatches && (!customer || fxRecordBelongsToCustomer(byId, customer))) return byId;
    }
    const customerProducts = products.filter(item => !customer || fxRecordBelongsToCustomer(item, customer));
    const exactCandidates = customerProducts.filter(item => (!productName || item.name === productName)
      && (!batch || item.batch === batch));
    if (exactCandidates.length === 1) return exactCandidates[0];
    if (productName) {
      const nameCandidates = customerProducts.filter(item => item.name === productName);
      if (nameCandidates.length === 1) return nameCandidates[0];
    }
    if (batch) {
      const batchCandidates = customerProducts.filter(item => item.batch === batch);
      if (batchCandidates.length === 1) return batchCandidates[0];
    }
    return null;
  }
  function fxMigrateWithdrawalActivationIds() {
    withdrawals.forEach(withdrawal => {
      const product = fxProductForRecord(withdrawal);
      (withdrawal.segments || []).forEach(segment => {
        const order = orders.find(item => item.no === segment.orderNo);
        if (!order) return;
        let activation = (order.activations || []).find(item => item.activationId && [segment.activationId, segment.key].includes(item.activationId));
        if (!activation) {
          const candidates = (order.activations || []).filter(item => item.range === segment.range
            && (!segment.time || item.time === segment.time)
            && (!product || fxActivationBelongsToProduct(item, product)));
          if (candidates.length === 1) activation = candidates[0];
        }
        if (!activation?.activationId) return;
        if (segment.activationId !== activation.activationId || segment.key !== activation.activationId) {
          segment.activationId = activation.activationId;
          segment.key = activation.activationId;
          fxWithdrawalActivationIdsChanged = true;
        }
      });
    });
  }
  function fxCodeRangesOverlap(leftRange, rightRange) {
    const [leftStartCode, leftEndCode] = String(leftRange || "").split("–");
    const [rightStartCode, rightEndCode] = String(rightRange || "").split("–");
    const leftStart = fxParseCode(leftStartCode); const leftEnd = fxParseCode(leftEndCode);
    const rightStart = fxParseCode(rightStartCode); const rightEnd = fxParseCode(rightEndCode);
    if (!leftStart || !leftEnd || !rightStart || !rightEnd || leftStart.prefix !== leftEnd.prefix || rightStart.prefix !== rightEnd.prefix || leftStart.prefix !== rightStart.prefix) return false;
    return leftStart.number <= rightEnd.number && rightStart.number <= leftEnd.number;
  }
  let fxCodeBatchMigrationChanged = false;
  const fxLegacyInventoryOrders = orders.filter(fxIsLegacyInventoryOrder);
  fxLegacyInventoryOrders.forEach(item => {
    const existing = codeBatches.find(batch => batch.no === item.no);
    const { customer, active, activations, allocationStatus, sourceBatchNo, allocatedAt, allocatedBy, ...batchData } = item;
    if (existing) fxNormalizeCodeBatch(Object.assign(existing, batchData), codeBatches.indexOf(existing));
    else codeBatches.unshift(fxNormalizeCodeBatch(batchData, codeBatches.length));
    fxCodeBatchMigrationChanged = true;
  });
  if (fxLegacyInventoryOrders.length) {
    const migrated = new Set(fxLegacyInventoryOrders);
    orders.splice(0, orders.length, ...orders.filter(item => !migrated.has(item)));
  }
  codeBatches.forEach(fxNormalizeCodeBatch);
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
  orders.forEach(fxNormalizeAllocationOrder);
  if (fxCodeBatchMigrationChanged) {
    fxStore.set(fxBusinessStorage.codeBatches, codeBatches);
    fxStore.set(fxBusinessStorage.orders, orders);
  }
  products.forEach(product => { if (!product.details) product.details = fxDefaultDetails(product); fxNormalizeDetails(product.details); if (product.status === "草稿") product.submitted = ""; });
  orders.forEach(order => {
    let allocated = 0; const start = fxParseCode(String(order.range || "").split("–")[0]);
    order.activations = (order.activations || []).map(row => { const amount = Number(row.amount || 0); const range = row.range || (start && amount ? fxCodeAt(start, start.number + allocated) + "–" + fxCodeAt(start, start.number + allocated + amount - 1) : ""); allocated += amount; return { ...row, amount, range, status: row.status || "有效" }; });
  });
  withdrawals.forEach((item, index) => {
    const legacySegments = fxLegacyWithdrawalSegments[item.no] || [];
    if ((!Array.isArray(item.segments) || !item.segments.length) && !item.resetRanges?.length && legacySegments.length) {
      item.segments = legacySegments.map(segment => ({ ...segment, key: `${segment.orderNo}::${segment.range}::` }));
      item.requestedAmount ||= legacySegments.reduce((sum, segment) => sum + Number(segment.amount || 0), 0);
    }
    Object.assign(item, { id: item.id || index + 1, rejectReason: item.rejectReason || "" });
  });
  fxMigrateWithdrawalActivationIds();
  products.forEach(product => {
    const customer = fxCustomerForRecord(product);
    if (customer) product.customerId = customer.id;
  });
  bindRequests.forEach((item, index) => Object.assign(item, {
    id: item.id || `BR-${Date.now()}-${index}`,
    no: item.no || `BR-202608-${String(index + 1).padStart(3, "0")}`,
    status: item.status || "待审批",
    time: item.time || fxNow(),
    customerId: fxCustomerForRecord(item)?.id || null,
  }));
  withdrawals.forEach(item => {
    const customer = fxCustomerForRecord(item);
    if (customer) item.customerId = customer.id;
  });
  messages.forEach(item => {
    const customer = fxCustomerForRecord(item);
    if (customer) item.customerId = customer.id;
  });
  const fxLegacyMessageTypes = {
    审核提醒: "产品审核申请",
    撤回申请: "产品撤回申请",
    激活通知: "产品审核通过",
    审核与激活: "产品审核通过",
    审核驳回: "产品审核驳回",
  };
  function fxMessageProductSubject(productName, batch) {
    const name = String(productName || "未命名产品").trim();
    const batchValue = String(batch || "").trim();
    return batchValue && batchValue !== "—" ? `${name}（批次：${batchValue}）` : name;
  }
  function fxMessageReason(rawValue) {
    let value = String(rawValue || "").trim();
    const reasonIndex = value.lastIndexOf("驳回原因：");
    if (reasonIndex >= 0) value = value.slice(reasonIndex + "驳回原因：".length);
    return value
      .replace(/^产品批次：[^；;]+[；;]\s*/, "")
      .replace(/^处理说明：\s*/, "")
      .replace(/[。；;]+$/, "")
      .trim();
  }
  function fxMessageDetailValue(detail, label) {
    const match = String(detail || "").match(new RegExp(`${label}：([^；;。]+)`));
    return match?.[1]?.trim() || "";
  }
  function fxMessageDetail(parts) {
    const detail = parts.filter(Boolean).map(part => String(part).replace(/[。；;]+$/, "")).join("；");
    return detail ? `${detail}。` : "暂无补充信息。";
  }
  function fxBindingResultMessage(data, approved) {
    const amount = Number(data.amount || 0);
    const range = String(data.range || "").trim();
    const orderNo = String(data.orderNo || "").trim();
    const reason = fxMessageReason(data.reason);
    return {
      type: "绑定审核结果",
      title: `${fxMessageProductSubject(data.product, data.batch)}绑定审核${approved ? "已通过" : "已驳回"}`,
      detail: fxMessageDetail([
        orderNo ? `订单号：${orderNo}` : "",
        amount ? `${approved ? "绑定数量" : "申请数量"}：${formatNumber(amount)} 枚` : "",
        range ? `${approved ? "绑定码段" : "申请码段"}：${range}` : "",
        !approved ? `驳回原因：${reason || "请根据审核意见修改后重新提交"}` : "",
      ]),
      productId: data.productId || null,
      customerId: data.customerId || null,
      orderNo,
      batch: data.batch || "",
      bindRequestNo: data.bindRequestNo || "",
    };
  }
  function fxReviewMessageCopy(product, approved, rawOptions = {}) {
    const options = typeof rawOptions === "string" ? { reason: rawOptions } : rawOptions || {};
    const activationRows = orders.flatMap(order => (order.activations || []).filter(row => row.product === product?.name).map(row => ({ order, row })));
    const activation = activationRows.find(entry => entry.row.time === product?.decidedAt)
      || activationRows.find(entry => !entry.row.batch || entry.row.batch === product?.batch)
      || activationRows.sort((left, right) => String(right.row.time || "").localeCompare(String(left.row.time || "")))[0];
    return fxBindingResultMessage({
      productId: product?.id,
      customerId: product?.customerId || null,
      product: product?.name,
      batch: product?.batch,
      orderNo: options.orderNo || product?.requestedOrderNo || activation?.order.no,
      amount: options.amount || product?.requestedAmount || activation?.row.amount,
      range: options.range || product?.requestedRange || activation?.row.range,
      reason: options.reason,
    }, approved);
  }
  function fxWithdrawalResultMessage(withdrawal, approved) {
    const product = fxProductForRecord(withdrawal);
    const customer = fxCustomerForRecord(withdrawal) || fxCustomerForRecord(product);
    const segments = Array.isArray(withdrawal?.segments) && withdrawal.segments.length
      ? withdrawal.segments
      : Array.isArray(withdrawal?.resetRanges) ? withdrawal.resetRanges.map(range => ({ range })) : [];
    const ranges = (withdrawal?.resetRanges?.length ? withdrawal.resetRanges : segments.map(segment => segment.range)).filter(Boolean);
    const amount = Number(withdrawal?.rollbackAmount || segments.reduce((sum, segment) => sum + Number(segment.amount || 0), 0));
    const rangeText = ranges.length ? ranges.join("、") : "未记录具体码段";
    const segmentMode = withdrawal?.scope === "segments" || ranges.length > 0;
    const reason = fxMessageReason(withdrawal?.rejectReason);
    return {
      type: "撤回审核结果",
      title: `${fxMessageProductSubject(withdrawal?.product, withdrawal?.batch || product?.batch)}${segmentMode ? "码段撤回" : "产品撤回"}审核${approved ? "已通过" : "已驳回"}`,
      detail: fxMessageDetail([
        amount ? `${approved ? "撤回数量" : "申请数量"}：${formatNumber(amount)} 枚` : "",
        `${approved ? "撤回码段" : "申请码段"}：${rangeText}`,
        approved ? `处理说明：${segmentMode ? "所选码段已重置" : "产品关联码段已重置"}` : `驳回原因：${reason || "请根据审核意见处理"}`,
      ]),
      productId: product?.id || null,
      customerId: customer?.id || null,
      withdrawalNo: withdrawal?.no || "",
      batch: withdrawal?.batch || product?.batch || "",
    };
  }
  messages.forEach(item => {
    if (fxLegacyMessageTypes[item.type]) item.type = fxLegacyMessageTypes[item.type];
    else if (["撤回审批", "撤回结果"].includes(item.type)) item.type = String(item.title).includes("驳回") ? "产品撤回驳回" : "产品撤回通过";
    if (["产品审核通过", "产品审核驳回"].includes(item.type)) {
      const product = [...products].sort((left, right) => right.name.length - left.name.length).find(row =>
        String(item.title).includes(row.name) && (row.company === item.recipient || row.company === item.customer)
      );
      const legacyProduct = String(item.title).includes("云岭春芽红茶")
        ? { name: "云岭春芽红茶", batch: "YL20260724", requestedOrderNo: "ORD-202607-024", requestedAmount: 18000, requestedRange: "YL00060001–YL00078000" }
        : null;
      if (!product?.batch && !legacyProduct) return;
      Object.assign(item, fxReviewMessageCopy(product || legacyProduct, item.type === "产品审核通过", { reason: item.detail }));
      return;
    }
    if (["绑定申请结果", "绑定审核结果"].includes(item.type)) {
      const rejected = String(item.title).includes("驳回");
      const matchingRequests = bindRequests.filter(request =>
        (item.bindRequestNo ? request.no === item.bindRequestNo : String(item.title).includes(request.product)) &&
        request.customer === (item.recipient || item.customer) &&
        request.status === (rejected ? "已驳回" : "已通过")
      );
      const request = matchingRequests.find(row => row.decidedAt === item.time) || matchingRequests.find(row => String(item.detail).includes(row.orderNo)) || matchingRequests[0];
      if (request) {
        const order = orders.find(row => row.no === request.orderNo);
      const activation = order?.activations?.find(row => row.bindRequestNo === request.no)
        || order?.activations?.find(row => row.product === request.product && row.batch === request.batch && request.range && row.range === request.range);
        Object.assign(item, fxBindingResultMessage({ productId: request.productId, product: request.product, batch: request.batch, orderNo: request.orderNo, amount: request.amount || activation?.amount, range: request.range || activation?.range, reason: request.rejectReason || item.detail, bindRequestNo: request.no }, !rejected));
      }
      else {
        const product = products.find(row => Number(row.id) === Number(item.productId)) || [...products].sort((left, right) => right.name.length - left.name.length).find(row => String(item.title).includes(row.name) && (row.company === item.recipient || row.company === item.customer));
        const legacyOptions = String(item.title).includes("云岭高山绿茶") && String(item.time) === "2026-07-27 15:57"
          ? { orderNo: "ORD-202607-031", amount: 10000, range: "YL00010001–YL00020000" }
          : {};
        if (product) Object.assign(item, fxReviewMessageCopy(product, !rejected, {
          ...legacyOptions,
          orderNo: item.orderNo || fxMessageDetailValue(item.detail, "订单号") || fxMessageDetailValue(item.detail, "关联订单") || fxMessageDetailValue(item.detail, "分配记录") || legacyOptions.orderNo,
          amount: Number(String(fxMessageDetailValue(item.detail, rejected ? "申请数量" : "绑定数量")).replace(/[^\d]/g, "")) || legacyOptions.amount,
          range: fxMessageDetailValue(item.detail, rejected ? "申请码段" : "绑定码段") || legacyOptions.range,
          reason: item.detail,
        }));
      }
      return;
    }
    if (["产品撤回通过", "产品撤回驳回", "撤回审核结果"].includes(item.type)) {
      const rejected = String(item.title).includes("驳回");
      const matching = withdrawals.filter(withdrawal =>
        (item.withdrawalNo ? withdrawal.no === item.withdrawalNo : String(item.title).includes(withdrawal.product)) &&
        withdrawal.customer === (item.recipient || item.customer)
      );
      const withdrawal = matching.find(row => row.decidedAt === item.time) || matching[0];
      if (withdrawal) Object.assign(item, fxWithdrawalResultMessage(withdrawal, !rejected));
      else if (String(item.title).includes("古树晒青毛茶")) Object.assign(item, fxWithdrawalResultMessage({ product: "古树晒青毛茶", batch: "YL20260618", customer: item.recipient || item.customer, scope: "product", segments: [{ range: "YL00893001–YL00909000", amount: 16000 }], rejectReason: item.detail }, !rejected));
    }
  });
  const fxDemoCaseVersion = 12;
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
      const demoCustomer = customers.find(item => item.name === "云岭生态农业有限公司");
      const productData = { id: 1001, demoCase: "complete-tea", customerId: demoCustomer?.id || null, name: "云岭高山有机绿茶", company: "云岭生态农业有限公司", category: "农产品", batch: "YL20260726", status: "已激活", submitted: "2026-07-26 10:32", amount: 12000, details: fxCompleteDemoDetails() };
      if (product) Object.assign(product, productData); else { product = productData; products.unshift(product); }
      const orderData = { id: 1001, demoCase: "complete-tea", customerId: demoCustomer?.id || null, no: "ORD-202607-088", sourceBatchNo: "BATCH-202607-088", customer: "云岭生态农业有限公司", range: "YL00880001–YL00910000", total: 30000, active: 12000, created: "2026-07-26", createdAt: "2026-07-26 10:18", allocatedAt: "2026-07-26 10:18", allocatedBy: "平台管理员", allocationStatus: "已分配", style: "二维码核心区块", size: "30 × 30 mm", note: "完整案例：春季特级有机绿茶首批包装赋码", activations: [{ productId: product.id, customerId: demoCustomer?.id || null, batch: "YL20260726", range: "YL00880001–YL00892000", amount: 12000, time: "2026-07-26 10:32", product: "云岭高山有机绿茶", operator: "平台管理员", status: "有效" }] };
      if (order) Object.assign(order, orderData); else { order = orderData; orders.unshift(order); }
      const withdrawalData = { id: 1001, demoCase: "complete-tea", customerId: demoCustomer?.id || null, productId: product.id, no: "WD-202607-018", product: "云岭高山有机绿茶", batch: "YL20260726", customer: "云岭生态农业有限公司", scope: "segments", segments: [{ key: "ORD-202607-088::YL00880001–YL00892000::2026-07-26 10:32", orderNo: "ORD-202607-088", range: "YL00880001–YL00892000", amount: 12000, time: "2026-07-26 10:32" }], requestedAmount: 12000, reason: "演示撤回审批流程并核对附件版本", status: "已驳回", time: "2026-07-27 09:06", decidedAt: "2026-07-27 09:28", rejectReason: "当前产品资料和质检附件均为最新版本，无需撤回或重置关联码" };
      if (withdrawal) Object.assign(withdrawal, withdrawalData); else { withdrawal = withdrawalData; withdrawals.unshift(withdrawal); }
      const demoMessages = [
        { id: 1001, demoCase: "complete-tea-approval", ...fxBindingResultMessage({ productId: product.id, customerId: demoCustomer?.id || null, product: product.name, batch: product.batch, orderNo: order.no, amount: 12000, range: "YL00880001–YL00892000" }, true), time: "2026-07-26 10:32", unread: false, recipient: "云岭生态农业有限公司", customer: "云岭生态农业有限公司", customerId: demoCustomer?.id || null },
        { id: 1002, demoCase: "complete-tea-withdrawal", ...fxWithdrawalResultMessage(withdrawalData, false), time: "2026-07-27 09:28", unread: true, recipient: "云岭生态农业有限公司", customer: "云岭生态农业有限公司", customerId: demoCustomer?.id || null },
      ];
      demoMessages.reverse().forEach(message => { const existing = messages.find(item => item.demoCase === message.demoCase); if (existing) Object.assign(existing, message); else messages.unshift(message); });
      const customer = customers.find(item => item.name === "云岭生态农业有限公司");
      if (customer) { const ownOrders = orders.filter(item => fxRecordBelongsToCustomer(item, customer)); customer.total = ownOrders.reduce((sum, item) => sum + Number(item.total || 0), 0); customer.active = ownOrders.reduce((sum, item) => sum + Number(item.active || 0), 0); }
      fxStore.set("trace-complete-demo-case-version", fxDemoCaseVersion);
    }
  }
  fxEnsureCompleteDemoCase();
  orders.forEach(fxNormalizeAllocationOrder);
  fxMigrateWithdrawalActivationIds();
  const completeDemoOrder = orders.find(item => item.demoCase === "complete-tea");
  if (completeDemoOrder?.sourceBatchNo && !codeBatches.some(batch => batch.no === completeDemoOrder.sourceBatchNo)) {
    codeBatches.unshift(fxNormalizeCodeBatch({
      id: "demo-complete-batch",
      no: completeDemoOrder.sourceBatchNo,
      range: completeDemoOrder.range,
      total: completeDemoOrder.total,
      created: completeDemoOrder.created,
      createdAt: completeDemoOrder.createdAt,
      style: completeDemoOrder.style,
      size: completeDemoOrder.size,
      note: "完整案例对应的历史库存批次",
    }, codeBatches.length));
    fxStore.set(fxBusinessStorage.codeBatches, codeBatches);
  }
  const fxPendingBindingDemoVersion = 1;
  function fxEnsurePendingBindingDemoCase() {
    const markerKey = "trace-pending-binding-demo-version";
    const marker = Number(fxStore.get(markerKey, 0));
    const product = products.find(item => item.demoCase === "pending-bind-review")
      || products.find(item => item.name === "云岭高山绿茶" && item.batch === "YL20260718" && item.company === "云岭生态农业有限公司");
    const order = orders.find(item => item.no === "ORD-202607-031");
    const customer = customers.find(item => item.name === "云岭生态农业有限公司");
    const validExistingRequest = product && order && customer
      && product.status === "待审核"
      && product.applicationType === "新建产品并绑定"
      && product.requestedOrderNo === order.no
      && Number(product.requestedAmount || 0) > 0
      && String(product.requestedRange || "");
    if (validExistingRequest) {
      fxStore.set(markerKey, fxPendingBindingDemoVersion);
      return;
    }
    if (!product || !order || !customer || product.status !== "待审核") return;
    const [startCode, endCode] = String(order.range || "").split("–");
    const start = fxParseCode(startCode); const end = fxParseCode(endCode);
    if (!start || !end || start.prefix !== end.prefix) return;
    const occupied = [
      ...(order.activations || []).filter(item => item.status !== "已重置"),
      ...bindRequests.filter(item => item.orderNo === order.no && item.status === "待审批"),
    ].map(item => {
      const [occupiedStartCode, occupiedEndCode] = String(item.range || "").split("–");
      const occupiedStart = fxParseCode(occupiedStartCode); const occupiedEnd = fxParseCode(occupiedEndCode);
      return occupiedStart && occupiedEnd && occupiedStart.prefix === start.prefix && occupiedEnd.prefix === start.prefix
        ? { first: Math.max(start.number, occupiedStart.number), last: Math.min(end.number, occupiedEnd.number) }
        : null;
    }).filter(item => item && item.first <= item.last).sort((left, right) => left.first - right.first);
    let first = start.number; let freeInterval = null;
    for (const interval of occupied) {
      if (interval.first > first) { freeInterval = { first, last: interval.first - 1 }; break; }
      first = Math.max(first, interval.last + 1);
    }
    if (!freeInterval && first <= end.number) freeInterval = { first, last: end.number };
    if (!freeInterval) return;
    const sourceRange = `${fxCodeAt(start, freeInterval.first)}–${fxCodeAt(start, freeInterval.last)}`;
    const requestedAmount = Math.min(10000, freeInterval.last - freeInterval.first + 1);
    Object.assign(product, {
      demoCase: "pending-bind-review",
      customerId: customer.id,
      amount: 0,
      applicationType: "新建产品并绑定",
      requestedOrderNo: order.no,
      requestedSourceRange: sourceRange,
      requestedRange: `${fxCodeAt(start, freeInterval.first)}–${fxCodeAt(start, freeInterval.first + requestedAmount - 1)}`,
      requestedAmount,
    });
    fxStore.set(markerKey, fxPendingBindingDemoVersion);
    fxStore.set(fxBusinessStorage.products, products);
  }
  fxEnsurePendingBindingDemoCase();
  const fxRichDemoCaseVersion = 1;
  function fxEnsureRichDemoCases() {
    const markerKey = "trace-rich-demo-cases-version";
    const requiredCases = [
      [codeBatches, "inventory-unallocated"],
      [codeBatches, "inventory-partial"],
      [codeBatches, "inventory-full"],
      [orders, "order-unbound"],
      [orders, "order-partial"],
      [orders, "order-full-active"],
      [products, "binding-draft"],
      [products, "binding-reset-product"],
      [bindRequests, "binding-pending"],
      [bindRequests, "binding-approved"],
      [bindRequests, "binding-rejected"],
      [withdrawals, "withdrawal-pending"],
      [withdrawals, "withdrawal-approved"],
      [withdrawals, "withdrawal-rejected"],
    ];
    const marker = Number(fxStore.get(markerKey, 0));
    if (marker >= fxRichDemoCaseVersion && requiredCases.every(([list, demoCase]) => list.some(item => item.demoCase === demoCase))) return;

    const byCustomer = name => customers.find(item => item.name === name);
    const upsert = (list, demoCase, data, prepend = true) => {
      const existing = list.find(item => item.demoCase === demoCase);
      if (existing) return Object.assign(existing, data, { demoCase });
      const record = { ...data, demoCase };
      if (prepend) list.unshift(record); else list.push(record);
      return record;
    };
    const productData = (demoCase, data) => {
      const customer = byCustomer(data.company);
      const record = upsert(products, demoCase, { ...data, customerId: customer?.id || null });
      record.details = fxNormalizeDetails(record.details || fxDefaultDetails(record));
      return record;
    };
    const orderData = (demoCase, data) => {
      const customer = byCustomer(data.customer);
      const record = upsert(orders, demoCase, { ...data, customerId: customer?.id || null });
      return fxNormalizeAllocationOrder(record, orders.indexOf(record));
    };

    [
      ["inventory-unallocated", { id: "demo-rich-batch-101", no: "BATCH-202608-101", range: "QR10000001–QR10012000", total: 12000, created: "2026-08-09", createdAt: "2026-08-09 09:12", size: "20 × 20 mm", note: "完整案例：新生成、尚未分配的通用库存码段" }],
      ["inventory-partial", { id: "demo-rich-batch-102", no: "BATCH-202608-102", range: "QR20000001–QR20020000", total: 20000, created: "2026-08-10", createdAt: "2026-08-10 10:25", size: "25 × 30 mm", note: "完整案例：已向多个客户分配，仍有库存" }],
      ["inventory-full", { id: "demo-rich-batch-103", no: "BATCH-202608-103", range: "QR30000001–QR30010000", total: 10000, created: "2026-08-11", createdAt: "2026-08-11 14:08", size: "32.5 × 40 mm", note: "完整案例：库存已全部分配且订单已全部激活" }],
    ].forEach(([demoCase, data]) => fxNormalizeCodeBatch(upsert(codeBatches, demoCase, data), codeBatches.length));

    productData("binding-draft", { id: 2101, name: "低温冻干蓝莓粉", company: "松野食品科技有限公司", category: "加工食品", batch: "SY20260809", status: "草稿", submitted: "", amount: 0, applicationType: "新建产品并绑定", requestedOrderNo: "ORD-202608-101", requestedSourceRange: "QR20000001–QR20008000", requestedRange: "QR20000001–QR20002000", requestedAmount: 2000 });
    const approvedProduct = productData("binding-approved-product", { id: 2102, name: "北辰胚芽米", company: "北辰农产有限公司", category: "农产品", batch: "BC20260810", status: "已激活", submitted: "2026-08-10 11:05", decidedAt: "2026-08-10 11:26", operator: "平台管理员", amount: 1000 });
    const pendingProduct = productData("binding-pending-product", { id: 2103, name: "北辰杂粮礼盒", company: "北辰农产有限公司", category: "农产品", batch: "BC20260811", status: "已激活", submitted: "2026-08-10 16:20", amount: 0 });
    const fullProduct = productData("binding-full-product", { id: 2104, name: "安护医用敷料", company: "安护医疗用品有限公司", category: "医疗卫生用品", batch: "AH20260811", status: "已激活", submitted: "2026-08-11 15:02", decidedAt: "2026-08-11 15:18", operator: "平台管理员", amount: 10000 });
    const resetProduct = productData("binding-reset-product", { id: 2105, name: "松野蓝莓果干", company: "松野食品科技有限公司", category: "加工食品", batch: "SY20260810", status: "已激活", submitted: "2026-08-10 15:42", amount: 1000 });
    const rejectedProduct = productData("binding-rejected-product", { id: 2106, name: "松野蓝莓果酱礼盒", company: "松野食品科技有限公司", category: "加工食品", batch: "SY20260812", status: "已激活", submitted: "2026-08-12 09:06", amount: 0 });

    orderData("order-unbound", { id: 2201, no: "ORD-202608-101", sourceBatchNo: "BATCH-202608-102", customer: "松野食品科技有限公司", range: "QR20000001–QR20008000", total: 8000, active: 0, created: "2026-08-10", createdAt: "2026-08-10 10:40", allocatedAt: "2026-08-10 10:40", allocatedBy: "平台管理员", allocationStatus: "已分配", size: "25 × 30 mm", note: "完整案例：已分配但尚未绑定产品，可从草稿继续提交", activations: [] });
    const partialOrder = orderData("order-partial", { id: 2202, no: "ORD-202608-102", sourceBatchNo: "BATCH-202608-102", customer: "北辰农产有限公司", range: "QR20008001–QR20012000", total: 4000, active: 1000, created: "2026-08-10", createdAt: "2026-08-10 10:52", allocatedAt: "2026-08-10 10:52", allocatedBy: "运营专员", allocationStatus: "已分配", size: "25 × 30 mm", note: "完整案例：包含已激活、待审批和剩余可用码量", activations: [{ activationId: "ACT-RICH-APPROVED", bindRequestNo: "BR-202608-101", productId: approvedProduct.id, customerId: byCustomer("北辰农产有限公司")?.id || null, product: approvedProduct.name, batch: approvedProduct.batch, range: "QR20008001–QR20009000", amount: 1000, time: "2026-08-10 11:26", operator: "平台管理员", status: "有效" }] });
    const resetOrder = orderData("order-with-reset", { id: 2203, no: "ORD-202608-103", sourceBatchNo: "BATCH-202608-102", customer: "松野食品科技有限公司", range: "QR20012001–QR20015000", total: 3000, active: 1000, created: "2026-08-10", createdAt: "2026-08-10 14:30", allocatedAt: "2026-08-10 14:30", allocatedBy: "运营专员", allocationStatus: "已分配", size: "25 × 30 mm", note: "完整案例：同一订单包含已重置、有效和已驳回的业务记录", activations: [{ activationId: "ACT-RICH-RESET", bindRequestNo: "BR-202608-103", productId: resetProduct.id, customerId: byCustomer("松野食品科技有限公司")?.id || null, product: resetProduct.name, batch: resetProduct.batch, range: "QR20012001–QR20013000", amount: 1000, time: "2026-08-10 15:56", operator: "平台管理员", status: "已重置", withdrawalNo: "WD-202608-102", withdrawalReason: "外包装营养成分表版本更新", resetTime: "2026-08-12 10:18", resetOperator: "平台管理员" }, { activationId: "ACT-RICH-ACTIVE", bindRequestNo: "BR-202608-105", productId: resetProduct.id, customerId: byCustomer("松野食品科技有限公司")?.id || null, product: resetProduct.name, batch: resetProduct.batch, range: "QR20013001–QR20014000", amount: 1000, time: "2026-08-11 09:12", operator: "平台管理员", status: "有效" }] });
    const fullOrder = orderData("order-full-active", { id: 2204, no: "ORD-202608-104", sourceBatchNo: "BATCH-202608-103", customer: "安护医疗用品有限公司", range: "QR30000001–QR30010000", total: 10000, active: 10000, created: "2026-08-11", createdAt: "2026-08-11 14:36", allocatedAt: "2026-08-11 14:36", allocatedBy: "平台管理员", allocationStatus: "已分配", size: "32.5 × 40 mm", note: "完整案例：整笔订单码量已全部绑定并激活", activations: [{ activationId: "ACT-RICH-FULL", bindRequestNo: "BR-202608-102", productId: fullProduct.id, customerId: byCustomer("安护医疗用品有限公司")?.id || null, product: fullProduct.name, batch: fullProduct.batch, range: "QR30000001–QR30010000", amount: 10000, time: "2026-08-11 15:18", operator: "平台管理员", status: "有效" }] });

    const requestData = [
      ["binding-approved", { id: "demo-rich-bind-101", no: "BR-202608-101", productId: approvedProduct.id, customerId: byCustomer("北辰农产有限公司")?.id || null, orderNo: partialOrder.no, customer: "北辰农产有限公司", product: approvedProduct.name, batch: approvedProduct.batch, range: "QR20008001–QR20009000", amount: 1000, status: "已通过", time: "2026-08-10 11:05", decidedAt: "2026-08-10 11:26", operator: "平台管理员" }],
      ["binding-pending", { id: "demo-rich-bind-102", no: "BR-202608-104", productId: pendingProduct.id, customerId: byCustomer("北辰农产有限公司")?.id || null, orderNo: partialOrder.no, customer: "北辰农产有限公司", product: pendingProduct.name, batch: pendingProduct.batch, range: "QR20009001–QR20010500", amount: 1500, status: "待审批", time: "2026-08-12 16:20", decidedAt: "", operator: "" }],
      ["binding-reset", { id: "demo-rich-bind-103", no: "BR-202608-103", productId: resetProduct.id, customerId: byCustomer("松野食品科技有限公司")?.id || null, orderNo: resetOrder.no, customer: "松野食品科技有限公司", product: resetProduct.name, batch: resetProduct.batch, range: "QR20012001–QR20013000", amount: 1000, status: "已通过", time: "2026-08-10 15:42", decidedAt: "2026-08-10 15:56", operator: "平台管理员" }],
      ["binding-active-second", { id: "demo-rich-bind-105", no: "BR-202608-105", productId: resetProduct.id, customerId: byCustomer("松野食品科技有限公司")?.id || null, orderNo: resetOrder.no, customer: "松野食品科技有限公司", product: resetProduct.name, batch: resetProduct.batch, range: "QR20013001–QR20014000", amount: 1000, status: "已通过", time: "2026-08-11 08:58", decidedAt: "2026-08-11 09:12", operator: "平台管理员" }],
      ["binding-rejected", { id: "demo-rich-bind-104", no: "BR-202608-106", productId: rejectedProduct.id, customerId: byCustomer("松野食品科技有限公司")?.id || null, orderNo: resetOrder.no, customer: "松野食品科技有限公司", product: rejectedProduct.name, batch: rejectedProduct.batch, range: "QR20014001–QR20014500", amount: 500, status: "已驳回", time: "2026-08-12 09:06", decidedAt: "2026-08-12 09:25", operator: "平台管理员", rejectReason: "产品批次检验报告缺少签章，请补充后重新提交" }],
      ["binding-full-approved", { id: "demo-rich-bind-106", no: "BR-202608-102", productId: fullProduct.id, customerId: byCustomer("安护医疗用品有限公司")?.id || null, orderNo: fullOrder.no, customer: "安护医疗用品有限公司", product: fullProduct.name, batch: fullProduct.batch, range: "QR30000001–QR30010000", amount: 10000, status: "已通过", time: "2026-08-11 15:02", decidedAt: "2026-08-11 15:18", operator: "平台管理员" }],
    ];
    requestData.forEach(([demoCase, data]) => upsert(bindRequests, demoCase, data));

    const withdrawalData = [
      ["withdrawal-pending", { id: 2301, no: "WD-202608-101", productId: fullProduct.id, customerId: byCustomer("安护医疗用品有限公司")?.id || null, product: fullProduct.name, batch: fullProduct.batch, customer: "安护医疗用品有限公司", scope: "segments", segments: [{ activationId: "ACT-RICH-FULL", key: "ACT-RICH-FULL", orderNo: fullOrder.no, range: "QR30000001–QR30010000", amount: 10000, time: "2026-08-11 15:18" }], requestedAmount: 10000, reason: "抽检记录需要复核，申请暂时撤回整批码段", status: "待审批", time: "2026-08-12 09:40", decidedAt: "", rejectReason: "" }],
      ["withdrawal-approved", { id: 2302, no: "WD-202608-102", productId: resetProduct.id, customerId: byCustomer("松野食品科技有限公司")?.id || null, product: resetProduct.name, batch: resetProduct.batch, customer: "松野食品科技有限公司", scope: "segments", segments: [{ activationId: "ACT-RICH-RESET", key: "ACT-RICH-RESET", orderNo: resetOrder.no, range: "QR20012001–QR20013000", amount: 1000, time: "2026-08-10 15:56" }], requestedAmount: 1000, rollbackAmount: 1000, resetRanges: ["QR20012001–QR20013000"], reason: "外包装营养成分表版本更新", status: "已通过", time: "2026-08-12 09:48", decidedAt: "2026-08-12 10:18", rejectReason: "" }],
      ["withdrawal-rejected", { id: 2303, no: "WD-202608-103", productId: resetProduct.id, customerId: byCustomer("松野食品科技有限公司")?.id || null, product: resetProduct.name, batch: resetProduct.batch, customer: "松野食品科技有限公司", scope: "segments", segments: [{ activationId: "ACT-RICH-ACTIVE", key: "ACT-RICH-ACTIVE", orderNo: resetOrder.no, range: "QR20013001–QR20014000", amount: 1000, time: "2026-08-11 09:12" }], requestedAmount: 1000, reason: "计划更换礼盒宣传文案", status: "已驳回", time: "2026-08-12 10:26", decidedAt: "2026-08-12 10:45", rejectReason: "该修改不影响现有溯源信息，无需撤回码段" }],
    ];
    const richWithdrawals = withdrawalData.map(([demoCase, data]) => upsert(withdrawals, demoCase, data));

    const messageData = [
      ["rich-binding-approved", { id: 2401, ...fxBindingResultMessage({ productId: approvedProduct.id, customerId: byCustomer("北辰农产有限公司")?.id || null, product: approvedProduct.name, batch: approvedProduct.batch, orderNo: partialOrder.no, amount: 1000, range: "QR20008001–QR20009000", bindRequestNo: "BR-202608-101" }, true), time: "2026-08-10 11:26", unread: false, recipient: "北辰农产有限公司", customer: "北辰农产有限公司" }],
      ["rich-binding-rejected", { id: 2402, ...fxBindingResultMessage({ productId: rejectedProduct.id, customerId: byCustomer("松野食品科技有限公司")?.id || null, product: rejectedProduct.name, batch: rejectedProduct.batch, orderNo: resetOrder.no, amount: 500, range: "QR20014001–QR20014500", bindRequestNo: "BR-202608-106", reason: "产品批次检验报告缺少签章，请补充后重新提交" }, false), time: "2026-08-12 09:25", unread: true, recipient: "松野食品科技有限公司", customer: "松野食品科技有限公司" }],
      ["rich-withdrawal-approved", { id: 2403, ...fxWithdrawalResultMessage(richWithdrawals[1], true), time: "2026-08-12 10:18", unread: false, recipient: "松野食品科技有限公司", customer: "松野食品科技有限公司" }],
      ["rich-withdrawal-rejected", { id: 2404, ...fxWithdrawalResultMessage(richWithdrawals[2], false), time: "2026-08-12 10:45", unread: true, recipient: "松野食品科技有限公司", customer: "松野食品科技有限公司" }],
    ];
    messageData.forEach(([demoCase, data]) => upsert(messages, demoCase, data));

    orders.forEach(fxNormalizeAllocationOrder);
    fxMigrateWithdrawalActivationIds();
    fxStore.set(fxBusinessStorage.customers, customers);
    fxStore.set(fxBusinessStorage.orders, orders);
    fxStore.set(fxBusinessStorage.codeBatches, codeBatches);
    fxStore.set(fxBusinessStorage.bindRequests, bindRequests);
    fxStore.set(fxBusinessStorage.products, products);
    fxStore.set(fxBusinessStorage.withdrawals, withdrawals);
    fxStore.set(fxBusinessStorage.messages, messages);
    fxStore.set(markerKey, fxRichDemoCaseVersion);
  }
  fxEnsureRichDemoCases();
  const fxRelationshipConsistencyVersion = 6;
  function fxEnsureRelationshipConsistency() {
    const markerKey = "trace-relationship-consistency-version";
    let changed = Number(fxStore.get(markerKey, 0)) < fxRelationshipConsistencyVersion;
    const normalizeCustomerLink = record => {
      const customer = fxCustomerForRecord(record);
      if (!customer) return null;
      if (Number(record.customerId) !== Number(customer.id)) { record.customerId = customer.id; changed = true; }
      if ("customer" in record && record.customer !== customer.name) { record.customer = customer.name; changed = true; }
      if ("company" in record && record.company !== customer.name) { record.company = customer.name; changed = true; }
      return customer;
    };
    const normalizeProductLink = record => {
      const product = fxProductForRecord(record);
      if (!product) return null;
      const customer = fxCustomerForRecord(product) || fxCustomerForRecord(record);
      if (Number(record.productId) !== Number(product.id)) { record.productId = product.id; changed = true; }
      if ("product" in record && record.product !== product.name) { record.product = product.name; changed = true; }
      if (record.batch !== product.batch) { record.batch = product.batch; changed = true; }
      if (customer && Number(record.customerId) !== Number(customer.id)) { record.customerId = customer.id; changed = true; }
      return product;
    };
    const placeholderProductNames = new Set(["", "—", "历史产品", "未命名产品"]);
    const usedProductIds = new Set();
    let maxProductId = Math.max(0, ...products.map(item => Number(item.id) || 0));
    products.forEach(product => {
      const productId = Number(product.id);
      if (!Number.isFinite(productId) || usedProductIds.has(productId)) {
        product.id = ++maxProductId;
        changed = true;
      }
      usedProductIds.add(Number(product.id));
    });
    const nextProductId = () => Math.max(0, ...products.map(item => Number(item.id) || 0)) + 1;
    const archiveProductForRecord = (record, customer, activated = false) => {
      const linked = fxProductForRecord(record);
      if (linked) return linked;
      const productName = String(record?.product || record?.name || "").trim();
      if (!customer || placeholderProductNames.has(productName)) return null;
      const customerProducts = products.filter(item => fxRecordBelongsToCustomer(item, customer));
      const category = customerProducts[0]?.category || "农产品";
      const knownBatches = { 云岭春芽红茶: "YL20260724" };
      const rawBatch = String(record?.batch || "").trim();
      const batchLooksLikeSerial = orders.some(order => fxRecordBelongsToCustomer(order, customer) && String(order.range || "").split("–")[0] === rawBatch);
      const batch = knownBatches[productName] || (!batchLooksLikeSerial && rawBatch ? rawBatch : `HIST-${String(customer.account || customer.id).toUpperCase()}-${String(nextProductId()).padStart(4, "0")}`);
      const statusValue = activated || ["已通过", "已激活"].includes(record?.status)
        ? "已激活"
        : ["待审批", "待审核"].includes(record?.status) ? "待审核" : "已驳回";
      const product = {
        id: nextProductId(),
        archiveCase: true,
        customerId: customer.id,
        name: productName,
        company: customer.name,
        category,
        batch,
        status: statusValue,
        submitted: record?.time || record?.submitted || fxToday,
        decidedAt: record?.decidedAt || record?.time || "",
        amount: 0,
      };
      product.details = fxCompleteProductDetails(product);
      products.push(product);
      changed = true;
      return product;
    };

    customers.forEach(normalizeCustomerLink);
    products.forEach(product => {
      const customer = normalizeCustomerLink(product);
      const previousDetails = JSON.stringify(product.details || null);
      const normalizedDetails = fxCompleteProductDetails(product);
      product.details = normalizedDetails;
      normalizedDetails.productName = product.name;
      normalizedDetails.batch = product.batch;
      normalizedDetails.category = product.category || normalizedDetails.category || "";
      if (customer) normalizedDetails.companyName = customer.name;
      if (JSON.stringify(normalizedDetails) !== previousDetails) changed = true;
    });
    orders.forEach(order => {
      const customer = normalizeCustomerLink(order);
      order.activations = (order.activations || []).filter(activation => {
        if (customer && Number(activation.customerId) !== Number(customer.id)) { activation.customerId = customer.id; changed = true; }
        const linkRecord = { ...activation, customerId: customer?.id || activation.customerId, customer: customer?.name || order.customer };
        let product = normalizeProductLink(linkRecord);
        if (!product && customer && placeholderProductNames.has(String(activation.product || "").trim())) {
          const candidates = products.filter(item => fxRecordBelongsToCustomer(item, customer));
          if (candidates.length === 1) product = candidates[0];
        }
        if (!product) product = archiveProductForRecord(linkRecord, customer, true);
        if (!product) { changed = true; return false; }
        if (Number(activation.productId) !== Number(product.id) || activation.product !== product.name || activation.batch !== product.batch) {
          Object.assign(activation, { productId: product.id, customerId: customer?.id || product.customerId || null, product: product.name, batch: product.batch });
          changed = true;
        }
        if (activation.status !== "已重置" && product.status !== "已激活") {
          product.status = "已激活";
          changed = true;
        }
        const request = bindRequests.find(item => item.no && item.no === activation.bindRequestNo)
          || bindRequests.find(item => item.orderNo === order.no && item.range === activation.range && Number(item.productId) === Number(product.id));
        if (request?.no && activation.bindRequestNo !== request.no) { activation.bindRequestNo = request.no; changed = true; }
        return true;
      });
    });
    bindRequests.splice(0, bindRequests.length, ...bindRequests.filter(request => {
      const customer = normalizeCustomerLink(request);
      const product = normalizeProductLink(request) || archiveProductForRecord(request, customer, request.status === "已通过");
      if (!product) { changed = true; return false; }
      Object.assign(request, { productId: product.id, product: product.name, batch: product.batch, customerId: customer?.id || product.customerId || null });
      return true;
    }));
    withdrawals.splice(0, withdrawals.length, ...withdrawals.filter(withdrawal => {
      const customer = normalizeCustomerLink(withdrawal);
      const product = normalizeProductLink(withdrawal) || archiveProductForRecord(withdrawal, customer, true);
      if (!product) { changed = true; return false; }
      Object.assign(withdrawal, { productId: product.id, product: product.name, batch: product.batch, customerId: customer?.id || product.customerId || null });
      return true;
    }));
    messages.forEach(message => { normalizeCustomerLink(message); if (message.productId || message.batch) normalizeProductLink(message); });
    const retainedProducts = products.filter(product => !placeholderProductNames.has(String(product.name || "").trim()));
    if (retainedProducts.length !== products.length) {
      products.splice(0, products.length, ...retainedProducts);
      changed = true;
    }
    products.forEach(product => {
      const previousDetails = JSON.stringify(product.details || null);
      product.details = fxCompleteProductDetails(product);
      if (JSON.stringify(product.details) !== previousDetails) changed = true;
    });

    if (changed) {
      fxStore.set(fxBusinessStorage.customers, customers);
      fxStore.set(fxBusinessStorage.orders, orders);
      fxStore.set(fxBusinessStorage.bindRequests, bindRequests);
      fxStore.set(fxBusinessStorage.products, products);
      fxStore.set(fxBusinessStorage.withdrawals, withdrawals);
      fxStore.set(fxBusinessStorage.messages, messages);
    }
    fxStore.set(markerKey, fxRelationshipConsistencyVersion);
  }
  fxEnsureRelationshipConsistency();
  let fxLegacyBatchLinksChanged = false;
  orders.forEach((order, index) => {
    let batch = codeBatches.find(item => item.no === order.sourceBatchNo && fxCodeRangeContains(item.range, order.range));
    if (!batch) batch = codeBatches.find(item => item.range === order.range && Number(item.total || 0) === Number(order.total || 0));
    if (!batch) {
      const containingBatches = codeBatches.filter(item => fxCodeRangeContains(item.range, order.range));
      if (containingBatches.length) {
        batch = [...containingBatches].sort((left, right) => Number(left.total || 0) - Number(right.total || 0) || String(left.createdAt || "").localeCompare(String(right.createdAt || "")))[0];
        if (containingBatches.length > 1) order.migrationNote = "历史来源批次存在重叠，已按最小包含范围归属";
      }
    }
    if (!batch) {
      const overlappingBatches = codeBatches.filter(item => fxCodeRangesOverlap(item.range, order.range));
      if (overlappingBatches.length) {
        order.sourceBatchNo = "";
        order.migrationStatus = "待核对";
        order.migrationNote = `历史分配码段与库存批次 ${overlappingBatches.map(item => item.no).join("、")} 部分重叠`;
        fxLegacyBatchLinksChanged = true;
        return;
      }
      const baseNo = String(order.no || `${index + 1}`).replace(/^ORD-/, "").replace(/[^A-Za-z0-9-]/g, "-");
      let no = `BATCH-${baseNo}`;
      let suffix = 2;
      while (codeBatches.some(item => item.no === no)) { no = `BATCH-${baseNo}-${suffix}`; suffix += 1; }
      batch = fxNormalizeCodeBatch({
        id: `legacy-batch-${order.id || index + 1}`,
        no,
        range: order.range,
        total: order.total,
        created: order.created,
        createdAt: order.createdAt,
        style: order.style || "二维码核心区块",
        size: order.size || "25 × 25 mm",
        customWidth: order.customWidth,
        customHeight: order.customHeight,
        note: order.note || "历史码段批次",
      }, codeBatches.length);
      codeBatches.push(batch);
      fxLegacyBatchLinksChanged = true;
    }
    if (order.sourceBatchNo !== batch.no) {
      order.sourceBatchNo = batch.no;
      order.migrationStatus = "已归属";
      fxLegacyBatchLinksChanged = true;
    }
  });
  let fxActivationIdentityChanged = false;
  orders.forEach(order => {
    const orderCustomer = fxCustomerForRecord(order);
    (order.activations || []).forEach(activation => {
      if (orderCustomer && Number(activation.customerId) !== Number(orderCustomer.id)) {
        activation.customerId = orderCustomer.id;
        fxActivationIdentityChanged = true;
      }
      if (activation.productId !== undefined && activation.productId !== null && activation.productId !== "") return;
      if (!activation.batch) return;
      const exactCandidates = products.filter(product => (!orderCustomer || fxRecordBelongsToCustomer(product, orderCustomer))
        && product.name === activation.product
        && activation.batch === product.batch);
      if (exactCandidates.length !== 1) return;
      const product = exactCandidates[0];
      Object.assign(activation, { productId: product.id, customerId: orderCustomer?.id || product.customerId || null, product: product.name, batch: product.batch });
      fxActivationIdentityChanged = true;
    });
  });
  const fxActivationStatisticsChanged = fxReconcileActivationStatistics();
  if (fxLegacyBatchLinksChanged || fxActivationIdsChanged || fxWithdrawalActivationIdsChanged || fxActivationIdentityChanged || fxActivationStatisticsChanged) {
    fxStore.set(fxBusinessStorage.codeBatches, codeBatches);
    fxStore.set(fxBusinessStorage.orders, orders);
    fxStore.set(fxBusinessStorage.products, products);
    fxStore.set(fxBusinessStorage.customers, customers);
  }
  const reserveBatchNo = "BATCH-202608-001";
  const reserveBatch = codeBatches.find(item => item.no === reserveBatchNo);
  if (!reserveBatch) {
    codeBatches.unshift(fxNormalizeCodeBatch({
      id: "demo-unallocated-batch",
      no: reserveBatchNo,
      range: "QR00000001–QR00010000",
      total: 10000,
      created: fxToday,
      createdAt: `${fxToday} 13:40`,
      style: "二维码核心区块",
      size: "25 × 25 mm",
      note: "待运营分配的演示库存",
    }, 0));
    fxStore.set(fxBusinessStorage.codeBatches, codeBatches);
  }
  const fxDemoWithdrawal = withdrawals.find(item => item.demoCase === "complete-tea" || item.no === "WD-202607-018");
  if (fxDemoWithdrawal && (!Array.isArray(fxDemoWithdrawal.segments) || !fxDemoWithdrawal.segments.length)) {
    Object.assign(fxDemoWithdrawal, {
      batch: fxDemoWithdrawal.batch || "YL20260726",
      scope: "segments",
      segments: [{ key: "ORD-202607-088::YL00880001–YL00892000::2026-07-26 10:32", orderNo: "ORD-202607-088", range: "YL00880001–YL00892000", amount: 12000, time: "2026-07-26 10:32" }],
      requestedAmount: Number(fxDemoWithdrawal.requestedAmount || 12000),
    });
  }
  function fxSaveBusiness() {
    orders.forEach(fxNormalizeAllocationOrder);
    fxMigrateWithdrawalActivationIds();
    fxStore.set(fxBusinessStorage.customers, customers);
    fxStore.set(fxBusinessStorage.orders, orders);
    fxStore.set(fxBusinessStorage.codeBatches, codeBatches);
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
  window.addEventListener("storage", event => {
    if (![fxBusinessStorage.orders, fxBusinessStorage.codeBatches].includes(event.key) || !event.newValue) return;
    try {
      const syncedItems = JSON.parse(event.newValue);
      if (!Array.isArray(syncedItems)) return;
      if (event.key === fxBusinessStorage.orders) {
        orders.splice(0, orders.length, ...syncedItems);
        orders.forEach(fxNormalizeAllocationOrder);
      } else {
        codeBatches.splice(0, codeBatches.length, ...syncedItems);
        codeBatches.forEach(fxNormalizeCodeBatch);
      }
      fxRenderFromStorage();
    } catch (_) {}
  });
  function fxCurrentCustomer() {
    return customers.find(item => item.account === state.currentAccount) || null;
  }
  function fxCurrentOperator() {
    return fxOperators.find(item => item.account === state.currentAccount) || null;
  }
  function fxIsCurrentOperator(item) {
    return Boolean(item && item.account === state.currentAccount);
  }

  nav.ops.splice(0, nav.ops.length,
    ["customers", "building-2", "客户列表"],
    ["inventory", "qr-code", "码段库存"],
    ["orders", "receipt-text", "订单台账"],
    ["bind-requests", "clipboard-check", "绑定审核"],
    ["withdrawals", "rotate-ccw", "撤回审核"],
    ["operators", "users-round", "运营账号管理"],
    ["messages", "mail", "站内信"],
    ["settings", "settings", "个人设置"]
  );
  nav.customer.splice(0, nav.customer.length, ...nav.customer.filter(item => item[0] !== "products"));
  if (!nav.customer.some(item => item[0] === "orders")) nav.customer.splice(1, 0, ["orders", "receipt-text", "订单台账"]);
  const fxCustomerOrderNav = nav.customer.find(item => item[0] === "orders");
  if (fxCustomerOrderNav) fxCustomerOrderNav[2] = "订单台账";
  Object.assign(state, {
    authenticated: entryPortal === "scan" || fxStore.sessionGet(`trace-auth-${entryPortal}`, "0") === "1",
    currentAccount: fxStore.sessionGet(`trace-account-${entryPortal}`, ""),
    operatorNameFilter: "", operatorAccountFilter: "", operatorStatus: "全部状态",
    operatorDateFrom: "", operatorDateTo: "", operatorDateDraftFrom: "", operatorDateDraftTo: "",
    operatorCalendarOpen: false, operatorCalendarLeftMonth: "2026-06-01", operatorCalendarRightMonth: "2026-07-01",
    customerNameFilter: "", customerAccountFilter: "", customerPhoneFilter: "", customerStatus: "全部状态", customerSortKey: "", customerSortDirection: "asc",
    customerDetailOrderFilter: "", customerDetailOrderSortKey: "", customerDetailOrderSortDirection: "asc",
    inventoryRangeFilter: "", inventoryStatus: "全部状态", inventoryAllocationCustomerFilter: "", inventoryAllocationOrderFilter: "", inventoryAllocationSortKey: "", inventoryAllocationSortDirection: "asc",
    inventoryAllocationDateFrom: "", inventoryAllocationDateTo: "", inventoryAllocationDateDraftFrom: "", inventoryAllocationDateDraftTo: "",
    orderCustomerFilter: "", orderNumberFilter: "", orderFrom: "", orderTo: "", orderSortKey: "", orderSortDirection: "asc",
    orderDateDraftFrom: "", orderDateDraftTo: "", orderCalendarOpen: false,
    orderCalendarLeftMonth: "2026-06-01", orderCalendarRightMonth: "2026-07-01",
    bindRequestCustomerFilter: "", bindRequestOrderFilter: "", bindRequestProductFilter: "", bindRequestBatchFilter: "", bindRequestStatus: "全部状态", bindRequestCategory: "全部大类",
    bindRequestSortKey: "", bindRequestSortDirection: "asc",
    bindRequestDateFrom: "", bindRequestDateTo: "", bindRequestDateDraftFrom: "", bindRequestDateDraftTo: "",
    orderBindingProductFilter: "", orderBindingBatchFilter: "", orderBindingCategory: "全部大类", orderBindingStatus: "全部状态",
    orderBindingSortKey: "", orderBindingSortDirection: "asc",
    orderBindingRequestedDateFrom: "", orderBindingRequestedDateTo: "", orderBindingRequestedDateDraftFrom: "", orderBindingRequestedDateDraftTo: "",
    orderBindingProcessedDateFrom: "", orderBindingProcessedDateTo: "", orderBindingProcessedDateDraftFrom: "", orderBindingProcessedDateDraftTo: "",
    productCategory: "全部大类",
    reviewDateFrom: "", reviewDateTo: "", reviewDateDraftFrom: "", reviewDateDraftTo: "",
    withdrawalNoFilter: "", withdrawalProductFilter: "", withdrawalCustomerFilter: "", withdrawalStatus: "全部状态",
    withdrawalDateFrom: "", withdrawalDateTo: "", withdrawalDateDraftFrom: "", withdrawalDateDraftTo: "",
    customerOrderSortKey: "", customerOrderSortDirection: "asc",
    customerProductFilter: "", customerProductStatus: "全部状态", customerProductCategory: "全部大类",
    customerProductSortKey: "", customerProductSortDirection: "asc",
    customerWithdrawalStatus: "全部状态",
    customerOrderDateFrom: "", customerOrderDateTo: "", customerOrderDateDraftFrom: "", customerOrderDateDraftTo: "",
    customerProductDateFrom: "", customerProductDateTo: "", customerProductDateDraftFrom: "", customerProductDateDraftTo: "",
    customerWithdrawalDateFrom: "", customerWithdrawalDateTo: "", customerWithdrawalDateDraftFrom: "", customerWithdrawalDateDraftTo: "",
    customerCalendarOpen: false, customerCalendarContext: "", customerCalendarLeftMonth: "2026-06-01", customerCalendarRightMonth: "2026-07-01",
    messageTitleSearch: "", messageContentSearch: "", messageReadFilter: "全部阅读状态", messageRecipientFilter: "全部接收方",
    messageTimeFilter: "全部发送时间", messageTypeFilter: "全部消息类型",
    messageDateFrom: "", messageDateTo: "", messageDateDraftFrom: "", messageDateDraftTo: "",
    messageCalendarOpen: false, messageCalendarLeftMonth: "2026-06-01", messageCalendarRightMonth: "2026-07-01",
    selectedMessageIds: [],
    selectedOperatorId: null, selectedCustomerId: null, selectedOrderNo: null, selectedCodeBatchNo: null, orderDetailReturnPage: "", allocationCustomerId: null, allocationSourceRange: "", highlightOrderNo: null,
    selectedWithdrawalIndex: null, selectedMessageId: null, selectedBindRequestId: null,
    editorProductId: null, editorDraft: null, editorReadonly: false, editorOwner: "customer", editorTargetOrderNo: null, editorBindRequestId: null,
    editorRequestedSourceRange: "", editorRequestedRange: "", editorRequestedAmount: 0, reviewEditing: false,
    qrDraft: { customerId: null, prefix: "QR", size: "custom", customWidth: 25, customHeight: 25, amount: 500, note: "" },
    generatedOrderNo: null, previewVersion: 1,
    scanExpandedModules: {},
  });
  const fxDirectPageParams = new URLSearchParams(location.search);
  if (fxDirectPageParams.get("order")) {
    state.selectedOrderNo = fxDirectPageParams.get("order");
    if (state.customerPage === "editor") state.editorTargetOrderNo = fxDirectPageParams.get("order");
  }
  if (fxDirectPageParams.get("customer")) state.selectedCustomerId = Number(fxDirectPageParams.get("customer"));
  if (fxDirectPageParams.get("range") && state.opsPage === "inventory-detail") {
    const routeRange = fxDirectPageParams.get("range");
    const batch = codeBatches.find(item => item.range === routeRange || item.no === routeRange);
    state.selectedCodeBatchNo = batch?.no || null;
  }
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
    const nameTerm = state.operatorNameFilter.trim().toLowerCase();
    const accountTerm = state.operatorAccountFilter.trim().toLowerCase();
    return fxNewestRows(fxOperators.filter(item => (!nameTerm || String(item.name || "").toLowerCase().includes(nameTerm)) && (!accountTerm || String(item.account || "").toLowerCase().includes(accountTerm)) && (state.operatorStatus === "全部状态" || item.status === state.operatorStatus) && fxOperatorMatchesLoginTime(item)), item => item.lastLogin);
  }
  function fxAddMessage(message) { messages.unshift({ id: Date.now(), time: fxNow(), unread: true, ...message }); }
  function fxIsApplicationSubmissionMessage(message) { return ["产品审核申请", "产品撤回申请", "绑定申请"].includes(message.type); }
  function fxIsCustomerMessage(message) { return customers.some(customer => fxRecordBelongsToCustomer(message, customer)); }
  function fxCustomerMessages() { return messages.filter(item => fxIsCustomerMessage(item) && !fxIsApplicationSubmissionMessage(item)); }
  function fxVisibleMessages(portal = state.portal) {
    if (portal === "customer") return messages.filter(item => fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && !fxIsApplicationSubmissionMessage(item));
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
    const titleTerm = state.messageTitleSearch.trim().toLowerCase();
    const contentTerm = state.messageContentSearch.trim().toLowerCase();
    return fxNewestRows(fxCustomerMessages().filter(item =>
      (!titleTerm || String(item.title || "").toLowerCase().includes(titleTerm)) &&
      (!contentTerm || String(item.detail || "").toLowerCase().includes(contentTerm)) &&
      (state.messageReadFilter === "全部阅读状态" || (state.messageReadFilter === "未读" ? item.unread : !item.unread)) &&
      (state.messageRecipientFilter === "全部接收方" || item.recipient === state.messageRecipientFilter) &&
      (state.messageTypeFilter === "全部消息类型" || item.type === state.messageTypeFilter) &&
      fxMessageMatchesTime(item)
    ), item => item.time);
  }
  function fxFilteredCustomerMessages() {
    const titleTerm = state.messageTitleSearch.trim().toLowerCase();
    const contentTerm = state.messageContentSearch.trim().toLowerCase();
    return fxNewestRows(messages.filter(item => fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && !fxIsApplicationSubmissionMessage(item) &&
      (!titleTerm || String(item.title || "").toLowerCase().includes(titleTerm)) &&
      (!contentTerm || String(item.detail || "").toLowerCase().includes(contentTerm)) &&
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
  function fxCodeRangeContains(containerRange = "", childRange = "") {
    const [containerStartCode, containerEndCode] = String(containerRange).split("–");
    const [childStartCode, childEndCode] = String(childRange).split("–");
    const containerStart = fxParseCode(containerStartCode); const containerEnd = fxParseCode(containerEndCode);
    const childStart = fxParseCode(childStartCode); const childEnd = fxParseCode(childEndCode);
    return Boolean(containerStart && containerEnd && childStart && childEnd
      && containerStart.prefix === containerEnd.prefix
      && containerStart.prefix === childStart.prefix
      && containerStart.prefix === childEnd.prefix
      && childStart.number >= containerStart.number
      && childEnd.number <= containerEnd.number);
  }
  function fxEffectiveActivationIntervals(orderOrOrders, predicate = null) {
    const scopedOrders = Array.isArray(orderOrOrders) ? orderOrOrders : orderOrOrders ? [orderOrOrders] : [];
    const intervals = scopedOrders.flatMap(order => {
      const [orderStartCode, orderEndCode] = String(order?.range || "").split("–");
      const orderStart = fxParseCode(orderStartCode); const orderEnd = fxParseCode(orderEndCode);
      if (!orderStart || !orderEnd || orderStart.prefix !== orderEnd.prefix) return [];
      return (order.activations || []).flatMap(activation => {
        if (activation?.status === "已重置" || (predicate && !predicate(activation, order))) return [];
        const [activationStartCode, activationEndCode] = String(activation?.range || "").split("–");
        const activationStart = fxParseCode(activationStartCode); const activationEnd = fxParseCode(activationEndCode);
        if (!activationStart || !activationEnd || activationStart.prefix !== orderStart.prefix || activationEnd.prefix !== orderStart.prefix) return [];
        const first = Math.max(orderStart.number, activationStart.number);
        const last = Math.min(orderEnd.number, activationEnd.number);
        return first <= last ? [{ prefix: orderStart.prefix, width: orderStart.width, first, last }] : [];
      });
    }).sort((left, right) => left.prefix.localeCompare(right.prefix) || left.first - right.first || left.last - right.last);
    const merged = [];
    intervals.forEach(interval => {
      const previous = merged[merged.length - 1];
      if (previous && previous.prefix === interval.prefix && interval.first <= previous.last + 1) {
        previous.last = Math.max(previous.last, interval.last);
        previous.width = Math.max(previous.width, interval.width);
      } else {
        merged.push({ ...interval });
      }
    });
    return merged.map(interval => ({
      ...interval,
      amount: interval.last - interval.first + 1,
      range: `${interval.prefix}${String(interval.first).padStart(interval.width, "0")}–${interval.prefix}${String(interval.last).padStart(interval.width, "0")}`,
    }));
  }
  function fxEffectiveActivationAmount(orderOrOrders, predicate = null) {
    return fxEffectiveActivationIntervals(orderOrOrders, predicate).reduce((sum, interval) => sum + interval.amount, 0);
  }
  function fxActivationBelongsToProduct(activation, product) {
    if (!activation || !product) return false;
    if (activation.productId !== undefined && activation.productId !== null && activation.productId !== "") {
      return Number(activation.productId) === Number(product.id);
    }
    return activation.product === product.name
      && (product.batch ? activation.batch === product.batch : !activation.batch);
  }
  function fxReconcileActivationStatistics() {
    let changed = false;
    orders.forEach(order => {
      const active = fxEffectiveActivationAmount(order);
      if (Number(order.active || 0) !== active) {
        order.active = active;
        changed = true;
      }
    });
    products.forEach(product => {
      const customer = fxCustomerForRecord(product);
      const customerOrders = customer
        ? orders.filter(order => order.allocationStatus !== "已撤销" && fxRecordBelongsToCustomer(order, customer))
        : [];
      const amount = fxEffectiveActivationAmount(customerOrders, activation => fxActivationBelongsToProduct(activation, product));
      if (Number(product.amount || 0) !== amount) {
        product.amount = amount;
        changed = true;
      }
    });
    customers.forEach(customer => {
      const customerOrders = orders.filter(order => order.allocationStatus !== "已撤销" && fxRecordBelongsToCustomer(order, customer));
      const active = fxEffectiveActivationAmount(customerOrders);
      if (Number(customer.active || 0) !== active) {
        customer.active = active;
        changed = true;
      }
    });
    return changed;
  }
  function fxResolveCodeBatch(batchOrNo) {
    if (batchOrNo && typeof batchOrNo === "object") return batchOrNo;
    return codeBatches.find(batch => batch.no === batchOrNo) || null;
  }
  function fxCodeBatchAllocations(batchOrNo) {
    const batch = fxResolveCodeBatch(batchOrNo);
    if (!batch) return [];
    return orders.filter(order => order.sourceBatchNo === batch.no
      && order.allocationStatus !== "已撤销"
      && fxCodeRangeContains(batch.range, order.range));
  }
  function fxCodeBatchFreeRanges(batchOrNo) {
    const batch = fxResolveCodeBatch(batchOrNo);
    const [startCode, endCode] = String(batch?.range || "").split("–");
    const start = fxParseCode(startCode); const end = fxParseCode(endCode);
    if (!batch || !start || !end || start.prefix !== end.prefix) return [];
    const occupied = fxCodeBatchAllocations(batch).map(order => {
      const [allocatedStartCode, allocatedEndCode] = String(order.range || "").split("–");
      const allocatedStart = fxParseCode(allocatedStartCode); const allocatedEnd = fxParseCode(allocatedEndCode);
      return allocatedStart && allocatedEnd && allocatedStart.prefix === start.prefix && allocatedEnd.prefix === start.prefix
        ? { first: Math.max(start.number, allocatedStart.number), last: Math.min(end.number, allocatedEnd.number) }
        : null;
    }).filter(interval => interval && interval.first <= interval.last).sort((left, right) => left.first - right.first);
    const merged = [];
    occupied.forEach(interval => {
      const previous = merged[merged.length - 1];
      if (previous && interval.first <= previous.last + 1) previous.last = Math.max(previous.last, interval.last);
      else merged.push({ ...interval });
    });
    const free = []; let first = start.number;
    merged.forEach(interval => {
      if (interval.first > first) free.push({ first, last: interval.first - 1 });
      first = Math.max(first, interval.last + 1);
    });
    if (first <= end.number) free.push({ first, last: end.number });
    return free.map(range => ({
      range: `${fxCodeAt(start, range.first)}–${fxCodeAt(start, range.last)}`,
      first: fxCodeAt(start, range.first),
      last: fxCodeAt(start, range.last),
      amount: range.last - range.first + 1,
      start,
      firstNumber: range.first,
      lastNumber: range.last,
    }));
  }
  function fxCodeBatchAvailableAmount(batchOrNo) {
    return fxCodeBatchFreeRanges(batchOrNo).reduce((sum, range) => sum + range.amount, 0);
  }
  function fxCodeBatchAllocatedAmount(batchOrNo) {
    const batch = fxResolveCodeBatch(batchOrNo);
    return batch ? Math.max(0, Number(batch.total || 0) - fxCodeBatchAvailableAmount(batch)) : 0;
  }
  function fxCodeBatchAllocationStatus(batchOrNo) {
    const batch = fxResolveCodeBatch(batchOrNo);
    if (!batch) return "未分配";
    const allocated = fxCodeBatchAllocatedAmount(batch);
    if (!allocated) return "未分配";
    return fxCodeBatchAvailableAmount(batch) > 0 ? "部分分配" : "已分配";
  }
  function fxCodeBatchAllocationRange(batchOrNo, amount, sourceRange = "") {
    const requestedAmount = Number(amount || 0);
    if (!Number.isSafeInteger(requestedAmount) || requestedAmount < 1) return "";
    const free = fxCodeBatchFreeRanges(batchOrNo);
    const source = sourceRange ? free.find(item => item.range === sourceRange) : free.find(item => item.amount >= requestedAmount);
    return source && source.amount >= requestedAmount ? fxRequestedRange(source.range, requestedAmount) : "";
  }
  function fxCodeSerialUpperBound(prefix = "QR") {
    const normalizedPrefix = String(prefix || "QR").trim().toUpperCase();
    const sources = [...codeBatches, ...orders.filter(order => !order.sourceBatchNo)];
    return sources.reduce((maximum, item) => {
      const end = fxParseCode(String(item.range || "").split("–")[1]);
      return end?.prefix === normalizedPrefix ? Math.max(maximum, end.number) : maximum;
    }, 0);
  }
  function fxNextCodeSerialNumber(prefix = "QR") { return fxCodeSerialUpperBound(prefix) + 1; }
  function fxActivationRange(order, amount, excludeProductId = null, excludeBindRequestId = null) {
    const [startCode, endCode] = String(order.range || "").split("–");
    const start = fxParseCode(startCode); const end = fxParseCode(endCode); const needed = Number(amount || 0);
    if (!start || !end || needed < 1 || start.prefix !== end.prefix) return "";
    const reservedRows = [
      ...fxCombinedPendingProducts(order.no, excludeProductId).map(product => ({ range: product.requestedRange, status: "有效" })),
      ...bindRequests.filter(request => request.orderNo === order.no && request.status === "待审批" && request.range && !fxSameId(request.id, excludeBindRequestId)).map(request => ({ range: request.range, status: "有效" })),
    ];
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
  function fxOrderFreeRanges(order, excludeProductId = null, excludeBindRequestId = null) {
    const [startCode, endCode] = String(order?.range || "").split("–");
    const start = fxParseCode(startCode); const end = fxParseCode(endCode);
    if (!start || !end || start.prefix !== end.prefix) return [];
    const reservedRows = [
      ...fxCombinedPendingProducts(order.no, excludeProductId).map(product => ({ range: product.requestedRange, status: "有效" })),
      ...bindRequests.filter(request => request.orderNo === order.no && request.status === "待审批" && request.range && !fxSameId(request.id, excludeBindRequestId)).map(request => ({ range: request.range, status: "有效" })),
    ];
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
  function fxRequestedRangeIsAvailable(order, sourceRange, requestedRange, amount, excludeProductId = null, excludeBindRequestId = null) {
    const availableAmount = fxOrderAvailableAmount(order, excludeProductId);
    if (!Number.isSafeInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > availableAmount) return false;
    const source = fxOrderFreeRanges(order, excludeProductId, excludeBindRequestId).find(item => item.range === sourceRange);
    return Boolean(source && Number(amount) <= source.amount && fxRequestedRange(source.range, Number(amount)) === requestedRange);
  }
  function fxBindingRequestRangeIsAvailable(order, request) {
    if (!order || order.allocationStatus === "已撤销" || !request) return false;
    const requestedRange = String(request.range || "");
    const amount = Number(request.amount || 0);
    return fxOrderFreeRanges(order, null, request.id).some(source =>
      amount > 0 && amount <= source.amount && fxRequestedRange(source.range, amount) === requestedRange
    );
  }
  function fxReviewActivationRange(order, amount, product = null) {
    const combined = product?.applicationType === "新建产品并绑定";
    if (combined && order?.no === product.requestedOrderNo) {
      const requestedRange = fxRequestedRange(product.requestedSourceRange, amount);
      if (fxRequestedRangeIsAvailable(order, product.requestedSourceRange, requestedRange, amount, product.id)) return requestedRange;
    }
    return fxActivationRange(order, amount, combined ? product.id : null);
  }
  function fxFileName(file) { return typeof file === "string" ? file : file?.name || "附件"; }
  function fxFileType(file) { return typeof file === "string" ? (/\.pdf$/i.test(file) ? "application/pdf" : "image/*") : file?.type || (/\.pdf$/i.test(file?.name || "") ? "application/pdf" : "image/*"); }
  function fxFileSrc(file, fallback = "") { return typeof file === "object" && file?.src ? file.src : fallback; }
  function fxPdfDisplaySrc(src) {
    const value = String(src || "");
    return value ? `${value}${value.includes("#") ? "&" : "#"}toolbar=0&navpanes=0&view=FitH` : "";
  }
  function fxNormalizeStoredFile(file) { return typeof file === "string" ? { name: file, type: fxFileType(file), src: "" } : { name: fxFileName(file), type: fxFileType(file), size: Number(file.size || 0), src: file.src || "" }; }
  function fxIsImageFile(file) { return fxFileType(file).startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(fxFileName(file)); }
  function fxUniqueFiles(files) {
    const seen = new Set();
    return files.map(fxNormalizeStoredFile).filter(file => { const key = `${file.name}\u0000${file.src}\u0000${file.size || 0}`; if (seen.has(key)) return false; seen.add(key); return true; });
  }
  function fxNormalizeDetails(details) {
    if (!details.custom || Array.isArray(details.custom) || typeof details.custom !== "object") details.custom = {};
    if (!details.files || Array.isArray(details.files) || typeof details.files !== "object") details.files = {};
    if (!details.fieldOrder || Array.isArray(details.fieldOrder) || typeof details.fieldOrder !== "object") details.fieldOrder = {};
    if (!details.fieldMedia || Array.isArray(details.fieldMedia) || typeof details.fieldMedia !== "object") details.fieldMedia = {};
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
      const count = qr.getModuleCount(); const cells = []; const widthMm = Number(options.width) || Number.parseFloat(options.size) || 25; const heightMm = Number(options.height) || widthMm; const viewSize = count + 8;
      for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) cells.push(`<rect x="${col + 4}" y="${row + 4}" width="1" height="1"/>`);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${viewSize} ${viewSize}" preserveAspectRatio="xMidYMid meet" style="background:#fff"><rect width="100%" height="100%" fill="white"/><g fill="black">${cells.join("")}</g></svg>`;
    }
    throw new Error("标准二维码组件未加载，无法生成可扫码二维码");
  }

  function fxDownloadQrPackage(order) {
    const [startCode] = order.range.split("–"); const prefix = startCode.match(/^[A-Z]+/)?.[0] || "QR"; const start = Number(startCode.replace(/\D/g, ""));
    const width = Number(order.customWidth) || Number.parseFloat(order.size) || 25; const height = Number(order.customHeight) || width; const sizeLabel = order.size || `${width} × ${height} mm`;
    const allocations = fxCodeBatchAllocations(order);
    const allocationStatus = fxCodeBatchAllocationStatus(order);
    const manifest = ["序列号,批次号,分配状态,订单号,客户名称", ...Array.from({ length: order.total }, (_, i) => {
      const serial = fxSerial(prefix, start + i);
      const allocation = allocations.find(item => fxCodeInRange(serial, item.range));
      return `${serial},${order.no},${allocation ? "已分配" : "未分配"},${allocation?.no || ""},${allocation?.customer || ""}`;
    })].join("\n");
    const samples = order.total; const entries = [
      { name: "manifest.csv", data: `\ufeff${manifest}` },
      { name: "README.txt", data: `码段批次：${order.no}\n分配状态：${allocationStatus}\n已分配：${fxCodeBatchAllocatedAmount(order)}\n剩余库存：${fxCodeBatchAvailableAmount(order)}\n码量：${order.total}\n序列范围：${order.range}\n尺寸：${sizeLabel}\n压缩包仅包含二维码核心矩阵 SVG 和完整序列清单，不包含标签模板或额外码样式。序列号保存在 SVG 文件名和 manifest.csv 中，不绘制在二维码图形内。` },
      ...Array.from({ length: samples }, (_, i) => { const code = fxSerial(prefix, start + i); return { name: `codes/${code}.svg`, data: fxQrSvg(code, undefined, { width, height, size: order.size }) }; }),
    ];
    fxDownloadBlob(`${order.no}_二维码核心区块.zip`, new Blob([fxZip(entries)], { type: "application/zip" }));
  }
