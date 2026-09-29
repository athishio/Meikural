import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:8000/';
const outDir = path.resolve('scratch', 'identity_screenshots');
const artifactDir = path.resolve('C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/screenshots');

for (const d of [outDir, artifactDir]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function getApiKey() {
  if (process.env.MEIKURAL_API_KEY) return process.env.MEIKURAL_API_KEY;
  try {
    const envPath = path.resolve('E:/Meikural/.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^MEIKURAL_API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    }
  } catch (e) {}
  return 'meikural-dev-key-2026';
}

async function setMode(page, targetMode) {
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if ((targetMode === 'dark' && !isDark) || (targetMode === 'light' && isDark)) {
    const toggleBtn = page.locator('header button[aria-label*="Switch to"]').first();
    await toggleBtn.click();
    await page.waitForTimeout(400);
  }
}

async function saveScreen(page, filename) {
  const p1 = path.join(outDir, filename);
  const p2 = path.join(artifactDir, filename);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`  [Saved Screenshot]: ${filename}`);
}

async function setThresholds(allow, critical) {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': getApiKey(),
  };
  await fetch('http://127.0.0.1:8000/api/rules', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bonafide_allow_threshold: allow,
      step_up_challenge_threshold: critical,
      critical_deepfake_threshold: critical,
    }),
  });
}

async function captureAll() {
  console.log('================================================================');
  console.log(' MEIKURAL AUDIT: FORENSIC DOSSIER SCREENSHOT CAPTURE (1920x1080)');
  console.log(' Aesthetic: Forensic Lab / Acoustic Evidence Dossier');
  console.log('================================================================\n');

  // Ensure default rules
  await setThresholds(0.35, 0.65);

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // -------------------------------------------------------------------------
    // 1. OVERVIEW: ALLOW STATE (Human Speech benchmark) — Light & Dark
    // -------------------------------------------------------------------------
    console.log('--- 1. Capturing Overview: ALLOW (Human Speech) ---');
    await page.locator('button:has-text("Human Speech")').first().click();
    await page.waitForSelector('text=ALLOW (AUTHENTIC HUMAN)', { timeout: 15000 });
    await page.waitForTimeout(600);

    await setMode(page, 'light');
    await saveScreen(page, 'overview_allow_light.png');

    await setMode(page, 'dark');
    await saveScreen(page, 'overview_allow_dark.png');

    // -------------------------------------------------------------------------
    // 2. OVERVIEW: WARN STATE (Noisy PSTN benchmark) — Light & Dark
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Capturing Overview: WARN (Noisy PSTN) ---');
    await page.locator('button:has-text("Noisy PSTN")').first().click();
    await page.waitForSelector('text=WARN (SUSPICIOUS JITTER)', { timeout: 15000 });
    await page.waitForTimeout(600);

    await setMode(page, 'light');
    await saveScreen(page, 'overview_warn_light.png');

    await setMode(page, 'dark');
    await saveScreen(page, 'overview_warn_dark.png');

    // -------------------------------------------------------------------------
    // 3. OVERVIEW: STEP-UP STATE (Voice Clone benchmark) — Light & Dark
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Capturing Overview: STEP-UP (Voice Clone) ---');
    await page.locator('button:has-text("Voice Clone")').first().click();
    await page.waitForSelector('text=STEP-UP (DEEPFAKE CLONE)', { timeout: 15000 });
    await page.waitForTimeout(600);

    await setMode(page, 'light');
    await saveScreen(page, 'overview_step_up_light.png');

    await setMode(page, 'dark');
    await saveScreen(page, 'overview_step_up_dark.png');

    // -------------------------------------------------------------------------
    // 4. RULES & POLICY — Light & Dark
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Capturing Rules & Policy ---');
    await page.locator('header nav button:has-text("Rules & Policy")').first().click();
    await page.waitForSelector('text=Security Rules & Decision Thresholds', { timeout: 8000 });
    await page.waitForTimeout(600);

    await setMode(page, 'light');
    await saveScreen(page, 'rules_policy_light.png');

    await setMode(page, 'dark');
    await saveScreen(page, 'rules_policy_dark.png');

    // -------------------------------------------------------------------------
    // 5. AUDIT TRAIL — Light & Dark
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Capturing Audit Trail ---');
    await page.locator('header nav button:has-text("Audit Trail")').first().click();
    await page.waitForSelector('text=Cryptographic Hash-Chain Audit Ledger', { timeout: 8000 });
    await page.waitForTimeout(600);

    await setMode(page, 'light');
    await saveScreen(page, 'audit_trail_light.png');

    await setMode(page, 'dark');
    await saveScreen(page, 'audit_trail_dark.png');

    // -------------------------------------------------------------------------
    // 6. PRIVACY & COMPLIANCE — Light & Dark
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Capturing Privacy & Compliance ---');
    await page.locator('header nav button:has-text("Privacy & Compliance")').first().click();
    await page.waitForSelector('text=Privacy & Compliance Architecture', { timeout: 8000 });
    await page.waitForTimeout(600);

    await setMode(page, 'light');
    await saveScreen(page, 'privacy_compliance_light.png');

    await setMode(page, 'dark');
    await saveScreen(page, 'privacy_compliance_dark.png');

    // -------------------------------------------------------------------------
    // 7. THRESHOLD ADJUSTMENT SEQUENCE (Noisy PSTN: Warn -> Step-Up -> Allow -> Reset)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Capturing Live Threshold Demo Sequence ---');
    await page.locator('header nav button:has-text("Overview")').first().click();
    await page.waitForTimeout(500);
    await setMode(page, 'light');

    // Step A: Default threshold (0.35 / 0.65) -> Score 0.48 -> WARN
    await setThresholds(0.35, 0.65);
    await page.locator('button:has-text("Noisy PSTN")').first().click();
    await page.waitForSelector('text=WARN (SUSPICIOUS JITTER)', { timeout: 15000 });
    await page.waitForTimeout(600);
    await saveScreen(page, 'threshold_sequence_1_warn.png');

    // Step B: Strict threshold (0.25 / 0.40) -> Score 0.48 >= 0.40 -> STEP-UP
    await setThresholds(0.25, 0.40);
    await page.locator('button:has-text("Noisy PSTN")').first().click();
    await page.waitForSelector('text=STEP-UP (DEEPFAKE CLONE)', { timeout: 15000 });
    await page.waitForTimeout(600);
    await saveScreen(page, 'threshold_sequence_2_step_up.png');

    // Step C: Relaxed threshold (0.55 / 0.75) -> Score 0.48 < 0.55 -> ALLOW
    await setThresholds(0.55, 0.75);
    await page.locator('button:has-text("Noisy PSTN")').first().click();
    await page.waitForSelector('text=ALLOW (AUTHENTIC HUMAN)', { timeout: 15000 });
    await page.waitForTimeout(600);
    await saveScreen(page, 'threshold_sequence_3_allow.png');

    // Step D: Reset back to defaults (0.35 / 0.65) -> Navigate to Rules & Policy, click Reset, click Save
    await page.locator('header nav button:has-text("Rules & Policy")').first().click();
    await page.waitForSelector('text=Security Rules & Decision Thresholds', { timeout: 8000 });
    await page.locator('button:has-text("Reset to Defaults")').first().click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Save Thresholds")').first().click();
    await page.waitForTimeout(600);
    await saveScreen(page, 'threshold_sequence_4_reset.png');

    // Return to Overview
    await page.locator('header nav button:has-text("Overview")').first().click();
    await page.waitForTimeout(500);

    console.log('\n================================================================');
    console.log(' ALL 16 FORENSIC DOSSIER SCREENSHOTS RECORDED SUCCESSFULLY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Screenshot capture error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureAll().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
