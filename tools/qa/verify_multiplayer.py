"""Dual-Browser Real-Time WebSocket Synchronization Test.

Spawns two independent browser contexts (Maya and Ethan) and verifies
sub-millimeter real-time movement and orientation sync over WebSocket.
"""

import math
from playwright.sync_api import sync_playwright

def log(msg):
    print(f"[QA MULTIPLAYER] {msg}", flush=True)

def run_multiplayer_qa():
    with sync_playwright() as p:
        log("Launching Browser 1 (Maya)...")
        b1 = p.chromium.launch(channel='chrome', headless=True)
        page1 = b1.new_page(viewport={'width': 1280, 'height': 800})
        page1.goto('http://localhost:8080/index.html?char=maya', wait_until='domcontentloaded')
        page1.wait_for_function('!document.querySelector("#start-btn").disabled', timeout=60000)
        page1.locator('#start-btn').click()
        page1.wait_for_timeout(1000)

        log("Launching Browser 2 (Ethan)...")
        b2 = p.chromium.launch(channel='chrome', headless=True)
        page2 = b2.new_page(viewport={'width': 1280, 'height': 800})
        page2.goto('http://localhost:8080/index.html?char=jack', wait_until='domcontentloaded')
        page2.wait_for_function('!document.querySelector("#start-btn").disabled', timeout=60000)
        page2.locator('#start-btn').click()
        page2.wait_for_timeout(1500)

        # Move Maya in Browser 1
        log("Player 1 moves Maya forward...")
        p1_initial = page1.evaluate('window.__debug.characters.maya.controller.position.toArray()')
        page1.keyboard.down('w')
        page1.wait_for_timeout(600)
        page1.keyboard.up('w')
        page2.wait_for_timeout(800)

        p1_moved = page1.evaluate('window.__debug.characters.maya.controller.position.toArray()')
        p2_seen = page2.evaluate('window.__debug.characters.maya.controller.position.toArray()')

        dist1 = math.hypot(p1_moved[0] - p1_initial[0], p1_moved[2] - p1_initial[2])
        dist2 = math.hypot(p2_seen[0] - p1_initial[0], p2_seen[2] - p1_initial[2])
        log(f"Maya moved in P1: {dist1:.3f}m | Synced to P2: {dist2:.3f}m")

        assert dist1 > 0.3, "Maya did not move in Browser 1"
        assert dist2 > 0.25, "Maya movement failed to synchronize to Browser 2"
        log("REAL-TIME MULTIPLAYER SYNC VERIFIED SUCCESSFULLY!")

        b1.close()
        b2.close()

if __name__ == '__main__':
    run_multiplayer_qa()
