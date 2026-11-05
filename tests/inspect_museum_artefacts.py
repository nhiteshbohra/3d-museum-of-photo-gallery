import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'screenshots', 'artefact_inspection')
os.makedirs(OUTPUT_DIR, exist_ok=True)

VIEWS = [
    # ─── GRAND LOBBY ───
    {
        'id': 'lobby_south_masterpiece_and_sconces',
        'url': 'http://localhost:8080/index.html',
        'pos': (0, 1.8, 1.8),
        'yaw': 3.14159,  # Facing South at Grand Sanctuary Masterpiece, sconces & entrance
        'pitch': 0.05,
        'wait': 2.0,
    },
    {
        'id': 'lobby_north_monument_and_sconces',
        'url': 'http://localhost:8080/index.html',
        'pos': (0, 1.8, 3.8),
        'yaw': 0.0,  # Facing North at Directory Monument, staircases & sconces
        'pitch': 0.0,
        'wait': 1.5,
    },
    {
        'id': 'lobby_east_platform_promenade_and_sconces',
        'url': 'http://localhost:8080/index.html',
        'pos': (5.0, 2.8, 0.0),
        'yaw': 1.5708,  # Looking East at platform promenade, salon doors & wall sconces
        'pitch': 0.05,
        'wait': 1.5,
    },
    {
        'id': 'lobby_west_platform_promenade_and_sconces',
        'url': 'http://localhost:8080/index.html',
        'pos': (-5.0, 2.8, 0.0),
        'yaw': -1.5708,  # Looking West at platform promenade, salon doors & wall sconces
        'pitch': 0.05,
        'wait': 1.5,
    },
    {
        'id': 'lobby_central_atrium_chandelier',
        'url': 'http://localhost:8080/index.html',
        'pos': (0, 1.8, 0.5),
        'yaw': 0.0,
        'pitch': 0.85,  # Looking up at Grand Central Crystal Chandelier
        'wait': 1.5,
    },

    # ─── SALON 1: FIRESIDE WINTER MEMORIES ───
    {
        'id': 'salon1_north_fireplace_hearth_and_chairs',
        'url': 'http://localhost:8080/index.html?exhibit=Fireside%20Winter%20Memories',
        'pos': (0, 1.7, -3.2),
        'yaw': 0.0,  # Looking North at hearth, rug, clock, candles, masterpiece & curved armchairs
        'pitch': 0.05,
        'wait': 2.0,
    },
    {
        'id': 'salon1_center_partition_south_highlight',
        'url': 'http://localhost:8080/index.html?exhibit=Fireside%20Winter%20Memories',
        'pos': (0, 1.8, 3.8),
        'yaw': 0.0,  # Looking North at South face of center partition
        'pitch': 0.05,
        'wait': 1.5,
    },
    {
        'id': 'salon1_center_partition_back_north_face',
        'url': 'http://localhost:8080/index.html?exhibit=Fireside%20Winter%20Memories',
        'pos': (0, 1.8, -3.8),
        'yaw': 3.14159,  # Looking South at North face of center partition
        'pitch': 0.05,
        'wait': 1.5,
    },
    {
        'id': 'salon1_west_narrative_memory_board',
        'url': 'http://localhost:8080/index.html?exhibit=Fireside%20Winter%20Memories',
        'pos': (0.5, 1.8, 2.2),
        'yaw': -1.5708,  # Facing West from open zone towards narrative memory board
        'pitch': 0.05,
        'wait': 1.5,
    },
    {
        'id': 'salon1_east_wall_5_sequential_artworks',
        'url': 'http://localhost:8080/index.html?exhibit=Fireside%20Winter%20Memories',
        'pos': (-0.5, 1.8, 2.2),
        'yaw': 1.5708,  # Facing East from open zone towards 5 sequential artworks
        'pitch': 0.02,
        'wait': 1.5,
    },
    {
        'id': 'salon1_south_entrance_door_and_medallion',
        'url': 'http://localhost:8080/index.html?exhibit=Fireside%20Winter%20Memories',
        'pos': (0, 1.8, 2.5),
        'yaw': 3.14159,  # Facing South
        'pitch': 0.0,
        'wait': 1.5,
    },

    # ─── SALON 2: MUSIC & CLASSICAL MELODIES ───
    {
        'id': 'salon2_music_melodies_grand_piano_and_corners',
        'url': 'http://localhost:8080/index.html?exhibit=Music%20%26%20Classical%20Melodies',
        'pos': (0, 1.8, -3.0),
        'yaw': 0.0,
        'pitch': -0.05,
        'wait': 2.0,
    },

    # ─── SALON 3: THE LIBRARY & READING NOOK ───
    {
        'id': 'salon3_southwest_reading_armchair_and_lamp',
        'url': 'http://localhost:8080/index.html?exhibit=The%20Library%20%26%20Reading%20Nook',
        'pos': (0.2, 1.7, 1.8),
        'yaw': -2.10,  # Looking at open reading nook from center floor
        'pitch': -0.10,
        'wait': 2.0,
    },
    {
        'id': 'salon3_east_wall_clear_sightline_check',
        'url': 'http://localhost:8080/index.html?exhibit=The%20Library%20%26%20Reading%20Nook',
        'pos': (-0.5, 1.8, 2.2),
        'yaw': 1.5708,  # Facing East wall to verify 100% unobstructed artworks
        'pitch': 0.0,
        'wait': 1.5,
    },

    # ─── SALON 4: MASTERPIECE PARIS ROMANCE ───
    {
        'id': 'salon4_north_masterpiece_and_urn_pedestals',
        'url': 'http://localhost:8080/index.html?exhibit=Masterpiece%20Paris%20Romance',
        'pos': (0, 1.8, -3.0),
        'yaw': 0.0,  # Looking North at Masterpiece and flanking marble pedestals
        'pitch': 0.05,
        'wait': 2.0,
    },

    # ─── SALON 5: THE GLASS ORANGERY ───
    {
        'id': 'salon5_glass_orangery_conservatory_view',
        'url': 'http://localhost:8080/index.html?exhibit=The%20Glass%20Orangery',
        'pos': (0, 1.8, -3.0),
        'yaw': 0.0,
        'pitch': 0.0,
        'wait': 2.0,
    },

    # ─── SALON 6: THE SECRET PROMISE ALCOVE ───
    {
        'id': 'salon6_alcove_nook_and_floating_petals',
        'url': 'http://localhost:8080/index.html?exhibit=The%20Secret%20Promise%20Alcove',
        'pos': (0.2, 1.7, 1.8),
        'yaw': -2.10,  # Looking at open reading chair and petals
        'pitch': -0.10,
        'wait': 2.0,
    },
]

def capture_all():
    print(f"[QA] Starting Automated Artefact Visual Inspection...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'])
        page = browser.new_page(viewport={'width': 1600, 'height': 900})

        current_url = None

        for idx, view in enumerate(VIEWS):
            view_id = view['id']
            url = view['url']
            pos = view['pos']
            yaw = view['yaw']
            pitch = view['pitch']
            wait_sec = view.get('wait', 1.5)

            if current_url != url:
                print(f"\n[QA] Navigating to: {url}")
                page.goto(url, wait_until='networkidle')
                time.sleep(1.0)
                # Dismiss overlay and enter museum
                page.wait_for_function("!document.querySelector('#btn-enter-museum').disabled", timeout=180000)
                page.evaluate("""() => {
                    const btn = document.querySelector('#btn-enter-museum');
                    if (btn) btn.click();
                }""")
                time.sleep(1.5)
                current_url = url

            # Set exact camera viewpoint via engineApi
            page.evaluate(f"""() => {{
                if (window.__engineApi && typeof window.__engineApi.setCameraPosition === 'function') {{
                    window.__engineApi.setCameraPosition({pos[0]}, {pos[1]}, {pos[2]}, {yaw}, {pitch});
                }}
            }}""")
            time.sleep(wait_sec)

            out_path = os.path.join(OUTPUT_DIR, f"{idx+1:02d}_{view_id}.png")
            page.screenshot(path=out_path)
            print(f"[QA] Saved: {out_path}")

        browser.close()
    print("\n[QA] All artefact inspection screenshots captured successfully!")

if __name__ == '__main__':
    capture_all()
