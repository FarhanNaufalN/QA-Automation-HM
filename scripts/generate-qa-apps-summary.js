/**
 * Build reports/qa-apps-summary.json for QA Apps.
 * Always exits 0 so artifact upload runs even when tests fail.
 */
const fs = require('fs');
const path = require('path');

const MAX_SCREENSHOTS = 10;
const MAX_SCREENSHOT_BYTES = 400 * 1024;

function findPNGs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findPNGs(full));
    else if (entry.isFile() && entry.name.endsWith('.png')) out.push(full);
  }
  return out;
}

function readStats() {
  let passed = 0;
  let failed = 0;

  try {
    const json = JSON.parse(fs.readFileSync('reports/test-results/results.json', 'utf8'));
    return {
      passed: json.stats?.expected ?? 0,
      failed: json.stats?.unexpected ?? 0,
    };
  } catch {
    // fall through to JUnit XML
  }

  try {
    const xml = fs.readFileSync('test-results/results.xml', 'utf8');
    const suites = xml.match(/<testsuite\b[^>]*>/g) || [];
    for (const suite of suites) {
      const tests = parseInt(suite.match(/tests="(\d+)"/)?.[1] || '0', 10);
      const failures = parseInt(suite.match(/failures="(\d+)"/)?.[1] || '0', 10);
      passed += tests - failures;
      failed += failures;
    }
    if (suites.length > 0) {
      return { passed, failed };
    }
  } catch {
    // no results
  }

  return { passed: 0, failed: 0 };
}

function collectScreenshots() {
  const roots = ['reports/test-results', 'test-results'];
  const pngFiles = roots
    .flatMap((root) => findPNGs(root))
    .sort()
    .slice(0, MAX_SCREENSHOTS);

  const screenshots = [];
  for (const file of pngFiles) {
    try {
      const stat = fs.statSync(file);
      if (stat.size > MAX_SCREENSHOT_BYTES) {
        screenshots.push({
          name: file.replace(/\\/g, '/'),
          data: null,
          skipped: true,
          reason: `too large (${Math.round(stat.size / 1024)}KB)`,
        });
        continue;
      }
      screenshots.push({
        name: file.replace(/\\/g, '/'),
        data: fs.readFileSync(file).toString('base64'),
      });
    } catch (err) {
      screenshots.push({
        name: file.replace(/\\/g, '/'),
        data: null,
        skipped: true,
        reason: String(err.message || err),
      });
    }
  }
  return screenshots;
}

function main() {
  const { passed, failed } = readStats();
  const total = passed + failed;
  const status = failed > 0 || total === 0 ? 'FAILED' : 'PASSED';

  let screenshots = [];
  try {
    screenshots = collectScreenshots();
  } catch (err) {
    console.warn('Screenshot collection failed:', err.message);
  }

  const summary = {
    correlation_id: process.env.CORRELATION_ID || '',
    status,
    stats: { passed, failed, total },
    github: {
      run_id: String(process.env.RUN_ID || ''),
      run_url: process.env.RUN_URL || '',
    },
    screenshots,
  };

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/qa-apps-summary.json', JSON.stringify(summary));

  console.log('=== QA Apps summary ===');
  console.log('Status:', status);
  console.log('Passed:', passed, '| Failed:', failed, '| Total:', total);
  console.log('Screenshots:', screenshots.filter((s) => s.data).length);
  console.log('Written: reports/qa-apps-summary.json');
}

try {
  main();
} catch (err) {
  console.error('Summary generation error:', err);
  const fallback = {
    correlation_id: process.env.CORRELATION_ID || '',
    status: 'FAILED',
    stats: { passed: 0, failed: 0, total: 0 },
    github: {
      run_id: String(process.env.RUN_ID || ''),
      run_url: process.env.RUN_URL || '',
    },
    screenshots: [],
    error: String(err.message || err),
  };
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/qa-apps-summary.json', JSON.stringify(fallback));
}

process.exit(0);
