"""
Adversarial Verification of Avatar Rig, Actions & Invariants (Milestone M2)
Tests:
- actions.size === 20 on both Maya and Ethan
- Strict exclusion of 'clap' (cannot be registered, cannot be triggered)
- Approved actions 'wave', 'dance', 'nod' work properly
- Adversarial inputs to setEmote fail closed without crashing or corrupting state
"""
import sys
import json
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080/?code=290512'

init = '''
window.requestIdleCallback = () => 0;
window.requestAnimationFrame = cb => {
    const s = String(cb);
    if (s.includes('.getDelta()')) { window.__tick = cb; return 0; }
    if (s.includes('lastSend')) { window.__netTick = cb; return 0; }
    if (s.includes('.running')) { window.__previewTick = cb; return 0; }
    return setTimeout(() => cb(performance.now()), 0);
};
'''

APPROVED_20_ACTIONS = {
    'idle', 'walk', 'run', 'jump', 'wave', 'dance', 'sit', 'sitDown', 'standUp',
    'stepBack', 'nod', 'shake', 'turn', 'walkStart', 'walkStop', 'casualDance',
    'sitLow', 'sitHigh', 'lookLeft', 'lookRight'
}

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-web-security', '--disable-features=BlockInsecurePrivateNetworkRequests']
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        page.add_init_script(init)
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))

        print(f"Connecting to {url}...")
        page.goto(url, wait_until='domcontentloaded')
        page.wait_for_function("!document.querySelector('#avatar-select').hidden", polling=100, timeout=60000)

        # -------------------------------------------------------------
        # TEST 1: Choose Maya and wait for all 20 actions to register
        # -------------------------------------------------------------
        print("Selecting Maya...")
        page.evaluate("document.querySelector('[data-avatar-id=maya]').click()")
        page.wait_for_function("!document.querySelector('#btn-enter-museum').hidden", polling=100, timeout=60000)

        print("Waiting for Maya action stream to complete (all 20 actions)...")
        page.wait_for_function(
            'window.__multiplayer?.getState()?.localAvatar?.actions?.size === 20',
            polling=200,
            timeout=30000
        )

        maya_actions = page.evaluate('Array.from(window.__multiplayer.getState().localAvatar.actions.keys())')
        print(f"Maya registered {len(maya_actions)} actions: {sorted(maya_actions)}")
        assert len(maya_actions) == 20, f"Expected exactly 20 actions, got {len(maya_actions)}"
        assert set(maya_actions) == APPROVED_20_ACTIONS, f"Mismatch with approved 20: {set(maya_actions) ^ APPROVED_20_ACTIONS}"

        # -------------------------------------------------------------
        # TEST 2: Strict Exclusion of 'clap'
        # -------------------------------------------------------------
        assert 'clap' not in maya_actions, "'clap' must NOT be in registered actions"
        assert page.evaluate("window.__multiplayer.getState().localAvatar.actions.has('clap')") is False
        assert page.evaluate("window.__multiplayer.getState().localAvatar.actions.get('clap')") is None

        # Try to trigger 'clap' via setEmote('clap')
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote('clap')")
        assert page.evaluate("window.__multiplayer.getState().localAvatar.actions.has('clap')") is False
        assert page.evaluate("window.__multiplayer.getState().localAvatar.actions.size") == 20
        assert page.evaluate("window.__multiplayer.getState().localAvatar.actions.get('clap')") is None
        print("  ✓ Strict exclusion of 'clap' confirmed: cannot be queried or registered via setEmote('clap')")

        # -------------------------------------------------------------
        # TEST 3: Approved Emotes Triggering (Wave, Dance, Nod)
        # -------------------------------------------------------------
        # Wave (id: 1)
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(1, true)")
        assert page.evaluate("window.__multiplayer.getState().localAvatar.emoteAction") == 'wave'
        assert page.evaluate("window.__multiplayer.getState().localAvatar.actions.get('wave').isRunning()") is True
        print("  ✓ Approved action 'wave' successfully triggered and running")
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(1, false)")

        # Dance (id: 2)
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(2, true)")
        assert page.evaluate("window.__multiplayer.getState().localAvatar.emoteAction") == 'dance'
        assert page.evaluate("window.__multiplayer.getState().localAvatar.actions.get('dance').isRunning()") is True
        print("  ✓ Approved action 'dance' successfully triggered and running")
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(2, false)")

        # Nod (id: 3)
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(3, true)")
        assert page.evaluate("window.__multiplayer.getState().localAvatar.emoteAction") == 'nod'
        assert page.evaluate("window.__multiplayer.getState().localAvatar.actions.get('nod').isRunning()") is True
        print("  ✓ Approved action 'nod' successfully triggered and running")
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(3, false)")

        # -------------------------------------------------------------
        # TEST 4: Adversarial & Boundary Inputs to setEmote
        # -------------------------------------------------------------
        adversarial_emotes = [
            0, -1, 999, 'clap', 'cheer', 'point', '__proto__', 'constructor',
            'prototype', None, '', ' ', {'foo': 'bar'}, [1, 2]
        ]
        for adv in adversarial_emotes:
            page.evaluate(f"window.__multiplayer.getState().localAvatar.setEmote({json.dumps(adv)}, true)")
            # Should not crash, and actions.size must strictly remain 20
            size = page.evaluate("window.__multiplayer.getState().localAvatar.actions.size")
            assert size == 20, f"Action size mutated to {size} on adversarial input {adv}"
        print("  ✓ All 14 adversarial emote inputs rejected without crash or action table mutation")

        # -------------------------------------------------------------
        # TEST 5: Verify Ethan avatar rig identical behavior
        # -------------------------------------------------------------
        print("Selecting Ethan...")
        page.evaluate("document.querySelector('[data-avatar-id=ethan]').click()")
        page.wait_for_function(
            'window.__multiplayer?.getState()?.localAvatar?.actions?.size === 20',
            polling=200,
            timeout=30000
        )
        ethan_actions = page.evaluate('Array.from(window.__multiplayer.getState().localAvatar.actions.keys())')
        print(f"Ethan registered {len(ethan_actions)} actions: {sorted(ethan_actions)}")
        assert len(ethan_actions) == 20
        assert set(ethan_actions) == APPROVED_20_ACTIONS
        assert 'clap' not in ethan_actions

        # Test Ethan emotes
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(1, true)")
        assert page.evaluate("window.__multiplayer.getState().localAvatar.emoteAction") == 'wave'
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(2, true)")
        assert page.evaluate("window.__multiplayer.getState().localAvatar.emoteAction") == 'dance'
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(3, true)")
        assert page.evaluate("window.__multiplayer.getState().localAvatar.emoteAction") == 'nod'
        page.evaluate("window.__multiplayer.getState().localAvatar.setEmote(3, false)")
        print("  ✓ Ethan avatar rig passed all 20 actions and approved emote tests")

        # -------------------------------------------------------------
        # TEST 6: Rig Invariant - Facing Direction & Root Rotation
        # -------------------------------------------------------------
        # Root rotation must be Math.PI
        root_rot_y = page.evaluate("window.__multiplayer.getState().localAvatar.root.rotation.y")
        import math
        assert abs(root_rot_y - math.pi) < 1e-4, f"Root rotation Y must be Math.PI ({math.pi}), got {root_rot_y}"
        print(f"  ✓ Rig visual forward invariant verified: root.rotation.y = {root_rot_y} (Math.PI)")

        assert not errors, f"Page errors encountered: {errors}"
        browser.close()
        print("\n=======================================================")
        print("ALL AVATAR RIG, ACTION & INVARIANT CHALLENGES PASSED (100%)")
        print("=======================================================")

if __name__ == '__main__':
    run_tests()
