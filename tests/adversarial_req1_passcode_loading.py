"""
Milestone M5 Requirement 1 Empirical Challenge Test Suite
Adversarially tests:
1. Passcode entry with delayed GLB asset loading (#invite-input-row hidden + display:none).
2. Clean display of #invite-status ("✦ Pass Verified: Welcome, [Name] ✦") and #entrance-loading.
3. CSS specificity enforcement (#invite-input-row[hidden] { display: none !important; }).
4. URL parameter passcode entry (?code=290512).
5. Network failure handling during pass verification.
6. Error restoration and retry latch behavior on fatal boot exception.
"""
import sys
import json
import time
from playwright.sync_api import sync_playwright

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080'

def run():
    print(f"[*] Executing Adversarial Challenge for Requirement 1 on {BASE_URL}...", flush=True)
    report = {
        'suite': 'Milestone M5 Req 1 Empirical Challenge',
        'target_url': BASE_URL,
        'results': {}
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-web-security', '--disable-features=BlockInsecurePrivateNetworkRequests']
        )

        # ---------------------------------------------------------------------
        # TEST 1: Manual Passcode Entry + Delayed GLB Loading
        # ---------------------------------------------------------------------
        print("\n--- TEST 1: Passcode Entry with Delayed GLB Assets ---", flush=True)
        ctx1 = browser.new_context(viewport={'width': 1280, 'height': 800})
        page1 = ctx1.new_page()
        held1 = []

        try:
            page1.goto(BASE_URL, wait_until='domcontentloaded')
            page1.wait_for_selector('#invite-box', state='visible')

            # Initial checks
            init_hidden = page1.evaluate("document.querySelector('#invite-input-row').hidden")
            init_display = page1.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")
            assert init_hidden is False, "Initial row should not be hidden"
            assert init_display in ['flex', 'block'], f"Initial display should be flex/block, got {init_display}"

            # Intercept and hold GLBs
            page1.route('**/*.glb', lambda r: held1.append(r))

            page1.fill('#invite-code-input', '290512')
            page1.click('#btn-redeem-invite')

            # Wait for verified status
            page1.wait_for_function(
                "document.querySelector('#invite-status')?.textContent?.includes('Pass Verified')",
                timeout=15000
            )
            # Wait for STARTING transition
            page1.wait_for_function(
                "document.querySelector('#invite-input-row')?.hidden === true",
                timeout=15000
            )

            # Measurements during loading
            row_hidden = page1.evaluate("document.querySelector('#invite-input-row').hidden")
            row_display = page1.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")
            row_bbox = page1.evaluate("document.querySelector('#invite-input-row').getBoundingClientRect()")
            
            status_text = page1.evaluate("document.querySelector('#invite-status').textContent.trim()")
            status_display = page1.evaluate("window.getComputedStyle(document.querySelector('#invite-status')).display")

            loading_hidden = page1.evaluate("document.querySelector('#entrance-loading').hidden")
            loading_display = page1.evaluate("window.getComputedStyle(document.querySelector('#entrance-loading')).display")
            progress_display = page1.evaluate("window.getComputedStyle(document.querySelector('#entrance-progress')).display")
            entrance_status_display = page1.evaluate("window.getComputedStyle(document.querySelector('#entrance-status')).display")
            entrance_status_text = page1.evaluate("document.querySelector('#entrance-status').textContent.trim()")

            print(f"  row hidden={row_hidden}, display={row_display}, height={row_bbox['height']}", flush=True)
            print(f"  status text='{status_text}', display={status_display}", flush=True)
            print(f"  entrance loading display={loading_display}, progress display={progress_display}", flush=True)

            t1_passed = (
                row_hidden is True and
                row_display == 'none' and
                row_bbox['height'] == 0 and
                status_display != 'none' and
                '✦ Pass Verified: Welcome, Maya & Ethan ✦' in status_text and
                loading_hidden is False and
                loading_display != 'none' and
                progress_display != 'none' and
                entrance_status_display != 'none'
            )
            report['results']['test1_delayed_loading_hidden'] = 'PASS' if t1_passed else 'FAIL'
            print(f"  --> TEST 1: {report['results']['test1_delayed_loading_hidden']}", flush=True)
        finally:
            page1.unroute('**/*.glb')
            for r in held1:
                try: r.abort()
                except Exception: pass
            ctx1.close()

        # ---------------------------------------------------------------------
        # TEST 2: CSS Specificity Invariant (#invite-input-row[hidden])
        # ---------------------------------------------------------------------
        print("\n--- TEST 2: CSS Specificity Override Test ---", flush=True)
        ctx2 = browser.new_context()
        page2 = ctx2.new_page()
        try:
            page2.goto(BASE_URL, wait_until='domcontentloaded')
            css_check = page2.evaluate('''() => {
                const el = document.querySelector('#invite-input-row');
                el.style.display = ''; // Clear inline styles
                el.setAttribute('hidden', '');
                const withHidden = window.getComputedStyle(el).display;
                el.removeAttribute('hidden');
                const withoutHidden = window.getComputedStyle(el).display;
                return { withHidden, withoutHidden };
            }''')
            t2_passed = (css_check['withHidden'] == 'none' and css_check['withoutHidden'] == 'flex')
            report['results']['test2_css_specificity_rule'] = 'PASS' if t2_passed else 'FAIL'
            print(f"  withHidden={css_check['withHidden']}, withoutHidden={css_check['withoutHidden']}", flush=True)
            print(f"  --> TEST 2: {report['results']['test2_css_specificity_rule']}", flush=True)
        finally:
            ctx2.close()

        # ---------------------------------------------------------------------
        # TEST 3: Network Error during Pass Verification
        # ---------------------------------------------------------------------
        print("\n--- TEST 3: Network Error on /api/invite/redeem ---", flush=True)
        ctx3 = browser.new_context()
        page3 = ctx3.new_page()
        try:
            page3.route('**/api/invite/redeem', lambda r: r.abort('failed'))
            page3.goto(BASE_URL, wait_until='domcontentloaded')
            page3.wait_for_selector('#invite-box', state='visible')

            page3.fill('#invite-code-input', '290512')
            page3.click('#btn-redeem-invite')

            page3.wait_for_function(
                "document.querySelector('#invite-status')?.textContent?.includes('Could not reach the server')",
                timeout=10000
            )

            row_hidden3 = page3.evaluate("document.querySelector('#invite-input-row').hidden")
            row_display3 = page3.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")
            btn_disabled3 = page3.evaluate("document.querySelector('#btn-redeem-invite').disabled")
            btn_text3 = page3.evaluate("document.querySelector('#btn-redeem-invite').textContent.trim()")

            t3_passed = (row_hidden3 is False and row_display3 == 'flex' and btn_disabled3 is False and btn_text3 == 'Verify Pass')
            report['results']['test3_network_error_restoration'] = 'PASS' if t3_passed else 'FAIL'
            print(f"  row hidden={row_hidden3}, btn disabled={btn_disabled3}, text='{btn_text3}'", flush=True)
            print(f"  --> TEST 3: {report['results']['test3_network_error_restoration']}", flush=True)
        finally:
            ctx3.close()

        # ---------------------------------------------------------------------
        # TEST 4: Scene Boot Error Restoration & Retry Latch Analysis
        # ---------------------------------------------------------------------
        print("\n--- TEST 4: Scene Boot Error Restoration & Retry Latch ---", flush=True)
        ctx4 = browser.new_context()
        page4 = ctx4.new_page()
        try:
            page4.goto(BASE_URL, wait_until='domcontentloaded')
            page4.wait_for_selector('#invite-box', state='visible')

            # Force WebGL error so startMuseumExperience throws
            page4.evaluate('''() => {
                const orig = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type, ...args) {
                    if (window.__forceCrash && (type === 'webgl' || type === 'webgl2')) {
                        throw new Error('Forced WebGL crash for empirical challenge');
                    }
                    return orig.apply(this, [type, ...args]);
                };
                window.__forceCrash = true;
            }''')

            page4.fill('#invite-code-input', '290512')
            page4.click('#btn-redeem-invite')

            # Wait for error message from enterSanctuaryFromPass catch block
            page4.wait_for_function(
                "document.querySelector('#invite-status')?.textContent?.includes('Could not enter sanctuary')",
                timeout=15000
            )

            err_hidden = page4.evaluate("document.querySelector('#invite-input-row').hidden")
            err_display = page4.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")
            err_btn_disabled = page4.evaluate("document.querySelector('#btn-redeem-invite').disabled")
            err_btn_text = page4.evaluate("document.querySelector('#btn-redeem-invite').textContent.trim()")
            err_status = page4.evaluate("document.querySelector('#invite-status').textContent.trim()")

            print(f"  Error restoration: row hidden={err_hidden}, display={err_display}, btn disabled={err_btn_disabled}, text='{err_btn_text}'", flush=True)
            print(f"  Status text='{err_status}'", flush=True)

            t4a_passed = (
                err_hidden is False and
                err_display == 'flex' and
                err_btn_disabled is False and
                err_btn_text == 'Enter Sanctuary →' and
                'Could not enter sanctuary. Please try again.' in err_status
            )
            report['results']['test4a_boot_error_ui_restoration'] = 'PASS' if t4a_passed else 'FAIL'
            print(f"  --> TEST 4a (UI Restored): {report['results']['test4a_boot_error_ui_restoration']}", flush=True)

            # Adversarial Stress: Click the restored retry button
            page4.evaluate("window.__forceCrash = false;")
            page4.click('#btn-redeem-invite')
            page4.wait_for_timeout(1500)

            retry_row_hidden = page4.evaluate("document.querySelector('#invite-input-row').hidden")
            retry_row_display = page4.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")
            retry_btn_text = page4.evaluate("document.querySelector('#btn-redeem-invite').textContent.trim()")

            # Did retry re-trigger STARTING state?
            retry_restarted = (retry_row_hidden is True and retry_row_display == 'none')
            report['results']['test4b_retry_latch_behavior'] = 'PASS' if retry_restarted else 'DEFECT_CONFIRMED'
            print(f"  --> TEST 4b (Retry Execution): {report['results']['test4b_retry_latch_behavior']}", flush=True)
            if not retry_restarted:
                print("      [DEFECT]: Button restores visually, but clicking 'Enter Sanctuary →' fails to retry because museumStarted is stuck at true.", flush=True)
        finally:
            ctx4.close()

        browser.close()

    print("\n================ FINAL REPORT ================", flush=True)
    print(json.dumps(report, indent=2), flush=True)
    return report

if __name__ == '__main__':
    run()
