#!/usr/bin/env node

/**
 * sync-translations.mjs
 *
 * Syncs translated & untranslated docs from the hermes-docs-feishu-automation
 * data directory into website/docs/ for Docusaurus consumption.
 *
 * Key responsibilities:
 * 1. Copy English originals from upstream as fallback
 * 2. Overlay Chinese translations from batches (latest wins)
 * 3. Reverse Feishu-specific Markdown adaptations (blockquote → admonition)
 * 4. Fix relative links for Docusaurus routing
 * 5. Add "untranslated" banner to English-only docs
 * 6. Generate Docusaurus frontmatter
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, copyFileSync } from 'fs';
import { join, dirname, basename, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const PROJECT_ROOT = join(__dirname, '..', '..');   // hermes-docs-feishu-automation/
const WEBSITE_ROOT = join(__dirname, '..');          // website/
const UPSTREAM_DOCS = join(PROJECT_ROOT, 'data', 'upstream', 'hermes-agent', 'website', 'docs');
const UPSTREAM_STATIC = join(PROJECT_ROOT, 'data', 'upstream', 'hermes-agent', 'website', 'static');
const BATCHES_DIR = join(PROJECT_ROOT, 'data', 'batches');
const STATE_FILE = join(PROJECT_ROOT, 'data', 'state.json');

const OUTPUT_DOCS = join(WEBSITE_ROOT, 'docs');
const DATA_DIR = join(WEBSITE_ROOT, 'data');
const DATA_SOURCE = join(DATA_DIR, 'source');
const DATA_TRANSLATED = join(DATA_DIR, 'translated');

// --------------------------------------------------------------------------
// Utility helpers
// --------------------------------------------------------------------------

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function walkFiles(dir, prefix = '') {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...walkFiles(join(dir, entry.name), rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

// --------------------------------------------------------------------------
// Step 1: Sync English originals into website/data/source/
// --------------------------------------------------------------------------

function syncSource() {
  console.log('📄 Syncing English source documents...');
  const files = walkFiles(UPSTREAM_DOCS).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  let count = 0;
  for (const relPath of files) {
    const src = join(UPSTREAM_DOCS, relPath);
    const dest = join(DATA_SOURCE, relPath);
    ensureDir(dirname(dest));
    const content = readFileSync(src, 'utf-8');
    writeFileSync(dest, content);
    count++;
  }
  console.log(`   ✅ Synced ${count} source files`);
  return files;
}

// --------------------------------------------------------------------------
// Step 2: Sync translations from batches → website/data/translated/
// --------------------------------------------------------------------------

function syncTranslations() {
  console.log('🌐 Syncing translations from batches...');

  // Map: docPath → { batchId, filePath }
  // Later batches override earlier ones (sorted by batch ID = timestamp)
  const translationMap = new Map();

  if (!existsSync(BATCHES_DIR)) {
    console.log('   ⚠️  No batches directory found');
    return translationMap;
  }

  const batches = readdirSync(BATCHES_DIR)
    .filter(b => statSync(join(BATCHES_DIR, b)).isDirectory())
    .sort(); // chronological order since IDs are YYYYMMDD-HHMMSS

  for (const batchId of batches) {
    const translatedDir = join(BATCHES_DIR, batchId, 'translated');
    if (!existsSync(translatedDir)) continue;

    // Walk the translated directory looking for translation files
    // Support two directory structures across batches:
    // Old format: "getting-started/quickstart-zh-CN/translation.md"
    // New format: "getting-started/quickstart.md"
    const mdFiles = walkFiles(translatedDir).filter(f => f.endsWith('.md'));

    for (const relFile of mdFiles) {
      let docPath;
      if (relFile.endsWith('/translation.md')) {
        // Parse old format: getting-started/quickstart-zh-CN/translation.md -> getting-started/quickstart.md
        const parts = relFile.split('/');
        const translationDir = parts[parts.length - 2];
        const docName = translationDir.replace(/-zh-CN$/, '');
        const parentPath = parts.slice(0, -2).join('/');
        docPath = parentPath ? `${parentPath}/${docName}.md` : `${docName}.md`;
      } else {
        // New format directly maps the file
        docPath = relFile;
      }

      translationMap.set(docPath, {
        batchId,
        filePath: join(translatedDir, relFile),
      });
    }
  }

  // Copy translations to website/data/translated/
  let count = 0;
  for (const [docPath, info] of translationMap) {
    const dest = join(DATA_TRANSLATED, docPath);
    ensureDir(dirname(dest));
    const content = readFileSync(info.filePath, 'utf-8');
    writeFileSync(dest, content);
    count++;
  }

  console.log(`   ✅ Found ${count} translations from ${batches.length} batches`);
  return translationMap;
}

// --------------------------------------------------------------------------
// Step 3: Reverse Feishu Markdown adaptations
// --------------------------------------------------------------------------

/**
 * Converts Feishu-adapted blockquote callouts back to Docusaurus admonitions.
 *
 * Feishu format:
 *   > 💡 **提示**：content
 *   > more content
 *   > continuation
 *
 * Docusaurus format:
 *   :::tip 提示
 *   content
 *   more content
 *   continuation
 *   :::
 */
function reverseFeishuAdaptations(content) {
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  // Mapping of emoji + label patterns to Docusaurus admonition types
  const calloutPatterns = [
    { emoji: '💡', labels: ['提示', '**提示**'], type: 'tip' },
    { emoji: '⚠️', labels: ['注意', '**注意**', '警告', '**警告**'], type: 'caution' },
    { emoji: 'ℹ️', labels: ['信息', '**信息**', '备注', '**备注**', '说明', '**说明**'], type: 'info' },
    { emoji: '🔥', labels: ['危险', '**危险**'], type: 'danger' },
    { emoji: '📝', labels: ['注意', '**注意**', '备注', '**备注**'], type: 'note' },
    { emoji: '✅', labels: ['提示', '**提示**'], type: 'tip' },
  ];

  while (i < lines.length) {
    const line = lines[i];

    // Check if this line starts a Feishu-style callout blockquote
    let matched = false;
    if (line.startsWith('> ')) {
      const lineContent = line.slice(2);

      for (const pattern of calloutPatterns) {
        // Match patterns like: 💡 **提示**：content  or  💡 **提示**\n
        const emojiPrefix = pattern.emoji + ' ';
        if (!lineContent.startsWith(emojiPrefix)) continue;

        const afterEmoji = lineContent.slice(emojiPrefix.length);

        for (const label of pattern.labels) {
          // Check for label followed by colon variants
          const colonVariants = [`${label}：`, `${label}：`, `${label}:`, `${label}\n`, label];

          for (const cv of colonVariants) {
            if (afterEmoji.startsWith(cv)) {
              matched = true;

              // Extract the content after the label+colon
              let firstLineContent = afterEmoji.slice(cv.length).trim();

              // Collect continuation blockquote lines
              const admonitionLines = [];
              if (firstLineContent) {
                admonitionLines.push(firstLineContent);
              }

              let j = i + 1;
              while (j < lines.length && (lines[j].startsWith('> ') || lines[j] === '>')) {
                const continuation = lines[j] === '>' ? '' : lines[j].slice(2);
                admonitionLines.push(continuation);
                j++;
              }

              // Write Docusaurus admonition
              result.push(`:::${pattern.type}`);
              for (const al of admonitionLines) {
                result.push(al);
              }
              result.push(':::');

              i = j;
              break;
            }
          }
          if (matched) break;
        }
        if (matched) break;
      }
    }

    if (!matched) {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

// --------------------------------------------------------------------------
// Step 4: Fix relative links for Docusaurus
// --------------------------------------------------------------------------

/**
 * Convert Markdown links to Docusaurus-style paths.
 *
 * Handles multiple formats:
 * 1. Relative .md links: [text](../user-guide/cli.md) → [text](/user-guide/cli)
 * 2. Absolute /docs/ prefix: [text](/docs/user-guide/cli) → [text](/user-guide/cli)
 * 3. Relative without .md: [text](../user-guide/cli) → [text](/user-guide/cli)
 */
function fixLinks(content, currentDocPath) {
  // Fix Markdown links: [text](path)
  return content.replace(
    /\[([^\]]*)\]\(([^)]+)\)/g,
    (match, text, href) => {
      // Skip absolute URLs, anchors-only, mailto, and image paths
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
        return match;
      }

      // Skip image references
      if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(href.split('#')[0])) {
        return match;
      }

      // Handle absolute /docs/ prefix links (from English source docs)
      if (href.startsWith('/docs/')) {
        let withoutDocsPrefix = href.slice(5); // Remove '/docs' → '/user-guide/cli'
        // Normalize /index paths for Docusaurus category pages
        withoutDocsPrefix = withoutDocsPrefix.replace(/\/index(#|$)/, '/$1');
        return `[${text}](${withoutDocsPrefix})`;
      }

      // Handle relative .md links (from translated docs)
      if (href.includes('.md')) {
        // Split off anchor
        const hashIdx = href.indexOf('#');
        const pathPart = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
        const anchor = hashIdx >= 0 ? href.slice(hashIdx) : '';

        // Resolve relative path
        const currentDir = dirname(currentDocPath);
        const resolved = normalizePath(join(currentDir, pathPart));

        // Remove .md extension
        const withoutExt = resolved.replace(/\.mdx?$/, '');

        // Normalize category index pages
        const normalized = withoutExt.replace(/\/index$/, '/');

        // Build absolute Docusaurus path
        const docPath = '/' + normalized;
        const finalHref = docPath + anchor;

        return `[${text}](${finalHref})`;
      }

      // Handle relative links without .md extension (e.g., ../user-guide/cli)
      if (href.startsWith('.') && !href.includes('.md')) {
        const hashIdx = href.indexOf('#');
        const pathPart = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
        const anchor = hashIdx >= 0 ? href.slice(hashIdx) : '';

        const currentDir = dirname(currentDocPath);
        const resolved = normalizePath(join(currentDir, pathPart));
        const docPath = '/' + resolved;
        return `[${text}](${docPath}${anchor})`;
      }

      return match;
    }
  );
}

function normalizePath(p) {
  const parts = p.split('/');
  const result = [];
  for (const part of parts) {
    if (part === '..') {
      result.pop();
    } else if (part !== '.' && part !== '') {
      result.push(part);
    }
  }
  return result.join('/');
}

// --------------------------------------------------------------------------
// Step 5: Extract title from Markdown content
// --------------------------------------------------------------------------

function extractTitle(content) {
  // Check for frontmatter title
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/^title:\s*(.+)$/m);
    if (titleMatch) return titleMatch[1].replace(/^['"]|['"]$/g, '');
  }

  // Check for first H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  return null;
}

function stripFrontmatter(content) {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
}

// --------------------------------------------------------------------------
// Step 6: Generate final docs
// --------------------------------------------------------------------------

function generateDocs(sourceFiles, translationMap) {
  console.log('📝 Generating final docs...');

  // Load state for title mapping
  let state = {};
  if (existsSync(STATE_FILE)) {
    state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  }
  const manifest = state.source_manifest || {};

  const untranslatedBanner = `:::caution 本文尚未翻译
本文暂时显示英文原文，中文翻译正在进行中。翻译完成后将自动更新。

原文链接：[English Version](https://hermes-agent.nousresearch.com/docs/)
:::

`;

  // Files with manual Chinese translations that should not be overwritten
  const MANUAL_OVERRIDES = new Set(['index.md']);

  let translatedCount = 0;
  let untranslatedCount = 0;
  let skippedCount = 0;

  for (const relPath of sourceFiles) {
    // Skip files with manual overrides
    if (MANUAL_OVERRIDES.has(relPath)) {
      skippedCount++;
      continue;
    }

    const isTranslated = translationMap.has(relPath);
    const destPath = join(OUTPUT_DOCS, relPath);
    ensureDir(dirname(destPath));

    let content;
    let title;

    if (isTranslated) {
      // Use translated content
      content = readFileSync(join(DATA_TRANSLATED, relPath), 'utf-8');
      content = reverseFeishuAdaptations(content);
      title = extractTitle(content);
      content = stripFrontmatter(content);
      content = fixLinks(content, relPath);
      translatedCount++;
    } else {
      // Use English original with banner
      content = readFileSync(join(DATA_SOURCE, relPath), 'utf-8');
      title = extractTitle(content);
      content = stripFrontmatter(content);
      content = fixLinks(content, relPath);
      content = untranslatedBanner + content;
      untranslatedCount++;
    }

    // Get English title from manifest for sidebar_label if needed
    const manifestEntry = manifest[relPath];
    const englishTitle = manifestEntry?.title || title || basename(relPath, '.md');

    // Build frontmatter
    const frontmatter = [
      '---',
      `title: "${(title || englishTitle).replace(/"/g, '\\"')}"`,
    ];

    // For untranslated docs, show English title in sidebar
    if (!isTranslated && manifestEntry?.title) {
      frontmatter.push(`sidebar_label: "${manifestEntry.title.replace(/"/g, '\\"')}"`);
    }

    frontmatter.push('---');
    frontmatter.push('');

    const finalContent = frontmatter.join('\n') + content;
    writeFileSync(destPath, finalContent);
  }

  console.log(`   ✅ Generated ${translatedCount} translated + ${untranslatedCount} untranslated docs (${skippedCount} manual overrides skipped)`);
}

// --------------------------------------------------------------------------
// Step 7: Copy upstream doc images
// --------------------------------------------------------------------------

function syncDocImages() {
  console.log('🖼️  Syncing doc images...');
  const imgSrc = join(UPSTREAM_STATIC, 'img', 'docs');
  const imgDest = join(WEBSITE_ROOT, 'static', 'img', 'docs');

  if (!existsSync(imgSrc)) {
    console.log('   ⚠️  No doc images found');
    return;
  }

  const files = walkFiles(imgSrc);
  let count = 0;
  for (const relPath of files) {
    const src = join(imgSrc, relPath);
    const dest = join(imgDest, relPath);
    ensureDir(dirname(dest));
    copyFileSync(src, dest);
    count++;
  }
  console.log(`   ✅ Synced ${count} doc images`);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

function main() {
  console.log('🚀 Hermes Docs Translation Sync');
  console.log('================================\n');

  // Validate paths
  if (!existsSync(UPSTREAM_DOCS)) {
    console.error(`❌ Upstream docs not found at: ${UPSTREAM_DOCS}`);
    console.error('   Run "hermes-docs run-daily" first to sync upstream.');
    process.exit(1);
  }

  // Create directories
  ensureDir(DATA_SOURCE);
  ensureDir(DATA_TRANSLATED);
  ensureDir(OUTPUT_DOCS);

  // Execute pipeline
  const sourceFiles = syncSource();
  const translationMap = syncTranslations();
  generateDocs(sourceFiles, translationMap);
  syncDocImages();

  console.log('\n✨ Sync complete!');
}

main();
