import { useEffect } from 'react'

function setControlledInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

export default function SalesWarRoomPasswordTools() {
  useEffect(() => {
    if (!window.location.pathname.startsWith('/sales-war-room/')) return

    const style = document.createElement('style')
    style.id = 'sales-war-room-password-tools-style'
    style.textContent = `
      .sales-war-room-password-tools {
        position: fixed;
        z-index: 2147483000;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px;
        border-radius: 10px;
        background: rgba(15, 23, 42, .94);
        box-shadow: 0 6px 20px rgba(0,0,0,.22);
        backdrop-filter: blur(8px);
      }
      .sales-war-room-password-tools button {
        appearance: none;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 8px;
        background: rgba(255,255,255,.10);
        color: white;
        padding: 7px 9px;
        font: 800 11px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        white-space: nowrap;
        cursor: pointer;
      }
      .sales-war-room-password-tools button:active { transform: scale(.96); }
    `
    document.head.appendChild(style)

    const tools = document.createElement('div')
    tools.className = 'sales-war-room-password-tools'
    tools.style.display = 'none'

    const showButton = document.createElement('button')
    showButton.type = 'button'

    const pasteButton = document.createElement('button')
    pasteButton.type = 'button'

    tools.append(showButton, pasteButton)
    document.body.appendChild(tools)

    let input: HTMLInputElement | null = null
    let observer: MutationObserver | null = null

    const isArabic = () => document.documentElement.dir === 'rtl'
    const labels = () => ({
      show: isArabic() ? '👁 إظهار' : '👁 Show',
      hide: isArabic() ? '🙈 إخفاء' : '🙈 Hide',
      paste: isArabic() ? '📋 لصق' : '📋 Paste',
    })

    function visiblePasswordInput() {
      const candidates = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"], input[data-war-room-password="true"]'))
      return candidates.find(el => {
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden'
      }) || null
    }

    function updateLabels() {
      const l = labels()
      showButton.textContent = input?.type === 'text' ? l.hide : l.show
      pasteButton.textContent = l.paste
    }

    function positionTools() {
      if (!input || !document.body.contains(input)) {
        tools.style.display = 'none'
        return
      }
      const rect = input.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        tools.style.display = 'none'
        return
      }
      tools.style.display = 'flex'
      tools.style.top = `${Math.max(4, rect.top + (rect.height - tools.offsetHeight) / 2)}px`
      tools.style.left = `${Math.max(4, rect.right - tools.offsetWidth - 6)}px`
    }

    function enhance() {
      const found = visiblePasswordInput()
      if (!found) {
        input = null
        tools.style.display = 'none'
        return
      }
      input = found
      input.dataset.warRoomPassword = 'true'
      input.autocomplete = 'current-password'
      input.setAttribute('autocapitalize', 'none')
      input.setAttribute('spellcheck', 'false')
      input.style.paddingInlineEnd = '132px'
      updateLabels()
      requestAnimationFrame(positionTools)
    }

    showButton.addEventListener('click', () => {
      if (!input) return
      const start = input.selectionStart
      const end = input.selectionEnd
      input.type = input.type === 'password' ? 'text' : 'password'
      input.dataset.warRoomPassword = 'true'
      input.focus()
      try { if (start !== null && end !== null) input.setSelectionRange(start, end) } catch {}
      updateLabels()
      positionTools()
    })

    pasteButton.addEventListener('click', async () => {
      if (!input) return
      input.focus()
      try {
        const text = await navigator.clipboard.readText()
        if (text) setControlledInputValue(input, text)
      } catch {
        // Native long-press paste remains available if clipboard permission is denied.
      }
      positionTools()
    })

    observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['type', 'style', 'class'] })
    window.addEventListener('resize', positionTools)
    window.addEventListener('scroll', positionTools, true)
    document.addEventListener('focusin', enhance)

    enhance()

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', positionTools)
      window.removeEventListener('scroll', positionTools, true)
      document.removeEventListener('focusin', enhance)
      tools.remove()
      style.remove()
    }
  }, [])

  return null
}
