from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    c = b.new_context()
    page = c.new_page()
    page.goto('http://127.0.0.1:8080')
    page.fill('#invite-code-input', '290512')
    page.click('#btn-redeem-invite')
    page.wait_for_timeout(2000)

    p2 = c.new_page()
    p2.on('console', lambda m: print('CONSOLE:', m.type, m.text))
    p2.on('pageerror', lambda e: print('PAGEERROR:', e))
    p2.add_init_script("""
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
            if (window.__forceCrash && (type === 'webgl' || type === 'webgl2')) {
                throw new Error('Forced crash on session check');
            }
            return orig.apply(this, [type, ...args]);
        };
        window.__forceCrash = true;
    """)
    p2.goto('http://127.0.0.1:8080')
    p2.wait_for_timeout(4000)
    print("P2 status text:", p2.evaluate("document.querySelector('#invite-status')?.textContent"))
    print("P2 row hidden:", p2.evaluate("document.querySelector('#invite-input-row')?.hidden"))
    print("P2 btn text:", p2.evaluate("document.querySelector('#btn-redeem-invite')?.textContent"))
    b.close()
