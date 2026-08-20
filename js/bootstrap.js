const projectRoot = new URL("../", import.meta.url);
const assetVersion = "v6q9x3e63";
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
  for (const relativePath of relativePaths) await loadClassicScript(relativePath);
}

export function bootstrapPage(config) {
  if (bootPromise) return bootPromise;
  document.body.dataset.entryPortal = config.portal;
  document.body.dataset.initialPage = config.page;
  if (config.scanStatus) document.body.dataset.scanStatus = config.scanStatus;
  document.title = `溯源质控码平台 · ${config.title}`;
  window.TRACE_PAGE_CONFIG = Object.freeze({ ...config });
  window.PROTOTYPE_ANNOTATOR_CONFIG = {
    ...(window.PROTOTYPE_ANNOTATOR_CONFIG || {}),
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
    "js/views/scan.js",
    "js/core/enhanced-runtime.js"
  ];
  const annotationScripts = [
    "prototype-annotator/runtime/markdown-renderer.js",
    "prototype-annotator/runtime/mermaid-loader.js",
    "prototype-annotator/runtime/prototype-annotator.js"
  ];

  bootPromise = loadClassicScripts(appScripts).then(() => {
    window.TRACE_APP_READY = true;
    document.documentElement.dataset.appReady = "true";
    window.TRACE_ANNOTATOR_BOOT = loadClassicScripts(annotationScripts).catch(error => console.warn(error));
    return config;
  });
  window.TRACE_APP_BOOT = bootPromise;
  return bootPromise;
}
