import time
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
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
        ]
    )
    page = browser.new_page(viewport={'width': 1280, 'height': 720})

    page.on('console', lambda msg: print(f'CONSOLE: {msg.text}'))

    page.goto('http://localhost:5174/index.html')
    page.wait_for_selector('#btn-enter-museum', timeout=15000)
    page.click('#btn-enter-museum')
    page.wait_for_timeout(2000)

    # Now let's measure setRoom directly
    result = page.evaluate('''async () => {
        const api = window.__engineApi;
        console.log('[DirectTest] Starting setRoom to Fireside Winter Memories...');
        const t0 = performance.now();
        await window.__loadAndEnterGallery('Fireside Winter Memories', { pushHistory: false });
        const t1 = performance.now();
        console.log('[DirectTest] setRoom finished in', (t1 - t0).toFixed(2), 'ms');
        
        // Measure 5 subsequent render frames
        const frameTimes = [];
        for (let i = 0; i < 5; i++) {
            await new Promise(r => requestAnimationFrame(r));
            const rf0 = performance.now();
            api.renderer.render(api.scene, api.camera);
            const rf1 = performance.now();
            frameTimes.push(rf1 - rf0);
        }
        return {
            setRoomMs: t1 - t0,
            frameTimesMs: frameTimes
        };
    }''')

    print('Direct Test Result:', result)
    browser.close()

