import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:8000/';
const outDir = path.resolve('scratch', 'lean_screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Overview in ALLOW state via real File Upload scoring of bonafide_human_speech.wav
  console.log('Capturing: Overview in ALLOW state (real scoring of Human Speech)...');
  await page.locator('button:has-text("Human Speech")').first().click();
  await page.locator('#unified-input-studio').getByText('Threshold & Codec').waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'overview_allow.png') });

  // 2. Overview in WARN state via real File Upload scoring of caution_noisy_telecom.wav
  console.log('Capturing: Overview in WARN state (real scoring of Noisy PSTN)...');
  await page.locator('button:has-text("Noisy PSTN")').first().click();
  await page.waitForSelector('text=WARN (SUSPICIOUS JITTER)', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'overview_warn.png') });

  // 3. Overview in STEP-UP state via real File Upload scoring of deepfake_voice_clone.wav
  console.log('Capturing: Overview in STEP-UP state (real scoring of Voice Clone)...');
  await page.locator('button:has-text("Voice Clone")').first().click();
  await page.waitForSelector('text=STEP-UP (DEEPFAKE CLONE)', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'overview_step_up.png') });

  // 4. Rules & Policy
  console.log('Capturing: Rules & Policy...');
  await page.locator('header nav button:has-text("Rules & Policy")').first().click();
  await page.waitForSelector('text=Security Rules & Decision Thresholds', { timeout: 5000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'rules_policy.png') });

  // 5. Audit Trail
  console.log('Capturing: Audit Trail...');
  await page.locator('header nav button:has-text("Audit Trail")').first().click();
  await page.waitForSelector('text=Cryptographic Hash-Chain Audit Ledger', { timeout: 5000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'audit_trail.png') });

  // 6. Privacy & Compliance
  console.log('Capturing: Privacy & Compliance...');
  await page.locator('header nav button:has-text("Privacy & Compliance")').first().click();
  await page.waitForSelector('text=Privacy & Compliance Architecture', { timeout: 5000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'privacy_compliance.png') });

  console.log('All 6 lean screenshots captured successfully to:', outDir);
  await browser.close();
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
