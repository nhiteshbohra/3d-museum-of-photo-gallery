import time
import subprocess
import sys
import os
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(line_buffering=True)

def wait_for_condition(page, js_expr, desc="condition", timeout=45, interval=0.5):
    t0 = time.time()
    print(f"  [Waiting] {desc} (timeout {timeout}s)...", flush=True)
    last_debug = 0
    while time.time() - t0 < timeout:
        try:
            val = page.evaluate(js_expr)
            if val:
                print(f"  [Condition Met] {desc} in {time.time() - t0:.2f}s", flush=True)
                return val
        except Exception:
            pass
        if time.time() - t0 - last_debug > 5:
            last_debug = time.time() - t0
            print(f"    ...still waiting for {desc} ({last_debug:.1f}s elapsed)...", flush=True)
        time.sleep(interval)
    raise TimeoutError(f"Condition timed out after {timeout}s: {desc}")

def run_test():
    port = "8997"
    print(f"[TEST] Starting server on port {port}...")
    env = os.environ.copy()
    env["PORT"] = port
    env["NODE_ENV"] = "production"
    
    server_log = open("tests/server_test.log", "w")
    proc = subprocess.Popen(["node", "server.js"], env=env, stdout=server_log, stderr=server_log)
    time.sleep(2)
    
    try:
        with sync_playwright() as p:
            print("[TEST] Launching Chromium instances...")
            browser1 = p.chromium.launch(headless=True, args=["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox"])
            page1 = browser1.new_page(viewport={"width": 1280, "height": 800})
            page1.on("console", lambda m: print(f"[Page1 Console {m.type}] {m.text}"))
            page1.on("pageerror", lambda e: print(f"[Page1 Error] {e}"))
            
            browser2 = p.chromium.launch(headless=True, args=["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox"])
            page2 = browser2.new_page(viewport={"width": 1280, "height": 800})
            page2.on("console", lambda m: print(f"[Page2 Console {m.type}] {m.text}"))
            page2.on("pageerror", lambda e: print(f"[Page2 Error] {e}"))
            
            # -----------------------------------------------------------------
            # TEST 1: Phase 1 Authentication-First Gate
            # -----------------------------------------------------------------
            print("\n--- TEST 1: Phase 1 Authentication-First Gate ---")
            page1.goto(f"http://127.0.0.1:{port}/", wait_until="domcontentloaded")
            time.sleep(1)
            
            # Assert entrance loading is hidden
            loading_hidden = page1.evaluate("() => document.querySelector('#entrance-loading').hasAttribute('hidden')")
            print(f"  [Gate] Entrance loading hidden initially: {loading_hidden}")
            assert loading_hidden, "Entrance loading should be hidden before authentication"
            
            # Assert Three.js engineApi is not started
            engine_started = page1.evaluate("() => !!window.__engineApi")
            print(f"  [Gate] Engine uninitialized before authentication: {not engine_started}")
            assert not engine_started, "Three.js should NOT initialize before authentication"
            
            # -----------------------------------------------------------------
            # TEST 2: Passcode Verification & Entrance
            # -----------------------------------------------------------------
            print("\n--- TEST 2: Passcode Verification & Entrance ---")
            # Visitor 1 (Maya)
            page1.fill("#invite-code-input", "maya-love")
            page1.click("#btn-redeem-invite")
            page1.wait_for_selector("#avatar-select:not([hidden])", timeout=35000)
            print("  [Pass 1] Maya pass verified, avatar select displayed.")
            page1.evaluate("() => { const el = document.querySelector(\"[data-avatar-id='maya']\"); if (el) el.click(); }")
            page1.wait_for_selector("#btn-enter-museum:not([disabled]):not([hidden])", timeout=35000)
            page1.evaluate("() => document.querySelector('#btn-enter-museum').click()")
            wait_for_condition(page1, "() => window.__multiplayer && window.__multiplayer.isConnected()", "Page 1 WS Connected")
            print("  [Pass 1] Maya entered sanctuary and connected to WebSocket.")
            
            # Visitor 2 (Ethan)
            page2.goto(f"http://127.0.0.1:{port}/", wait_until="domcontentloaded")
            page2.fill("#invite-code-input", "ethan-love")
            page2.click("#btn-redeem-invite")
            page2.wait_for_selector("#avatar-select:not([hidden])", timeout=35000)
            print("  [Pass 2] Ethan pass verified, avatar select displayed.")
            is_ethan = page2.evaluate("() => { const el = document.querySelector(\"[data-avatar-id='ethan']\"); return el && el.classList.contains('selected'); }")
            if not is_ethan:
                page2.evaluate("() => { const el = document.querySelector(\"[data-avatar-id='ethan']\"); if (el) el.click(); }")
            page2.wait_for_selector("#btn-enter-museum:not([disabled]):not([hidden])", timeout=45000)
            time.sleep(1.0)
            page2.evaluate("() => document.querySelector('#btn-enter-museum').click()")
            wait_for_condition(page2, "() => window.__multiplayer && window.__multiplayer.isConnected()", "Page 2 WS Connected")
            print("  [Pass 2] Ethan entered sanctuary and connected to WebSocket.")
            
            # -----------------------------------------------------------------
            # TEST 3: Avatar Visibility in Same Room (Lobby)
            # -----------------------------------------------------------------
            print("\n--- TEST 3: Avatar Visibility in Lobby ---")
            wait_for_condition(page1, """() => {
                const mp = window.__multiplayer;
                if (!mp) return false;
                const remotes = [...mp.getState().world.remote.values()];
                return remotes.length > 0 && remotes[0].root && remotes[0].group && remotes[0].group.visible;
            }""", "Page 1 Sees Page 2 (Root & Group Visible)", timeout=60)
            wait_for_condition(page2, """() => {
                const mp = window.__multiplayer;
                if (!mp) return false;
                const remotes = [...mp.getState().world.remote.values()];
                return remotes.length > 0 && remotes[0].root && remotes[0].group && remotes[0].group.visible;
            }""", "Page 2 Sees Page 1 (Root & Group Visible)", timeout=60)
            
            p1_views_p2 = page1.evaluate("""() => {
                const mp = window.__multiplayer;
                const remotes = [...mp.getState().world.remote.values()];
                if (remotes.length === 0) return { error: "no_remote" };
                const rem = remotes[0];
                return {
                    name: rem.name,
                    visible: rem.group ? rem.group.visible : false,
                    hasRoot: !!rem.root,
                    position: rem.group ? [rem.group.position.x, rem.group.position.y, rem.group.position.z] : null,
                    tagText: rem.tag ? rem.tag.textContent : null,
                    tagVisible: rem.tag ? rem.tag.style.display !== 'none' : false,
                };
            }""")
            print(f"  [P1 sees P2]: {p1_views_p2}")
            assert p1_views_p2.get("visible") is True, f"Remote avatar should be visible to Page 1: {p1_views_p2}"
            assert p1_views_p2.get("name") == "Ethan", f"Remote avatar name should be Ethan: {p1_views_p2}"
            
            p2_views_p1 = page2.evaluate("""() => {
                const mp = window.__multiplayer;
                const remotes = [...mp.getState().world.remote.values()];
                if (remotes.length === 0) return { error: "no_remote" };
                const rem = remotes[0];
                return {
                    name: rem.name,
                    visible: rem.group ? rem.group.visible : false,
                    hasRoot: !!rem.root,
                    position: rem.group ? [rem.group.position.x, rem.group.position.y, rem.group.position.z] : null,
                    tagText: rem.tag ? rem.tag.textContent : null,
                    tagVisible: rem.tag ? rem.tag.style.display !== 'none' : false,
                };
            }""")
            print(f"  [P2 sees P1]: {p2_views_p1}")
            assert p2_views_p1.get("visible") is True, f"Remote avatar should be visible to Page 2: {p2_views_p1}"
            assert p2_views_p1.get("name") == "Maya", f"Remote avatar name should be Maya: {p2_views_p1}"
            
            # -----------------------------------------------------------------
            # TEST 4: Real-time Movement Synchronization
            # -----------------------------------------------------------------
            print("\n--- TEST 4: Real-time Movement Synchronization ---")
            initial_z = p1_views_p2["position"][2]
            
            # Page 2 moves forward
            page2.keyboard.down("KeyW")
            time.sleep(1.2)
            page2.keyboard.up("KeyW")
            time.sleep(0.5)
            
            new_pos = page1.evaluate("""() => {
                const mp = window.__multiplayer;
                const rem = [...mp.getState().world.remote.values()][0];
                return rem ? [rem.group.position.x, rem.group.position.y, rem.group.position.z] : null;
            }""")
            print(f"  [Movement Sync] Initial Z: {initial_z:.2f}, New Z: {new_pos[2]:.2f}")
            assert abs(new_pos[2] - initial_z) > 0.3, "Remote avatar position did not synchronize on Page 1!"
            
            # -----------------------------------------------------------------
            # TEST 5: Gestures Drawer UI & Approved Emotes
            # -----------------------------------------------------------------
            print("\n--- TEST 5: Gestures Drawer UI & Emotes ---")
            # Press G on Page 1 to toggle drawer
            page1.keyboard.press("KeyG")
            drawer_style = page1.evaluate("""() => {
                const d = document.querySelector('#hud-animations-drawer');
                const computed = window.getComputedStyle(d);
                return {
                    display: d.style.display,
                    left: computed.left,
                    position: computed.position,
                };
            }""")
            print(f"  [Gestures Drawer] Style: {drawer_style}")
            assert drawer_style["display"] == "block", "Drawer should be open after pressing G"
            assert "20px" in drawer_style["left"], "Drawer should be positioned on the left side"
            
            # Trigger Emote 1 (Wave) on Page 2
            page2.keyboard.press("Digit1")
            time.sleep(0.3)
            
            emote_status = page1.evaluate("""() => {
                const mp = window.__multiplayer;
                const rem = [...mp.getState().world.remote.values()][0];
                return {
                    emoteAction: rem ? rem.emoteAction : null,
                };
            }""")
            print(f"  [Emote Sync] Page 1 sees remote emote: {emote_status}")
            assert emote_status.get("emoteAction") == "wave", f"Remote avatar should be playing wave: {emote_status}"
            
            # -----------------------------------------------------------------
            # TEST 6: Room Awareness & 'Go there' Navigation
            # -----------------------------------------------------------------
            print("\n--- TEST 6: Room Awareness & Navigation ---")
            # Page 2 navigates to gallery "our-story"
            page2.evaluate("() => window.__loadAndEnterGallery('Our Story', { pushHistory: true })")
            time.sleep(1.5)
            
            # Page 1 checks partner panel and avatar visibility
            room_check = page1.evaluate("""() => {
                const mp = window.__multiplayer;
                const rem = [...mp.getState().world.remote.values()][0];
                const panel = document.querySelector('#partner-panel');
                const partnerRoom = document.querySelector('#partner-room');
                return {
                    partnerRoomText: partnerRoom ? partnerRoom.textContent : null,
                    partnerVisibleInLobby: rem && rem.group ? rem.group.visible : false,
                };
            }""")
            print(f"  [Room Check on P1]: {room_check}")
            assert "Our Story" in (room_check["partnerRoomText"] or ""), "Partner room should show Our Story in HUD"
            assert room_check["partnerVisibleInLobby"] is False, "Partner in Our Story should NOT be rendered in Lobby!"
            
            # Page 1 clicks "Go there" button
            print("  [Navigation] Page 1 clicking 'Go there' button...")
            page1.click("#partner-go")
            wait_for_condition(page1, "() => window.__engineApi && window.__engineApi.getRoomKey() !== 'lobby'", "Page 1 Transitioned Room")
            wait_for_condition(page1, """() => {
                const mp = window.__multiplayer;
                if (!mp) return false;
                const rem = [...mp.getState().world.remote.values()][0];
                return rem && rem.group && rem.group.visible;
            }""", "Page 1 Sees Page 2 in Salon")
            
            # Now both are in Our Story; avatar visibility should be restored!
            both_in_salon = page1.evaluate("""() => {
                const mp = window.__multiplayer;
                const rem = [...mp.getState().world.remote.values()][0];
                return {
                    p1Room: window.__engineApi.getRoomKey(),
                    remoteVisible: rem && rem.group ? rem.group.visible : false,
                };
            }""")
            print(f"  [Reunion in Salon]: {both_in_salon}")
            assert both_in_salon["remoteVisible"] is True, f"Remote avatar should be visible once both arrive in same salon: {both_in_salon}"
            
            print("\n=======================================================")
            print("  ALL E2E MULTIPLAYER & HARDENING TESTS PASSED! (100%)")
            print("=======================================================\n")
            
    finally:
        print("[TEST] Terminating server...")
        try:
            browser1.close()
            browser2.close()
        except Exception:
            pass
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except:
            proc.kill()

if __name__ == "__main__":
    run_test()
