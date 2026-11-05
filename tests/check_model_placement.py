"""Run with Vite on localhost:5173; verify loaded model contact bounds."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1803, 'height': 881})
    # Render once after loading; continuous software WebGL slows headless QA.
    page.add_init_script('window.requestAnimationFrame = cb => cb.name === "frame" ? (window.__qaFrame = cb, 0) : setTimeout(() => cb(performance.now()), 0)')
    page.goto('http://127.0.0.1:5173', wait_until='networkidle')
    page.wait_for_function("!document.querySelector('#btn-enter-museum').disabled", polling=100, timeout=120000)
    page.evaluate("document.querySelector('#btn-enter-museum').click()")
    page.wait_for_function('window.__engineApi?.scene', polling=100)
    page.wait_for_function('''() => {
        let count = 0;
        window.__engineApi.scene.traverse(o => { if(o.userData.glbPath) count++; });
        return count >= 10;
    }''', timeout=120000, polling=100)
    collision_result = page.evaluate('''async () => {
        const THREE = await import('/node_modules/three/build/three.module.js');
        const { mergeGeometries } = await import('/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js');
        const { modelObstaclesFor } = await import('/src/game/room/placedItems.js');
        const ground = new THREE.BoxGeometry(10, 0.01, 10).translate(0, 0.005, 0);
        const left = new THREE.BoxGeometry(1, 1, 1).translate(-2, 0.5, 0);
        const right = new THREE.BoxGeometry(1, 1, 1).translate(2, 0.5, 0);
        // One mesh containing disconnected solids AND a large ground plane.
        const mesh = new THREE.Mesh(mergeGeometries([ground, left, right]));
        const parent = new THREE.Group();
        parent.position.set(10, 1.4, 5);
        parent.rotation.y = Math.PI / 2;
        parent.add(mesh);
        const boxes = modelObstaclesFor(mesh);
        const blocked = (x, z) => boxes.some(b => Math.abs(x-b.x) < b.w/2 + 0.4 && Math.abs(z-b.z) < b.d/2 + 0.4);
        if (!boxes.length || blocked(10,5) || blocked(13,5) || !blocked(10,3) || !blocked(10,7)) {
            throw new Error('Disconnected geometry, floor decoration or parent transform regression');
        }
        const api = window.__engineApi;
        const render = api.renderer.render;
        api.renderer.render = () => {};
        Object.defineProperty(document, 'pointerLockElement', {configurable:true, get:() => api.renderer.domElement});
        api.setCameraPosition(2.6, 1.7, 0);
        window.__qaFrame(performance.now());
        const approach = api.camera.position.clone();
        api.setCameraPosition(0, 1.7, 0.3);
        window.__qaFrame(performance.now()+16);
        const solid = api.camera.position.clone();
        api.renderer.render = render;
        delete document.pointerLockElement;
        if (Math.abs(approach.x-2.6) > 0.01 || Math.abs(approach.z) > 0.01) throw new Error('Empty floor near sofa is still blocked');
        if (Math.hypot(solid.x, solid.z-0.3) < 0.01) throw new Error('Sofa solids no longer block walking');
        return {syntheticBoxes:boxes.length, approach:approach.toArray(), solid:solid.toArray(),
            obstacleCount:api.getCurrentRoom().obstacles.length};
    }''')
    print('Collision checks:', collision_result, flush=True)
    result = page.evaluate('''async () => {
        const THREE = await import('/node_modules/three/build/three.module.js');
        const models = [];
        window.__engineApi.scene.updateMatrixWorld(true);
        window.__engineApi.scene.traverse(o => {
            if (!o.userData.glbPath) return;
            const box = new THREE.Box3().setFromObject(o);
            const center = box.getCenter(new THREE.Vector3());
            models.push({path:o.userData.glbPath, min:box.min.toArray(), max:box.max.toArray(),
                center:center.toArray(), floor:o.parent.getWorldPosition(new THREE.Vector3()).y});
        });
        return models;
    }''')
    for model in result:
        if 'osgona' in model['path']:
            assert abs(model['max'][1] - 5.6) < 0.001, model
            assert abs(model['center'][0]) < 0.001 and abs(model['center'][2]) < 0.001, model
        else:
            assert abs(model['min'][1] - model['floor']) < 0.001, model
        if 'curved_sofa' in model['path']:
            assert abs(model['center'][0]) < 0.001 and abs(model['center'][2]) < 0.001, model
    output = Path(__file__).resolve().parents[1] / 'docs/reports/model-placement'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'bounds.json').write_text(json.dumps(result, indent=2))
    page.evaluate('''() => {
        window.__engineApi.setCameraPosition(-4, 3, 5, -0.65, -0.18);
        window.__engineApi.camera.rotation.set(-0.18, -0.65, 0, 'YXZ');
    }''')
    page.evaluate('window.__engineApi.renderer.render(window.__engineApi.scene, window.__engineApi.camera)')
    page.wait_for_timeout(1500)
    page.screenshot(path=str(output / 'lobby.png'))
    browser.close()
print('Model contact and centering checks passed')
