import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const pages = [
  ["inicio", "https://imagenesypostales.com/"],
  ["herramientas", "https://imagenesypostales.com/herramientas/"],
  ["crear", "https://imagenesypostales.com/crear/"],
  ["frases", "https://imagenesypostales.com/frases/"],
  ["postales", "https://imagenesypostales.com/postales/"],
];
const viewports = [
  { name: "mobile-390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "tablet-768", width: 768, height: 1024, isMobile: false, hasTouch: true },
];

await mkdir("reports/mobile-visual", { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failed = false;

try {
  for (const [slug, url] of pages) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.isMobile ? 2 : 1,
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", error => pageErrors.push(error.message));

      let status = null;
      let navigationError = null;
      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        status = response?.status() ?? null;
        await page.waitForTimeout(1000);
      } catch (error) {
        navigationError = error.message;
      }

      const layout = await page.evaluate(() => {
        const nav = document.querySelector(".top-nav");
        const links = nav ? [...nav.querySelectorAll("a")] : [];
        return {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body?.scrollWidth ?? null,
          h1Count: document.querySelectorAll("h1").length,
          navFound: Boolean(nav),
          navClientWidth: nav?.clientWidth ?? null,
          navScrollWidth: nav?.scrollWidth ?? null,
          navLinkCount: links.length,
          smallestNavLinkHeight: links.length ? Math.min(...links.map(a => a.getBoundingClientRect().height)) : null,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      }).catch(() => ({
        viewportWidth: viewport.width,
        documentWidth: null,
        bodyWidth: null,
        h1Count: 0,
        navFound: false,
        navClientWidth: null,
        navScrollWidth: null,
        navLinkCount: 0,
        smallestNavLinkHeight: null,
        horizontalOverflow: true,
      }));

      const failures = [];
      if (navigationError) failures.push("navegación fallida: " + navigationError);
      if (status !== null && status >= 400) failures.push("HTTP " + status);
      if (layout.horizontalOverflow) failures.push("desbordamiento horizontal de la página");
      if (!layout.navFound) failures.push("no se encontró .top-nav");
      if (layout.h1Count !== 1) failures.push("cantidad de H1 distinta de 1 (" + layout.h1Count + ")");
      if (viewport.width === 390 && layout.navFound && layout.smallestNavLinkHeight < 43.5) {
        failures.push("enlace del menú móvil menor de 44 px");
      }
      if (pageErrors.length) failures.push("errores JavaScript: " + pageErrors.join(" | "));

      const screenshotPath = `reports/mobile-visual/${slug}-${viewport.name}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
      results.push({ page: slug, url, viewport: viewport.name, status, ...layout, pageErrors, failures, screenshot: screenshotPath });
      if (failures.length) failed = true;
      console.log(`${failures.length ? "FAIL" : "PASS"} ${slug} ${viewport.name}: ${failures.join("; ") || "sin problemas detectados"}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile("reports/mobile-visual/results.json", JSON.stringify(results, null, 2) + "\n");
console.log(`Resultado: ${results.length} combinaciones de página y viewport; ${results.filter(r => r.failures.length).length} con incidencias.`);
if (failed) process.exit(1);
