"""Run against a fresh production server: python tests/check_avatar_controls.py URL."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8095'
output = Path(__file__).resolve().parents[1] / 'docs/reports/avatar-controls'
output.mkdir(parents=True, exist_ok=True)
init = '''window.requestIdleCallback = () => 0;
window.requestAnimationFrame = cb => {
    const source = String(cb);
    if (source.includes('.getDelta()')) { window.__tick = cb; return 0; }
    if (source.includes('lastSend')) { window.__netTick = cb; return 0; }
    return setTimeout(() => cb(performance.now()), 0);
};'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    errors = []

    def enter(page, avatar='maya'):
        page.add_init_script(init)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url, wait_until='domcontentloaded')
        assert page.locator('#btn-enter-museum').is_hidden()
        page.wait_for_function("!document.querySelector('#avatar-select').hidden", polling=100, timeout=180000)
        page.evaluate("id => document.querySelector('[data-avatar-id=' + id + ']').click()", avatar)
        assert page.locator('#btn-enter-museum').is_hidden()
        page.wait_for_function("!document.querySelector('#btn-enter-museum').hidden", polling=100, timeout=120000)
        assert page.locator('#entrance-progress').get_attribute('value') == '100'
        page.evaluate('''() => {
            const api = window.__engineApi;
            api.renderer.domElement.requestPointerLock = () => {};
            Object.defineProperty(document, 'pointerLockElement', {configurable:true, get:() => api.renderer.domElement});
            document.querySelector('#btn-enter-museum').click();
            window.__render = api.renderer.render;
            api.renderer.render = () => {};
            api.setCameraPosition(0, 1.7, 4, 0, 0);
            window.__tick();
        }''')
        page.wait_for_function('window.__multiplayer.isConnected()', polling=100, timeout=10000)

    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    enter(page)
    page.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyW'}))")
    for _ in range(12):
        page.wait_for_timeout(25)
        page.evaluate('window.__tick(); window.__netTick()')
    movement = page.evaluate('''() => {
        const api = window.__engineApi, av = window.__multiplayer.getState().localAvatar;
        return {position:api.camera.position.toArray(), avatar:av.group.position.toArray(),
            anim:av.target.anim, action:av.currentAction.getClip().name, time:av.currentAction.time,
            camera:api.getActiveCamera().position.toArray(), hips:av.root.getObjectByName('Hips').getWorldPosition(api.camera.position.clone()).toArray()};
    }''')
    assert movement['position'][2] < 3.5, movement
    assert movement['anim'] == 'walk' and movement['time'] > 0, movement
    assert abs(movement['avatar'][0] - movement['position'][0]) < 0.001, movement
    assert abs(movement['avatar'][1]) < 0.05, movement
    assert 0.4 < movement['hips'][1] < 1.6, movement
    assert movement['camera'] != movement['position'], movement
    page.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {code:'ShiftLeft'})); window.__tick()")
    assert page.evaluate('window.__multiplayer.getState().localAvatar.target.anim') == 'run'
    page.evaluate("window.dispatchEvent(new KeyboardEvent('keyup', {code:'KeyW'})); window.dispatchEvent(new KeyboardEvent('keyup', {code:'ShiftLeft'})); window.__tick()")
    assert page.evaluate('window.__multiplayer.getState().localAvatar.target.anim') == 'idle'
    facing = page.evaluate('''() => {
        const api=window.__engineApi;
        const before=api.getPlayerState().ry;
        window.dispatchEvent(new MouseEvent('mousemove', {movementX:100, movementY:20}));
        window.__tick();
        return {before, after:api.getPlayerState().ry, avatar:window.__multiplayer.getState().localAvatar.group.rotation.y};
    }''')
    assert abs(facing['after'] - facing['before']) > 0.1, facing
    assert abs(facing['after'] - facing['avatar']) < 0.001, facing
    page.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {code:'Space'})); window.__tick()")
    assert page.evaluate('window.__multiplayer.getState().localAvatar.target.anim') == 'jump'
    page.evaluate("window.dispatchEvent(new KeyboardEvent('keyup', {code:'Space'}))")

    partner = browser.new_page(viewport={'width': 640, 'height': 480})
    enter(partner)
    for _ in range(8):
        page.wait_for_timeout(50)
        page.evaluate('window.__tick(); window.__netTick()')
        partner.evaluate('window.__tick(); window.__netTick()')
    page.wait_for_function('''() => [...window.__multiplayer.getState().world.remote.values()].some(a => a.root && a.group.visible)''', polling=100, timeout=120000)
    assert page.evaluate('''() => {
        const s=window.__multiplayer.getState(), remote=[...s.world.remote.values()][0];
        return remote.root !== s.localAvatar.root && remote.root.getObjectByName('Hips') !== s.localAvatar.root.getObjectByName('Hips');
    }''')
    partner.close()
    # 30-second disconnect grace window (NET-02 / Q3) holds slot before permanent eviction
    page.wait_for_function('window.__multiplayer.getState().world.remote.size === 0', polling=200, timeout=36000)
    page.evaluate('''() => {
        const api=window.__engineApi;
        api.setCameraPosition(0,1.7,3,0,-0.08);
        window.__tick();
        api.renderer.render = window.__render;
        api.renderer.render(api.scene, api.getActiveCamera());
    }''')
    page.screenshot(path=str(output / 'local-avatar.png'), timeout=120000)
    (output / 'checks.json').write_text(json.dumps({'movement':movement, 'facing':facing, 'errors':errors}, indent=2))
    assert not errors, errors
    page.close()
    man = browser.new_page(viewport={'width': 1280, 'height': 800})
    enter(man, 'ethan')
    man.evaluate('window.__tick()')
    assert man.evaluate('''() => {
        const a=window.__multiplayer.getState().localAvatar;
        const hips=a.root.getObjectByName('Hips').getWorldPosition(window.__engineApi.camera.position.clone());
        return a.group.visible && hips.y > 0.4 && hips.y < 1.6;
    }''')
    browser.close()
print('Avatar visibility, walk/run/idle/jump, mouse-follow and two-player isolation checks passed')
