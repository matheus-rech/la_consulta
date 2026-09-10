import { test, expect } from '@playwright/test';
import { loadSamplePDF } from './helpers/pdf-helpers';
import { waitForAIProcessing } from './helpers/ai-helpers';

/**
 * MANUAL REAL-WORLD API TEST
 * This test simulates exactly what a real user would do:
 * 1. Load the app
 * 2. Upload a PDF
 * 3. Click "Generate PICO" button
 * 4. Wait for REAL Gemini API response
 * 5. Verify fields are populated
 */

test.describe('Manual Real-World API Test', () => {
  test('should generate PICO with real Gemini API - like a real user', async ({ page }) => {
    // This one deliberately calls Gemini for real, so it needs a key rather than a mock and there is nothing to assert without one.
    test.skip(
      !process.env.GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY,
      'Set GEMINI_API_KEY to exercise the real PICO generation',
    );

    // Set longer timeout for real API call
    test.setTimeout(120000); // 2 minutes

    console.log('\n🚀 Starting manual real-world API test...\n');

    // 1. Navigate to app
    console.log('📂 Step 1: Loading application...');
    await page.goto('http://localhost:3000');
    await expect(page.locator('#extraction-status')).toContainText(/ready/i, { timeout: 10000 });
    console.log('✅ App loaded successfully\n');

    // 2. Load sample PDF (using helper - like a real user)
    console.log('📄 Step 2: Loading sample PDF...');
    await loadSamplePDF(page);
    console.log('✅ PDF loaded successfully\n');

    // 3. Navigate to PICO step (Step 2 in the form wizard)
    console.log('📋 Step 3: Navigating to PICO form (Step 2)...');

    // Click the Next button to go from Step 1 to Step 2
    const nextButton = page.locator('#next-btn');  // Correct ID is #next-btn
    await expect(nextButton).toBeVisible({ timeout: 5000 });
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Verify we're now on Step 2
    const step2 = page.locator('#step-2');
    await expect(step2).toBeVisible({ timeout: 5000 });

    console.log('✅ Navigated to Step 2 (PICO form)\n');

    // 4. Verify button exists (our fix!)
    console.log('🔍 Step 4: Verifying Generate PICO button exists...');
    const picoButton = page.locator('#generate-pico-btn');
    await expect(picoButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Button found with ID: #generate-pico-btn\n');

    // 5. Click Generate PICO button (REAL API CALL!)
    console.log('🤖 Step 5: Clicking Generate PICO button (REAL API CALL)...');
    console.log('⏳ This will make a REAL call to Google Gemini API...\n');

    await picoButton.click();

    // 6. Wait for AI processing (using helper with 90s timeout for real API)
    console.log('⏳ Step 6: Waiting for AI processing (REAL API call to Gemini)...');
    await waitForAIProcessing(page, 90000);
    console.log('✅ API response received!\n');

    // 7. Verify PICO fields are populated with REAL data
    console.log('📝 Step 7: Verifying PICO fields are populated...');

    const fieldsToCheck = [
      { id: 'eligibility-population', name: 'Population' },
      { id: 'eligibility-intervention', name: 'Intervention' },
      { id: 'eligibility-comparator', name: 'Comparator' },
      { id: 'eligibility-outcomes', name: 'Outcomes' },
      { id: 'eligibility-timing', name: 'Timing' },
      { id: 'eligibility-type', name: 'Study Type' }
    ];

    let allFieldsPopulated = true;
    const results: any = {};

    for (const field of fieldsToCheck) {
      const fieldElement = page.locator(`#${field.id}`);
      const value = await fieldElement.inputValue().catch(() => '');

      results[field.name] = value;

      if (value && value.length > 5) {
        console.log(`  ✅ ${field.name}: "${value.substring(0, 50)}..."`);
      } else {
        console.log(`  ❌ ${field.name}: EMPTY or too short`);
        allFieldsPopulated = false;
      }
    }

    console.log('\n📊 Step 8: Final verification...\n');

    if (allFieldsPopulated) {
      console.log('🎉 SUCCESS! All PICO fields populated with real AI data!');
      console.log('✅ Real Gemini API integration is WORKING!\n');
    } else {
      console.log('⚠️  WARNING: Some fields were not populated');
      console.log('This could be due to:');
      console.log('  - API key not configured');
      console.log('  - API rate limiting');
      console.log('  - Network issues');
      console.log('  - API returned empty response\n');
    }

    // Log full results
    console.log('📋 Full Results:');
    console.log(JSON.stringify(results, null, 2));
    console.log('\n');

    // Assert at least one field has substantial content
    const hasContent = Object.values(results).some((val: any) => val && val.length > 10);
    expect(hasContent, 'At least one PICO field should have content from API').toBeTruthy();

    console.log('✅ Manual API test completed!\n');
  });
});
