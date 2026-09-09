#!/usr/bin/env node
/**
 * One-shot snapshot generator for version-0.5.0 docs.
 *
 * Reads README + docs/ + demo/ from a skardi checkout at the v0.5.0 tag and
 * writes a complete versioned_docs/version-0.5.0/ tree.
 *
 * Point it at the checkout with SKARDI_ROOT; it defaults to a sibling
 * `skardi` directory. Earlier snapshot scripts hard-coded one machine's
 * absolute path, which meant nobody else could re-run them.
 *
 *   SKARDI_ROOT=/path/to/skardi node scripts/snapshot-v0.5.0.mjs
 *
 * The doc website is the canonical home for docs, so links are rewritten
 * to internal Docusaurus paths whenever a mapping exists; references to
 * source code, ad-hoc YAML files, or anything else not surfaced on the
 * site have their link wrapper stripped and only the link text is kept.
 *
 * Run once when cutting the v0.5.0 release; subsequent edits to the
 * snapshot should be made directly in versioned_docs/version-0.5.0/.
 *
 * Notable shape changes vs v0.4.0:
 *   - README was restructured: `What is Skardi?` / `Why an agent data plane?`
 *     / `What's already in the box` are gone; `Why Skardi?`,
 *     `Get started in 60 seconds`, `What is an "agent data plane"?` and
 *     `When does a uniform data plane earn its keep?` take their place.
 *   - The CLI is a thin HTTP client — every path now starts a skardi-server.
 *   - New data sources: ClickHouse, DynamoDB, InfluxDB 3, Open Connector
 *     (GitHub and Slack packs).
 *   - New features: documents source (`docs/documents.md`) and the
 *     `llm_extract` UDF (`docs/llm_extract.md`).
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKARDI = resolve(process.env.SKARDI_ROOT ?? join(__dirname, '../../../skardi'));
const DEST = join(__dirname, '../versioned_docs/version-0.5.0');
const STATIC_IMG = join(__dirname, '../static/img');

if (!existsSync(join(SKARDI, 'README.md'))) {
  console.error(`No skardi checkout at ${SKARDI}. Set SKARDI_ROOT.`);
  process.exit(1);
}

// Maps a normalized source path (relative to skardi root, no leading ./)
// to an internal Docusaurus URL. Entries with trailing /README.md and the
// directory form both resolve to the same destination.
const DOC_MAP = {
  'README.md': '/docs/intro',
  'docs/cli.md': '/docs/cli',
  'docs/server.md': '/docs/server',
  'docs/pipelines.md': '/docs/pipelines',
  'docs/jobs.md': '/docs/jobs',
  'docs/agent_data_plane.md': '/docs/agent-data-plane',
  'docs/spark_for_agents.md': '/docs/agent-data-plane',
  'docs/postgres/README.md': '/docs/data-sources/postgres',
  'docs/postgres': '/docs/data-sources/postgres',
  'docs/mysql/README.md': '/docs/data-sources/mysql',
  'docs/mysql': '/docs/data-sources/mysql',
  'docs/sqlite/README.md': '/docs/data-sources/sqlite',
  'docs/sqlite': '/docs/data-sources/sqlite',
  'docs/mongo/README.md': '/docs/data-sources/mongo',
  'docs/mongo': '/docs/data-sources/mongo',
  'docs/redis/README.md': '/docs/data-sources/redis',
  'docs/redis': '/docs/data-sources/redis',
  'docs/dynamodb/README.md': '/docs/data-sources/dynamodb',
  'docs/dynamodb': '/docs/data-sources/dynamodb',
  'docs/seekdb/README.md': '/docs/data-sources/seekdb',
  'docs/seekdb': '/docs/data-sources/seekdb',
  'docs/clickhouse/README.md': '/docs/data-sources/clickhouse',
  'docs/clickhouse': '/docs/data-sources/clickhouse',
  'docs/iceberg/README.md': '/docs/data-sources/iceberg',
  'docs/iceberg': '/docs/data-sources/iceberg',
  'docs/lance/README.md': '/docs/data-sources/lance',
  'docs/lance': '/docs/data-sources/lance',
  'docs/influxdb/README.md': '/docs/data-sources/influxdb',
  'docs/influxdb': '/docs/data-sources/influxdb',
  'docs/open-connector.md': '/docs/data-sources/open-connector',
  'docs/open-connector/README.md': '/docs/data-sources/open-connector',
  'docs/open-connector': '/docs/data-sources/open-connector',
  'docs/open-connector-github.md': '/docs/data-sources/open-connector-github',
  'docs/open-connector-slack.md': '/docs/data-sources/open-connector-slack',
  'docs/S3_USAGE.md': '/docs/data-sources/s3',
  'docs/federated-queries.md': '/docs/features/federated-queries',
  'docs/catalog.md': '/docs/features/catalog',
  'docs/semantics.md': '/docs/features/semantics',
  'docs/chunk.md': '/docs/features/chunk',
  'docs/documents.md': '/docs/features/documents',
  'docs/llm_extract.md': '/docs/features/llm-extract',
  'docs/onnx_predict.md': '/docs/features/onnx-inference',
  'docs/observability.md': '/docs/features/observability',
  'docs/auth/README.md': '/docs/features/auth',
  'docs/auth': '/docs/features/auth',
  'docs/embeddings/README.md': '/docs/features/embeddings/overview',
  'docs/embeddings': '/docs/features/embeddings/overview',
  'docs/embeddings/candle/README.md': '/docs/features/embeddings/candle',
  'docs/embeddings/candle': '/docs/features/embeddings/candle',
  'docs/embeddings/gguf/README.md': '/docs/features/embeddings/gguf',
  'docs/embeddings/gguf': '/docs/features/embeddings/gguf',
  'docs/embeddings/remote/README.md': '/docs/features/embeddings/remote',
  'docs/embeddings/remote': '/docs/features/embeddings/remote',
  'demo/simple_backend/README.md': '/docs/demos/simple-backend',
  'demo/simple_backend': '/docs/demos/simple-backend',
  'demo/llm_wiki/README.md': '/docs/demos/llm-wiki',
  'demo/llm_wiki': '/docs/demos/llm-wiki',
  'demo/rag/README.md': '/docs/demos/rag',
  'demo/rag': '/docs/demos/rag',
  'demo/movie_recommendation/README.md': '/docs/demos/movie-recommendation',
  'demo/movie_recommendation': '/docs/demos/movie-recommendation',
};

// Asset paths copied into website/static/img/.
const ASSET_MAP = {
  'asset/logo.png': '/skardi-docs/img/skardi-logo.png',
  'asset/architecture.png': '/skardi-docs/img/skardi-architecture.png',
  'asset/architecture-open-source.svg': '/skardi-docs/img/skardi-architecture-open-source.svg',
};

// Assets that must exist in static/img before the snapshot renders.
const ASSET_COPIES = [
  ['asset/architecture-open-source.svg', 'skardi-architecture-open-source.svg'],
];

function resolveRelative(baseDir, rel) {
  rel = rel.replace(/^\.\//, '');
  const [pathOnly, suffix = ''] = rel.split(/(?=[?#])/, 2);
  const parts = baseDir === '.' ? [] : baseDir.split('/').filter(Boolean);
  let r = pathOnly;
  while (r.startsWith('../')) {
    parts.pop();
    r = r.slice(3);
  }
  const joined = [...parts, r].filter(Boolean).join('/').replace(/^\/+/, '');
  return { path: joined, suffix };
}

function lookupDoc(normalized) {
  if (DOC_MAP[normalized]) return DOC_MAP[normalized];
  const noslash = normalized.replace(/\/$/, '');
  if (DOC_MAP[noslash]) return DOC_MAP[noslash];
  return null;
}

// Rewrite markdown links and inline HTML images. Resolves each relative
// target against the source file's directory, then either:
//   - rewrites it to a Docusaurus-internal path (DOC_MAP / ASSET_MAP), or
//   - drops the link wrapper and keeps only the visible text.
// Absolute URLs and bare anchors are left alone.
function rewriteContent(content, sourceDir) {
  content = content.replace(
    /^\[([^\]]+)\]:\s*(?!https?:\/\/)(?!#)([^\s]+).*$/gm,
    '',
  );

  content = content.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/)(?!#)([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_, alt, href) => {
      const { path } = resolveRelative(sourceDir, href);
      const asset = ASSET_MAP[path];
      if (asset) return `![${alt}](${asset})`;
      return '';
    },
  );

  content = content.replace(
    /\[([^\]]+)\]\((?!https?:\/\/)(?!#)([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_, text, href) => {
      const { path, suffix } = resolveRelative(sourceDir, href);
      const mapped = lookupDoc(path);
      if (mapped) return `[${text}](${mapped}${suffix})`;
      return text;
    },
  );

  content = content.replace(
    /<img\s+([^>]*?)src=["'](?!https?:\/\/)([^"']+)["']([^>]*?)\/?>/g,
    (_, before, src, after) => {
      const { path } = resolveRelative(sourceDir, src);
      const asset = ASSET_MAP[path];
      if (!asset) return '';
      const cleanedAfter = after.trim().replace(/\/$/, '').trim();
      const beforeTrim = before.trim();
      return `<img ${beforeTrim ? beforeTrim + ' ' : ''}src="${asset}"${cleanedAfter ? ' ' + cleanedAfter : ''} />`;
    },
  );

  content = content.replace(/<source\s+[^>]*\/?>(?:\s*<\/source>)?/g, '');
  content = content.replace(/<\/?picture>/g, '');

  // MDX is JSX: void elements written HTML-style (`<br>`, `<hr>`) are read as
  // unclosed tags and abort the build. Self-close them.
  content = content.replace(/<(br|hr)\s*>/gi, '<$1 />');

  // Stray `<placeholder>` tokens inside quoted prose (e.g. error messages
  // like "unsupported mode '<x>'") look like unclosed JSX to MDX. Escape
  // the brackets with backslashes so they render as literal text.
  content = content.replace(
    /(['"])<([a-zA-Z][a-zA-Z0-9_-]*)>(['"])/g,
    '$1\\<$2\\>$3',
  );

  const BARE_ANCHOR_FIXUPS = {
    '#building-from-source': '/docs/docker#building-from-source',
    '#supported-data-sources': '/docs/data-sources/overview',
    '#roadmap': '/docs/roadmap',
    '#public-roadmap': '/docs/roadmap',
    '#demo--examples': '/docs/demos/overview',
    '#docker': '/docs/docker',
    '#quick-start': '/docs/quick-start',
    '#cloud-sealos': '/docs/docker#cloud-sealos',
    '#skardi-server--online-serving--offline-jobs': '/docs/server',
  };
  content = content.replace(/\]\((#[^)\s]+)\)/g, (m, anchor) =>
    BARE_ANCHOR_FIXUPS[anchor] ? `](${BARE_ANCHOR_FIXUPS[anchor]})` : m,
  );

  content = content.replace(/\(\/docs\/intro#public-roadmap\)/g, '(/docs/roadmap)');
  content = content.replace(/\(\/docs\/intro#roadmap\)/g, '(/docs/roadmap)');

  // docs/jobs.md still points at a numbered section that the rewritten
  // agent_data_plane.md no longer has. Rather than guess which of the current
  // sections it meant, drop the anchor and land the reader on the page.
  content = content.replace(
    /\(\/docs\/agent-data-plane#4-trust-the-agent-but-make-writes-safe\)/g,
    '(/docs/agent-data-plane)',
  );

  return content;
}

function readSource(absPath) {
  return readFileSync(absPath, 'utf8');
}

function write(relPath, frontmatter, body) {
  const full = join(DEST, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, `---\n${frontmatter}\n---\n\n${body.trim()}\n`);
  console.log(`  wrote ${relPath}`);
}

function writeRaw(relPath, body) {
  const full = join(DEST, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body);
  console.log(`  wrote ${relPath}`);
}

function loadAndTransform(relSourcePath, { stripTopHeading = true } = {}) {
  const abs = join(SKARDI, relSourcePath);
  let content = readSource(abs);
  content = rewriteContent(content, dirname(relSourcePath));
  if (stripTopHeading) {
    content = content.replace(/^#\s+[^\n]+\n+/, '');
  }
  return content;
}

// ---------- Parse README.md into named sections ----------
const README = readSource(join(SKARDI, 'README.md'));
const sections = {};
{
  let heading = null;
  let lines = [];
  for (const line of README.split('\n')) {
    if (line.startsWith('## ')) {
      if (heading) sections[heading] = lines.join('\n').trimEnd();
      heading = line.slice(3).trim();
      lines = [];
    } else if (heading) {
      lines.push(line);
    }
  }
  if (heading) sections[heading] = lines.join('\n').trimEnd();
}

function stripDividers(text) {
  return text
    .replace(/^\s*---\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Fail loudly on a heading that no longer exists upstream. The v0.4.0 script
// returned '' for a missing section, which silently produced empty pages.
const missingSections = [];
function section(name) {
  if (!(name in sections)) {
    missingSections.push(name);
    return '';
  }
  return stripDividers(rewriteContent(sections[name], '.'));
}

// ---------- Reset destination ----------
rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

// ---------- Copy new assets ----------
for (const [src, destName] of ASSET_COPIES) {
  copyFileSync(join(SKARDI, src), join(STATIC_IMG, destName));
  console.log(`  copied static/img/${destName}`);
}

// ---------- Top-level pages ----------
// Intro carries the README's narrative arc: what problem Skardi solves, the
// one-paste install, the data-plane definition, and when a plane is worth it.
// The "Star the Repository" section is repo-side marketing and is dropped.
write(
  'intro.md',
  'sidebar_position: 1\nslug: /intro\ntitle: Intro',
  [
    '# Skardi',
    '',
    '<p align="center"><img src="/skardi-docs/img/skardi-logo.png" alt="Skardi" width="600" /></p>',
    '',
    '**Skardi is an open-source agent data plane** — parameterized SQL templates served as REST endpoints (and shell verbs) your agent calls as tools, turning *data autonomy* (letting the agent decide what to query and write) into a default you can govern.',
    '',
    '## Why Skardi?',
    '',
    section('Why Skardi?'),
    '',
    '## Get started in 60 seconds — install on Claude Code',
    '',
    section('Get started in 60 seconds — install on Claude Code'),
    '',
    '## What is an "agent data plane"?',
    '',
    section('What is an "agent data plane"?'),
    '',
    '## When does a uniform data plane earn its keep?',
    '',
    section('When does a uniform data plane earn its keep?'),
    '',
    '## Architecture',
    '',
    '<p align="center"><img src="/skardi-docs/img/skardi-architecture.png" alt="Skardi Architecture" width="800" /></p>',
  ].join('\n'),
);

write(
  'quick-start.md',
  'sidebar_position: 2\ntitle: Quick Start',
  `# Quick Start\n\n${section('Quick Start')}\n\n## Next Steps\n\n- [Skardi CLI](/docs/cli) — the full CLI reference.\n- [Skardi Server](/docs/server) — running the server and its HTTP surface.\n- [Pipelines](/docs/pipelines) — the online-serving primitive.\n- [Jobs](/docs/jobs) — the offline-batch peer.`,
);

write(
  'cli.md',
  'sidebar_position: 3\ntitle: Skardi CLI',
  `# Skardi CLI\n\n${loadAndTransform('docs/cli.md')}`,
);

write(
  'server.md',
  'sidebar_position: 4\ntitle: Skardi Server',
  `# Skardi Server\n\n${loadAndTransform('docs/server.md')}`,
);

write(
  'pipelines.md',
  'sidebar_position: 5\ntitle: Pipelines',
  `# Pipelines\n\n${loadAndTransform('docs/pipelines.md')}`,
);

write(
  'jobs.md',
  'sidebar_position: 6\ntitle: Offline Jobs',
  `# Offline Jobs\n\n${loadAndTransform('docs/jobs.md')}`,
);

write(
  'agent-data-plane.md',
  'sidebar_position: 7\ntitle: Agent Data Plane',
  `# Why an Agent Data Plane\n\n${loadAndTransform('docs/agent_data_plane.md')}`,
);

// v0.3.0 docs link to /docs/spark-for-agents with absolute paths, which fall
// through to whichever version is `lastVersion`. This stub keeps the URL
// resolvable; `unlisted: true` keeps it out of the sidebar.
writeRaw(
  'spark-for-agents.md',
  `---
title: Spark for Agents
slug: /spark-for-agents
unlisted: true
---

# Spark for Agents

This page has been renamed to **[Agent Data Plane](/docs/agent-data-plane)**.

The "Spark for Agents" framing is still the analogy the project leans on — one execution engine over every data source, the way Spark unified analytics over heterogeneous storage — but the canonical narrative now lives at the Agent Data Plane page. Older versions of the docs (\`0.3.0\` and below) still link to this page from their snapshots; this stub keeps those URLs resolvable.
`,
);

write(
  'docker.md',
  'sidebar_position: 11\ntitle: Docker & Deployment',
  `# Docker & Deployment\n\n## Docker\n\n${section('Docker')}\n\n## Cloud (Sealos)\n\n${section('Cloud (Sealos)')}\n\n## Building from Source\n\n${section('Building from Source')}`,
);

write(
  'roadmap.md',
  'sidebar_position: 12\ntitle: Roadmap',
  `# Roadmap\n\n${section('Roadmap')}`,
);

writeRaw('data-sources/_category_.json', JSON.stringify({ label: 'Data Sources', position: 8 }, null, 2) + '\n');
writeRaw('features/_category_.json', JSON.stringify({ label: 'Features', position: 9 }, null, 2) + '\n');
writeRaw('demos/_category_.json', JSON.stringify({ label: 'Demos', position: 10 }, null, 2) + '\n');

// ---------- Data Sources ----------
write(
  'data-sources/overview.md',
  'sidebar_position: 1\ntitle: Overview',
  `# Supported Data Sources\n\n${section('Supported Data Sources')}`,
);

const dataSources = [
  ['postgres', 'PostgreSQL', 'docs/postgres/README.md'],
  ['mysql', 'MySQL', 'docs/mysql/README.md'],
  ['sqlite', 'SQLite', 'docs/sqlite/README.md'],
  ['mongo', 'MongoDB', 'docs/mongo/README.md'],
  ['redis', 'Redis', 'docs/redis/README.md'],
  ['dynamodb', 'Amazon DynamoDB', 'docs/dynamodb/README.md'],
  ['seekdb', 'SeekDB', 'docs/seekdb/README.md'],
  ['clickhouse', 'ClickHouse', 'docs/clickhouse/README.md'],
  ['iceberg', 'Apache Iceberg', 'docs/iceberg/README.md'],
  ['lance', 'Lance', 'docs/lance/README.md'],
  ['influxdb', 'InfluxDB 3', 'docs/influxdb/README.md'],
];
dataSources.forEach(([slug, title, src], i) => {
  write(
    `data-sources/${slug}.md`,
    `sidebar_position: ${i + 2}\ntitle: ${title}`,
    `# ${title}\n\n${loadAndTransform(src)}`,
  );
});

write(
  'data-sources/s3.md',
  `sidebar_position: ${dataSources.length + 2}\ntitle: S3 / Object Stores`,
  `# S3 and Object Stores\n\n${loadAndTransform('docs/S3_USAGE.md')}`,
);

// Open Connector: gateway overview plus one page per shipped source pack.
const openConnector = [
  ['open-connector', 'Open Connector', 'docs/open-connector.md'],
  ['open-connector-github', 'Open Connector — GitHub', 'docs/open-connector-github.md'],
  ['open-connector-slack', 'Open Connector — Slack', 'docs/open-connector-slack.md'],
];
openConnector.forEach(([slug, title, src], i) => {
  write(
    `data-sources/${slug}.md`,
    `sidebar_position: ${dataSources.length + 3 + i}\ntitle: ${title}`,
    `# ${title}\n\n${loadAndTransform(src)}`,
  );
});

// ---------- Features ----------
// Embeddings is a nested category at sidebar_position 4, so the flat feature
// pages skip that slot.
const features = [
  ['federated-queries', 'Federated Queries', 'docs/federated-queries.md', 1],
  ['catalog', 'Catalog Mode', 'docs/catalog.md', 2],
  ['semantics', 'Catalog Semantics', 'docs/semantics.md', 3],
  ['chunk', 'Text Chunking', 'docs/chunk.md', 5],
  ['documents', 'Document Ingestion', 'docs/documents.md', 6],
  ['llm-extract', 'LLM Extraction', 'docs/llm_extract.md', 7],
  ['onnx-inference', 'ONNX Inference', 'docs/onnx_predict.md', 8],
  ['observability', 'Observability', 'docs/observability.md', 9],
  ['auth', 'Authentication', 'docs/auth/README.md', 10],
];
features.forEach(([slug, title, src, pos]) => {
  write(
    `features/${slug}.md`,
    `sidebar_position: ${pos}\ntitle: ${title}`,
    `# ${title}\n\n${loadAndTransform(src)}`,
  );
});

writeRaw('features/embeddings/_category_.json', JSON.stringify({ label: 'Embeddings', position: 4 }, null, 2) + '\n');
write(
  'features/embeddings/overview.md',
  'sidebar_position: 1\ntitle: Overview',
  `# Embedding Inference\n\n${loadAndTransform('docs/embeddings/README.md')}`,
);
const embeddings = [
  ['candle', 'Candle (local SafeTensors)', 'docs/embeddings/candle/README.md'],
  ['gguf', 'GGUF (llama.cpp)', 'docs/embeddings/gguf/README.md'],
  ['remote', 'Remote APIs', 'docs/embeddings/remote/README.md'],
];
embeddings.forEach(([slug, title, src], i) => {
  write(
    `features/embeddings/${slug}.md`,
    `sidebar_position: ${i + 2}\ntitle: ${title}`,
    `# ${title}\n\n${loadAndTransform(src)}`,
  );
});

// ---------- Demos ----------
write(
  'demos/overview.md',
  'sidebar_position: 1\ntitle: Overview',
  `# Demos & Examples\n\n${section('Demo & Examples')}`,
);

const demos = [
  ['simple-backend', 'Simple Backend', 'demo/simple_backend/README.md'],
  ['llm-wiki', 'LLM Wiki Q&A', 'demo/llm_wiki/README.md'],
  ['rag', 'RAG Pipeline', 'demo/rag/README.md'],
  ['movie-recommendation', 'Movie Recommendation', 'demo/movie_recommendation/README.md'],
];
demos.forEach(([slug, title, src], i) => {
  write(
    `demos/${slug}.md`,
    `sidebar_position: ${i + 2}\ntitle: ${title}`,
    `# ${title}\n\n${loadAndTransform(src)}`,
  );
});

if (missingSections.length) {
  console.error(`\nREADME sections not found: ${missingSections.join(', ')}`);
  process.exit(1);
}

console.log(`\nSnapshot written to ${DEST}`);
