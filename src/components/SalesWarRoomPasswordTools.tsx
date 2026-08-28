import { useEffect } from 'react'

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
        padding: 4px;
        border-radius: 10px;
        background: rgba(15, 23, 42, .94);
        box-shadow: 0 6px 20px rgba(0,0,0,.22);
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
    tools.append(showButton)
    document.body.appendChild(tools)

    let input: HTMLInputElement | null = null

    const isArabic = () => document.documentElement.dir === 'rtl'
    const labels = () => ({
      show: isArabic() ? '👁 إظهار' : '👁 Show',
      hide: isArabic() ? '🙈 إخفاء' : '🙈 Hide',
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
      const top = Math.max(4, rect.top + (rect.height - tools.offsetHeight) / 2)
      const left = Math.max(4, rect.right - tools.offsetWidth - 6)
      tools.style.top = `${top}px`
      tools.style.left = `${left}px`
    }

    function enhance() {
      const found = visiblePasswordInput()
      if (!found) {
        input = null
        tools.style.display = 'none'
        return
      }
      input = found
      if (input.dataset.warRoomPassword !== 'true') input.dataset.warRoomPassword = 'true'
      if (input.autocomplete !== 'current-password') input.autocomplete = 'current-password'
      if (input.getAttribute('autocapitalize') !== 'none') input.setAttribute('autocapitalize', 'none')
      if (input.getAttribute('spellcheck') !== 'false') input.setAttribute('spellcheck', 'false')
      if (input.style.paddingInlineEnd !== '78px') input.style.paddingInlineEnd = '78px'
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
      requestAnimationFrame(positionTools)
    })

    // Native long-press/context-menu paste remains available on the input.
    const observer = new MutationObserver(() => requestAnimationFrame(enhance))
    observer.observe(document.body, { childList: true, subtree: true })

    const onFocus = () => requestAnimationFrame(enhance)
    const onPosition = () => requestAnimationFrame(positionTools)
    window.addEventListener('resize', onPosition)
    window.addEventListener('scroll', onPosition, true)
    document.addEventListener('focusin', onFocus)

    enhance()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onPosition)
      window.removeEventListener('scroll', onPosition, true)
      document.removeEventListener('focusin', onFocus)
      tools.remove()
      style.remove()
    }
  }, [])

  return null
}
