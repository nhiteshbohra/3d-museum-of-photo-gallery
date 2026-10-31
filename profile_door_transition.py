import json
import time
from playwright.sync_api import sync_playwright

print('[Profile] Starting Door Transition Profiling in Playwright...', flush=True)

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

    results = []

    def on_console(msg):
        text = msg.text
        if '[SLOW MESH]' in text:
            print(f'  {text}', flush=True)
        elif '[DOOR_PROFILE_RESULT]' in text:
            try:
                json_str = text.split('[DOOR_PROFILE_RESULT]')[1].strip()
                data = json.loads(json_str)
                results.append(data)
                target_name = data.get("target")
                print(f'  [Captured Profile Event]: target={target_name}', flush=True)
            except Exception as e:
                print(f'  [Error parsing profile]: {e}', flush=True)

    page.on('console', on_console)

    page.goto('http://localhost:5174/index.html')
    page.wait_for_selector('#btn-enter-museum', timeout=15000)
    page.click('#btn-enter-museum')
    page.wait_for_timeout(2000)

    # Test 1: Click door in Lobby to enter a salon
    print('\n--- Test 1: Lobby -> Salon (Click door) ---', flush=True)
    # Get door coordinates or trigger via click
    # In Lobby, doors are located along East and West elevated platforms.
    # Let's teleport player near door 0 or click it
    page.evaluate('''() => {
        // Find first door in current room
        const api = window.__engineApi;
        const room = api.getCurrentRoom();
        const doors = room.doors || [];
        console.log('[Test] Current room doors count:', doors.length);
        if (doors.length > 0) {
            const d = doors[0];
            // Position camera facing door
            // Door is at d.position.x, z
            const dx = d.position.x;
            const dz = d.position.z;
            console.log('[Test] Aiming at door:', d.id, d.category, 'at', dx, dz);
            // Move player 2.5m away from door looking at it
            const offsetX = dx > 0 ? dx - 2.5 : dx + 2.5;
            api.setCameraPosition(offsetX, 1.7, dz, dx > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
        }
    }''')
    page.wait_for_timeout(500)

    # Click canvas center to trigger click on door
    print('Clicking door...', flush=True)
    page.mouse.click(640, 360)
    page.wait_for_timeout(2500)

    # Test 2: In Salon -> Lobby (Click door)
    print('\n--- Test 2: Salon -> Lobby (Click exit door) ---', flush=True)
    page.evaluate('''() => {
        const api = window.__engineApi;
        const room = api.getCurrentRoom();
        const doors = room.doors || [];
        // Entry door is south door (z > 0)
        const exitDoor = doors.find(d => d.id === 'entry-door' || d.target === 'lobby');
        if (exitDoor) {
            console.log('[Test] Aiming at exit door at', exitDoor.position.x, exitDoor.position.z);
            // Face south (yaw = Math.PI) toward door at z ~ 6..8
            api.setCameraPosition(0, 1.7, exitDoor.position.z - 2.5, Math.PI, 0);
        }
    }''')
    page.wait_for_timeout(500)

    print('Clicking exit door...', flush=True)
    page.mouse.click(640, 360)
    page.wait_for_timeout(2500)

    # Test 3: Lobby -> Salon (Walk through door)
    print('\n--- Test 3: Lobby -> Salon (Walk-through door) ---', flush=True)
    page.evaluate('''() => {
        const api = window.__engineApi;
        const room = api.getCurrentRoom();
        const doors = room.doors || [];
        if (doors.length > 0) {
            const d = doors[1] || doors[0];
            const dx = d.position.x;
            const dz = d.position.z;
            // Place player 0.8m from door
            const startX = dx > 0 ? dx - 0.8 : dx + 0.8;
            api.setCameraPosition(startX, 1.7, dz, dx > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
        }
    }''')
    page.wait_for_timeout(300)
    # Walk forward into door
    print('Walking forward into door...', flush=True)
    page.keyboard.down('KeyW')
    page.wait_for_timeout(600)
    page.keyboard.up('KeyW')
    page.wait_for_timeout(2500)

    # Test 4: Another click transition to get average
    print('\n--- Test 4: Salon -> Salon or Lobby ---', flush=True)
    page.evaluate('''() => {
        const api = window.__engineApi;
        const room = api.getCurrentRoom();
        const doors = room.doors || [];
        const d = doors[0];
        if (d) {
            const dx = d.position.x;
            const dz = d.position.z;
            const offsetX = dx > 0 ? dx - 2.5 : dx + 2.5;
            api.setCameraPosition(offsetX, 1.7, dz, dx > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
        }
    }''')
    page.wait_for_timeout(500)
    page.mouse.click(640, 360)
    page.wait_for_timeout(2500)

    browser.close()

    print('\n' + '='*70)
    print(f'PROFILING RESULTS ({len(results)} transitions captured):')
    print('='*70)

    with open('door_profile_summary.json', 'w') as f:
        json.dump(results, f, indent=2)

    for idx, r in enumerate(results, 1):
        t_trigger = r.get('t_door_trigger', 0)
        t_call = r.get('t_setRoom_call', t_trigger)
        t_b_start = r.get('t_buildRoom_start', 0)
        t_b_end = r.get('t_buildRoom_end', 0)
        t_disp_start = r.get('t_dispose_start', 0)
        t_disp_end = r.get('t_dispose_end', 0)
        t_comp_start = r.get('t_compile_start', 0)
        t_comp_end = r.get('t_compile_end', 0)
        t_sr_end = r.get('t_setRoom_end', 0)
        t_f_start = r.get('t_first_frame_start', 0)
        t_r_start = r.get('t_first_render_start', 0)
        t_r_end = r.get('t_first_render_end', 0)
        t_done = r.get('t_first_frame_rendered', 0)

        total_ms = t_done - t_trigger
        pre_setRoom_ms = t_b_start - t_trigger
        build_ms = t_b_end - t_b_start
        dispose_ms = t_disp_end - t_disp_start if t_disp_end else 0
        compile_ms = t_comp_end - t_comp_start if t_comp_end else 0
        setRoom_total = t_sr_end - t_call
        raf_delay_ms = t_f_start - t_sr_end
        first_render_ms = t_r_end - t_r_start
        gl_finish_ms = t_done - t_r_end
        after_setRoom_total = t_done - t_sr_end

        tex_count = r.get('texUploadCount', 0)
        tex_ms = r.get('texUploadMs', 0)
        shader_count = r.get('shaderCompileCount', 0)
        shader_ms = r.get('shaderCompileMs', 0)
        prog_count = r.get('programLinkCount', 0)
        prog_ms = r.get('programLinkMs', 0)

        r_target = r.get("target", "unknown")
        print(f'\nTransition #{idx}: Target = "{r_target}"')
        print(f'  TOTAL (Door Trigger -> 1st Frame Rendered): {total_ms:.2f} ms')
        print(f'  |-- 1. Door trigger -> setRoom starts:     {pre_setRoom_ms:.2f} ms')
        print(f'  |-- 2. setRoom duration:                   {setRoom_total:.2f} ms')
        print(f'  |      |-- buildRoom (JS + 2D canvases):  {build_ms:.2f} ms')
        print(f'  |      |-- Old room disposal:             {dispose_ms:.2f} ms')
        print(f'  |      \\-- renderer.compile():            {compile_ms:.2f} ms')
        print(f'  \\-- 3. AFTER setRoom -> 1st frame:        {after_setRoom_total:.2f} ms  <-- UNEXPLAINED GAP BREAKDOWN:')
        print(f'         |-- rAF scheduling delay:          {raf_delay_ms:.2f} ms')
        print(f'         |-- first renderer.render() call:  {first_render_ms:.2f} ms')
        
        # WebGL calls breakdown
        for k, v in sorted(r.items()):
            if k.endswith('Ms') and v > 0:
                cnt_key = k[:-2] + 'Count'
                cnt = r.get(cnt_key, 0)
                print(f'         |   |-- {k[:-2]}: {v:.2f} ms ({cnt} calls)')
        
        print(f'         \\-- gl.finish() (GPU sync):        {gl_finish_ms:.2f} ms')

    print('\n[Profile] Saved raw results to door_profile_summary.json')
