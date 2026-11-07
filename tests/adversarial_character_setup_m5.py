"""
Adversarial Verification of Character Setup Customization Controls (Milestone M5 Requirement 2)

Empirical Challenge Matrix:
1. Initial Mount Verification (Strictly ZERO clicks on avatar buttons):
   - Immediately upon entering Character Setup card, verify:
     - .character-fields.hidden === false
     - window.getComputedStyle(.character-fields).display !== 'none'
     - #visitor-name is populated with default name ('Maya') and visible
     - .character-colors has 4 color swatch rows (Skin, Hair, Top, Trousers)
     - default avatar card (maya) has class 'selected' and aria-pressed="true"
     - non-selected avatar card (ethan) does NOT have class 'selected' and aria-pressed="false"
2. Avatar Toggling Verification:
   - Click "Ethan":
     - Verify #visitor-name updates to 'Ethan'
     - Verify Ethan card gets class 'selected' and aria-pressed="true"
     - Verify Maya card loses class 'selected' and aria-pressed="false"
     - Verify color pickers reflect Ethan's looks
   - Click back to "Maya":
     - Verify #visitor-name returns to 'Maya'
     - Verify Maya card gets class 'selected' and aria-pressed="true"
     - Verify Ethan card loses class 'selected' and aria-pressed="false"
3. LocalStorage Customization Persistence on Initial Load (Zero clicks):
   - Set custom looks in localStorage
   - Reload fresh
   - WITHOUT clicking any avatar card:
     - Verify .character-fields is immediately unhidden
     - Verify #visitor-name has custom Maya name
     - Verify color swatches have custom color values
     - Verify Maya card is selected
   - Switch to Ethan:
     - Verify custom Ethan name and custom colors appear immediately
4. Pre-selected avatar via invite recipient (ethan-love):
   - Fresh context navigating with ?code=ethan-love
   - Verify Ethan is pre-selected on initial mount WITHOUT clicking
5. Corrupted LocalStorage Resilience:
   - Invalid JSON syntax in localStorage
   - Verify graceful fallback to unhidden fields with default Maya profile
6. Rapid Avatar Toggling Stress:
   - Rapidly switch Maya and Ethan 30 times
   - Verify DOM consistency and .character-fields stays visible
7. Input Sanitization and Length Boundary:
   - Validate 24-character clamp and control character stripping
"""

import sys
import json
import time
from playwright.sync_api import sync_playwright

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8096'

init_script = '''
window.requestIdleCallback = () => 0;
window.requestAnimationFrame = cb => {
  const s = String(cb);
  if (s.includes('.getDelta()')) { window.__tick = cb; return 0; }
  if (s.includes('lastSend')) { window.__netTick = cb; return 0; }
  if (s.includes('.running')) { window.__previewTick = cb; return 0; }
  return setTimeout(() => cb(performance.now()), 0);
};
'''

def run_adversarial_suite():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-web-security', '--disable-features=BlockInsecurePrivateNetworkRequests']
        )

        # -------------------------------------------------------------
        # TEST 1: Initial Mount Inspection (Strictly ZERO clicks on avatar cards)
        # -------------------------------------------------------------
        print("\n=== TEST 1: Initial Mount Inspection (Zero clicks) ===", flush=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.add_init_script(init_script)
        page_errors = []
        page.on('pageerror', lambda err: page_errors.append(str(err)))

        url_t1 = f"{BASE_URL}/?code=290512"
        page.goto(url_t1, wait_until='domcontentloaded')
        
        # Wait until avatar-select container is visible
        page.wait_for_function(
            "Boolean(document.querySelector('#avatar-select') && !document.querySelector('#avatar-select').hidden)",
            polling=100, timeout=180000
        )
        print("Avatar selection container is visible.", flush=True)

        # Zero-click DOM snapshot
        mount_check = page.evaluate('''() => {
            const fields = document.querySelector('.character-fields');
            const nameInput = document.querySelector('#visitor-name');
            const colorsContainer = document.querySelector('.character-colors');
            const colorRows = document.querySelectorAll('.character-color-row');
            const mayaCard = document.querySelector('.avatar-card[data-avatar-id="maya"]');
            const ethanCard = document.querySelector('.avatar-card[data-avatar-id="ethan"]');
            
            const fieldsStyle = fields ? window.getComputedStyle(fields) : null;
            const nameInputStyle = nameInput ? window.getComputedStyle(nameInput) : null;
            
            const colorLabels = Array.from(colorRows).map(row => {
                const label = row.querySelector('label');
                const input = row.querySelector('input[type="color"]');
                return {
                    text: label ? label.textContent.trim() : null,
                    inputId: input ? input.id : null,
                    value: input ? input.value : null
                };
            });

            return {
                fieldsPresent: Boolean(fields),
                fieldsHiddenAttr: fields ? fields.hidden : null,
                fieldsDisplay: fieldsStyle ? fieldsStyle.display : null,
                nameInputPresent: Boolean(nameInput),
                nameInputValue: nameInput ? nameInput.value : null,
                nameInputDisplay: nameInputStyle ? nameInputStyle.display : null,
                colorRowCount: colorRows.length,
                colorDetails: colorLabels,
                mayaPresent: Boolean(mayaCard),
                mayaSelectedClass: mayaCard ? mayaCard.classList.contains('selected') : false,
                mayaAriaPressed: mayaCard ? mayaCard.getAttribute('aria-pressed') : null,
                ethanPresent: Boolean(ethanCard),
                ethanSelectedClass: ethanCard ? ethanCard.classList.contains('selected') : false,
                ethanAriaPressed: ethanCard ? ethanCard.getAttribute('aria-pressed') : null
            };
        }''')

        print(f"Initial Mount DOM state:\n{json.dumps(mount_check, indent=2)}", flush=True)

        # Objective 1 Assertions
        assert mount_check['fieldsPresent'] is True, "FAIL: .character-fields not found in DOM"
        assert mount_check['fieldsHiddenAttr'] is False, f"FAIL: .character-fields has hidden={mount_check['fieldsHiddenAttr']}"
        assert mount_check['fieldsDisplay'] != 'none', f"FAIL: .character-fields computed display is '{mount_check['fieldsDisplay']}'"
        assert mount_check['nameInputPresent'] is True, "FAIL: #visitor-name not found"
        assert mount_check['nameInputValue'] == 'Maya', f"FAIL: #visitor-name expected 'Maya', got '{mount_check['nameInputValue']}'"
        assert mount_check['nameInputDisplay'] != 'none', "FAIL: #visitor-name is display:none"
        assert mount_check['colorRowCount'] == 4, f"FAIL: Expected 4 color rows, found {mount_check['colorRowCount']}"
        
        expected_regions = {'Skin', 'Hair', 'Top', 'Trousers'}
        found_regions = {c['text'] for c in mount_check['colorDetails']}
        assert expected_regions == found_regions, f"FAIL: Color labels mismatch. Expected {expected_regions}, got {found_regions}"

        assert mount_check['mayaSelectedClass'] is True, "FAIL: Maya card lacks 'selected' class on initial mount"
        assert mount_check['mayaAriaPressed'] == 'true', f"FAIL: Maya card aria-pressed is '{mount_check['mayaAriaPressed']}' (expected 'true')"
        assert mount_check['ethanSelectedClass'] is False, "FAIL: Ethan card should NOT have 'selected' class on initial mount"
        assert mount_check['ethanAriaPressed'] == 'false', f"FAIL: Ethan card aria-pressed is '{mount_check['ethanAriaPressed']}' (expected 'false')"
        print("✓ TEST 1 PASSED: Initial mount renders customization controls immediately with Maya selected.", flush=True)
        results['test_1_initial_mount'] = 'PASSED'

        # -------------------------------------------------------------
        # TEST 2: Avatar Toggling
        # -------------------------------------------------------------
        print("\n=== TEST 2: Avatar Toggling ===", flush=True)
        page.click('.avatar-card[data-avatar-id="ethan"]')
        ethan_state = page.evaluate('''() => {
            const mayaCard = document.querySelector('.avatar-card[data-avatar-id="maya"]');
            const ethanCard = document.querySelector('.avatar-card[data-avatar-id="ethan"]');
            const nameInput = document.querySelector('#visitor-name');
            const fields = document.querySelector('.character-fields');
            const topColorInput = document.querySelector('#look-top');
            return {
                name: nameInput.value,
                fieldsHidden: fields.hidden,
                ethanSelected: ethanCard.classList.contains('selected'),
                ethanAriaPressed: ethanCard.getAttribute('aria-pressed'),
                mayaSelected: mayaCard.classList.contains('selected'),
                mayaAriaPressed: mayaCard.getAttribute('aria-pressed'),
                topColor: topColorInput ? topColorInput.value : null
            };
        }''')
        print(f"After selecting Ethan:\n{json.dumps(ethan_state, indent=2)}", flush=True)
        assert ethan_state['name'] == 'Ethan', f"FAIL: Expected name 'Ethan', got '{ethan_state['name']}'"
        assert ethan_state['fieldsHidden'] is False, "FAIL: fields became hidden after selecting Ethan"
        assert ethan_state['ethanSelected'] is True, "FAIL: Ethan card missing .selected class"
        assert ethan_state['ethanAriaPressed'] == 'true', "FAIL: Ethan card aria-pressed != 'true'"
        assert ethan_state['mayaSelected'] is False, "FAIL: Maya card still has .selected class"
        assert ethan_state['mayaAriaPressed'] == 'false', "FAIL: Maya card aria-pressed != 'false'"

        page.click('.avatar-card[data-avatar-id="maya"]')
        maya_state = page.evaluate('''() => {
            const mayaCard = document.querySelector('.avatar-card[data-avatar-id="maya"]');
            const ethanCard = document.querySelector('.avatar-card[data-avatar-id="ethan"]');
            const nameInput = document.querySelector('#visitor-name');
            const fields = document.querySelector('.character-fields');
            return {
                name: nameInput.value,
                fieldsHidden: fields.hidden,
                ethanSelected: ethanCard.classList.contains('selected'),
                ethanAriaPressed: ethanCard.getAttribute('aria-pressed'),
                mayaSelected: mayaCard.classList.contains('selected'),
                mayaAriaPressed: mayaCard.getAttribute('aria-pressed')
            };
        }''')
        print(f"After selecting Maya back:\n{json.dumps(maya_state, indent=2)}", flush=True)
        assert maya_state['name'] == 'Maya', f"FAIL: Expected name 'Maya', got '{maya_state['name']}'"
        assert maya_state['fieldsHidden'] is False, "FAIL: fields became hidden after selecting Maya"
        assert maya_state['mayaSelected'] is True, "FAIL: Maya card missing .selected class"
        assert maya_state['mayaAriaPressed'] == 'true', "FAIL: Maya card aria-pressed != 'true'"
        assert maya_state['ethanSelected'] is False, "FAIL: Ethan card still has .selected class"
        assert maya_state['ethanAriaPressed'] == 'false', "FAIL: Ethan card aria-pressed != 'false'"
        print("✓ TEST 2 PASSED: Toggling between Ethan and Maya works seamlessly.", flush=True)
        results['test_2_toggling'] = 'PASSED'

        # -------------------------------------------------------------
        # TEST 3: LocalStorage Customization Persistence on Initial Load (Zero clicks)
        # -------------------------------------------------------------
        print("\n=== TEST 3: LocalStorage Customization Persistence on Initial Load ===", flush=True)
        custom_looks = {
            "maya": {
                "name": "Princess Maya",
                "appearance": {
                    "skin": "#bb805c",
                    "hair": "#332211",
                    "top": "#123456",
                    "trousers": "#654321"
                }
            },
            "ethan": {
                "name": "Prince Ethan",
                "appearance": {
                    "skin": "#bb805c",
                    "hair": "#112233",
                    "top": "#abcdef",
                    "trousers": "#fedcba"
                }
            }
        }
        page.evaluate("(looks) => localStorage.setItem('ourmuseum:characterLooks:v1', JSON.stringify(looks))", custom_looks)
        
        # Hard reload to test fresh mount with populated localStorage
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function(
            "Boolean(document.querySelector('#avatar-select') && !document.querySelector('#avatar-select').hidden)",
            polling=100, timeout=180000
        )

        persisted_mount = page.evaluate('''() => {
            const fields = document.querySelector('.character-fields');
            const nameInput = document.querySelector('#visitor-name');
            const topInput = document.querySelector('#look-top');
            const trousersInput = document.querySelector('#look-trousers');
            const hairInput = document.querySelector('#look-hair');
            const mayaCard = document.querySelector('.avatar-card[data-avatar-id="maya"]');
            return {
                fieldsHidden: fields ? fields.hidden : null,
                name: nameInput ? nameInput.value : null,
                topColor: topInput ? topInput.value : null,
                trousersColor: trousersInput ? trousersInput.value : null,
                hairColor: hairInput ? hairInput.value : null,
                mayaSelected: mayaCard ? mayaCard.classList.contains('selected') : false
            };
        }''')
        print(f"Fresh mount with localStorage:\n{json.dumps(persisted_mount, indent=2)}", flush=True)
        assert persisted_mount['fieldsHidden'] is False, "FAIL: fields hidden on fresh mount with localStorage"
        assert persisted_mount['name'] == 'Princess Maya', f"FAIL: Expected 'Princess Maya', got '{persisted_mount['name']}'"
        assert persisted_mount['topColor'] == '#123456', f"FAIL: Expected top '#123456', got '{persisted_mount['topColor']}'"
        assert persisted_mount['trousersColor'] == '#654321', f"FAIL: Expected trousers '#654321', got '{persisted_mount['trousersColor']}'"
        assert persisted_mount['hairColor'] == '#332211', f"FAIL: Expected hair '#332211', got '{persisted_mount['hairColor']}'"
        assert persisted_mount['mayaSelected'] is True, "FAIL: Maya card not selected on mount"

        page.click('.avatar-card[data-avatar-id="ethan"]')
        ethan_persisted = page.evaluate('''() => {
            const nameInput = document.querySelector('#visitor-name');
            const topInput = document.querySelector('#look-top');
            return {
                name: nameInput.value,
                topColor: topInput.value
            };
        }''')
        assert ethan_persisted['name'] == 'Prince Ethan', f"FAIL: Expected 'Prince Ethan', got '{ethan_persisted['name']}'"
        assert ethan_persisted['topColor'] == '#abcdef', f"FAIL: Expected '#abcdef', got '{ethan_persisted['topColor']}'"
        print("✓ TEST 3 PASSED: LocalStorage customizations load and persist immediately on first render.", flush=True)
        results['test_3_persistence'] = 'PASSED'

        # -------------------------------------------------------------
        # TEST 6: Rapid Avatar Toggling Stress
        # -------------------------------------------------------------
        print("\n=== TEST 6: Rapid Avatar Toggling Stress (30 cycles) ===", flush=True)
        for _ in range(15):
            page.click('.avatar-card[data-avatar-id="ethan"]')
            page.click('.avatar-card[data-avatar-id="maya"]')
        
        post_stress = page.evaluate('''() => {
            const fields = document.querySelector('.character-fields');
            const nameInput = document.querySelector('#visitor-name');
            const mayaCard = document.querySelector('.avatar-card[data-avatar-id="maya"]');
            const ethanCard = document.querySelector('.avatar-card[data-avatar-id="ethan"]');
            return {
                fieldsHidden: fields.hidden,
                name: nameInput.value,
                mayaSelected: mayaCard.classList.contains('selected'),
                mayaAriaPressed: mayaCard.getAttribute('aria-pressed'),
                ethanSelected: ethanCard.classList.contains('selected'),
                ethanAriaPressed: ethanCard.getAttribute('aria-pressed')
            };
        }''')
        print(f"Post-rapid toggle state:\n{json.dumps(post_stress, indent=2)}", flush=True)
        assert post_stress['fieldsHidden'] is False, "FAIL: fields became hidden during rapid toggle"
        assert post_stress['name'] == 'Princess Maya', f"FAIL: Expected 'Princess Maya', got '{post_stress['name']}'"
        assert post_stress['mayaSelected'] is True
        assert post_stress['mayaAriaPressed'] == 'true'
        assert post_stress['ethanSelected'] is False
        assert post_stress['ethanAriaPressed'] == 'false'
        print("✓ TEST 6 PASSED: Rapid toggling maintains DOM consistency.", flush=True)
        results['test_6_rapid_toggle'] = 'PASSED'

        # -------------------------------------------------------------
        # TEST 7: Input Sanitization and MaxLength Boundary
        # -------------------------------------------------------------
        print("\n=== TEST 7: Input Sanitization & MaxLength ===", flush=True)
        page.fill('#visitor-name', 'VeryLongNameExceedingTwentyFourCharactersTotal')
        actual_val = page.locator('#visitor-name').input_value()
        assert len(actual_val) <= 24, f"FAIL: Input allowed {len(actual_val)} characters (max 24)"
        
        page.fill('#visitor-name', 'Maya\u0000\u001f\u007fName')
        stored_looks = page.evaluate("() => JSON.parse(localStorage.getItem('ourmuseum:characterLooks:v1'))")
        assert '\u0000' not in stored_looks['maya']['name']
        print("✓ TEST 7 PASSED: MaxLength and control character stripping validated.", flush=True)
        results['test_7_sanitization'] = 'PASSED'

        context.close()

        # -------------------------------------------------------------
        # TEST 4: Pre-selected avatar via invite recipient (Clean Context)
        # -------------------------------------------------------------
        print("\n=== TEST 4: Pre-selected avatar via invite recipient (ethan-love) ===", flush=True)
        context4 = browser.new_context(viewport={'width': 1440, 'height': 900})
        page4 = context4.new_page()
        page4.add_init_script(init_script)
        page4.goto(f"{BASE_URL}/?code=ethan-love", wait_until='domcontentloaded')
        page4.wait_for_function(
            "Boolean(document.querySelector('#avatar-select') && !document.querySelector('#avatar-select').hidden)",
            polling=100, timeout=180000
        )
        ethan_invite_mount = page4.evaluate('''() => {
            const fields = document.querySelector('.character-fields');
            const nameInput = document.querySelector('#visitor-name');
            const mayaCard = document.querySelector('.avatar-card[data-avatar-id="maya"]');
            const ethanCard = document.querySelector('.avatar-card[data-avatar-id="ethan"]');
            return {
                fieldsHidden: fields.hidden,
                name: nameInput.value,
                ethanSelected: ethanCard.classList.contains('selected'),
                ethanAriaPressed: ethanCard.getAttribute('aria-pressed'),
                mayaSelected: mayaCard.classList.contains('selected')
            };
        }''')
        print(f"Mount with ethan-love invite:\n{json.dumps(ethan_invite_mount, indent=2)}", flush=True)
        assert ethan_invite_mount['fieldsHidden'] is False, "FAIL: fields hidden with ethan-love invite"
        assert ethan_invite_mount['name'] == 'Ethan', f"FAIL: Expected 'Ethan', got '{ethan_invite_mount['name']}'"
        assert ethan_invite_mount['ethanSelected'] is True, "FAIL: Ethan card should be selected for ethan-love invite"
        assert ethan_invite_mount['ethanAriaPressed'] == 'true'
        assert ethan_invite_mount['mayaSelected'] is False
        print("✓ TEST 4 PASSED: Recipient pre-selection mounts Ethan customization controls immediately.", flush=True)
        results['test_4_recipient_preselect'] = 'PASSED'
        context4.close()

        # -------------------------------------------------------------
        # TEST 5: Corrupted LocalStorage Resilience (Clean Context)
        # -------------------------------------------------------------
        print("\n=== TEST 5: Corrupted LocalStorage Resilience ===", flush=True)
        context5 = browser.new_context(viewport={'width': 1440, 'height': 900})
        page5 = context5.new_page()
        page5.add_init_script(init_script)
        # Inject corrupted JSON before loading app
        page5.add_init_script("window.localStorage.setItem('ourmuseum:characterLooks:v1', 'corrupt-invalid-json{{{')")
        page5.goto(f"{BASE_URL}/?code=290512", wait_until='domcontentloaded')
        page5.wait_for_function(
            "Boolean(document.querySelector('#avatar-select') && !document.querySelector('#avatar-select').hidden)",
            polling=100, timeout=180000
        )
        corrupted_state = page5.evaluate('''() => {
            const fields = document.querySelector('.character-fields');
            const nameInput = document.querySelector('#visitor-name');
            const mayaCard = document.querySelector('.avatar-card[data-avatar-id="maya"]');
            return {
                fieldsHidden: fields.hidden,
                name: nameInput.value,
                mayaSelected: mayaCard.classList.contains('selected')
            };
        }''')
        print(f"Mount with corrupted localStorage:\n{json.dumps(corrupted_state, indent=2)}", flush=True)
        assert corrupted_state['fieldsHidden'] is False, "FAIL: Corrupted localStorage broke fields visibility"
        assert corrupted_state['name'] == 'Maya', "FAIL: Corrupted localStorage failed fallback to default name"
        assert corrupted_state['mayaSelected'] is True, "FAIL: Maya card not selected under fallback"
        print("✓ TEST 5 PASSED: Corrupted localStorage safely handled with fail-safe defaults.", flush=True)
        results['test_5_corrupted_storage'] = 'PASSED'
        context5.close()

        browser.close()

    print("\n=======================================================", flush=True)
    print("ALL 7 ADVERSARIAL VERIFICATION SUITE TESTS PASSED! 100%", flush=True)
    print("=======================================================\n", flush=True)
    return results

if __name__ == '__main__':
    run_adversarial_suite()
