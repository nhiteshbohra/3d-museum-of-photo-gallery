from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            '--use-gl=angle',
            '--use-angle=d3d11',
            '--enable-webgl',
            '--ignore-gpu-blocklist',
            '--enable-gpu-rasterization',
        ]
    )
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    page.goto('http://localhost:5174/index.html')
    page.wait_for_selector('#btn-enter-museum', timeout=15000)
    page.click('#btn-enter-museum')
    page.wait_for_timeout(2000)

    # Let's test room transitions between Lobby and multiple Salons
    transitions = [
        ('Lobby -> Fireside Winter Memories', 'Fireside Winter Memories'),
        ('Fireside -> Romantic Paris & Sunset', 'Romantic Paris & Sunset'),
        ('Paris -> Cozy Autumn & Coffee', 'Cozy Autumn & Coffee'),
        ('Cozy Autumn -> Lobby', 'lobby'),
        ('Lobby -> Fireside (re-visit)', 'Fireside Winter Memories')
    ]

    for label, target in transitions:
        res = page.evaluate('''async (target) => {
            const api = window.__engineApi;
            const t0 = performance.now();
            if (target === 'lobby') {
                await window.__enterlobby({ push: false });
            } else {
                await window.__loadAndEnterGallery(target, { pushHistory: false });
            }
            const tSetRoom = performance.now();
            
            // First frame after setRoom
            await new Promise(r => requestAnimationFrame(r));
            const tFirstFrameStart = performance.now();
            api.renderer.render(api.scene, api.camera);
            const tFirstFrameEnd = performance.now();

            return {
                setRoomMs: tSetRoom - t0,
                rafDelayMs: tFirstFrameStart - tSetRoom,
                firstFrameRenderMs: tFirstFrameEnd - tFirstFrameStart,
                totalMs: tFirstFrameEnd - t0
            };
        }''', target)
        print(f'{label}:')
        print(f"  setRoom: {res['setRoomMs']:.2f} ms")
        print(f"  rAF delay: {res['rafDelayMs']:.2f} ms")
        print(f"  1st frame render: {res['firstFrameRenderMs']:.2f} ms")
        print(f"  TOTAL: {res['totalMs']:.2f} ms")

    browser.close()

