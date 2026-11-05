"""Run with Vite on localhost:5173; captures the marked lobby viewpoint."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
room = (root / 'src/game/room.js').read_text(encoding='utf-8')
decor = (root / 'src/game/room/decorations.js').read_text(encoding='utf-8')
lobby_decor = decor.split('export function decorateLobbyGrandRotunda', 1)[1].split('// 8.', 1)[0]
assert 'createChandelier(' not in lobby_decor
lobby_lights = room.split("if (mode === 'lobby') {", 1)[1].split('} else {', 1)[0]
assert lobby_lights.count('addCeilingDownlight(') == 6
assert 'addCeilingDownlight(0,' not in lobby_lights

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1803, 'height': 881})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:5173', wait_until='networkidle')
    page.wait_for_function("!document.querySelector('#btn-enter-museum').disabled", polling=100, timeout=180000)
    page.locator('#btn-enter-museum').click()
    page.wait_for_timeout(2000)
    page.evaluate('window.__engineApi.setCameraPosition(-3, 1.8, 0, -Math.PI/2, 0.08)')
    page.wait_for_timeout(1500)
    output = root / 'docs/reports/fixture-removal/lobby.png'
    output.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(output))
    assert not errors, errors
    browser.close()
print('Lobby fixture checks passed')
