// =========================================================================
// CHAT — pop-up bubble above an avatar's head.
//   • Rendered as a DOM overlay positioned by projecting the avatar's 3D
//     position (never a 3D plane in the scene).
//   • Plain text only — inserted via textContent, never innerHTML.
//   • Shows ~5 seconds then fades and disappears. No history/log/list.
// =========================================================================

const BUBBLE_MS = 5000
const FADE_MS = 400

const overlay = (() => {
  let el = document.getElementById('chat-bubble-overlay')
  if (!el) {
    el = document.createElement('div')
    el.id = 'chat-bubble-overlay'
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:950;overflow:hidden;'
    document.body.appendChild(el)
  }
  return el
})()

const bubbles = new Map() // key (peerId or 'local') -> {el, timer}

function makeBubble() {
  const el = document.createElement('div')
  el.style.cssText =
    'position:absolute;transform:translate(-50%,-100%);max-width:220px;' +
    'padding:6px 12px;border-radius:12px;background:rgba(20,14,8,.92);' +
    'color:#f4e9d2;font:500 13px/1.35 system-ui,sans-serif;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.45);word-break:break-word;' +
    'transition:opacity 400ms ease;'
  overlay.appendChild(el)
  return el
}

/**
 * Show a chat bubble at a projected 2D position.
 * @param {string} key     stable key for this sender
 * @param {string} text    plain text
 * @param {{x:number,y:number}|null} pos  screen position (projected head)
 */
export function showChatBubble(key, text, pos) {
  let b = bubbles.get(key)
  if (!b) {
    b = { el: makeBubble(), timer: 0 }
    bubbles.set(key, b)
  }
  b.el.textContent = text // plain text — never innerHTML
  if (pos) {
    b.el.style.left = `${pos.x}px`
    b.el.style.top = `${pos.y}px`
  }
  b.el.style.opacity = '1'
  b.el.style.display = 'block'

  if (b.timer) clearTimeout(b.timer)
  b.timer = setTimeout(() => {
    b.el.style.opacity = '0'
    setTimeout(() => { b.el.style.display = 'none' }, FADE_MS)
  }, BUBBLE_MS)
}

export function positionChatBubble(key, pos) {
  const b = bubbles.get(key)
  if (b && b.el.style.display !== 'none') {
    b.el.style.left = `${pos.x}px`
    b.el.style.top = `${pos.y}px`
  }
}

export function hideChatBubble(key) {
  const b = bubbles.get(key)
  if (b) {
    b.el.style.opacity = '0'
    b.el.style.display = 'none'
  }
}

export function disposeChatBubble(key) {
  const b = bubbles.get(key)
  if (b) {
    if (b.timer) clearTimeout(b.timer)
    b.el.remove()
    bubbles.delete(key)
  }
}
