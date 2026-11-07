"""
Milestone M5 Requirement 1 Extra Adversarial Stress & Edge Case Test Suite
Target: http://127.0.0.1:8080

Stress Scenarios:
1. Multi-Cycle Retry Resilience: 3 consecutive boot crashes followed by successful recovery.
2. Rapid-Fire Double/Triple Click Debounce: Fast successive clicks on 'Enter Sanctuary →' during retry.
3. Keyboard 'Enter' key submission during retry state on #invite-code-input.
4. Auto-Auth Session Boot Crash & Recovery: Failed checkAuthSession() on pre-authenticated cookie, followed by retry.
"""
import sys
import json
import time
from playwright.sync_api import sync_playwright

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080'

def run():
    print(f"[*] Starting Extra Adversarial Stress Test on {BASE_URL}...", flush=True)
    report = {
        'suite': 'Milestone M5 Req 1 Extra Adversarial Stress',
        'target_url': BASE_URL,
        'results': {}
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-web-security', '--disable-features=BlockInsecurePrivateNetworkRequests']
        )

        # -------------------------------------------------------------
        # STRESS 1: Multi-Cycle Retry (3 consecutive crashes then recover)
        # -------------------------------------------------------------
        print("\n--- STRESS 1: 3 Consecutive Crashes then Recovery ---", flush=True)
        ctx1 = browser.new_context(viewport={'width': 1280, 'height': 800})
        page1 = ctx1.new_page()
        try:
            page1.goto(BASE_URL, wait_until='domcontentloaded')
            page1.wait_for_selector('#invite-box', state='visible')

            # Force WebGL crash
            page1.evaluate('''() => {
                const orig = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type, ...args) {
                    if (window.__forceCrash && (type === 'webgl' || type === 'webgl2')) {
                        throw new Error('Forced WebGL crash cycle');
                    }
                    return orig.apply(this, [type, ...args]);
                };
                window.__forceCrash = true;
            }''')

            # Initial pass entry
            page1.fill('#invite-code-input', '290512')
            page1.click('#btn-redeem-invite')

            # Cycle 1
            page1.wait_for_function(
                "document.querySelector('#invite-status')?.textContent?.includes('Could not enter sanctuary')",
                timeout=15000
            )
            print("  Cycle 1: Crash caught, UI restored.", flush=True)
            assert page1.evaluate("document.querySelector('#invite-input-row').hidden") is False
            assert page1.evaluate("document.querySelector('#btn-redeem-invite').textContent.trim()") == 'Enter Sanctuary →'

            # Cycle 2
            page1.click('#btn-redeem-invite')
            page1.wait_for_timeout(500)
            page1.wait_for_function(
                "document.querySelector('#invite-status')?.textContent?.includes('Could not enter sanctuary')",
                timeout=15000
            )
            print("  Cycle 2: Crash caught again, UI restored.", flush=True)
            assert page1.evaluate("document.querySelector('#invite-input-row').hidden") is False
            assert page1.evaluate("document.querySelector('#btn-redeem-invite').textContent.trim()") == 'Enter Sanctuary →'

            # Cycle 3
            page1.click('#btn-redeem-invite')
            page1.wait_for_timeout(500)
            page1.wait_for_function(
                "document.querySelector('#invite-status')?.textContent?.includes('Could not enter sanctuary')",
                timeout=15000
            )
            print("  Cycle 3: Crash caught again, UI restored.", flush=True)
            assert page1.evaluate("document.querySelector('#invite-input-row').hidden") is False
            assert page1.evaluate("document.querySelector('#btn-redeem-invite').textContent.trim()") == 'Enter Sanctuary →'

            # Recovery: Disable crash and retry
            page1.evaluate("window.__forceCrash = false;")
            page1.click('#btn-redeem-invite')

            # Check that it enters STARTING and hides row cleanly
            page1.wait_for_function(
                "document.querySelector('#invite-input-row')?.hidden === true",
                timeout=15000
            )
            final_hidden = page1.evaluate("document.querySelector('#invite-input-row').hidden")
            final_display = page1.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")
            
            s1_passed = (final_hidden is True and final_display == 'none')
            report['results']['stress1_multi_cycle_retry'] = 'PASS' if s1_passed else 'FAIL'
            print(f"  --> STRESS 1 Result: {report['results']['stress1_multi_cycle_retry']}", flush=True)
        finally:
            ctx1.close()

        # -------------------------------------------------------------
        # STRESS 2: Rapid-Fire Clicks on 'Enter Sanctuary →'
        # -------------------------------------------------------------
        print("\n--- STRESS 2: Rapid-Fire Clicks Debounce ---", flush=True)
        ctx2 = browser.new_context()
        page2 = ctx2.new_page()
        try:
            page2.goto(BASE_URL, wait_until='domcontentloaded')
            page2.wait_for_selector('#invite-box', state='visible')

            # Induce 1 crash to get into retry state
            page2.evaluate('''() => {
                const orig = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type, ...args) {
                    if (window.__forceCrash && (type === 'webgl' || type === 'webgl2')) {
                        throw new Error('Quick crash');
                    }
                    return orig.apply(this, [type, ...args]);
                };
                window.__forceCrash = true;
            }''')

            page2.fill('#invite-code-input', '290512')
            page2.click('#btn-redeem-invite')

            page2.wait_for_function(
                "document.querySelector('#invite-status')?.textContent?.includes('Could not enter sanctuary')",
                timeout=15000
            )

            # Turn off crash and rapidly click 5 times
            page2.evaluate("window.__forceCrash = false;")
            page2.evaluate('''() => {
                const btn = document.querySelector('#btn-redeem-invite');
                for (let i = 0; i < 5; i++) {
                    btn.click();
                }
            }''')

            page2.wait_for_function(
                "document.querySelector('#invite-input-row')?.hidden === true",
                timeout=15000
            )
            row_hidden = page2.evaluate("document.querySelector('#invite-input-row').hidden")
            row_display = page2.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")

            s2_passed = (row_hidden is True and row_display == 'none')
            report['results']['stress2_rapid_click_debounce'] = 'PASS' if s2_passed else 'FAIL'
            print(f"  --> STRESS 2 Result: {report['results']['stress2_rapid_click_debounce']}", flush=True)
        finally:
            ctx2.close()

        # -------------------------------------------------------------
        # STRESS 3: Keyboard 'Enter' key submission during retry
        # -------------------------------------------------------------
        print("\n--- STRESS 3: Enter Keydown Submission in Retry State ---", flush=True)
        ctx3 = browser.new_context()
        page3 = ctx3.new_page()
        try:
            page3.goto(BASE_URL, wait_until='domcontentloaded')
            page3.wait_for_selector('#invite-box', state='visible')

            # Induce crash
            page3.evaluate('''() => {
                const orig = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type, ...args) {
                    if (window.__forceCrash && (type === 'webgl' || type === 'webgl2')) {
                        throw new Error('Quick crash');
                    }
                    return orig.apply(this, [type, ...args]);
                };
                window.__forceCrash = true;
            }''')

            page3.fill('#invite-code-input', '290512')
            page3.click('#btn-redeem-invite')

            page3.wait_for_function(
                "document.querySelector('#invite-status')?.textContent?.includes('Could not enter sanctuary')",
                timeout=15000
            )

            # Turn off crash, focus input, press Enter
            page3.evaluate("window.__forceCrash = false;")
            page3.focus('#invite-code-input')
            page3.keyboard.press('Enter')

            page3.wait_for_function(
                "document.querySelector('#invite-input-row')?.hidden === true",
                timeout=15000
            )
            row_hidden = page3.evaluate("document.querySelector('#invite-input-row').hidden")
            row_display = page3.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")

            s3_passed = (row_hidden is True and row_display == 'none')
            report['results']['stress3_enter_keydown_retry'] = 'PASS' if s3_passed else 'FAIL'
            print(f"  --> STRESS 3 Result: {report['results']['stress3_enter_keydown_retry']}", flush=True)
        finally:
            ctx3.close()

        # -------------------------------------------------------------
        # STRESS 4: Auto-Auth Session Boot Failure & Retry
        # -------------------------------------------------------------
        print("\n--- STRESS 4: Auto-Auth Session Check Boot Failure & Retry ---", flush=True)
        ctx4 = browser.new_context()
        page4 = ctx4.new_page()
        try:
            # First authenticate normally to get session cookie
            page4.goto(BASE_URL, wait_until='domcontentloaded')
            page4.wait_for_selector('#invite-box', state='visible')
            page4.fill('#invite-code-input', '290512')
            page4.click('#btn-redeem-invite')
            page4.wait_for_function(
                "Boolean(document.querySelector('#avatar-select') && !document.querySelector('#avatar-select').hidden)",
                timeout=60000
            )

            # Now reload page with active cookie, but crash WebGL
            page4.evaluate('''() => {
                sessionStorage.clear(); // Clear local session markers but keep cookie
            }''')

            # We create a new page in the same context (inheriting cookie) with forced WebGL crash on init
            page4_crash = ctx4.new_page()
            page4_crash.add_init_script('''() => {
                const orig = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type, ...args) {
                    if (window.__forceCrash && (type === 'webgl' || type === 'webgl2')) {
                        throw new Error('Forced crash on session check');
                    }
                    return orig.apply(this, [type, ...args]);
                };
                window.__forceCrash = true;
            }''')

            page4_crash.goto(BASE_URL, wait_until='domcontentloaded')

            # Wait for Session Boot Error message in invite-status
            page4_crash.wait_for_function(
                "document.querySelector('#invite-status')?.textContent?.includes('Could not load sanctuary session')",
                timeout=15000
            )
            print("  Auto-auth session crash caught in checkAuthSession().", flush=True)

            status_text = page4_crash.evaluate("document.querySelector('#invite-status').textContent.trim()")
            btn_text = page4_crash.evaluate("document.querySelector('#btn-redeem-invite').textContent.trim()")
            row_hidden = page4_crash.evaluate("document.querySelector('#invite-input-row').hidden")
            row_display = page4_crash.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")

            print(f"  status='{status_text}', btn='{btn_text}', hidden={row_hidden}, display={row_display}", flush=True)

            assert row_hidden is False
            assert row_display == 'flex'
            assert btn_text == 'Enter Sanctuary →'

            # Disable crash and click Enter Sanctuary → to retry
            page4_crash.evaluate("window.__forceCrash = false;")
            page4_crash.click('#btn-redeem-invite')

            # Confirm it enters STARTING and row is hidden
            page4_crash.wait_for_function(
                "document.querySelector('#invite-input-row')?.hidden === true",
                timeout=15000
            )
            retry_hidden = page4_crash.evaluate("document.querySelector('#invite-input-row').hidden")
            retry_display = page4_crash.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")

            s4_passed = (retry_hidden is True and retry_display == 'none')
            report['results']['stress4_session_auth_retry'] = 'PASS' if s4_passed else 'FAIL'
            print(f"  --> STRESS 4 Result: {report['results']['stress4_session_auth_retry']}", flush=True)
            page4_crash.close()
        finally:
            ctx4.close()

        browser.close()

    print("\n================ EXTRA STRESS FINAL REPORT ================", flush=True)
    print(json.dumps(report, indent=2), flush=True)
    return report

if __name__ == '__main__':
    run()
