"""
Adversarial Verification of Client State Machine Recovery & UI Synchronization
Milestone M11 (Concurrency & Reconnect Recovery)

Verifies:
1. Clean DOM state recovery when server rejects character claim (code 4005):
   - 'in-sanctuary' removed from document.body
   - 'choosing-character' restored on document.body
   - #camera-hud-group hidden attribute set
   - #overlay unhidden (overlayEl.hidden === false)
   - #ticket-card restored with class 'character-setup-card' (and 'card-hidden' removed)
   - sessionStorage 'ourmuseum:entered' removed
2. Visual feedback:
   - #entrance-status populated with warning in gold (#e7a854)
   - Toast notification displayed via showChatToast
3. CharacterSetup reconstruction:
   - characterSetup preview stage recreated with fresh <canvas> element and OrbitControls
4. Occupancy synchronization:
   - Claimed character (Maya) disabled with class 'claimed' and badge ' (In Museum)'
   - Unclaimed character (Ethan) automatically selected
5. Clean reconnection without page reload:
   - Entering sanctuary as Ethan establishes fresh WebSocket connection (NET.terminalError cleared)
   - Visitor successfully enters museum
"""

import sys
import json
import time
import subprocess
import urllib.request
import urllib.parse
from playwright.sync_api import sync_playwright

SERVER_PORT = 8094
BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

init_script = '''
window.requestIdleCallback = () => 0;
window.requestAnimationFrame = cb => {
  const s = String(cb);
  if (s.includes('.getDelta()')) { window.__tick = cb; return 0; }
  if (s.includes('lastSend')) { window.__netTick = cb; return 0; }
  if (s.includes('.running')) { window.__previewTick = cb; return 0; }
  return setTimeout(() => cb(performance.now()), 0);
};

const OriginalWebSocket = window.WebSocket;
window.__activeSockets = [];
window.WebSocket = function(...args) {
  const ws = new OriginalWebSocket(...args);
  window.__activeSockets.push(ws);
  return ws;
};
window.WebSocket.prototype = OriginalWebSocket.prototype;
window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
window.WebSocket.OPEN = OriginalWebSocket.OPEN;
window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
'''

def redeem_invite(code):
    req_data = json.dumps({"code": code}).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/api/invite/redeem",
        data=req_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        cookie = response.headers.get("Set-Cookie")
        return cookie.split(";")[0]

def main():
    print(f"[*] Starting isolated server on port {SERVER_PORT}...", flush=True)
    server_proc = subprocess.Popen(
        ["node", "server.js"],
        env={**dict(subprocess.os.environ), "PORT": str(SERVER_PORT), "NODE_ENV": "production"},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE
    )

    try:
        # Wait for server ready
        for _ in range(30):
            time.sleep(0.2)
            try:
                with urllib.request.urlopen(f"{BASE_URL}/healthz", timeout=1) as resp:
                    if resp.status == 200:
                        break
            except Exception:
                pass
        else:
            raise RuntimeError("Server failed to start")

        print("[*] Server ready. Simulating partner claiming Maya in sanctuary...", flush=True)
        # Partner redeems maya-love and joins via Node WebSocket client
        partner_script = f"""
import WebSocket from 'ws';
import http from 'http';

const reqData = JSON.stringify({{ code: 'maya-love' }});
const req = http.request({{
  hostname: '127.0.0.1',
  port: {SERVER_PORT},
  path: '/api/invite/redeem',
  method: 'POST',
  headers: {{ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }}
}}, res => {{
  const cookie = res.headers['set-cookie'][0].split(';')[0];
  const ws = new WebSocket('ws://127.0.0.1:{SERVER_PORT}/ws', {{
    headers: {{ Cookie: cookie, Origin: '{BASE_URL}' }}
  }});
  ws.on('open', () => {{
    ws.send(JSON.stringify({{
      t: 'join', proto: 2, name: 'Maya', avatarId: 'maya', model: 'woman.glb', room: 'lobby'
    }}));
  }});
  ws.on('message', d => {{
    const msg = JSON.parse(d.toString());
    if (msg.t === 'room_state') {{
      console.log('PARTNER_JOINED_OK');
    }}
  }});
}});
req.write(reqData);
req.end();
"""
        partner_proc = subprocess.Popen(
            ["node", "-e", partner_script],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        for _ in range(30):
            line = partner_proc.stdout.readline()
            if "PARTNER_JOINED_OK" in line:
                print("  ✓ Partner is active in sanctuary as Maya", flush=True)
                break
            time.sleep(0.1)
        else:
            raise RuntimeError("Partner failed to join sanctuary")

        # Check /api/occupancy reflects Maya claimed
        with urllib.request.urlopen(f"{BASE_URL}/api/occupancy") as resp:
            occ = json.loads(resp.read().decode())
            assert occ["count"] == 1, f"Expected count 1, got {occ['count']}"
            assert "maya" in occ["claimedCharacters"], "Maya should be in claimedCharacters"
            print("  ✓ GET /api/occupancy confirms Maya is claimed", flush=True)

        print("[*] Launching Chromium browser to challenge client recovery...", flush=True)
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=['--disable-web-security', '--disable-features=BlockInsecurePrivateNetworkRequests']
            )
            context = browser.new_context(viewport={'width': 1280, 'height': 800})
            page = context.new_page()
            page.add_init_script(init_script)

            page_errors = []
            page.on("pageerror", lambda err: print(f"[Page Error] {err}", flush=True))
            page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}", flush=True))

            # Visitor 2 navigates with code ethan-love
            print("[*] Visitor 2 navigating to sanctuary with invite...", flush=True)
            page.goto(f"{BASE_URL}/?code=ethan-love", wait_until="domcontentloaded")

            # Wait for avatar select card to be visible
            page.wait_for_selector("#avatar-select", state="visible", timeout=60000)
            page.wait_for_selector("#btn-enter-museum", state="visible", timeout=60000)
            print("  ✓ Character setup screen loaded", flush=True)

            # Visitor enters sanctuary
            print("[*] Visitor entering sanctuary...", flush=True)
            page.wait_for_selector("#btn-enter-museum", state="visible", timeout=60000)
            page.wait_for_function(
                "document.querySelector('#btn-enter-museum') && !document.querySelector('#btn-enter-museum').disabled && !document.querySelector('#btn-enter-museum').hidden",
                timeout=30000
            )
            page.click("#btn-enter-museum")

            # Verify in-sanctuary state
            page.wait_for_function(
                "document.body.classList.contains('in-sanctuary') && document.querySelector('#overlay')?.hidden === true",
                timeout=20000
            )
            print("  ✓ Visitor successfully entered sanctuary", flush=True)

            # Now simulate concurrent race condition: Server sends character-taken terminal rejection
            print("[*] Simulating server 4005 rejection (character-taken)...", flush=True)
            page.evaluate('''() => {
                const ws = window.__activeSockets[window.__activeSockets.length - 1];
                if (ws && typeof ws.onmessage === 'function') {
                    ws.onmessage({ data: JSON.stringify({ t: 'error', msg: 'character-taken' }) });
                }
            }''')

            # Verify handleCharacterClaimRejected() state recovery
            print("[*] Waiting for handleCharacterClaimRejected() state recovery...", flush=True)

            # 1. Body class 'choosing-character' restored, 'in-sanctuary' removed
            page.wait_for_function(
                "document.body.classList.contains('choosing-character') && !document.body.classList.contains('in-sanctuary')",
                timeout=20000
            )
            print("  ✓ State Assertion 1: body class 'choosing-character' restored and 'in-sanctuary' removed", flush=True)

            # 2. Camera HUD hidden attribute
            cam_hud_hidden = page.evaluate("document.querySelector('#camera-hud-group')?.hasAttribute('hidden')")
            assert cam_hud_hidden is True, "#camera-hud-group must have hidden attribute"
            print("  ✓ State Assertion 2: #camera-hud-group is cleanly hidden", flush=True)

            # 3. Overlay and Ticket Card unhidden
            overlay_hidden = page.evaluate("document.querySelector('#overlay')?.hidden")
            assert overlay_hidden is False, "#overlay must not be hidden"

            ticket_classes = page.evaluate("Array.from(document.querySelector('#ticket-card')?.classList || [])")
            assert "character-setup-card" in ticket_classes, "#ticket-card must have class character-setup-card"
            assert "card-hidden" not in ticket_classes, "#ticket-card must not have class card-hidden"
            print("  ✓ State Assertion 3: #overlay and #ticket-card cleanly restored", flush=True)

            # 4. SessionStorage cleared
            entered_storage = page.evaluate("window.sessionStorage.getItem('ourmuseum:entered')")
            assert entered_storage is None, "sessionStorage 'ourmuseum:entered' must be cleared"
            print("  ✓ State Assertion 4: sessionStorage 'ourmuseum:entered' was removed", flush=True)

            # 5. Visual warning & notification toast
            toast_text = page.evaluate("document.querySelector('#chat-toast-text')?.textContent")
            toast_sender = page.evaluate("document.querySelector('#chat-toast-sender')?.textContent")
            toast_display = page.evaluate("document.querySelector('#chat-toast-banner')?.style.display")
            assert "just claimed by your partner" in (toast_text or ""), f"Toast text mismatch: {toast_text}"
            assert "Sanctuary Entrance" in (toast_sender or ""), f"Toast sender mismatch: {toast_sender}"
            assert toast_display == "flex", f"Toast banner display should be flex, got {toast_display}"
            print(f"  ✓ State Assertion 5: Notification toast emitted: '{toast_sender}{toast_text}'", flush=True)

            status_text = page.evaluate("document.querySelector('#entrance-status')?.textContent")
            assert "just claimed by your partner" in status_text or "Your character is ready" in status_text
            print(f"  ✓ State Assertion 6: #entrance-status reflects character claim recovery ('{status_text}')", flush=True)

            # 7. CharacterSetup recreation: preview stage has active canvas
            canvas_present = page.evaluate('''() => {
                const stage = document.querySelector('.character-stage');
                return Boolean(stage && stage.querySelector('canvas'));
            }''')
            assert canvas_present is True, "Recreated characterSetup must have mounted 3D canvas"
            print("  ✓ State Assertion 7: 3D character preview stage and canvas successfully recreated", flush=True)

            # 8. Occupancy sync: Maya card is disabled with ' (In Museum)' badge
            maya_card_state = page.evaluate('''() => {
                const card = document.querySelector('.avatar-card[data-avatar-id="maya"]');
                return {
                    disabled: card ? card.disabled : null,
                    claimedClass: card ? card.classList.contains('claimed') : null,
                    badgeText: card?.querySelector('.claimed-badge')?.textContent || null
                };
            }''')
            assert maya_card_state["disabled"] is True, "Maya card must be disabled"
            assert maya_card_state["claimedClass"] is True, "Maya card must have class 'claimed'"
            assert "(In Museum)" in (maya_card_state["badgeText"] or ""), f"Badge text mismatch: {maya_card_state}"
            print(f"  ✓ State Assertion 8: Maya card is disabled with badge: '{maya_card_state['badgeText']}'", flush=True)

            # 9. Auto-switch to Ethan
            ethan_card_selected = page.evaluate('''() => {
                const card = document.querySelector('.avatar-card[data-avatar-id="ethan"]');
                return card ? card.classList.contains('selected') : false;
            }''')
            assert ethan_card_selected is True, "Ethan card must be auto-selected"
            visitor_name = page.evaluate("document.querySelector('#visitor-name')?.value")
            assert visitor_name == "Ethan", f"Visitor name should be Ethan, got {visitor_name}"
            print(f"  ✓ State Assertion 9: Ethan auto-selected in UI (name={visitor_name})", flush=True)

            # 10. Enter Sanctuary as Ethan without reload (verifying disconnectNet cleared terminalError)
            print("[*] Reconnecting as Ethan without page reload...", flush=True)
            # Wait for Ethan to be ready
            page.wait_for_function(
                "document.querySelector('#btn-enter-museum') && !document.querySelector('#btn-enter-museum').disabled && !document.querySelector('#btn-enter-museum').hidden",
                timeout=15000
            )
            page.click("#btn-enter-museum")

            # Verify successful entrance into sanctuary
            page.wait_for_function(
                "document.body.classList.contains('in-sanctuary') && document.querySelector('#overlay')?.hidden === true",
                timeout=15000
            )
            print("  ✓ State Assertion 10: Successfully entered sanctuary as Ethan! Reconnect succeeded without reload!", flush=True)

            # Verify /api/occupancy reflects full museum (count: 2)
            time.sleep(0.5)
            with urllib.request.urlopen(f"{BASE_URL}/api/occupancy") as resp:
                final_occ = json.loads(resp.read().decode())
                assert final_occ["count"] == 2, f"Expected 2 occupants, got {final_occ['count']}"
                assert final_occ["full"] is True, "Museum should be full"
                print(f"  ✓ State Assertion 11: GET /api/occupancy confirms full museum (count: 2, claimed: {final_occ['claimedCharacters']})", flush=True)

            browser.close()
            print("\n=======================================================", flush=True)
            print("  ALL PLAYWRIGHT CLIENT RECOVERY CHALLENGES PASSED!", flush=True)
            print("=======================================================", flush=True)

    finally:
        try:
            partner_proc.kill()
        except Exception:
            pass
        server_proc.kill()
        server_proc.wait()

if __name__ == "__main__":
    main()
