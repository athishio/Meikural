import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:8000/';

async function runQA() {
  console.log('================================================================');
  console.log(' MEIKURAL FRONTEND — LEAN AUTOMATED QA PASS (ui-lean)');
  console.log(' Resolution: 1920x1080 | Engine: Chromium (Edge) | Target: Live');
  console.log('================================================================\n');

  const results = [];
  const consoleErrors = [];
  const consoleWarnings = [];

  function record(element, action, result, passFail, note = '') {
    results.push({ element, action, result, passFail, note });
    const tag = passFail === 'PASS' ? '✓ PASS' : (passFail === 'FAIL' ? '✗ FAIL' : '⚠ PARTIAL');
    console.log(`[${tag}] ${element} | Action: ${action} -> Result: ${result} ${note ? '(' + note + ')' : ''}`);
  }

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.error('  [Browser Error]:', text);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[Uncaught Page Exception]: ${err.toString()}`);
    console.error('  [Browser Uncaught Error]:', err.toString());
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // =========================================================================
    // SECTION 1: HEADER & NAVIGATION (4 TABS ONLY)
    // =========================================================================
    console.log('\n--- Section 1: Header & Minimalist Navigation ---');

    // Check 1: Brand logo
    const brand = await page.locator('text=MEIKURAL').first().isVisible();
    record('Header Brand', 'Verify branding', brand ? 'Visible' : 'Missing', brand ? 'PASS' : 'FAIL');

    // Check 2: Exactly 4 Navigation Tabs
    const navButtons = page.locator('header nav button');
    const navCount = await navButtons.count();
    record('Navigation Tabs Count', 'Count nav tabs', `${navCount} tabs`, navCount === 4 ? 'PASS' : 'FAIL', 'Expected exactly 4');

    // Check 3: Tab labels
    const tabTexts = await navButtons.allTextContents();
    const hasTabs = ['Overview', 'Rules & Policy', 'Audit Trail', 'Privacy & Compliance'].every(t => tabTexts.includes(t));
    record('Navigation Tabs Labels', 'Verify tab names', tabTexts.join(', '), hasTabs ? 'PASS' : 'FAIL');

    // Check 4: Absence of 'More' dropdown
    const hasMore = await page.locator('header button:has-text("More")').count() > 0;
    record('Absence of More Dropdown', 'Verify no dropdowns', hasMore ? 'Found' : 'Absent', !hasMore ? 'PASS' : 'FAIL');

    // Check 5: Absence of Command Palette
    const hasCmdK = await page.locator('header button:has-text("⌘K")').count() > 0;
    record('Absence of Command Palette', 'Verify no search shortcut', hasCmdK ? 'Found' : 'Absent', !hasCmdK ? 'PASS' : 'FAIL');

    // Check 6: Backend Status Badge
    const backendBadge = await page.locator('header').getByText('Backend Live').count() > 0;
    record('Backend Live Pill', 'Check status pill', backendBadge ? 'Connected' : 'Offline', backendBadge ? 'PASS' : 'FAIL');

    // =========================================================================
    // SECTION 2: OVERVIEW - STATUS BANNER & METADATA
    // =========================================================================
    console.log('\n--- Section 2: Overview Status Banner & Context ---');

    // Check 7: State Banner rendered
    const banner = page.locator('section[aria-label="System Security State"]');
    const bannerVisible = await banner.isVisible();
    record('Security State Banner', 'Verify banner visibility', bannerVisible ? 'Visible' : 'Hidden', bannerVisible ? 'PASS' : 'FAIL');

    // Check 8: Honest wording: LOW RISK - PASSIVE CHECK CLEARED
    const hasHonestBadge = await page.locator('text=LOW RISK - PASSIVE CHECK CLEARED').count() > 0;
    record('Honest Wording Badge', 'Verify LOW RISK badge', hasHonestBadge ? 'Present' : 'Missing', hasHonestBadge ? 'PASS' : 'FAIL');

    // Check 9: Initial headline
    const headlineText = await banner.locator('h1').textContent();
    record('Banner Headline', 'Read headline', headlineText?.trim() || 'Empty', headlineText ? 'PASS' : 'FAIL');

    // Check 10: Single line of context
    const contextLine = await banner.locator('p').first().textContent();
    record('Context Line', 'Read context line', contextLine?.trim() || 'Empty', contextLine?.includes('Acoustic glottal dynamics') ? 'PASS' : 'FAIL');

    // Check 11: Passive Spoof Risk readout
    const hasRiskReadout = await banner.getByText('Passive Spoof Risk:').count() > 0;
    record('Passive Spoof Risk', 'Verify telemetry line', hasRiskReadout ? 'Present' : 'Missing', hasRiskReadout ? 'PASS' : 'FAIL');

    // Check 12: Voice Trust Index readout
    const hasTrustReadout = await banner.getByText('Voice Trust Index:').count() > 0;
    record('Voice Trust Readout', 'Verify telemetry line', hasTrustReadout ? 'Present' : 'Missing', hasTrustReadout ? 'PASS' : 'FAIL');

    // Check 13: SIP Action readout
    const hasSipAction = await banner.getByText('SIP Protocol Action:').count() > 0;
    record('SIP Action Readout', 'Verify telemetry line', hasSipAction ? 'Present' : 'Missing', hasSipAction ? 'PASS' : 'FAIL');

    // Check 14: Honest label: Sample reference
    const hasSampleRef = await banner.getByText('Sample reference').count() > 0;
    record('Sample Reference Label', 'Verify honest label', hasSampleRef ? 'Present' : 'Missing', hasSampleRef ? 'PASS' : 'FAIL');

    // Check 15: DPDP §3(2) tag
    const hasDpdp = await banner.getByText('DPDP §3(2) Zero Biometrics').count() > 0;
    record('DPDP §3(2) Notice', 'Verify compliance tag', hasDpdp ? 'Present' : 'Missing', hasDpdp ? 'PASS' : 'FAIL');

    // =========================================================================
    // SECTION 3: OVERVIEW - TRUST GAUGE & TELEMETRY
    // =========================================================================
    console.log('\n--- Section 3: Overview Trust Gauge & Telemetry ---');

    // Check 16: SVG Gauge rendered
    const gaugeSvg = page.locator('svg[viewBox="0 0 220 170"]');
    const gaugeExists = await gaugeSvg.count() > 0;
    record('Trust Gauge SVG', 'Inspect SVG radial gauge', gaugeExists ? 'Rendered' : 'Missing', gaugeExists ? 'PASS' : 'FAIL');

    // Check 17: Large Trust Index numerical readout
    const trustNumber = await page.locator('text=/100').first().textContent();
    record('Trust Numerical Score', 'Read gauge score', trustNumber?.trim() || '', trustNumber ? 'PASS' : 'FAIL');

    // Check 18: Spoof Probability tile
    const spoofTile = await page.getByText('Spoof Probability').count() > 0;
    record('Spoof Probability Tile', 'Verify metric tile', spoofTile ? 'Present' : 'Missing', spoofTile ? 'PASS' : 'FAIL');

    // Check 19: Inference Latency tile
    const latencyTile = await page.getByText('Inference Latency').count() > 0;
    record('Inference Latency Tile', 'Verify metric tile', latencyTile ? 'Present' : 'Missing', latencyTile ? 'PASS' : 'FAIL');

    // =========================================================================
    // SECTION 4: OVERVIEW - THREAT TIMELINE
    // =========================================================================
    console.log('\n--- Section 4: Threat Timeline ---');

    // Check 20: Threat Timeline SVG
    const timelineSvg = page.locator('svg[viewBox="0 0 480 150"]');
    const timelineExists = await timelineSvg.count() > 0;
    record('Threat Timeline SVG', 'Inspect timeline chart', timelineExists ? 'Rendered' : 'Missing', timelineExists ? 'PASS' : 'FAIL');

    // Check 21: Timeline Window Buttons
    const btn30s = page.locator('button:has-text("30s")').first();
    const btn5m = page.locator('button:has-text("5m")').first();
    const canToggleWindow = (await btn30s.count() > 0) && (await btn5m.count() > 0);
    if (canToggleWindow) {
      await btn5m.click();
      await page.waitForTimeout(100);
      await btn30s.click();
    }
    record('Timeline Window Selector', 'Toggle 30s/5m windows', canToggleWindow ? 'Operational' : 'Missing', canToggleWindow ? 'PASS' : 'FAIL');

    // =========================================================================
    // SECTION 5: INPUT STUDIO & REAL SCORING
    // =========================================================================
    console.log('\n--- Section 5: Acoustic Ingestion & Real Inference ---');

    // Check 22: Codec selector
    const codecSelect = page.locator('#unified-input-studio select');
    const hasCodec = await codecSelect.count() > 0;
    record('Codec Selector', 'Verify codec dropdown', hasCodec ? 'Present' : 'Missing', hasCodec ? 'PASS' : 'FAIL');

    // Check 23: Benchmark 1 - Human Speech
    await page.locator('button:has-text("Human Speech")').first().click();
    await page.locator('#unified-input-studio').getByText('Threshold & Codec').waitFor({ timeout: 12000 });
    const humanScored = await page.locator('text=ALLOW (AUTHENTIC HUMAN)').count() > 0;
    record('Benchmark: Human Speech', '1-click score', humanScored ? 'ALLOW Verified' : 'Failed', humanScored ? 'PASS' : 'FAIL');

    // Check 24: Scored result card shows metadata
    const resultCard = page.locator('#unified-input-studio').locator('text=Threshold & Codec');
    const hasResultCard = await resultCard.count() > 0;
    record('Scored Result Card', 'Inspect result details', hasResultCard ? 'Rendered' : 'Missing', hasResultCard ? 'PASS' : 'FAIL');

    // Check 25: Benchmark 2 - Voice Clone
    await page.locator('button:has-text("Voice Clone")').first().click();
    await page.waitForSelector('text=STEP-UP (DEEPFAKE CLONE)', { timeout: 12000 });
    const cloneScored = await page.locator('text=STEP-UP (DEEPFAKE CLONE)').count() > 0;
    record('Benchmark: Voice Clone', '1-click score', cloneScored ? 'STEP-UP Verified' : 'Failed', cloneScored ? 'PASS' : 'FAIL');

    // Check 26: State banner reflects crimson STEP-UP
    const isStepUpBanner = await banner.locator('text=STEP-UP (DEEPFAKE CLONE)').count() > 0;
    record('Banner STEP-UP State', 'Verify banner alert transition', isStepUpBanner ? 'Transitioned' : 'Unchanged', isStepUpBanner ? 'PASS' : 'FAIL');

    // Check 27: Benchmark 3 - Noisy PSTN
    await page.locator('button:has-text("Noisy PSTN")').first().click();
    await page.waitForSelector('text=WARN (SUSPICIOUS JITTER)', { timeout: 12000 });
    const warnScored = await page.locator('text=WARN (SUSPICIOUS JITTER)').count() > 0;
    record('Benchmark: Noisy PSTN', '1-click score', warnScored ? 'WARN Verified' : 'Failed', warnScored ? 'PASS' : 'FAIL');

    // Check 28: State banner reflects amber WARN
    const isWarnBanner = await banner.locator('text=WARN (SUSPICIOUS JITTER)').count() > 0;
    record('Banner WARN State', 'Verify banner warning transition', isWarnBanner ? 'Transitioned' : 'Unchanged', isWarnBanner ? 'PASS' : 'FAIL');

    // Check 29: File upload drop zone
    const dropZone = page.locator('input[type="file"]');
    const hasDropZone = await dropZone.count() > 0;
    record('File Upload Drop Zone', 'Verify file input element', hasDropZone ? 'Present' : 'Missing', hasDropZone ? 'PASS' : 'FAIL');

    // =========================================================================
    // SECTION 6: ACTIVE CHALLENGE PANEL (INLINE)
    // =========================================================================
    console.log('\n--- Section 6: Dynamic Voice Challenge Panel ---');

    // Check 30: Challenge CTA button
    const issueChallengeBtn = page.locator('button:has-text("Issue Dynamic Challenge")').first();
    const hasChallengeCTA = await issueChallengeBtn.count() > 0;
    record('Issue Dynamic Challenge CTA', 'Verify CTA button', hasChallengeCTA ? 'Rendered' : 'Missing', hasChallengeCTA ? 'PASS' : 'FAIL');

    // Check 31: Trigger challenge
    if (hasChallengeCTA) {
      await issueChallengeBtn.click();
      await page.waitForTimeout(400);
    }
    const challengePanel = page.locator('text=Active Liveness Intercept & Dynamic Challenge');
    const isChallengeOpen = await challengePanel.count() > 0;
    record('Challenge Panel Open', 'Trigger dynamic challenge', isChallengeOpen ? 'Rendered Inline' : 'Failed', isChallengeOpen ? 'PASS' : 'FAIL');

    // Check 32: Spoken prompt sequence
    const hasPromptText = await page.locator('text=Spoken Dynamic Security Prompt').count() > 0;
    record('Dynamic Prompt Token', 'Inspect prompt text', hasPromptText ? 'Visible' : 'Missing', hasPromptText ? 'PASS' : 'FAIL');

    // Check 33: Reflex countdown timer
    const hasTimer = await page.locator('text=Reflex Window:').count() > 0;
    record('Reflex Timer', 'Inspect countdown timer', hasTimer ? 'Active' : 'Missing', hasTimer ? 'PASS' : 'FAIL');

    // Check 34: Pass challenge resolution
    const passBtn = page.locator('button:has-text("Pass Challenge")').first();
    const canPass = await passBtn.count() > 0;
    if (canPass) {
      await passBtn.click();
      await page.waitForTimeout(400);
    }
    record('Pass Challenge Action', 'Resolve challenge as human', canPass ? 'Executed' : 'Missing', canPass ? 'PASS' : 'FAIL');

    // =========================================================================
    // SECTION 7: RULES & POLICY
    // =========================================================================
    console.log('\n--- Section 7: Rules & Policy Page ---');

    // Check 35: Navigate to Rules
    await page.locator('header nav button:has-text("Rules & Policy")').first().click();
    await page.waitForTimeout(400);
    const hasRulesHeading = await page.locator('text=Security Rules & Decision Thresholds').count() > 0;
    record('Navigate to Rules', 'Click nav button', hasRulesHeading ? 'Loaded' : 'Failed', hasRulesHeading ? 'PASS' : 'FAIL');

    // Check 36: Contiguous Three-Band Decision Plane
    const hasDecisionPlane = await page.locator('text=Contiguous Three-Band Decision Plane').count() > 0;
    record('Three-Band Decision Plane', 'Verify contiguous visualizer', hasDecisionPlane ? 'Rendered' : 'Missing', hasDecisionPlane ? 'PASS' : 'FAIL');

    // Check 37: Allow threshold slider
    const allowSlider = page.locator('input[type="range"]').first();
    const hasAllowSlider = await allowSlider.count() > 0;
    record('Allow Threshold Slider', 'Inspect slider input', hasAllowSlider ? 'Interactive' : 'Missing', hasAllowSlider ? 'PASS' : 'FAIL');

    // Check 38: Critical alert slider
    const alertSlider = page.locator('input[type="range"]').nth(1);
    const hasAlertSlider = await alertSlider.count() > 0;
    record('Critical Alert Slider', 'Inspect slider input', hasAlertSlider ? 'Interactive' : 'Missing', hasAlertSlider ? 'PASS' : 'FAIL');

    // Check 39: Reset to defaults
    const resetBtn = page.locator('button:has-text("Reset to Defaults")').first();
    const hasReset = await resetBtn.count() > 0;
    if (hasReset) await resetBtn.click();
    record('Reset to Defaults Action', 'Click reset', hasReset ? 'Operational' : 'Missing', hasReset ? 'PASS' : 'FAIL');

    // Check 40: Save thresholds button
    const saveBtn = page.locator('button:has-text("Save Thresholds")').first();
    const hasSave = await saveBtn.count() > 0;
    record('Save Thresholds Action', 'Verify save action', hasSave ? 'Present' : 'Missing', hasSave ? 'PASS' : 'FAIL');

    // =========================================================================
    // SECTION 8: AUDIT TRAIL
    // =========================================================================
    console.log('\n--- Section 8: Audit Trail Page ---');

    // Check 41: Navigate to Audit Trail
    await page.locator('header nav button:has-text("Audit Trail")').first().click();
    await page.waitForTimeout(500);
    const hasAuditHeading = await page.locator('text=Cryptographic Hash-Chain Audit Ledger').count() > 0;
    record('Navigate to Audit Trail', 'Click nav button', hasAuditHeading ? 'Loaded' : 'Failed', hasAuditHeading ? 'PASS' : 'FAIL');

    // Check 42: Audit table rows
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    record('Audit Ledger Rows', 'Count session rows', `${rowCount} rows`, rowCount > 0 ? 'PASS' : 'FAIL');

    // Check 43: Token Reference View toggle
    const toggleToFullBtn = page.locator('button:has-text("Reference View")').first();
    const hasTokenToggle = await toggleToFullBtn.count() > 0;
    if (hasTokenToggle) {
      await toggleToFullBtn.click();
      await page.waitForTimeout(200);
      const toggleBackBtn = page.locator('button:has-text("Full Hashes View")').first();
      if (await toggleBackBtn.count() > 0) {
        await toggleBackBtn.click();
      }
    }
    record('Token Toggle ([#] / [<>])', 'Toggle hash/token mode', hasTokenToggle ? 'Operational' : 'Missing', hasTokenToggle ? 'PASS' : 'FAIL');

    // Check 44: Search filter
    const searchInput = page.locator('input[placeholder*="Search session"]').first();
    const hasSearch = await searchInput.count() > 0;
    if (hasSearch) {
      await searchInput.fill('call_');
      await page.waitForTimeout(200);
      await searchInput.fill('');
    }
    record('Search Session Filter', 'Filter audit records', hasSearch ? 'Operational' : 'Missing', hasSearch ? 'PASS' : 'FAIL');

    // Check 45: Verdict filter pills
    const allPill = page.locator('button:has-text("All")').first();
    const allowPill = page.locator('button:has-text("ALLOW")').first();
    const hasFilters = (await allPill.count() > 0) && (await allowPill.count() > 0);
    record('Verdict Filter Pills', 'Check filter pills', hasFilters ? 'Present' : 'Missing', hasFilters ? 'PASS' : 'FAIL');

    // Check 46: Per-session verify action
    const verifyRowBtn = page.locator('table tbody button:has-text("Verify")').first();
    const hasVerifyRow = await verifyRowBtn.count() > 0;
    if (hasVerifyRow) {
      await verifyRowBtn.click();
      await page.waitForTimeout(300);
    }
    record('Per-Session Verify Action', 'Click row verify', hasVerifyRow ? 'Operational' : 'Missing', hasVerifyRow ? 'PASS' : 'FAIL');

    // Check 47: Verify Full Chain action
    const verifyFullBtn = page.locator('button:has-text("Verify Full Chain")').first();
    const hasVerifyFull = await verifyFullBtn.count() > 0;
    if (hasVerifyFull) {
      await verifyFullBtn.click();
      await page.waitForTimeout(500);
    }
    record('Verify Full Chain Action', 'Execute whole-chain verify', hasVerifyFull ? 'Operational' : 'Missing', hasVerifyFull ? 'PASS' : 'FAIL');

    // Check 48: Export CSV button
    const exportCsvBtn = page.locator('button:has-text("Export CSV")').first();
    const hasExportCsv = await exportCsvBtn.count() > 0;
    record('Export CSV Action', 'Verify export button', hasExportCsv ? 'Present' : 'Missing', hasExportCsv ? 'PASS' : 'FAIL');

    // =========================================================================
    // SECTION 9: PRIVACY & COMPLIANCE
    // =========================================================================
    console.log('\n--- Section 9: Privacy & Compliance Page ---');

    // Check 49: Navigate to Privacy
    await page.locator('header nav button:has-text("Privacy & Compliance")').first().click();
    await page.waitForTimeout(400);
    const hasPrivacyTitle = await page.locator('text=Privacy & Compliance Architecture').count() > 0;
    record('Navigate to Privacy', 'Click nav button', hasPrivacyTitle ? 'Loaded' : 'Failed', hasPrivacyTitle ? 'PASS' : 'FAIL');

    // Check 50: DPDP Act 2023 & ISO/IEC 30107-3 context
    const hasRegContext = await page.locator('text=DPDP Act 2023').count() > 0;
    record('Regulatory Framework Context', 'Verify DPDP context', hasRegContext ? 'Present' : 'Missing', hasRegContext ? 'PASS' : 'FAIL');

    // Check 51: Caller Identity Privacy card
    const hasCallerCard = await page.locator('text=Caller Identity Privacy').count() > 0;
    record('Caller Privacy Card', 'Inspect Salted SHA-256 card', hasCallerCard ? 'Present' : 'Missing', hasCallerCard ? 'PASS' : 'FAIL');

    // Check 52: 90-Day Auto Purge card
    const hasPurgeCard = await page.locator('text=90-Day Auto-Purge').count() > 0;
    record('90-Day Auto-Purge Card', 'Inspect auto-purge card', hasPurgeCard ? 'Present' : 'Missing', hasPurgeCard ? 'PASS' : 'FAIL');

    // Check 53: Ephemeral Zero-Audio on Disk card
    const hasZeroAudio = await page.locator('text=Zero-Audio on Disk').count() > 0;
    record('Zero-Audio on Disk Card', 'Inspect RAM-only card', hasZeroAudio ? 'Present' : 'Missing', hasZeroAudio ? 'PASS' : 'FAIL');

    // Check 54: 0 Bytes confirmed
    const has0Bytes = await page.locator('text=0 Bytes').count() > 0;
    record('0 Bytes Disk Usage Tag', 'Inspect disk usage proof', has0Bytes ? 'Verified' : 'Missing', has0Bytes ? 'PASS' : 'FAIL');

    // Check 55: 5-step Sovereign Data Lifecycle
    const hasLifecycle = await page.locator('text=Sovereign Data Lifecycle & Privacy Guarantee').count() > 0;
    record('Sovereign Data Lifecycle', 'Verify 5-step journey', hasLifecycle ? 'Rendered' : 'Missing', hasLifecycle ? 'PASS' : 'FAIL');

    // Check 56: Run Purge Now button
    const runPurgeBtn = page.locator('button:has-text("Run Purge Now")').first();
    const hasRunPurge = await runPurgeBtn.count() > 0;
    if (hasRunPurge) {
      await runPurgeBtn.click();
      await page.waitForTimeout(300);
      const confirmPurgeBtn = page.locator('button:has-text("Confirm Purge")').first();
      if (await confirmPurgeBtn.count() > 0) {
        await confirmPurgeBtn.click();
        await page.waitForTimeout(500);
      }
      const closePurgeBtn = page.locator('button:has-text("Close")').first();
      if (await closePurgeBtn.count() > 0) {
        await closePurgeBtn.click();
      }
    }
    record('Run Purge Modal & Execution', 'Execute regulatory purge', hasRunPurge ? 'Operational' : 'Missing', hasRunPurge ? 'PASS' : 'FAIL');

    // Check 57: Generate Compliance Package action
    const genPkgBtn = page.locator('button:has-text("Generate Compliance Package")').first();
    const hasGenPkg = await genPkgBtn.count() > 0;
    if (hasGenPkg) {
      await genPkgBtn.click();
      await page.waitForTimeout(600);
    }
    record('Generate Compliance Package', 'Compile regulatory dossier', hasGenPkg ? 'Operational' : 'Missing', hasGenPkg ? 'PASS' : 'FAIL');

    // =========================================================================
    // SECTION 10: FOOTER & CONSOLE ERROR ZERO-TOLERANCE
    // =========================================================================
    console.log('\n--- Section 10: Footer & Runtime Integrity ---');

    // Check 58: Minimalist Footer
    const footer = page.locator('footer');
    const hasFooter = await footer.count() > 0;
    record('Minimalist Footer', 'Verify footer element', hasFooter ? 'Rendered' : 'Missing', hasFooter ? 'PASS' : 'FAIL');

    // Check 59: Privacy link in footer
    const footerPrivacyLink = footer.getByText('Privacy & Compliance');
    const hasFooterLink = await footerPrivacyLink.count() > 0;
    record('Footer Privacy Link', 'Inspect footer navigation', hasFooterLink ? 'Present' : 'Missing', hasFooterLink ? 'PASS' : 'FAIL');

    // Check 60: Zero Console Errors
    const errorCount = consoleErrors.length;
    record('Console Error Audit', 'Audit runtime browser errors', `${errorCount} errors`, errorCount === 0 ? 'PASS' : 'FAIL');

    // Print Final Summary
    const totalChecks = results.length;
    const passedChecks = results.filter((r) => r.passFail === 'PASS').length;
    const failedChecks = results.filter((r) => r.passFail === 'FAIL').length;
    const passRate = ((passedChecks / totalChecks) * 100).toFixed(1);

    console.log('\n================================================================');
    console.log('  TEST RUN SUMMARY (ui-lean)');
    console.log('================================================================');
    console.log(`  Total Checks : ${totalChecks}`);
    console.log(`  Passed       : ${passedChecks}`);
    console.log(`  Failed       : ${failedChecks}`);
    console.log(`  Pass Rate    : ${passRate}%`);
    console.log('================================================================');

    if (errorCount > 0) {
      console.log('Console Errors Detected:');
      consoleErrors.forEach((e) => console.log(' - ', e));
    } else {
      console.log('0 browser console errors detected.');
    }

    if (failedChecks > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal QA Execution Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runQA().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
