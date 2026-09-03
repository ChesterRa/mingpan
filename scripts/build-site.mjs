import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const sourceDir = path.join(rootDir, "site-src");
const outputDir = path.join(rootDir, "site");

const ORIGIN = "https://mingpan.bzwai.com";
const ENDPOINT = `${ORIGIN}/mcp`;
const SOURCE_URL = "https://github.com/ChesterRa/mingpan";
const BAZIWEI_URL = "https://bzwai.com";
const manifest = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const VERSION = manifest.version;

const localeDefinitions = [
  { id: "zh-TW", href: "/", label: "繁體中文", file: "zh-TW.json" },
  { id: "zh-CN", href: "/zh-CN/", label: "简体中文", file: "zh-CN.json" },
  { id: "en", href: "/en/", label: "English", file: "en.json" },
  { id: "ja", href: "/ja/", label: "日本語", file: "ja.json" },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLanguageMenu(currentLocale, label) {
  const links = localeDefinitions
    .map((locale) => {
      const current = locale.id === currentLocale;
      return `<a href="${locale.href}" hreflang="${locale.id}" lang="${locale.id}"${current ? ' aria-current="page"' : ""}>${escapeHtml(locale.label)}</a>`;
    })
    .join("");

  return `
    <details class="language-menu">
      <summary aria-label="${escapeHtml(label)}">
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.7 5.5 3.7 9S14.4 18.5 12 21c-2.4-2.5-3.7-5.5-3.7-9S9.6 5.5 12 3Z"/></svg>
        <span>${escapeHtml(localeDefinitions.find((locale) => locale.id === currentLocale)?.label ?? currentLocale)}</span>
        <svg class="chevron" aria-hidden="true" viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg>
      </summary>
      <div class="language-menu__items">${links}</div>
    </details>`;
}

function renderPrinciples(items) {
  return items
    .map((item, index) => `
      <article class="principle-card">
        <span class="principle-card__index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </article>`)
    .join("");
}

function renderCapabilities(items) {
  return items
    .map((item) => `
      <article class="capability-card">
        <div class="capability-card__top">
          <span class="capability-card__mark" aria-hidden="true">${escapeHtml(item.mark)}</span>
          <span class="capability-card__count">${escapeHtml(item.count)}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </article>`)
    .join("");
}

function renderStats(items) {
  return items
    .map((item) => `
      <div class="stat">
        <strong>${escapeHtml(item.value)}</strong>
        <span>${escapeHtml(item.label)}</span>
      </div>`)
    .join("");
}

function renderExamples(items) {
  return items
    .map((item) => `<li><span aria-hidden="true">→</span><span>${escapeHtml(item)}</span></li>`)
    .join("");
}

function renderEvidence(evidence) {
  if (!evidence) return "";
  const steps = evidence.steps.map((step, index) => {
    const isCode = /^[a-z_]+\(/m.test(step.content || "");
    return `
      <div class="evidence-step" data-role="${escapeHtml(step.role.toLowerCase())}">
        <div class="evidence-step__header">
          <span class="evidence-step__num" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
          <span class="evidence-step__tag">${escapeHtml(step.tag)}</span>
          <h4 class="evidence-step__title">${escapeHtml(step.title)}</h4>
        </div>
        <div class="evidence-step__body">
          <pre class="evidence-step__text${isCode ? " evidence-step__text--code" : ""}"><code>${escapeHtml(step.content)}</code></pre>
        </div>
      </div>`;
  }).join("");

  return `
    <section class="section section--tinted" id="evidence">
      <div class="shell section-heading">
        <p class="eyebrow">${escapeHtml(evidence.eyebrow)}</p>
        <h2>${escapeHtml(evidence.title)}</h2>
        <p>${escapeHtml(evidence.description)}</p>
      </div>
      <div class="shell evidence-wrapper">
        <div class="evidence-flow">${steps}</div>
        <div class="evidence-contrast">
          <div class="contrast-card contrast-card--bad">
            <div class="contrast-card__badge">✕ ${escapeHtml(evidence.contrast.badTitle)}</div>
            <p>${escapeHtml(evidence.contrast.badDesc)}</p>
          </div>
          <div class="contrast-card contrast-card--good">
            <div class="contrast-card__badge">✓ ${escapeHtml(evidence.contrast.goodTitle)}</div>
            <p>${escapeHtml(evidence.contrast.goodDesc)}</p>
          </div>
        </div>
      </div>
    </section>`;
}

const COPY_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
const STDIO_COMMAND = "npx -y mingpan";

function renderConnect(connect, primaryCta) {
  return `
    <section class="section" id="connect">
      <div class="shell section-heading">
        <p class="eyebrow">${escapeHtml(connect.eyebrow)}</p>
        <h2>${escapeHtml(connect.title)}</h2>
        <p>${escapeHtml(connect.description)}</p>
      </div>
      <div class="shell connect-forms">
        <article class="connect-form connect-form--primary">
          <div class="connect-form__head">
            <h3>${escapeHtml(connect.remote.title)}</h3>
            <span class="connect-form__tag">Streamable HTTP</span>
          </div>
          <button class="endpoint-value" type="button" data-copy-endpoint aria-label="${escapeHtml(primaryCta)}">
            <code>${ENDPOINT}</code>
            ${COPY_ICON}
          </button>
          <p>${escapeHtml(connect.remote.description)}</p>
        </article>
        <article class="connect-form">
          <div class="connect-form__head">
            <h3>${escapeHtml(connect.local.title)}</h3>
            <span class="connect-form__tag">stdio</span>
          </div>
          <button class="endpoint-value" type="button" data-copy-text="${STDIO_COMMAND}" data-copied-label="${escapeHtml(connect.local.copied)}" aria-label="${escapeHtml(connect.local.copy)}">
            <code>${STDIO_COMMAND}</code>
            ${COPY_ICON}
          </button>
          <p>${escapeHtml(connect.local.description)}</p>
        </article>
      </div>
      <p class="shell connect-note">${escapeHtml(connect.note)} <a href="${SOURCE_URL}#readme" rel="noreferrer">${escapeHtml(connect.docsCta)}<span aria-hidden="true"> ↗</span></a></p>
    </section>`;
}

function renderPage(content) {
  const canonicalUrl = `${ORIGIN}${content.path === "/" ? "" : content.path.replace(/\/$/, "")}`;
  const alternateLinks = localeDefinitions
    .map((locale) => `<link rel="alternate" hreflang="${locale.id}" href="${ORIGIN}${locale.href === "/" ? "" : locale.href.replace(/\/$/, "")}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}">`)
    .join("\n    ");
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Mingpan",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: ORIGIN,
    description: content.meta.description,
    softwareVersion: VERSION,
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    codeRepository: SOURCE_URL,
    creator: { "@type": "Organization", name: "BaziWei", url: BAZIWEI_URL },
  }).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="${content.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f5f4ed">
  <meta name="description" content="${escapeHtml(content.meta.description)}">
  <meta name="robots" content="index,follow">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'">
  <title>${escapeHtml(content.meta.title)}</title>
  <link rel="canonical" href="${canonicalUrl}">
  ${alternateLinks}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Mingpan">
  <meta property="og:title" content="${escapeHtml(content.meta.title)}">
  <meta property="og:description" content="${escapeHtml(content.meta.description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">${structuredData}</script>
  <script src="/site.js" defer></script>
</head>
<body data-copy-success="${escapeHtml(content.copy.success)}" data-copy-failure="${escapeHtml(content.copy.failure)}">
  <a class="skip-link" href="#main">${escapeHtml(content.skipLink)}</a>

  <header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="${content.path}" aria-label="Mingpan">
        <span class="brand-mark" aria-hidden="true">命</span>
        <span class="brand-name"><strong>Mingpan</strong><small>by BaziWei</small></span>
      </a>
      <nav class="desktop-nav" aria-label="${escapeHtml(content.nav.label)}">
        <a href="#evidence">${escapeHtml(content.nav.evidence)}</a>
        <a href="#principles">${escapeHtml(content.nav.principles)}</a>
        <a href="#capabilities">${escapeHtml(content.nav.capabilities)}</a>
        <a href="#connect">${escapeHtml(content.nav.connect)}</a>
      </nav>
      <div class="header-actions">
        <a class="source-link" href="${SOURCE_URL}" rel="noreferrer">GitHub<span aria-hidden="true">↗</span></a>
        ${renderLanguageMenu(content.lang, content.languageLabel)}
      </div>
    </div>
  </header>

  <main id="main">
    <section class="hero">
      <div class="hero-orbit hero-orbit--one" aria-hidden="true"></div>
      <div class="hero-orbit hero-orbit--two" aria-hidden="true"></div>
      <div class="shell hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">${escapeHtml(content.hero.eyebrow)}</p>
          <h1>${escapeHtml(content.hero.title)}</h1>
          <p class="hero-lede">${escapeHtml(content.hero.description)}</p>
          <div class="hero-actions">
            <button class="button button--primary" type="button" data-copy-endpoint>
              <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
              <span>${escapeHtml(content.hero.primaryCta)}</span>
            </button>
            <a class="button button--secondary" href="${SOURCE_URL}" rel="noreferrer">${escapeHtml(content.hero.secondaryCta)}<span aria-hidden="true">↗</span></a>
          </div>
          <p class="hero-note">${escapeHtml(content.hero.note)}</p>
        </div>

        <aside class="endpoint-panel" aria-label="${escapeHtml(content.endpoint.label)}">
          <div class="endpoint-panel__head">
            <span><i aria-hidden="true"></i>${escapeHtml(content.endpoint.status)}</span>
            <span>v${escapeHtml(VERSION)}</span>
          </div>
          <div class="endpoint-panel__body">
            <p class="endpoint-label">${escapeHtml(content.endpoint.label)}</p>
            <button class="endpoint-value" type="button" data-copy-endpoint aria-label="${escapeHtml(content.hero.primaryCta)}">
              <code>${ENDPOINT}</code>
              <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
            </button>
            <div class="endpoint-flow" aria-label="${escapeHtml(content.endpoint.flowLabel)}">
              <span>${escapeHtml(content.endpoint.input)}</span><b aria-hidden="true">→</b><span>Mingpan</span><b aria-hidden="true">→</b><span>${escapeHtml(content.endpoint.output)}</span>
            </div>
            <ul class="endpoint-checks">
              ${content.endpoint.checks.map((item) => `<li><span aria-hidden="true">✓</span>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </aside>
      </div>
      <div class="shell stats" aria-label="${escapeHtml(content.statsLabel)}">${renderStats(content.stats)}</div>
    </section>

    ${renderEvidence(content.evidence)}

    <section class="section" id="principles">
      <div class="shell section-heading section-heading--split">
        <div>
          <p class="eyebrow">${escapeHtml(content.principles.eyebrow)}</p>
          <h2>${escapeHtml(content.principles.title)}</h2>
        </div>
        <p>${escapeHtml(content.principles.description)}</p>
      </div>
      <div class="shell principle-grid">${renderPrinciples(content.principles.items)}</div>
    </section>

    <section class="section section--tinted" id="capabilities">
      <div class="shell section-heading">
        <p class="eyebrow">${escapeHtml(content.capabilities.eyebrow)}</p>
        <h2>${escapeHtml(content.capabilities.title)}</h2>
        <p>${escapeHtml(content.capabilities.description)}</p>
      </div>
      <div class="shell capability-grid">${renderCapabilities(content.capabilities.items)}</div>
      <p class="shell calendar-note"><span aria-hidden="true">＋</span>${escapeHtml(content.capabilities.calendarNote)}</p>
    </section>

    ${renderConnect(content.connect, content.hero.primaryCta)}

    <section class="section section--tinted" id="prompts">
      <div class="shell prompt-panel">
        <div>
          <p class="eyebrow">${escapeHtml(content.examples.eyebrow)}</p>
          <h3>${escapeHtml(content.examples.title)}</h3>
        </div>
        <ul>${renderExamples(content.examples.items)}</ul>
      </div>
    </section>

    <section class="relationship">
      <div class="shell relationship-inner">
        <div>
          <p class="eyebrow eyebrow--light">Mingpan × BaziWei</p>
          <h2>${escapeHtml(content.relationship.title)}</h2>
          <p>${escapeHtml(content.relationship.description)}</p>
        </div>
        <a class="button button--light" href="${BAZIWEI_URL}">${escapeHtml(content.relationship.cta)}<span aria-hidden="true">→</span></a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="shell footer-inner">
      <div class="footer-brand"><span class="brand-mark" aria-hidden="true">命</span><div><strong>Mingpan</strong><p>${escapeHtml(content.footer.tagline)}</p></div></div>
      <div class="footer-links">
        <a href="${SOURCE_URL}" rel="noreferrer">GitHub</a>
        <a href="${BAZIWEI_URL}">BaziWei</a>
        <span>Apache-2.0</span>
      </div>
    </div>
  </footer>
  <p class="copy-status" role="status" aria-live="polite" aria-atomic="true"></p>
</body>
</html>`;
}

async function loadLocale(definition) {
  const raw = await readFile(path.join(sourceDir, "locales", definition.file), "utf8");
  const content = JSON.parse(raw);
  if (content.lang !== definition.id || content.path !== definition.href) {
    throw new Error(`Locale metadata mismatch in ${definition.file}`);
  }
  return content;
}

if (path.basename(outputDir) !== "site" || path.dirname(outputDir) !== rootDir) {
  throw new Error(`Refusing to rewrite unexpected output directory: ${outputDir}`);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const asset of ["styles.css", "site.js", "favicon.svg"]) {
  await cp(path.join(sourceDir, asset), path.join(outputDir, asset));
}

for (const definition of localeDefinitions) {
  const content = await loadLocale(definition);
  const localeOutput = definition.href === "/"
    ? outputDir
    : path.join(outputDir, definition.href.replaceAll("/", ""));
  await mkdir(localeOutput, { recursive: true });
  await writeFile(path.join(localeOutput, "index.html"), renderPage(content), "utf8");
}

await writeFile(path.join(outputDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`, "utf8");
await writeFile(
  path.join(outputDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${localeDefinitions.map((locale) => `\n  <url><loc>${ORIGIN}${locale.href === "/" ? "" : locale.href.replace(/\/$/, "")}</loc></url>`).join("")}\n</urlset>\n`,
  "utf8"
);

console.log(`Built Mingpan open-source project site for ${localeDefinitions.length} locales.`);
