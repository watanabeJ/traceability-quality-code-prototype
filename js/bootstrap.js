const projectRoot = new URL("../", import.meta.url);
const assetVersion = "business-catalog-20261102-04";
let bootPromise = null;

function assetUrl(relativePath) {
  const url = new URL(relativePath, projectRoot);
  url.searchParams.set("v", assetVersion);
  return url.href;
}

function preloadClassicScripts(relativePaths) {
  return Promise.all(relativePaths.map(relativePath => new Promise(resolve => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "script";
    link.href = assetUrl(relativePath);
    link.onload = resolve;
    link.onerror = resolve;
    document.head.appendChild(link);
  })));
}

function loadClassicScript(relativePath) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = assetUrl(relativePath);
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${relativePath}`));
    document.head.appendChild(script);
  });
}

async function loadClassicScripts(relativePaths) {
  await preloadClassicScripts(relativePaths);
  for (const relativePath of relativePaths) {
    if (relativePath === "js/core/enhanced-runtime.js") {
      for (const [name, list] of Object.entries({ customers, orders, codeBatches, products, bindRequests, withdrawals, messages })) {
        const saved = fxStore.get(fxBusinessStorage[name], null);
        if (Array.isArray(saved)) list.splice(0, list.length, ...saved);
      }
    }
    await loadClassicScript(relativePath);
    if (relativePath === "js/core/demo-fixtures.js") {
      try { await traceInstallDemoFixtures(); }
      catch (error) {
        window.TRACE_DEMO_ERROR = error.message;
        console.error("初始业务数据加载失败", error);
      }
    }
    if (relativePath === "js/core/business-sample-data.js") {
      try { await traceRefreshBusinessSamples(); }
      catch (error) {
        window.TRACE_DEMO_ERROR = error.message;
        console.error("业务资料更新失败", error);
      }
      if (document.body.dataset.entryPortal === "scan" && document.body.dataset.scanStatus !== "preview") {
        const url = new URL(location.href);
        const kind = { active: "active", inactive: "unbound", reset: "reset" }[document.body.dataset.scanStatus];
        const sample = window.TRACE_BUSINESS_DATA?.samples?.[kind];
        if (!url.searchParams.has("serial") && url.searchParams.get("preview") !== "1" && sample?.code) {
          url.searchParams.set("serial", sample.code);
          url.searchParams.delete("demo");
          history.replaceState(history.state, "", url);
        }
      }
      if (configScanSerial()) await window.omResolveScan();
    }
  }
}
function configScanSerial() { return document.body.dataset.entryPortal === "scan" && /^\d{16}$/.test(new URLSearchParams(location.search).get("serial") || ""); }

export function bootstrapPage(config) {
  if (bootPromise) return bootPromise;
  document.body.dataset.entryPortal = config.portal;
  document.body.dataset.initialPage = config.page;
  if (config.scanStatus) document.body.dataset.scanStatus = config.scanStatus;
  document.title = `溯源质控码平台 · ${config.title}`;
  window.TRACE_PAGE_CONFIG = Object.freeze({ ...config });
  window.PROTOTYPE_ANNOTATOR_CONFIG = {
    ...(window.PROTOTYPE_ANNOTATOR_CONFIG || {}),
    mermaidSources: [new URL("vendor/mermaid.min.js", projectRoot).href],
    dataUrl: new URL("prototype-annotator/annotations.json", projectRoot).href
  };

  const appScripts = [
    "vendor/lucide.min.js",
    "vendor/qrcode-generator.min.js",
    "js/core/config.js",
    "js/components/ui.js",
    "js/views/base.js",
    "js/core/runtime.js",
    "js/core/domain.js",
    "js/components/application.js",
    "js/views/business.js",
    "js/core/customer-management.js",
    "js/core/category-management.js",
    "js/core/order-management.js",
    "js/core/demo-fixtures.js",
    "js/core/business-sample-data.js",
    "js/core/order-statistics.js",
    "js/views/scan.js",
    "js/core/enhanced-runtime.js",
    "js/core/code-query.js"
  ];
  const annotationScripts = [
    "prototype-annotator/runtime/markdown-renderer.js",
    "prototype-annotator/runtime/mermaid-loader.js",
    "prototype-annotator/runtime/prototype-annotator.js"
  ];

  bootPromise = loadClassicScripts(appScripts).then(() => {
    if (window.TRACE_DEMO_ERROR) showToast(`业务数据未加载：${window.TRACE_DEMO_ERROR}`);
    window.TRACE_APP_READY = true;
    document.documentElement.dataset.appReady = "true";
    window.TRACE_ANNOTATOR_BOOT = loadClassicScripts(annotationScripts).catch(error => console.warn(error));
    return config;
  });
  window.TRACE_APP_BOOT = bootPromise;
  return bootPromise;
}
