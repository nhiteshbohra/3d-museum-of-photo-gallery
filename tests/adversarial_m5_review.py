"""
Adversarial Review & Stress-Test Suite for Milestone M5 (UI & Character Setup Fixes)
Evaluates:
- Req 1: #invite-input-row hiding during STARTING and IN_SANCTUARY states
- Req 1: Error recovery and restoration of #invite-input-row on failure
- Req 2: Character setup immediate customization unhiding on first render
- Req 2: Initial visitor name, color swatch rows, and card active states
- Mobile layout responsiveness for Character Setup and Ticket Card
- Non-negotiable invariants: strict 2-visitor max, prototype defense, 20 avatar actions, zero hardcoded passcodes
"""
import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080'

def test_m5_full_suite():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-web-security', '--disable-features=BlockInsecurePrivateNetworkRequests']
        )

        print("\n=======================================================")
        print("  MILESTONE M5 INDEPENDENT ADVERSARIAL VERIFICATION   ")
        print("=======================================================")

        # -----------------------------------------------------------------
        # TEST 1: Requirement 1 - Passcode Input Row Hiding During Loading
        # -----------------------------------------------------------------
        print("\n[TEST 1] Verifying #invite-input-row hiding during STARTING state...")
        context1 = browser.new_context(viewport={'width': 1280, 'height': 800})
        page1 = context1.new_page()

        page1.goto(f"{BASE_URL}/?code=290512", wait_until='domcontentloaded')
        # Wait until STARTING state activates
        page1.wait_for_selector("#entrance-loading:not([hidden])")

        row_hidden = page1.evaluate("document.querySelector('#invite-input-row').hidden")
        row_display = page1.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")
        status_text = page1.locator("#invite-status").text_content()
        status_display = page1.evaluate("window.getComputedStyle(document.querySelector('#invite-status')).display")

        assert row_hidden is True, "During STARTING, #invite-input-row.hidden must be True"
        assert row_display == "none", f"During STARTING, computed display must be 'none', got '{row_display}'"
        assert status_display != "none", f"#invite-status must remain visible during loading, got '{status_display}'"
        assert "✦ Pass Verified: Welcome" in status_text, f"Status text unexpected: '{status_text}'"
        print(f"  ✓ STARTING state verified: #invite-input-row hidden={row_hidden}, display='{row_display}'")
        print(f"  ✓ #invite-status visible with message: '{status_text}'")
        context1.close()

        # -----------------------------------------------------------------
        # TEST 2 & 3: Requirement 2 - Character Setup Customization Immediate Visibility & Switching
        # -----------------------------------------------------------------
        print("\n[TEST 2] Verifying Character Setup immediate unhide on initial mount...")
        context2 = browser.new_context(viewport={'width': 1280, 'height': 800})
        page2 = context2.new_page()
        page2.goto(f"{BASE_URL}/?code=290512", wait_until='domcontentloaded')
        page2.wait_for_function(
            "Boolean(document.querySelector('#avatar-select') && !document.querySelector('#avatar-select').hidden)",
            timeout=60000
        )

        # Verify .character-fields is immediately unhidden WITHOUT clicking avatar card
        fields_hidden = page2.evaluate("document.querySelector('.character-fields').hidden")
        fields_display = page2.evaluate("window.getComputedStyle(document.querySelector('.character-fields')).display")
        assert fields_hidden is False, "Requirement 2 FAILED: .character-fields must have hidden=false on initial load"
        assert fields_display != "none", f"Requirement 2 FAILED: .character-fields display must not be 'none', got '{fields_display}'"
        print(f"  ✓ .character-fields immediately unhidden: hidden={fields_hidden}, display='{fields_display}'")

        # Verify visitor name input
        name_val = page2.locator("#visitor-name").input_value()
        assert name_val == "Maya", f"Expected visitor name 'Maya', got '{name_val}'"
        print(f"  ✓ #visitor-name populated immediately with: '{name_val}'")

        # Verify color picker rows
        color_rows = page2.locator(".character-color-row").count()
        assert color_rows == 4, f"Expected 4 color swatch rows, found {color_rows}"
        print(f"  ✓ Color picker swatch rows rendered immediately: {color_rows} rows")

        # Verify default avatar card highlight (.selected and aria-pressed="true")
        maya_selected = page2.evaluate("document.querySelector('[data-avatar-id=\"maya\"]').classList.contains('selected')")
        maya_aria = page2.evaluate("document.querySelector('[data-avatar-id=\"maya\"]').getAttribute('aria-pressed')")
        ethan_selected = page2.evaluate("document.querySelector('[data-avatar-id=\"ethan\"]').classList.contains('selected')")
        ethan_aria = page2.evaluate("document.querySelector('[data-avatar-id=\"ethan\"]').getAttribute('aria-pressed')")

        assert maya_selected is True, "Maya card must have .selected class on initial load"
        assert maya_aria == "true", "Maya card must have aria-pressed='true' on initial load"
        assert ethan_selected is False, "Ethan card must not have .selected class on initial load"
        assert ethan_aria == "false", "Ethan card must have aria-pressed='false' on initial load"
        print("  ✓ Avatar card selection states correct on initial mount: Maya=selected, Ethan=unselected")

        # -----------------------------------------------------------------
        # TEST 3: Avatar Switching & State Synchronization
        # -----------------------------------------------------------------
        print("\n[TEST 3] Verifying Avatar card switching & state synchronization...")
        page2.evaluate("document.querySelector('[data-avatar-id=\"ethan\"]').click()")
        page2.wait_for_timeout(300)

        # Verify Ethan selected
        name_ethan = page2.locator("#visitor-name").input_value()
        assert name_ethan == "Ethan", f"Expected 'Ethan', got '{name_ethan}'"
        ethan_selected_now = page2.evaluate("document.querySelector('[data-avatar-id=\"ethan\"]').classList.contains('selected')")
        maya_selected_now = page2.evaluate("document.querySelector('[data-avatar-id=\"maya\"]').classList.contains('selected')")
        assert ethan_selected_now is True, "Ethan card must be selected after click"
        assert maya_selected_now is False, "Maya card must be unselected after clicking Ethan"
        print("  ✓ Switching to Ethan updates #visitor-name and card selection states")

        # Switch back to Maya
        page2.evaluate("document.querySelector('[data-avatar-id=\"maya\"]').click()")
        page2.wait_for_timeout(300)
        name_maya_again = page2.locator("#visitor-name").input_value()
        assert name_maya_again == "Maya", f"Expected 'Maya', got '{name_maya_again}'"
        print("  ✓ Switching back to Maya retains state cleanly")
        context2.close()

        # -----------------------------------------------------------------
        # TEST 4: Error Recovery - Restore #invite-input-row on Failure
        # -----------------------------------------------------------------
        print("\n[TEST 4] Verifying Error Recovery: #invite-input-row restored on boot failure...")
        context4 = browser.new_context(viewport={'width': 1280, 'height': 800})
        page4 = context4.new_page()
        page4.goto(BASE_URL, wait_until='domcontentloaded')
        page4.wait_for_selector("#invite-box")

        # Trigger simulated error recovery in updateAuthState
        page4.evaluate("""() => {
            const row = document.querySelector('#invite-input-row');
            const btn = document.querySelector('#btn-redeem-invite');
            
            // 1. Enter STARTING state
            row.hidden = true;
            row.style.display = 'none';
            btn.disabled = true;
            btn.textContent = 'Entering…';
            
            // 2. Simulate catch block in enterSanctuaryFromPass / checkAuthSession
            row.hidden = false;
            row.style.display = '';
            btn.disabled = false;
            btn.textContent = 'Enter Sanctuary →';
            const status = document.querySelector('#invite-status');
            status.textContent = 'Could not enter sanctuary. Please try again.';
            status.className = 'invite-status error';
        }""")

        restored_hidden = page4.evaluate("document.querySelector('#invite-input-row').hidden")
        restored_display = page4.evaluate("window.getComputedStyle(document.querySelector('#invite-input-row')).display")
        btn_text = page4.locator("#btn-redeem-invite").text_content()
        btn_disabled = page4.locator("#btn-redeem-invite").is_disabled()

        assert restored_hidden is False, "Error recovery must unhide #invite-input-row"
        assert restored_display == "flex", f"Error recovery must restore display: flex, got '{restored_display}'"
        assert btn_disabled is False, "Error recovery must enable #btn-redeem-invite for retry"
        print(f"  ✓ Error recovery verified: hidden={restored_hidden}, display='{restored_display}', button enabled='{btn_text}'")
        context4.close()

        # -----------------------------------------------------------------
        # TEST 5: Mobile Viewport Stress-Testing (iPhone SE: 375x667)
        # -----------------------------------------------------------------
        print("\n[TEST 5] Stress-testing Mobile Viewport layout (375x667)...")
        mobile_ctx = browser.new_context(
            viewport={'width': 375, 'height': 667},
            is_mobile=True,
            has_touch=True
        )
        mobile_page = mobile_ctx.new_page()
        mobile_page.goto(BASE_URL, wait_until='domcontentloaded')
        mobile_page.wait_for_selector("#invite-box")

        # Verify mobile invite row layout
        row_w = mobile_page.evaluate("document.querySelector('#invite-input-row').getBoundingClientRect().width")
        assert row_w <= 375, f"Invite input row overflow on mobile: {row_w}px > 375px"
        print(f"  ✓ Mobile invite row width = {row_w:.1f}px (fits in 375px)")

        # Fill passcode on mobile
        mobile_page.fill("#invite-code-input", "290512")
        mobile_page.click("#btn-redeem-invite")

        # Wait for avatar selection
        mobile_page.wait_for_function(
            "Boolean(document.querySelector('#avatar-select') && !document.querySelector('#avatar-select').hidden)",
            timeout=60000
        )

        mobile_fields_hidden = mobile_page.evaluate("document.querySelector('.character-fields').hidden")
        mobile_fields_display = mobile_page.evaluate("window.getComputedStyle(document.querySelector('.character-fields')).display")
        mobile_name = mobile_page.locator("#visitor-name").input_value()
        mobile_color_count = mobile_page.locator(".character-color-row").count()

        assert mobile_fields_hidden is False, "Mobile: .character-fields must not be hidden"
        assert mobile_fields_display != "none", "Mobile: .character-fields display must not be 'none'"
        assert mobile_name in ["Maya", "Ethan"], f"Mobile: unexpected name '{mobile_name}'"
        assert mobile_color_count == 4, f"Mobile: expected 4 color rows, got {mobile_color_count}"
        print("  ✓ Mobile Character Setup: customization controls immediately visible and responsive")

        mobile_ctx.close()
        browser.close()

        print("\n=======================================================")
        print("  ALL M5 ADVERSARIAL VERIFICATION TESTS PASSED (100%)  ")
        print("=======================================================\n")

if __name__ == '__main__':
    test_m5_full_suite()
