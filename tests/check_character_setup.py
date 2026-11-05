"""Character setup UI, real texture edits, persistence and peer appearance."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8096'
output = Path(__file__).resolve().parents[1] / 'docs/reports/character-setup'
output.mkdir(parents=True, exist_ok=True)
init = '''window.requestIdleCallback=()=>0;window.requestAnimationFrame=cb=>{
 const s=String(cb);
 if(s.includes('.getDelta()')){window.__tick=cb;return 0;}
 if(s.includes('lastSend')){window.__netTick=cb;return 0;}
 if(s.includes('.running')){window.__previewTick=cb;return 0;}
 return setTimeout(()=>cb(performance.now()),0);
};'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1050})
    page = context.new_page()
    errors = []
    page.add_init_script(init)
    page.on('pageerror', lambda error: errors.append(str(error)))

    def choose(id):
        page.evaluate("id=>document.querySelector('[data-avatar-id='+id+']').click()", id)
        page.wait_for_function("!document.querySelector('#btn-enter-museum').hidden", polling=100, timeout=120000)

    page.goto(url, wait_until='domcontentloaded')
    page.wait_for_function("!document.querySelector('#avatar-select').hidden", polling=100, timeout=180000)
    assert page.locator('#btn-enter-museum').is_hidden()
    assert page.locator('[data-anim]').count() == 0
    choose('maya')
    assert page.evaluate('window.__multiplayer.getState().localAvatar.actions.size') == 21
    assert page.evaluate("window.__multiplayer.getState().localAvatar.actions.get('clap').repetitions") == 1
    page.locator('#visitor-name').fill('Asha')
    before = page.evaluate('''() => {
        const s=window.__multiplayer.getState().localAvatar.appearanceTexture;
        return s.ctx.getImageData(0,0,s.original.width,s.original.height).data.reduce((a,b)=>a+b,0);
    }''')
    page.evaluate("const input=document.querySelector('#look-top');input.value='#22aa66';input.dispatchEvent(new Event('change'))")
    after = page.evaluate('''() => {
        const s=window.__multiplayer.getState().localAvatar.appearanceTexture;
        return s.ctx.getImageData(0,0,s.original.width,s.original.height).data.reduce((a,b)=>a+b,0);
    }''')
    assert before != after, 'Texture pixels did not change'
    assert page.evaluate('window.__visitor.name') == 'Asha'
    page.evaluate('window.__previewTick?.()')
    page.screenshot(path=str(output / 'desktop.png'), timeout=120000)
    choose('ethan')
    choose('maya')
    assert page.locator('#visitor-name').input_value() == 'Asha'
    assert page.locator('#look-top').input_value() == '#22aa66'
    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate("document.activeElement.blur();document.querySelector('#overlay').scrollTop=0")
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.screenshot(path=str(output / 'mobile-preview.png'), timeout=120000)
    page.locator('#btn-enter-museum').scroll_into_view_if_needed()
    page.screenshot(path=str(output / 'mobile-controls.png'), timeout=120000)
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function("!document.querySelector('#avatar-select').hidden", polling=100, timeout=180000)
    choose('maya')
    assert page.locator('#visitor-name').input_value() == 'Asha'
    assert page.locator('#look-top').input_value() == '#22aa66'
    page.evaluate('''() => {
        const api=window.__engineApi;
        api.renderer.domElement.requestPointerLock=()=>{};
        Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>api.renderer.domElement});
        document.querySelector('#btn-enter-museum').click();
        window.__render=api.renderer.render;api.renderer.render=()=>{};
        window.__tick();
    }''')
    assert page.evaluate('window.__multiplayer.getState().localAvatar.group.parent === window.__engineApi.scene')
    assert page.evaluate("window.__multiplayer.getState().localAvatar.appearance.top") == '#22aa66'
    observer = browser.new_page()
    observer.route('**/__relay_probe__', lambda route: route.fulfill(content_type='text/html', body='<!doctype html><title>Relay check</title>'))
    observer.goto(url + '/__relay_probe__', wait_until='domcontentloaded')
    # Observe the actual relay profile without loading another full 3D scene.
    relay = observer.evaluate('''() => new Promise((resolve,reject)=>{
        const ws=new WebSocket(location.origin.replace('http','ws')+'/ws');
        ws.onopen=()=>ws.send(JSON.stringify({t:'join',room:'lobby',name:'Observer',model:'man.glb'}));
        ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.t==='room_state'){ws.close();resolve(m.peers)}};
        ws.onerror=()=>reject(new Error('Relay connection failed'));
    })''')
    assert any(peer['name'] == 'Asha' and peer.get('appearance', {}).get('top') == '#22aa66' for peer in relay), relay
    page.set_viewport_size({'width': 1280, 'height': 800})
    page.evaluate('''() => {
        const api=window.__engineApi;
        api.setCameraPosition(0,1.7,3,0,-0.08);
        window.__tick();api.renderer.render=window.__render;
        api.renderer.render(api.scene,api.getActiveCamera());
    }''')
    page.screenshot(path=str(output / 'museum-look.png'), timeout=120000)
    (output / 'checks.json').write_text(json.dumps({'before':before,'after':after,'peers':relay,'errors':errors},indent=2))
    assert not errors, errors
    browser.close()
print('Character preview, V4 clips, names, masked colours, switching, persistence, mobile and peer appearance passed')
