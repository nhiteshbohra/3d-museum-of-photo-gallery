"""Optional first argument: server URL (default http://127.0.0.1:8080)."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path(__file__).resolve().parents[1] / 'docs/reports/entrance-loading'
output.mkdir(parents=True, exist_ok=True)
base_url = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.add_init_script('window.requestIdleCallback = () => 0; window.requestAnimationFrame = cb => String(cb).includes(".getDelta()") ? 0 : setTimeout(() => cb(performance.now()), 0)')
    held = []
    page.route('**/3d_pbr_curved_sofa.glb', lambda route: held.append(route))
    page.goto(base_url, wait_until='domcontentloaded')
    page.wait_for_function('window.__engineApi?.scene', polling=100)
    assert page.locator('#btn-retry-loading').count() == 0
    progress_value = int(page.locator('#entrance-progress').get_attribute('value'))
    assert 0 <= progress_value <= 100
    assert page.locator('#btn-enter-museum').is_hidden()
    page.screenshot(path=str(output / 'loading.png'))
    while not held:
        page.wait_for_timeout(100)
    held[0].continue_()
    page.wait_for_function("!document.querySelector('#btn-enter-museum').hidden", polling=100, timeout=180000)
    assert page.locator('#entrance-progress').get_attribute('value') == '100'
    assert page.locator('#btn-retry-loading').count() == 0
    assert page.evaluate('''() => {
        let count = 0;
        window.__engineApi.scene.traverse(o => { if(o.userData.glbPath) count++; });
        return count === 10;
    }''')
    page.screenshot(path=str(output / 'ready.png'), timeout=120000)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(output / 'mobile.png'), timeout=120000)
    page.evaluate("document.querySelector('#btn-enter-museum').click()")
    assert page.locator('#overlay').is_hidden()
    page.close()

    failed = browser.new_page()
    failed.add_init_script('window.requestAnimationFrame = cb => String(cb).includes(".getDelta()") ? 0 : setTimeout(() => cb(performance.now()), 0)')
    failed.route('**/3d_pbr_curved_sofa.glb', lambda route: route.abort())
    failed.goto(base_url, wait_until='domcontentloaded')
    failed.wait_for_function("document.querySelector('#entrance-status').textContent.includes('could not finish loading')", polling=100, timeout=120000)
    assert failed.locator('#btn-retry-loading').count() == 0
    assert failed.locator('#btn-enter-museum').is_hidden()
    assert failed.locator('#overlay').is_visible()
    failed.close()

    gallery = browser.new_page()
    gallery.add_init_script('window.requestIdleCallback = () => 0; window.requestAnimationFrame = cb => String(cb).includes(".getDelta()") ? 0 : setTimeout(() => cb(performance.now()), 0)')
    gallery.goto(base_url + '/?exhibit=Fireside%20Winter%20Memories', wait_until='domcontentloaded')
    gallery.wait_for_function("!document.querySelector('#btn-enter-museum').hidden", polling=100, timeout=180000)
    assert gallery.evaluate('window.__engineApi.getRoomKey()') == 'fireside'
    browser.close()
print('Entrance delayed-load, ready, mobile, failure and direct-gallery checks passed')
