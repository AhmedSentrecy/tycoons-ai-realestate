/* @ds-bundle: {"format":4,"namespace":"TycoonsInvestmentsDesignSystem_8890c9","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"LanguageSwitch","sourcePath":"components/core/LanguageSwitch.jsx"},{"name":"StatusNote","sourcePath":"components/core/StatusNote.jsx"},{"name":"WhatsAppButton","sourcePath":"components/core/WhatsAppButton.jsx"},{"name":"Badge","sourcePath":"components/forms/Badge.jsx"},{"name":"Chip","sourcePath":"components/forms/Chip.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SearchBar","sourcePath":"components/forms/SearchBar.jsx"},{"name":"Tag","sourcePath":"components/forms/Tag.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"PropertyCard","sourcePath":"components/property/PropertyCard.jsx"}],"sourceHashes":{"components/core/Button.jsx":"ae4dd0cc0ef5","components/core/Eyebrow.jsx":"7205fa9b4a8d","components/core/LanguageSwitch.jsx":"0225a3daebd2","components/core/StatusNote.jsx":"e1c287438882","components/core/WhatsAppButton.jsx":"893ea8db7b04","components/forms/Badge.jsx":"3344e3dd5b63","components/forms/Chip.jsx":"3fdfd562573e","components/forms/Input.jsx":"58a3bf0380a4","components/forms/SearchBar.jsx":"7ed2204812c7","components/forms/Tag.jsx":"c2ed34ac4083","components/forms/Textarea.jsx":"3e242a52e5f5","components/property/PropertyCard.jsx":"0311b9cacc61","demos/animations.jsx":"a8d2a696abaa","demos/ios-frame.jsx":"be3343be4b51","demos/tweaks-panel.jsx":"8a5ecc816c55","demos/tycoons-search-scene.jsx":"0dc3e99b2830","demos/tycoons-site/App.jsx":"1a879f1113f2","demos/tycoons-site/Concierge.jsx":"d21dd3cdb7a2","demos/tycoons-site/HomeSections.jsx":"d04677497ba2","demos/tycoons-site/ProjectPage.jsx":"3f176b25acac","demos/tycoons-site/ResultCard.jsx":"47568c1ba754","demos/tycoons-site/copy.js":"84b3d4c866b0","demos/tycoons-site/data.js":"4c17dc46b716","demos/tycoons-site/intent.js":"8ab40720d82c","demos/tycoons-site/supabase.js":"21f7231274c8","demos/tycoons-site/voice.js":"5637acb068b9","ui_kits/website/Header.jsx":"d4868de20207","ui_kits/website/Hero.jsx":"8a331a17fd71","ui_kits/website/HowPanel.jsx":"59a765537961","ui_kits/website/Results.jsx":"3fdd46a1f582","ui_kits/website/data.js":"1601d986fbb7"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TycoonsInvestmentsDesignSystem_8890c9 = window.TycoonsInvestmentsDesignSystem_8890c9 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tycoons primary action button. Pill-shaped, weighty, with the
 * brand's lift-on-hover. Variants map to the site's button system.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '0 14px',
      minHeight: 36,
      fontSize: 13
    },
    md: {
      padding: '0 20px',
      minHeight: 44,
      fontSize: 14
    },
    lg: {
      padding: '0 26px',
      minHeight: 52,
      fontSize: 15
    }
  };
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, var(--navy), var(--navy-600))',
      color: '#fff',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-primary)'
    },
    secondary: {
      background: 'rgba(255,255,255,.9)',
      color: 'var(--navy)',
      border: '1px solid var(--line-strong)',
      boxShadow: 'none'
    },
    ghost: {
      background: '#fff8e9',
      color: 'var(--gold)',
      border: '1px solid var(--line-gold)',
      boxShadow: 'none'
    },
    gold: {
      background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
      color: '#fff',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-gold)'
    }
  };
  const [hover, setHover] = React.useState(false);
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    letterSpacing: 0,
    borderRadius: 'var(--radius-pill)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    transition: 'transform .16s var(--ease), box-shadow .16s var(--ease), background .16s var(--ease), color .16s var(--ease), border-color .16s var(--ease)',
    opacity: disabled ? 0.55 : 1,
    transform: hover && !disabled ? 'translateY(-1px)' : 'none',
    ...sizes[size],
    ...variants[variant]
  };

  // Hover color shifts that match the source
  if (hover && !disabled) {
    if (variant === 'secondary') {
      base.borderColor = 'var(--gold)';
      base.color = 'var(--gold)';
    }
    if (variant === 'ghost') {
      base.background = 'var(--gold)';
      base.color = '#fff';
      base.borderColor = 'var(--gold)';
    }
    if (variant === 'primary') {
      base.background = 'var(--navy-700)';
    }
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The brand's signature gold kicker label — uppercase, heavy,
 * letter-spaced, with a leading gold dot.
 */
function Eyebrow({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      color: 'var(--gold)',
      fontFamily: 'var(--font-display)',
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: '.11em',
      textTransform: 'uppercase',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'currentColor',
      flex: '0 0 7px'
    }
  }), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/LanguageSwitch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EN / AR language switcher — the gold-tinted pill segmented control
 * from the site header.
 */
function LanguageSwitch({
  value = 'ar',
  onChange,
  style,
  ...rest
}) {
  const opts = [{
    id: 'en',
    label: 'EN'
  }, {
    id: 'ar',
    label: 'عربي'
  }];
  return /*#__PURE__*/React.createElement("div", _extends({
    dir: "ltr",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: 3,
      borderRadius: 'var(--radius-pill)',
      border: '1px solid rgba(184,137,57,.34)',
      background: 'rgba(255,248,233,.82)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.72)',
      ...style
    }
  }, rest), opts.map(o => {
    const active = o.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.id,
      type: "button",
      onClick: () => onChange && onChange(o.id),
      style: {
        minWidth: 38,
        height: 30,
        padding: '0 10px',
        border: 'none',
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-display)',
        fontSize: 12,
        fontWeight: 900,
        cursor: 'pointer',
        transition: 'background .16s var(--ease), color .16s var(--ease), box-shadow .16s var(--ease)',
        color: active ? '#fff' : 'var(--navy)',
        background: active ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'transparent',
        boxShadow: active ? 'var(--shadow-gold)' : 'none'
      }
    }, o.label);
  }));
}
Object.assign(__ds_scope, { LanguageSwitch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/LanguageSwitch.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusNote.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Inline status note used under search/forms. Tone maps to the
 * brand's tinted status colors.
 */
function StatusNote({
  children,
  tone = 'info',
  style,
  ...rest
}) {
  const tones = {
    info: {
      background: 'var(--warn-bg)',
      color: 'var(--warn-ink)',
      border: '1px solid var(--warn-border)'
    },
    success: {
      background: 'var(--green-bg)',
      color: 'var(--green)',
      border: '1px solid var(--green-border)'
    },
    error: {
      background: 'var(--red-bg)',
      color: 'var(--red)',
      border: '1px solid var(--red-border)'
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      padding: '12px 14px',
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      lineHeight: 1.55,
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { StatusNote });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusNote.jsx", error: String((e && e.message) || e) }); }

// components/core/WhatsAppButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const WA_GLYPH = "data:image/svg+xml,%3Csvg viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19.11 17.29c-.27-.14-1.61-.79-1.86-.88-.25-.09-.43-.14-.62.14-.18.27-.7.88-.86 1.06-.16.18-.31.2-.58.07-.27-.14-1.14-.42-2.18-1.35-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.41.12-.55.13-.13.27-.31.41-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.62-1.49-.84-2.04-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.27s.97 2.64 1.11 2.82c.14.18 1.91 2.91 4.63 4.08.65.28 1.16.45 1.56.58.66.21 1.27.18 1.74.11.53-.08 1.61-.66 1.84-1.29.23-.63.23-1.16.16-1.29-.07-.13-.25-.2-.52-.34z'/%3E%3Cpath d='M16.01 3.2c-7 0-12.67 5.67-12.67 12.67 0 2.22.58 4.39 1.67 6.3L3.2 28.8l6.79-1.78c1.86 1.01 3.95 1.55 6.02 1.55h.01c7 0 12.67-5.67 12.67-12.67S23.01 3.2 16.01 3.2zm0 23.06h-.01c-1.87 0-3.71-.5-5.32-1.46l-.38-.23-4.03 1.06 1.08-3.93-.25-.4a10.53 10.53 0 0 1-1.63-5.59c0-5.82 4.73-10.55 10.55-10.55 2.82 0 5.46 1.1 7.45 3.09 1.99 1.99 3.09 4.63 3.09 7.45 0 5.82-4.73 10.56-10.55 10.56z'/%3E%3C/svg%3E";

/**
 * WhatsApp conversion button — the brand's signature CTA. Solid
 * green with the WhatsApp glyph painted via CSS mask in currentColor.
 * `shape="fab"` renders the floating round action button.
 */
function WhatsAppButton({
  children = 'WhatsApp',
  shape = 'button',
  href = '#',
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const isFab = shape === 'fab';
  const icon = /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: isFab ? 30 : 20,
      height: isFab ? 30 : 20,
      flex: `0 0 ${isFab ? 30 : 20}px`,
      display: 'inline-block',
      background: 'currentColor',
      WebkitMask: `url("${WA_GLYPH}") center / contain no-repeat`,
      mask: `url("${WA_GLYPH}") center / contain no-repeat`
    }
  });
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isFab ? 0 : 8,
    background: 'var(--wa)',
    color: '#fff',
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    borderRadius: 'var(--radius-pill)',
    boxShadow: 'var(--shadow-wa)',
    transition: 'transform .16s var(--ease), box-shadow .16s var(--ease), filter .16s var(--ease)',
    transform: hover ? 'translateY(-1px)' : 'none',
    filter: hover ? 'brightness(1.04)' : 'none',
    ...(isFab ? {
      width: 56,
      height: 56,
      padding: 0,
      boxShadow: '0 16px 36px rgba(32,177,90,.28)'
    } : {
      padding: '0 18px',
      minHeight: 44,
      fontSize: 14
    })
  };
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    target: "_blank",
    rel: "noopener",
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    "aria-label": isFab ? 'Contact on WhatsApp' : undefined,
    style: {
      ...base,
      ...style
    }
  }, rest), icon, !isFab && children);
}
Object.assign(__ds_scope, { WhatsAppButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/WhatsAppButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Status badge — solid emphasis pill for availability / status.
 * Tones map to the brand's gold + semantic palette.
 */
function Badge({
  children,
  tone = 'gold',
  style,
  ...rest
}) {
  const tones = {
    gold: {
      background: 'var(--surface-warm)',
      color: 'var(--gold)',
      border: '1px solid var(--line-gold)'
    },
    available: {
      background: 'var(--green-bg)',
      color: 'var(--green)',
      border: '1px solid var(--green-border)'
    },
    soldout: {
      background: 'var(--red-bg)',
      color: 'var(--red)',
      border: '1px solid var(--red-border)'
    },
    navy: {
      background: 'var(--navy)',
      color: '#fff',
      border: '1px solid var(--navy)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      borderRadius: 'var(--radius-pill)',
      padding: '5px 10px',
      fontFamily: 'var(--font-display)',
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: '.04em',
      textTransform: 'uppercase',
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Badge.jsx", error: String((e && e.message) || e) }); }

// components/forms/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Quick-search example chip — the soft pill suggestions under the
 * search box. `interactive` adds hover affordance.
 */
function Chip({
  children,
  interactive = false,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      background: 'rgba(255,255,255,.72)',
      color: 'var(--navy)',
      border: `1px solid ${hover && interactive ? 'var(--gold)' : 'rgba(184,137,57,.18)'}`,
      borderRadius: 'var(--radius-pill)',
      padding: '7px 13px',
      fontFamily: 'var(--font-body)',
      fontSize: 12.5,
      fontWeight: 700,
      cursor: interactive ? 'pointer' : 'default',
      transition: 'border-color .16s var(--ease), color .16s var(--ease)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Chip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text input with the brand's gold focus ring. */
function Input({
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("input", _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      border: `1px solid ${focus ? 'var(--focus-border)' : 'var(--line)'}`,
      borderRadius: 14,
      padding: '13px 14px',
      outline: 'none',
      color: 'var(--ink)',
      background: 'var(--surface)',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      boxShadow: focus ? 'var(--focus-ring)' : 'none',
      transition: 'border-color .16s var(--ease), box-shadow .16s var(--ease)',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Property attribute tag — muted pill used inside cards (e.g. "120 m²", "2027"). */
function Tag({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      color: 'var(--muted)',
      background: 'var(--surface-soft)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-pill)',
      padding: '5px 9px',
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      fontWeight: 750,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Multi-line input (soft inset surface) with gold focus ring. */
function Textarea({
  style,
  rows = 3,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      minHeight: 64,
      resize: 'vertical',
      border: `1px solid ${focus ? 'var(--focus-border)' : 'var(--line)'}`,
      borderRadius: 20,
      padding: 14,
      outline: 'none',
      color: 'var(--ink)',
      background: 'var(--surface-soft)',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      lineHeight: 1.55,
      boxShadow: focus ? 'var(--focus-ring)' : 'none',
      transition: 'border-color .16s var(--ease), box-shadow .16s var(--ease)',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The voice-or-text AI search card — the centerpiece of the homepage.
 * A labelled textarea + primary Search button, with example chips.
 */
function SearchBar({
  label = 'ابحث بالصوت أو بالكتابة',
  action = 'اتكلم مع المساعد',
  placeholder = 'مثال: عايز شاليه في الساحل أو iVilla in New Cairo',
  buttonLabel = 'بحث',
  examples = ['عايز شاليه في الساحل', 'آي فيلا في التجمع', 'شقة أقل من 9 مليون', 'استلام قريب'],
  value,
  onChange,
  onSearch,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--line-strong)',
      borderRadius: 'var(--radius-xl)',
      padding: 16,
      boxShadow: 'var(--shadow-md)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      margin: '2px 4px 10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 13,
      fontWeight: 900,
      color: 'var(--navy)'
    }
  }, label), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'var(--gold)',
      fontSize: 13,
      fontWeight: 900,
      borderBottom: '1px solid rgba(184,137,57,.35)'
    }
  }, action)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(118px,150px)',
      gap: 12,
      alignItems: 'stretch'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Textarea, {
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    style: {
      minHeight: 82
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    onClick: onSearch,
    style: {
      minHeight: 82,
      whiteSpace: 'normal'
    }
  }, buttonLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      flexWrap: 'wrap',
      marginTop: 14
    }
  }, examples.map((ex, i) => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: i,
    interactive: true,
    onClick: () => onChange && onChange({
      target: {
        value: ex
      }
    })
  }, ex))));
}
Object.assign(__ds_scope, { SearchBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchBar.jsx", error: String((e && e.message) || e) }); }

// components/property/PropertyCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Property/unit card — the core marketplace object. Image with scrim +
 * pill label, gold kicker, title, tags, warm price row, a 3-up metric
 * grid, and a gold links row + WhatsApp CTA.
 */
function PropertyCard({
  image,
  label = 'North Coast',
  kicker = 'Chalet',
  title = 'Mountain View · Chalet on the North Coast',
  tags = ['120 m²', 'Semi-finished'],
  price = 'EGP 8,400,000',
  priceCaption = 'Starting price',
  metrics = [{
    label: 'Area',
    value: '120 m²'
  }, {
    label: 'Delivery',
    value: '2027'
  }, {
    label: 'Down pmt',
    value: '5%'
  }],
  availability = 'available',
  waHref = 'https://wa.me/201200704344',
  onBrochure,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: 'var(--surface)',
      border: `1px solid ${hover ? 'var(--line-strong)' : 'var(--line)'}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      transform: hover ? 'translateY(-3px)' : 'none',
      transition: 'transform .16s var(--ease), box-shadow .16s var(--ease), border-color .16s var(--ease)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 200,
      background: image ? '#eef1f5' : 'linear-gradient(135deg,#edf0f5,#f8f1e3)',
      overflow: 'hidden'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: title,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      color: 'var(--faint)',
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 13,
      letterSpacing: '.08em',
      textTransform: 'uppercase'
    }
  }, "Tycoons"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--img-scrim)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      bottom: 12,
      zIndex: 2,
      background: 'rgba(16,24,39,.72)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,.18)',
      borderRadius: 'var(--radius-pill)',
      padding: '6px 10px',
      fontSize: 12,
      letterSpacing: '.04em',
      textTransform: 'uppercase',
      backdropFilter: 'blur(8px)'
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 17,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold)',
      fontFamily: 'var(--font-display)',
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: '.08em',
      textTransform: 'uppercase'
    }
  }, kicker), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: availability === 'available' ? 'available' : availability === 'sold_out' ? 'soldout' : 'gold'
  }, availability === 'available' ? 'Available' : availability === 'sold_out' ? 'Sold out' : 'Limited')), /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--navy)',
      fontFamily: 'var(--font-display)',
      fontSize: 19,
      lineHeight: 1.22,
      letterSpacing: '-.02em',
      margin: 0,
      fontWeight: 700
    }
  }, title), tags.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      flexWrap: 'wrap'
    }
  }, tags.map((t, i) => /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    key: i
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      padding: 14,
      borderRadius: 'var(--radius-sm)',
      background: 'var(--surface-warm)',
      border: '1px solid var(--line-gold)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: '#7f6c49',
      fontFamily: 'var(--font-display)',
      fontSize: 11,
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      marginBottom: 5
    }
  }, priceCaption), /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      color: 'var(--navy)',
      fontSize: 18,
      lineHeight: 1.2,
      fontFamily: 'var(--font-display)'
    }
  }, price)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 8
    }
  }, metrics.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      border: '1px solid var(--line)',
      background: 'var(--surface-soft)',
      borderRadius: 14,
      padding: 9,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--faint)',
      fontFamily: 'var(--font-display)',
      fontSize: 10.5,
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '.07em',
      marginBottom: 4
    }
  }, m.label), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--navy)',
      display: 'block',
      fontSize: 12.5,
      lineHeight: 1.25,
      fontFamily: 'var(--font-display)'
    }
  }, m.value)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onBrochure,
    style: {
      color: 'var(--gold)',
      border: '1px solid var(--line-gold)',
      background: '#fff8e9',
      borderRadius: 'var(--radius-pill)',
      padding: '8px 10px',
      fontFamily: 'var(--font-display)',
      fontSize: 12.5,
      fontWeight: 900,
      cursor: 'pointer',
      alignSelf: 'flex-start'
    }
  }, "Ask for brochure"), /*#__PURE__*/React.createElement(__ds_scope.WhatsAppButton, {
    href: waHref,
    style: {
      width: '100%',
      minHeight: 42,
      fontSize: 13
    }
  }, "Continue on WhatsApp"))));
}
Object.assign(__ds_scope, { PropertyCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/property/PropertyCard.jsx", error: String((e && e.message) || e) }); }

// demos/animations.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// animations.jsx — timeline engine. Exports (on window): Stage, Sprite,
//   TextSprite, ImageSprite, RectSprite, VideoSprite, PlaybackBar,
//   useTime, useTimeline, useSprite, Easing, interpolate, animate, clamp.
//
//   <Stage width={1280} height={720} duration={10} background="#f6f4ef">
//     <Sprite start={0} end={3}>
//       <TextSprite text="Hello" x={100} y={300} size={72} color="#111" />
//     </Sprite>
//     <Sprite start={2} end={8}>
//       <ImageSprite src="hero.png" x={200} y={120} width={640} height={360} kenBurns />
//     </Sprite>
//   </Stage>
//
// Stage({width,height,duration,background,fps,loop,autoplay}) — auto-scales to
//   viewport; scrubber + play/pause + ←/→ seek + space + 0-reset; persists
//   playhead. The canvas is an <svg><foreignObject>, export-ready: Share →
//   Export → Video (or the PlaybackBar's download button) renders it to .mp4.
//   Screenshot tools DOM-rerender (not pixel-capture) and unwrap this wrapper
//   so captures should work — but if one comes back black, that's a capture
//   artifact, not a render bug; trust the live preview.
// Sprite({start,end,keepMounted}) — mounts children only while playhead is in
//   [start,end]. Children read {localTime, progress, duration} via useSprite().
// useTime() → seconds; useTimeline() → {time,duration,playing,setTime,setPlaying}.
// TextSprite({text,x,y,size,color,font,weight,align,entryDur,exitDur}) — fades/scales in+out.
// ImageSprite({src,x,y,width,height,fit,radius,kenBurns,placeholder}) — same, with optional ken-burns.
// RectSprite({x,y,width,height,color,radius}) — solid box with entry/exit.
// VideoSprite({src,start,end,speed,style}) — looped <video> clip synced to the
//   timeline; its audio is mixed into the exported video.
// Easing.{linear,easeIn/Out/InOut Quad/Cubic/Quart/Quint/Expo/Back, …}
// interpolate([t0,t1,…],[v0,v1,…],ease?) → (t)=>v  — piecewise tween.
// animate({from,to,start,end,ease}) → (t)=>v  — single tween.
//
// Build scenes by composing Sprites inside Stage. Absolutely-position elements.
//
// In a .dc.html project, put your scene in a sibling my-scene.jsx (reading
// {Stage, Sprite, useTime, Easing, …} from window is safe) and mount BOTH:
//   <x-import component-from-global-scope="MyScene"
//             from="./animations.jsx ./my-scene.jsx"></x-import>
// The two files in from= load in order, so my-scene.jsx can use the globals
// animations.jsx set.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: t => t,
  // Quad
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  // Cubic
  easeInCubic: t => t * t * t,
  easeOutCubic: t => --t * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  // Quart
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - --t * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  // Expo
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },
  // Sine
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  // Back (overshoot)
  easeOutBack: t => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: t => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: t => {
    const c1 = 1.70158,
      c2 = c1 * 1.525;
    return t < 0.5 ? Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  // Elastic
  easeOutElastic: t => {
    const c4 = 2 * Math.PI / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return t => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? ease[i] || Easing.linear : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({
  from = 0,
  to = 1,
  start = 0,
  end = 1,
  ease = Easing.easeInOutCubic
}) {
  return t => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({
  time: 0,
  duration: 10,
  playing: false
});
const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Sprite ──────────────────────────────────────────────────────────────────
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper — children can call useSprite() themselves.

const SpriteContext = React.createContext({
  localTime: 0,
  progress: 0,
  duration: 0
});
const useSprite = () => React.useContext(SpriteContext);
function Sprite({
  start = 0,
  end = Infinity,
  children,
  keepMounted = false
}) {
  const {
    time
  } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;
  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration) ? clamp(localTime / duration, 0, 1) : 0;
  const value = {
    localTime,
    progress,
    duration,
    visible
  };
  return /*#__PURE__*/React.createElement(SpriteContext.Provider, {
    value: value
  }, typeof children === 'function' ? children(value) : children);
}

// ── Sample sprite components ────────────────────────────────────────────────

// TextSprite: fades/slides text in on entry, holds, then fades out on exit.
// Props: text, x, y, size, color, font, entryDur, exitDur, align
function TextSprite({
  text,
  x = 0,
  y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em'
}) {
  const {
    localTime,
    duration
  } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);
  let opacity = 1;
  let ty = 0;
  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }
  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(${translateX}, ${ty}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing,
      whiteSpace: 'pre',
      lineHeight: 1.1,
      willChange: 'transform, opacity'
    }
  }, text);
}

// ImageSprite: scales + fades in; optional Ken Burns drift during hold.
function ImageSprite({
  src,
  x = 0,
  y = 0,
  width = 400,
  height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null // {label: string} for striped placeholder
}) {
  const {
    localTime,
    duration
  } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);
  let opacity = 1;
  let scale = 1;
  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }
  const content = placeholder ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
      color: '#6b6458',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      letterSpacing: '0.04em',
      textTransform: 'uppercase'
    }
  }, placeholder.label || 'image') : /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: fit,
      display: 'block'
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      borderRadius: radius,
      overflow: 'hidden',
      willChange: 'transform, opacity'
    }
  }, content);
}

// RectSprite: simple rectangle that animates position/size/color via props.
// Useful demo primitive — takes a `render` fn for per-frame customization.
function RectSprite({
  x = 0,
  y = 0,
  width = 100,
  height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
  render // optional: (ctx) => style overrides
}) {
  const spriteCtx = useSprite();
  const {
    localTime,
    duration
  } = spriteCtx;
  const exitStart = Math.max(0, duration - exitDur);
  let opacity = 1;
  let scale = 1;
  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }
  const overrides = render ? render(spriteCtx) : {};
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      background: color,
      borderRadius: radius,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
      ...overrides
    }
  });
}

// ── Font inlining ───────────────────────────────────────────────────────────
// Copy every @font-face rule from the page into a <style> inside the svg's
// foreignObject, with font URLs rewritten to data: URLs. Makes the svg
// self-describing so serializing it alone (video export fast path) still
// renders with the right fonts. Sets data-om-fonts-inlined on the svg when
// done so the exporter can wait for it.

function useInlineFontsInto(svgRef) {
  React.useEffect(() => {
    const svg = svgRef.current;
    const host = svg && svg.querySelector('foreignObject > div');
    if (!svg || !host) return;
    let cancelled = false;
    (async () => {
      const rules = [];
      for (const ss of document.styleSheets) {
        let cssRules;
        try {
          cssRules = ss.cssRules;
        } catch {
          // Cross-origin sheet without crossorigin attr (e.g. the standard
          // fonts.googleapis.com <link>) — fetch the CSS text directly and
          // regex-extract the @font-face blocks.
          if (ss.href) {
            try {
              const txt = await fetch(ss.href).then(r => {
                if (!r.ok) throw 0;
                return r.text();
              });
              for (const ff of txt.match(/@font-face\s*{[^}]*}/g) || []) rules.push({
                css: ff,
                base: ss.href
              });
            } catch {}
          }
          continue;
        }
        if (!cssRules) continue;
        for (const r of cssRules) {
          if (r.type === CSSRule.FONT_FACE_RULE) {
            rules.push({
              css: r.cssText,
              base: ss.href || location.href
            });
          }
        }
      }
      const toDataURL = url => fetch(url).then(r => {
        if (!r.ok) throw 0;
        return r.blob();
      }).then(b => new Promise(res => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = () => res(url);
        fr.readAsDataURL(b);
      })).catch(() => url);
      const parts = await Promise.all(rules.map(async ({
        css,
        base
      }) => {
        const re = /url\((['"]?)([^'")]+)\1\)/g;
        let out = css,
          m;
        while (m = re.exec(css)) {
          const u = m[2];
          if (u.startsWith('data:')) continue;
          let abs;
          try {
            abs = new URL(u, base).href;
          } catch {
            continue;
          }
          out = out.split(m[0]).join(`url("${await toDataURL(abs)}")`);
        }
        return out;
      }));
      if (cancelled || !parts.length) {
        svg.setAttribute('data-om-fonts-inlined', 'true');
        return;
      }
      const style = document.createElement('style');
      style.textContent = parts.join('\n');
      host.insertBefore(style, host.firstChild);
      svg.setAttribute('data-om-fonts-inlined', 'true');
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  children
}) {
  // Props arrive as strings when Stage is mounted via <x-import> (DC
  // projects) — coerce so style={{width}} gets a number React can px-ify.
  width = +width || 1280;
  height = +height || 720;
  duration = +duration || 10;
  fps = +fps || 60;
  if (typeof loop === 'string') loop = loop !== 'false';
  if (typeof autoplay === 'string') autoplay = autoplay !== 'false';
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch {
      return 0;
    }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try {
      localStorage.setItem(persistKey + ':t', String(time));
    } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const s = Math.min(el.clientWidth / width, (el.clientHeight - barH) / height);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = ts => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime(t => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;else {
            next = duration;
            setPlaying(false);
          }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  // Video-export protocol: the exporter dispatches this event per frame;
  // pause + sync the playhead so the capture sees exactly that timestamp.
  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onSeek = e => {
      setPlaying(false);
      setTime(clamp(e.detail.time, 0, duration));
    };
    el.addEventListener('data-om-seek-to-time-frame', onSeek);
    return () => el.removeEventListener('data-om-seek-to-time-frame', onSeek);
  }, [duration]);

  // Inline @font-face rules into the svg's foreignObject so the svg is
  // self-describing — serializing it alone (for video export) then renders
  // with the right fonts. Sets data-om-fonts-inlined once done.
  useInlineFontsInto(canvasRef);
  const displayTime = hoverTime != null ? hoverTime : time;
  const ctxValue = React.useMemo(() => ({
    time: displayTime,
    duration,
    playing,
    setTime,
    setPlaying
  }), [displayTime, duration, playing]);
  return /*#__PURE__*/React.createElement("div", {
    ref: stageRef,
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: '#0a0a0a',
      fontFamily: 'Inter, system-ui, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    ref: canvasRef,
    width: width,
    height: height,
    "data-om-exportable-video-with-duration-secs": duration,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      flexShrink: 0,
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("foreignObject", {
    x: "0",
    y: "0",
    width: "100%",
    height: "100%"
  }, /*#__PURE__*/React.createElement("div", {
    xmlns: "http://www.w3.org/1999/xhtml",
    style: {
      width,
      height,
      background,
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(TimelineContext.Provider, {
    value: ctxValue
  }, children))))), /*#__PURE__*/React.createElement(PlaybackBar, {
    time: displayTime,
    actualTime: time,
    duration: duration,
    playing: playing,
    onPlayPause: () => setPlaying(p => !p),
    onReset: () => {
      setTime(0);
    },
    onSeek: t => setTime(t),
    onHover: t => setHoverTime(t)
  }));
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({
  time,
  duration,
  playing,
  onPlayPause,
  onReset,
  onSeek,
  onHover
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const timeFromEvent = React.useCallback(e => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);
  const onTrackMove = e => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };
  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };
  const onTrackDown = e => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };
  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = e => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);
  const pct = duration > 0 ? time / duration * 100 : 0;
  const fmt = t => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor(total * 100 % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };
  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';
  return /*#__PURE__*/React.createElement("div", {
    "data-omelette-chrome": true,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 16px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      borderRadius: 8,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    onClick: onReset,
    title: "Return to start (0)"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2v10M12 2L5 7l7 5V2z",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement(IconButton, {
    onClick: onPlayPause,
    title: "Play/pause (space)"
  }, playing ? /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "2",
    width: "3",
    height: "10",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "2",
    width: "3",
    height: "10",
    fill: "currentColor"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2l9 5-9 5V2z",
    fill: "currentColor"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: mono,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      width: 64,
      textAlign: 'right',
      color: '#f6f4ef'
    }
  }, fmt(time)), /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    onMouseMove: onTrackMove,
    onMouseLeave: onTrackLeave,
    onMouseDown: onTrackDown,
    style: {
      flex: 1,
      height: 22,
      position: 'relative',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 4,
      background: 'rgba(255,255,255,0.12)',
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      width: `${pct}%`,
      height: 4,
      background: 'oklch(72% 0.12 250)',
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: `${pct}%`,
      top: '50%',
      width: 12,
      height: 12,
      marginLeft: -6,
      marginTop: -6,
      background: '#fff',
      borderRadius: 6,
      boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: mono,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      width: 64,
      textAlign: 'left',
      color: 'rgba(246,244,239,0.55)'
    }
  }, fmt(duration)), typeof VideoEncoder !== 'undefined' && /*#__PURE__*/React.createElement(IconButton, {
    title: "Export video",
    onClick: () => window.parent.postMessage({
      type: 'omelette:request-video-export'
    }, '*')
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 2v7m0 0L4 6m3 3l3-3M2 12h10",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))));
}
function IconButton({
  children,
  onClick,
  title
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    title: title,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: 28,
      height: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 6,
      color: '#f6f4ef',
      cursor: 'pointer',
      padding: 0,
      transition: 'background 120ms'
    }
  }, children);
}

// ── VideoSprite ─────────────────────────────────────────────────────────────
// Renders a <video> that loops within [start,end] of its source at `speed`,
// kept in sync with the Stage's playhead. Carries the
// data-om-exportable-video-play-* attrs so video export can mix its audio.
//
//   <VideoSprite src="clip.mp4" start={2} end={5} speed={1}
//     style={{ width: 640, height: 360 }} />

function VideoSprite({
  src,
  start = 0,
  end,
  speed = 1,
  style,
  ...rest
}) {
  start = +start || 0;
  speed = +speed || 1;
  if (end != null) end = +end || undefined;
  const t = useTime();
  const ref = React.useRef(null);
  const span = Math.max(0.001, (end ?? start + 1) - start);
  React.useEffect(() => {
    const v = ref.current;
    if (!v || v.readyState < 1) return;
    const target = start + t * speed % span;
    if (Math.abs(v.currentTime - target) > 0.05) v.currentTime = target;
  }, [t, start, span, speed]);
  return /*#__PURE__*/React.createElement("video", _extends({
    ref: ref,
    src: src,
    muted: true,
    playsInline: true,
    preload: "auto",
    "data-om-exportable-video-play-start": start,
    "data-om-exportable-video-play-end": end ?? start + span,
    "data-om-exportable-video-play-speed": speed,
    style: {
      display: 'block',
      objectFit: 'cover',
      ...style
    }
  }, rest));
}
Object.assign(window, {
  Easing,
  interpolate,
  animate,
  clamp,
  TimelineContext,
  useTime,
  useTimeline,
  Sprite,
  SpriteContext,
  useSprite,
  TextSprite,
  ImageSprite,
  RectSprite,
  VideoSprite,
  Stage,
  PlaybackBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/animations.jsx", error: String((e && e.message) || e) }); }

// demos/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/ios-frame.jsx", error: String((e && e.message) || e) }); }

// demos/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:inset-inline-start .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const rtl = getComputedStyle(trackRef.current).direction === 'rtl';
    let i = Math.floor((clientX - r.left - 2) / inner * n);
    if (rtl) i = n - 1 - i;
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      insetInlineStart: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// demos/tycoons-search-scene.jsx
try { (() => {
/* Tycoons — voice-first search animation scene (portrait 1080x1350).
   Tells the story: voice prompt → "hold to talk" waveform → transcribed
   request types into the search bar → search → matching sea-unit result. */
(function () {
  const {
    Stage,
    useTime,
    Easing,
    interpolate,
    clamp
  } = window;
  const NAVY = '#101827';
  const GOLD = '#b88939';
  const WA = '#20b15a';

  // fade+rise helper -> {opacity, translateY}
  function rise(t, start, dur = 0.6, dist = 28) {
    const p = clamp((t - start) / dur, 0, 1);
    const e = Easing.easeOutCubic(p);
    return {
      opacity: e,
      ty: (1 - e) * dist
    };
  }
  function fadeOut(t, start, dur = 0.5) {
    return 1 - clamp((t - start) / dur, 0, 1);
  }
  function Scene() {
    const t = useTime();

    // ---- timeline marks ----
    const REQUEST = 'عايز شاليه في الساحل';
    // voice press window
    const voiceStart = 3.0,
      voiceEnd = 5.6;
    const listening = t >= voiceStart && t <= voiceEnd;
    // typing window (transcription)
    const typeStart = 5.4,
      typeEnd = 7.6;
    const typed = Math.floor(clamp((t - typeStart) / (typeEnd - typeStart), 0, 1) * REQUEST.length);
    const typingActive = t >= typeStart && t < typeEnd + 0.3;
    const caretOn = Math.floor(t * 2) % 2 === 0;
    // search press
    const searchT = 7.9;
    const searchPulse = t >= searchT && t < searchT + 0.5 ? 1 + Math.sin(clamp((t - searchT) / 0.5, 0, 1) * Math.PI) * 0.05 : 1;
    // result reveal
    const resultStart = 8.5;
    const intro = rise(t, 0.2, 0.7);
    const eyebrow = rise(t, 0.5, 0.6);
    const head = rise(t, 0.9, 0.8, 36);
    const card = rise(t, 2.0, 0.7, 40);
    const result = rise(t, resultStart, 0.7, 46);

    // equalizer bar heights while listening
    const bars = [];
    for (let i = 0; i < 9; i++) {
      const base = listening ? 0.35 + 0.65 * Math.abs(Math.sin(t * 7 + i * 0.7)) : 0.18;
      bars.push(base);
    }
    const fieldText = REQUEST.slice(0, typed);
    return React.createElement('div', {
      style: {
        width: 1080,
        height: 1350,
        position: 'relative',
        overflow: 'hidden',
        background: NAVY,
        backgroundImage: 'radial-gradient(circle at 84% 6%, rgba(184,137,57,.30), transparent 44%)',
        fontFamily: 'var(--font-arabic)',
        direction: 'rtl',
        color: '#fff',
        padding: '80px 72px',
        boxSizing: 'border-box'
      }
    },
    // logo
    React.createElement('img', {
      src: '../assets/tycoons-logo-light.svg',
      alt: '',
      style: {
        height: 60,
        opacity: intro.opacity,
        transform: `translateY(${intro.ty}px)`
      }
    }),
    // eyebrow
    React.createElement('div', {
      style: {
        marginTop: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        color: GOLD,
        fontWeight: 700,
        fontSize: 28,
        opacity: eyebrow.opacity,
        transform: `translateY(${eyebrow.ty}px)`
      }
    }, React.createElement('span', {
      style: {
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: GOLD,
        display: 'inline-block'
      }
    }), 'بحث عقاري بالصوت والكتابة'),
    // headline
    React.createElement('h1', {
      style: {
        fontSize: 104,
        lineHeight: 1.08,
        fontWeight: 700,
        margin: '22px 0 0',
        opacity: head.opacity,
        transform: `translateY(${head.ty}px)`
      }
    }, 'قول للـ ', React.createElement('span', {
      style: {
        color: GOLD
      }
    }, 'AI'), ' بتدور على إيه.'),
    // ---- search card ----
    React.createElement('div', {
      style: {
        background: '#fff',
        borderRadius: 40,
        padding: 30,
        marginTop: 46,
        boxShadow: '0 30px 70px rgba(0,0,0,.35)',
        opacity: card.opacity,
        transform: `translateY(${card.ty}px) scale(${searchPulse})`,
        transformOrigin: 'center'
      }
    },
    // label row
    React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '4px 8px 20px'
      }
    }, React.createElement('span', {
      style: {
        color: NAVY,
        fontWeight: 700,
        fontSize: 28
      }
    }, 'ابحث بالصوت أو بالكتابة'), React.createElement('span', {
      style: {
        color: GOLD,
        fontWeight: 700,
        fontSize: 26,
        borderBottom: '2px solid rgba(184,137,57,.4)',
        paddingBottom: 2
      }
    }, 'اتكلم مع المساعد')),
    // bar
    React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 230px',
        gap: 20
      }
    }, React.createElement('div', {
      style: {
        background: '#f8f9fb',
        border: '2px solid #e4e7ec',
        borderRadius: 28,
        padding: '28px 30px',
        minHeight: 150,
        fontSize: 32,
        lineHeight: 1.5,
        color: fieldText ? NAVY : '#99a1ad',
        display: 'flex',
        alignItems: 'flex-start',
        flexWrap: 'wrap'
      }
    }, fieldText || (listening ? 'بستمع لك دلوقتي…' : 'مثال: عايز شاليه في الساحل أو iVilla في التجمع…'), typingActive && caretOn ? React.createElement('span', {
      style: {
        display: 'inline-block',
        width: 3,
        height: 38,
        background: GOLD,
        marginRight: 4,
        transform: 'translateY(4px)'
      }
    }) : null), React.createElement('div', {
      style: {
        background: `linear-gradient(135deg, ${NAVY}, #1d2a40)`,
        color: '#fff',
        borderRadius: 28,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 800,
        fontSize: 34,
        boxShadow: '0 12px 24px rgba(16,24,39,.16)'
      }
    }, 'بحث')),
    // chips
    React.createElement('div', {
      style: {
        display: 'flex',
        gap: 14,
        flexWrap: 'wrap',
        marginTop: 22
      }
    }, ['عايز شاليه في الساحل', 'آي فيلا في التجمع', 'شقة أقل من 9 مليون'].map((c, i) => React.createElement('span', {
      key: i,
      style: {
        background: '#f8f9fb',
        color: NAVY,
        border: '2px solid rgba(184,137,57,.18)',
        borderRadius: 999,
        padding: '14px 24px',
        fontSize: 26,
        fontWeight: 600
      }
    }, c)))),
    // ---- voice / hold to talk ----
    React.createElement('div', {
      style: {
        marginTop: 36,
        background: 'rgba(255,255,255,.06)',
        border: '2px solid rgba(255,255,255,.12)',
        borderRadius: 36,
        padding: 32,
        opacity: card.opacity,
        transform: `translateY(${card.ty}px)`
      }
    }, React.createElement('div', {
      style: {
        display: 'flex',
        gap: 20,
        alignItems: 'center'
      }
    },
    // hold-to-talk button (glows while listening)
    React.createElement('div', {
      style: {
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: listening ? `linear-gradient(135deg, ${GOLD}, #d2aa62)` : '#fff',
        color: listening ? '#fff' : NAVY,
        borderRadius: 999,
        padding: '26px 38px',
        fontWeight: 800,
        fontSize: 32,
        transition: 'none',
        boxShadow: listening ? '0 0 0 10px rgba(184,137,57,.18)' : 'none'
      }
    }, React.createElement('span', {
      style: {
        width: 38,
        height: 38,
        borderRadius: 999,
        background: listening ? '#fff' : NAVY,
        display: 'grid',
        placeItems: 'center'
      }
    }, React.createElement('span', {
      style: {
        width: 14,
        height: 20,
        borderRadius: 999,
        background: listening ? GOLD : '#fff',
        display: 'block'
      }
    })), listening ? 'بيتكلم…' : 'اضغط للتحدث'),
    // equalizer
    React.createElement('div', {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        height: 64
      }
    }, bars.map((h, i) => React.createElement('span', {
      key: i,
      style: {
        width: 12,
        height: `${Math.round(h * 64)}px`,
        borderRadius: 999,
        background: listening ? WA : 'rgba(255,255,255,.25)'
      }
    })))), React.createElement('div', {
      style: {
        marginTop: 24,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 26,
        color: 'rgba(255,255,255,.85)'
      }
    }, React.createElement('span', {
      style: {
        width: 16,
        height: 16,
        borderRadius: 999,
        background: WA,
        display: 'inline-block',
        opacity: listening ? 0.5 + 0.5 * Math.abs(Math.sin(t * 6)) : 1
      }
    }), listening ? 'بستقبل طلبك بالصوت…' : 'جاهز للاستماع')),
    // ---- result overlay (slides up at the end) ----
    result.opacity > 0.01 ? React.createElement('div', {
      style: {
        position: 'absolute',
        left: 72,
        right: 72,
        bottom: 64,
        background: '#fff',
        borderRadius: 36,
        padding: 34,
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        boxShadow: '0 -10px 60px rgba(0,0,0,.4)',
        opacity: result.opacity,
        transform: `translateY(${result.ty}px)`
      }
    }, React.createElement('div', {
      style: {
        flex: '0 0 150px',
        height: 150,
        borderRadius: 26,
        background: 'linear-gradient(135deg,#edf0f5,#f8f1e3)',
        display: 'grid',
        placeItems: 'center',
        color: '#99a1ad',
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: '.08em'
      }
    }, 'TYCOONS'), React.createElement('div', {
      style: {
        flex: 1
      }
    }, React.createElement('div', {
      style: {
        color: GOLD,
        fontWeight: 800,
        fontSize: 24
      }
    }, 'شاليه · لافيستا'), React.createElement('div', {
      style: {
        color: NAVY,
        fontWeight: 800,
        fontSize: 36,
        lineHeight: 1.2,
        margin: '6px 0'
      }
    }, 'شاليه بإطلالة بحر في الساحل'), React.createElement('div', {
      style: {
        color: NAVY,
        fontWeight: 800,
        fontSize: 30
      }
    }, 'تبدأ من EGP 8.4M ', React.createElement('span', {
      style: {
        color: '#657080',
        fontWeight: 600,
        fontSize: 24
      }
    }, '· 120 م² · تسليم 2027'))), React.createElement('div', {
      style: {
        flex: '0 0 auto',
        background: WA,
        color: '#fff',
        borderRadius: 999,
        padding: '24px 30px',
        fontWeight: 800,
        fontSize: 28
      }
    }, 'واتساب')) : null);
  }
  window.TycoonsSearchAnimation = function () {
    return React.createElement(Stage, {
      width: 1080,
      height: 1350,
      duration: 13,
      fps: 30,
      loop: true,
      background: NAVY
    }, React.createElement(Scene));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-search-scene.jsx", error: String((e && e.message) || e) }); }

// demos/tycoons-site/App.jsx
try { (() => {
/* Tycoons site — app shell: header, routing, language, voice + query
   engine, tweaks. Composes DS components + the site modules. */
const {
  useState,
  useEffect,
  useRef
} = React;
const TC_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "searchMode": "fullscreen",
  "cardStyle": "compact",
  "launchLayout": "grid",
  "palette": "default"
} /*EDITMODE-END*/;

// Runtime token overrides for the "Royal Sapphire & Brass" direction.
// Applied on documentElement so it cascades to every component AND body
// bg-wash — without editing the design-system token files.
const TC_PALETTES = {
  sapphire: {
    '--navy': '#11213f',
    '--navy-700': '#1b2f52',
    '--navy-600': '#1d3155',
    '--gold': '#b98a46',
    '--gold-deep': '#8e6a34',
    '--gold-bright': '#cba15f',
    '--gold-light': '#cba15f',
    '--gold-soft': '#ebdcb8',
    '--bg': '#eef1f6',
    '--surface': '#ffffff',
    '--surface-soft': '#f3f5f9',
    '--surface-warm': '#f4efe3',
    '--line': '#e0e5ee',
    '--line-strong': '#cfd6e2',
    '--line-gold': '#e2d0a6',
    '--bg-wash': 'radial-gradient(circle at 16% 0%, rgba(185,138,70,.12), transparent 34%), linear-gradient(180deg,#f2f4f8 0%,#eef1f6 100%)',
    '--shadow-md': '0 14px 34px rgba(17,33,63,.10)',
    '--shadow-primary': '0 12px 24px rgba(17,33,63,.16)',
    '--shadow-gold': '0 8px 18px rgba(185,138,70,.22)',
    '--focus-ring': '0 0 0 4px rgba(185,138,70,.10)',
    '--focus-border': 'rgba(185,138,70,.65)'
  }
};
function TCHeader({
  lang,
  setLang,
  onHome,
  t
}) {
  const {
    WhatsAppButton,
    LanguageSwitch
  } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const ar = lang === 'ar';
  const anchors = ['#tc-console', '#tc-launches', '#tc-areas', '#tc-calc', '#tc-foot'];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 40,
      minHeight: 68,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '12px clamp(16px,4vw,48px)',
      background: 'var(--glass-bg)',
      borderBottom: '1px solid var(--glass-border)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    onClick: e => {
      e.preventDefault();
      onHome();
    },
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/tycoons-logo-header.svg",
    alt: "Tycoons Investments",
    style: {
      height: 40
    }
  })), /*#__PURE__*/React.createElement("nav", {
    className: "tc-nav",
    style: {
      display: 'flex',
      gap: 4,
      alignItems: 'center'
    }
  }, t.nav.map((n, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: anchors[i],
    onClick: onHome,
    style: {
      color: 'var(--muted)',
      textDecoration: 'none',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 13.5,
      fontWeight: 700,
      padding: '9px 12px',
      borderRadius: 999
    }
  }, n))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(LanguageSwitch, {
    value: lang,
    onChange: setLang
  }), /*#__PURE__*/React.createElement(WhatsAppButton, {
    href: "https://wa.me/201200704344",
    style: {
      minHeight: 40,
      fontSize: 13.5,
      padding: '0 13px'
    }
  }, t.wa)));
}
function App() {
  // Design locked in from the explored Tweaks — this is the committed build.
  // (Recoverable palette variants live in TC_PALETTES above.)
  const t = {
    searchMode: 'fullscreen',
    cardStyle: 'compact',
    launchLayout: 'grid',
    palette: 'default'
  };
  const [lang, setLang] = useState('ar');
  const [route, setRoute] = useState('home');
  const [activeProject, setActiveProject] = useState(null);
  const [listKind, setListKind] = useState(null);
  const navStack = useRef([]);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [voiceState, setVoiceState] = useState('idle');
  const [fsOpen, setFsOpen] = useState(false);
  const lastFilters = useRef(null);
  const stopListen = useRef(null);
  const consoleRef = useRef(null);
  const copy = window.TC.COPY[lang];
  const [dataTick, setDataTick] = useState(0);
  const [dataSource, setDataSource] = useState(null);
  useEffect(() => {
    function onReady(e) {
      setDataTick(n => n + 1);
      setDataSource(e.detail);
    }
    window.addEventListener('tycoons:data-ready', onReady);
    return () => window.removeEventListener('tycoons:data-ready', onReady);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  function scrollToConsole() {
    if (consoleRef.current) window.scrollTo({
      top: consoleRef.current.getBoundingClientRect().top + window.scrollY - 78,
      behavior: 'smooth'
    });
  }
  function runQuery(text, opts) {
    const o = opts || {};
    const userText = o.refineLabel || text;
    const filters = o.refineKey ? window.TC_INTENT.applyRefine(lastFilters.current || {}, o.refineKey) : window.TC_INTENT.parseQuery(text);
    setMessages(m => [...m, {
      role: 'user',
      text: userText
    }]);
    setDraft('');
    if (t.searchMode === 'fullscreen') setFsOpen(true);
    window.TC_VOICE.stopSpeaking();
    setVoiceState('thinking');
    setTimeout(() => {
      const res = window.TC_INTENT.search(text, window.TYCOONS_DATA.PROJECTS, lang, filters);
      lastFilters.current = res.filters;
      const reply = res.items.length ? copy.resultsLead(res.items.length, res.areaLabel) : copy.noResults;
      setMessages(m => [...m, {
        role: 'assistant',
        text: reply,
        items: res.items
      }]);
      setVoiceState('speaking');
      window.TC_VOICE.speak(reply, lang, () => setVoiceState('idle'));
    }, 720);
  }
  function externalSearch(label) {
    if (route !== 'home') setRoute('home');
    setTimeout(scrollToConsole, route !== 'home' ? 60 : 0);
    runQuery(label);
  }
  function onMic() {
    if (voiceState === 'listening') {
      stopListen.current && stopListen.current();
      setVoiceState('idle');
      return;
    }
    window.TC_VOICE.stopSpeaking();
    if (!window.TC_VOICE.sttSupported()) {
      // fallback: demo phrase typed then searched
      const demo = lang === 'ar' ? 'عايز شاليه في الساحل تحت ٩ مليون' : 'a chalet on the North Coast under 9 million';
      setVoiceState('listening');
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setDraft(demo.slice(0, i));
        if (i >= demo.length) {
          clearInterval(iv);
          setVoiceState('idle');
          runQuery(demo);
        }
      }, 45);
      return;
    }
    setVoiceState('listening');
    stopListen.current = window.TC_VOICE.listen({
      lang,
      onInterim: txt => setDraft(txt),
      onFinal: txt => setDraft(txt),
      onEnd: final => {
        setVoiceState('idle');
        if (final && final.trim()) runQuery(final.trim());
      },
      onError: () => {
        setVoiceState('idle');
      }
    });
  }

  // ---- navigation with scroll memory ----------------------------------
  // Pushing the current view (route + scroll position + context) onto a
  // stack before navigating lets the back button drop the user back exactly
  // where they were — same page, same scroll offset.
  function pushNav() {
    navStack.current.push({
      route,
      scroll: window.scrollY,
      activeProject,
      listKind
    });
  }
  function restoreScroll(y) {
    // wait for the destination to render + images to reserve height, then jump
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo({
        top: y || 0,
        behavior: 'auto'
      });
      setTimeout(() => window.scrollTo({
        top: y || 0,
        behavior: 'auto'
      }), 120);
    }));
  }
  function openProject(p) {
    pushNav();
    setActiveProject(p);
    setRoute('project');
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }
  function openList(kind) {
    pushNav();
    setListKind(kind);
    setRoute('list');
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }
  function goBack() {
    const prev = navStack.current.pop();
    if (!prev) {
      setRoute('home');
      return;
    }
    setRoute(prev.route);
    setActiveProject(prev.activeProject);
    setListKind(prev.listKind);
    restoreScroll(prev.scroll);
  }
  function goHome() {
    navStack.current = [];
    setRoute('home');
  }
  const conciergeProps = {
    lang,
    t: copy,
    mode: t.searchMode,
    cardStyle: t.cardStyle,
    messages,
    voiceState,
    draft,
    onDraft: setDraft,
    onSubmit: txt => runQuery(txt),
    onRefine: (key, label) => runQuery('', {
      refineKey: key,
      refineLabel: label
    }),
    onMic,
    micSupported: window.TC_VOICE.sttSupported(),
    onOpenProject: openProject,
    fsOpen,
    onCloseFullscreen: () => setFsOpen(false)
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TCHeader, {
    lang: lang,
    setLang: setLang,
    onHome: goHome,
    t: copy
  }), route === 'home' ? /*#__PURE__*/React.createElement("main", {
    style: {
      width: 'min(1240px,calc(100% - 32px))',
      margin: '0 auto'
    },
    id: "top"
  }, /*#__PURE__*/React.createElement("section", {
    id: "tc-console",
    ref: consoleRef,
    style: {
      padding: '30px 0 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 22,
      maxWidth: 780
    }
  }, /*#__PURE__*/React.createElement(window.EyebrowWrap, {
    lang: lang
  }, copy.eyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '14px 0 12px',
      color: 'var(--navy)',
      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'clamp(26px,3.6vw,42px)',
      lineHeight: lang === 'ar' ? 1.18 : 0.98,
      letterSpacing: lang === 'ar' ? 0 : '-.04em'
    }
  }, copy.h1a, /*#__PURE__*/React.createElement("br", null), copy.h1b), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 640,
      margin: 0,
      color: 'var(--muted)',
      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 17,
      lineHeight: 1.6
    }
  }, copy.lede)), /*#__PURE__*/React.createElement(window.TCConcierge, conciergeProps)), /*#__PURE__*/React.createElement("div", {
    id: "tc-launches"
  }, /*#__PURE__*/React.createElement(window.TCLaunches, {
    lang: lang,
    t: copy,
    layout: t.launchLayout,
    onOpenProject: openProject,
    onSeeMore: openList
  })), /*#__PURE__*/React.createElement("div", {
    id: "tc-areas"
  }, /*#__PURE__*/React.createElement(window.TCAreas, {
    lang: lang,
    t: copy,
    onSearch: externalSearch,
    onSeeMore: openList
  })), /*#__PURE__*/React.createElement(window.TCDevelopers, {
    lang: lang,
    t: copy,
    onSeeMore: openList
  }), /*#__PURE__*/React.createElement("div", {
    id: "tc-calc"
  }, /*#__PURE__*/React.createElement(window.TCCalculator, {
    lang: lang,
    t: copy
  })), /*#__PURE__*/React.createElement(window.TCPopular, {
    lang: lang,
    t: copy,
    onSearch: externalSearch,
    onSeeMore: openList
  })) : route === 'list' ? /*#__PURE__*/React.createElement("main", {
    style: {
      width: 'min(1240px,calc(100% - 32px))',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(window.TCListPage, {
    lang: lang,
    t: copy,
    kind: listKind,
    project: activeProject,
    onBack: goBack,
    onOpenProject: openProject,
    onSearch: externalSearch
  })) : /*#__PURE__*/React.createElement("main", {
    style: {
      width: 'min(1100px,calc(100% - 32px))',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(window.TCProjectPage, {
    lang: lang,
    t: copy,
    project: activeProject,
    onBack: goBack,
    onOpenProject: openProject,
    onSeeMore: openList
  })), /*#__PURE__*/React.createElement("div", {
    id: "tc-foot"
  }, /*#__PURE__*/React.createElement(window.TCFooter, {
    lang: lang
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      left: 18,
      bottom: 18,
      zIndex: 60
    }
  }, (() => {
    const {
      WhatsAppButton
    } = window.TycoonsInvestmentsDesignSystem_8890c9;
    return /*#__PURE__*/React.createElement(WhatsAppButton, {
      shape: "fab",
      href: "https://wa.me/201200704344"
    });
  })()));
}

// small eyebrow wrapper that honours Arabic tracking
function EyebrowWrap({
  children,
  lang
}) {
  const {
    Eyebrow
  } = window.TycoonsInvestmentsDesignSystem_8890c9;
  return /*#__PURE__*/React.createElement(Eyebrow, {
    style: lang === 'ar' ? {
      letterSpacing: 0,
      fontFamily: 'var(--font-arabic)'
    } : null
  }, children);
}
window.EyebrowWrap = EyebrowWrap;
const rootEl = document.getElementById('root');
const tcRoot = window.__tcRoot || (window.__tcRoot = ReactDOM.createRoot(rootEl));
tcRoot.render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/App.jsx", error: String((e && e.message) || e) }); }

// demos/tycoons-site/Concierge.jsx
try { (() => {
/* Tycoons site — AI Concierge: the conversational voice/text search.
   The whole point: results render INSIDE the assistant's reply (a rail
   attached under the message), so the answer never detaches from the
   conversation and the user never has to scroll to a separate section. */
const TC_REFINE_KEYS = ['cheaper', 'ready', 'sea', 'beds2', 'longplan'];
function TCOrb({
  state,
  size = 46
}) {
  const active = state === 'listening' || state === 'speaking';
  const ring = i => ({
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '2px solid ' + (state === 'listening' ? 'rgba(32,177,90,.9)' : 'var(--gold)'),
    opacity: 0,
    animation: active ? `tcRing 1.6s var(--ease) ${i * 0.5}s infinite` : 'none'
  });
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      flex: `0 0 ${size}px`,
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 32% 28%, #2a3a58, var(--navy))',
      display: 'grid',
      placeItems: 'center',
      boxShadow: '0 8px 18px rgba(16,24,39,.28)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: size * 0.42,
    height: size * 0.42,
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v18M7 7v10M17 7v10M3.5 10v4M20.5 10v4",
    stroke: state === 'listening' ? '#7ee0a6' : '#d2aa62',
    strokeWidth: "2",
    strokeLinecap: "round"
  })), /*#__PURE__*/React.createElement("span", {
    style: ring(0)
  }), /*#__PURE__*/React.createElement("span", {
    style: ring(1)
  }));
}
function TCEq({
  on,
  color = 'var(--gold)',
  bars = 6,
  h = 20
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      height: h
    },
    "aria-hidden": "true"
  }, Array.from({
    length: bars
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 3.5,
      borderRadius: 999,
      background: color,
      height: on ? '30%' : '22%',
      animation: on ? `tcEq .85s var(--ease) ${i % 4 * 0.12}s infinite` : 'none'
    }
  })));
}
function TCConversation({
  lang,
  t,
  cardStyle,
  messages,
  voiceState,
  onOpenProject,
  compact
}) {
  const ar = lang === 'ar';
  const endRef = React.useRef(null);
  React.useEffect(() => {
    if (endRef.current) endRef.current.parentNode.scrollTop = endRef.current.offsetTop;
  }, [messages, voiceState]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      maxHeight: compact ? 'none' : 460,
      overflowY: 'auto',
      paddingInlineEnd: 4
    },
    className: "tc-scroll"
  }, messages.map((m, i) => m.role === 'user' ? /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      alignSelf: ar ? 'flex-start' : 'flex-end',
      maxWidth: '82%',
      animation: 'tcRise .3s var(--ease) both'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,var(--navy),var(--navy-600))',
      color: '#fff',
      borderRadius: '16px 16px 4px 16px',
      padding: '11px 15px',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 15,
      lineHeight: 1.5,
      boxShadow: 'var(--shadow-primary)'
    }
  }, m.text)) : /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'flex-start',
      animation: 'tcRise .3s var(--ease) both'
    }
  }, /*#__PURE__*/React.createElement(TCOrb, {
    state: i === messages.length - 1 ? voiceState : 'idle',
    size: 34
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      paddingInlineStart: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-warm)',
      border: '1px solid var(--line-gold)',
      color: 'var(--navy)',
      borderRadius: ar ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
      padding: '11px 15px',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 15,
      lineHeight: 1.55,
      display: 'inline-block'
    }
  }, m.text), m.items && m.items.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "tc-rail",
    style: {
      display: 'flex',
      gap: 13,
      marginTop: 12,
      overflowX: 'auto',
      paddingBottom: 6,
      scrollSnapType: 'x mandatory'
    }
  }, m.items.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    style: {
      flex: `0 0 ${cardStyle === 'compact' ? 244 : 286}px`,
      scrollSnapAlign: 'start'
    }
  }, /*#__PURE__*/React.createElement(TCResultCard, {
    project: p,
    lang: lang,
    variant: cardStyle === 'compact' ? 'compact' : 'big',
    onOpen: onOpenProject
  }))))))), voiceState === 'thinking' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'center',
      animation: 'tcRise .3s var(--ease) both'
    }
  }, /*#__PURE__*/React.createElement(TCOrb, {
    state: "speaking",
    size: 34
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9,
      background: 'var(--surface-soft)',
      border: '1px solid var(--line)',
      borderRadius: 999,
      padding: '9px 15px',
      color: 'var(--muted)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tc-dots"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)), t.thinking)), /*#__PURE__*/React.createElement("div", {
    ref: endRef,
    style: {
      height: 1
    }
  }));
}
function TCInputRow({
  lang,
  t,
  draft,
  onDraft,
  onSubmit,
  onMic,
  micSupported,
  voiceState
}) {
  const ar = lang === 'ar';
  const listening = voiceState === 'listening';
  function submit() {
    const v = (draft || '').trim();
    if (v) onSubmit(v);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--surface)',
      border: '1px solid var(--line-strong)',
      borderRadius: 'var(--radius-lg)',
      padding: '6px 6px 6px 16px',
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    rows: 1,
    value: draft,
    placeholder: listening ? t.listening : t.inputPlaceholder,
    onChange: e => onDraft(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      resize: 'none',
      background: 'transparent',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 15.5,
      color: 'var(--navy)',
      lineHeight: 1.5,
      padding: '8px 0',
      maxHeight: 90
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onMic,
    "aria-label": t.tapToTalk,
    title: micSupported ? t.tapToTalk : 'mic unavailable — using demo voice',
    style: {
      flex: '0 0 44px',
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      display: 'grid',
      placeItems: 'center',
      transition: 'all .16s var(--ease)',
      background: listening ? 'var(--wa)' : 'var(--surface-warm)',
      color: listening ? '#fff' : 'var(--gold)',
      border: listening ? '1px solid var(--wa)' : '1px solid var(--line-gold)',
      boxShadow: listening ? '0 0 0 6px rgba(32,177,90,.16)' : 'none',
      animation: listening ? 'tcPulse 1.4s var(--ease) infinite' : 'none'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "20",
    height: "20",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "3",
    width: "6",
    height: "12",
    rx: "3",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 11a7 7 0 0 0 14 0M12 18v3",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: submit,
    style: {
      flex: '0 0 auto',
      minHeight: 56,
      padding: '0 22px',
      borderRadius: 'var(--radius-lg)',
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(135deg,var(--gold),var(--gold-light))',
      color: '#fff',
      boxShadow: 'var(--shadow-gold)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 15,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, t.send, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "17",
    height: "17",
    fill: "none",
    style: ar ? {
      transform: 'scaleX(-1)'
    } : null
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 6l6 6-6 6",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))));
}
function TCChips({
  lang,
  t,
  active,
  onSubmit,
  onRefine
}) {
  const ar = lang === 'ar';
  const items = active ? t.refines : t.popular.slice(0, 4);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 12.5,
      fontWeight: 800
    }
  }, active ? t.refineHint : t.examplesLabel), items.map((label, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    onClick: () => active ? onRefine(TC_REFINE_KEYS[i], label) : onSubmit(label),
    style: {
      border: '1px solid rgba(184,137,57,.28)',
      background: 'rgba(255,255,255,.75)',
      color: 'var(--navy)',
      borderRadius: 999,
      padding: '7px 14px',
      cursor: 'pointer',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 13,
      fontWeight: 700,
      transition: 'border-color .16s var(--ease), background .16s var(--ease)'
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = 'var(--gold)';
      e.currentTarget.style.background = '#fff8e9';
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = 'rgba(184,137,57,.28)';
      e.currentTarget.style.background = 'rgba(255,255,255,.75)';
    }
  }, label)));
}
function TCConcierge(props) {
  const {
    lang,
    t,
    mode,
    cardStyle,
    messages,
    voiceState,
    draft,
    onDraft,
    onSubmit,
    onRefine,
    onMic,
    micSupported,
    onOpenProject,
    onCloseFullscreen,
    fsOpen
  } = props;
  const ar = lang === 'ar';
  const active = messages.length > 0;
  const statusText = voiceState === 'listening' ? t.listening : voiceState === 'thinking' ? t.thinking : voiceState === 'speaking' ? '' : ar ? 'جاهز يسمعك' : 'Ready when you are';
  const identity = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(TCOrb, {
    state: voiceState
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 13.5,
      color: 'var(--gold-deep)'
    }
  }, ar ? 'المساعد الذكي' : 'AI Assistant'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 13,
      color: 'var(--muted)'
    }
  }, statusText)), /*#__PURE__*/React.createElement(TCEq, {
    on: voiceState === 'listening' || voiceState === 'speaking',
    color: voiceState === 'listening' ? 'var(--wa)' : 'var(--gold)'
  }));
  const body = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, identity, active && /*#__PURE__*/React.createElement(TCConversation, {
    lang: lang,
    t: t,
    cardStyle: cardStyle,
    messages: messages,
    voiceState: voiceState,
    onOpenProject: onOpenProject,
    compact: mode === 'fullscreen'
  }), /*#__PURE__*/React.createElement(TCInputRow, {
    lang: lang,
    t: t,
    draft: draft,
    onDraft: onDraft,
    onSubmit: onSubmit,
    onMic: onMic,
    micSupported: micSupported,
    voiceState: voiceState
  }), /*#__PURE__*/React.createElement(TCChips, {
    lang: lang,
    t: t,
    active: active,
    onSubmit: onSubmit,
    onRefine: onRefine
  }));

  // Fullscreen overlay variant
  if (mode === 'fullscreen' && fsOpen) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TCConsoleShell, {
      lang: lang,
      t: t
    }, /*#__PURE__*/React.createElement(TCInputRow, {
      lang: lang,
      t: t,
      draft: draft,
      onDraft: onDraft,
      onSubmit: onSubmit,
      onMic: onMic,
      micSupported: micSupported,
      voiceState: voiceState
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(16,24,39,.55)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(12px,3vw,40px)',
        animation: 'tcFade .2s var(--ease) both'
      },
      onClick: e => {
        if (e.target === e.currentTarget && onCloseFullscreen) onCloseFullscreen();
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 'min(920px,100%)',
        maxHeight: '92vh',
        overflow: 'auto',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-lg)',
        padding: 'clamp(18px,3vw,28px)'
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onCloseFullscreen,
      "aria-label": "close",
      style: {
        position: 'absolute',
        insetInlineEnd: 14,
        top: 14,
        zIndex: 2,
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '1px solid var(--line)',
        background: 'var(--surface-soft)',
        color: 'var(--muted)',
        cursor: 'pointer',
        fontSize: 18,
        lineHeight: 1
      }
    }, "\xD7"), body)));
  }
  return /*#__PURE__*/React.createElement(TCConsoleShell, {
    lang: lang,
    t: t,
    bare: mode === 'bar' && !active
  }, body);
}
function TCConsoleShell({
  children,
  bare
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: bare ? 'transparent' : 'linear-gradient(140deg,#fff 0%,#fff 56%,var(--surface-warm) 100%)',
      border: bare ? 'none' : '1px solid var(--line)',
      borderRadius: 'var(--radius-2xl)',
      padding: bare ? 0 : 'clamp(18px,3vw,30px)',
      boxShadow: bare ? 'none' : 'var(--shadow-md)'
    }
  }, children);
}
window.TCConcierge = TCConcierge;
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/Concierge.jsx", error: String((e && e.message) || e) }); }

// demos/tycoons-site/HomeSections.jsx
try { (() => {
/* Tycoons site — homepage sections below the concierge.
   Each is exported to window and composed by App so the New-Launch
   section's position/layout can be driven by a tweak. */

function TCSectionHead({
  eyebrow,
  title,
  sub,
  lang,
  onDark
}) {
  const {
    Eyebrow
  } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const ar = lang === 'ar';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 22,
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    style: ar ? {
      letterSpacing: 0,
      fontFamily: 'var(--font-arabic)'
    } : null
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '12px 0 0',
      color: onDark ? '#fff' : 'var(--navy)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'clamp(24px,3vw,34px)',
      lineHeight: ar ? 1.2 : 1.06,
      letterSpacing: ar ? 0 : '-.025em'
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      color: onDark ? 'rgba(255,255,255,.68)' : 'var(--muted)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 16,
      lineHeight: 1.55
    }
  }, sub));
}

/* mobile-viewport hook — See-more caps apply on phones only */
function useTCMobile() {
  const [m, setM] = React.useState(typeof window !== 'undefined' && window.matchMedia('(max-width:720px)').matches);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width:720px)');
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

/* ---------- reusable "see more" button (navigates to a listing page) ---------- */
function TCSeeMoreButton({
  lang,
  t,
  onClick,
  dark
}) {
  const ar = lang === 'ar';
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      margin: '20px auto 0',
      border: dark ? '1px solid rgba(255,255,255,.28)' : '1px solid var(--line-strong)',
      background: dark ? 'rgba(255,255,255,.06)' : 'var(--surface)',
      color: dark ? '#fff' : 'var(--navy)',
      borderRadius: 999,
      padding: '12px 22px',
      cursor: 'pointer',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 14,
      fontWeight: 800,
      boxShadow: dark ? 'none' : 'var(--shadow-sm)',
      transition: 'border-color .16s var(--ease), color .16s var(--ease)'
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = 'var(--gold)';
      e.currentTarget.style.color = 'var(--gold)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,.28)' : 'var(--line-strong)';
      e.currentTarget.style.color = dark ? '#fff' : 'var(--navy)';
    }
  }, t.seeMore, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "15",
    height: "15",
    fill: "none",
    style: ar ? {
      transform: 'scaleX(-1)'
    } : null
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 6l6 6-6 6",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })));
}

/* ---------- reusable back button (restores scroll via App) ---------- */
function TCBackButton({
  lang,
  t,
  onBack
}) {
  const ar = lang === 'ar';
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onBack,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      margin: '18px 0 16px',
      border: '1px solid var(--line-strong)',
      background: 'var(--surface)',
      color: 'var(--navy)',
      borderRadius: 999,
      padding: '9px 16px',
      cursor: 'pointer',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      fontSize: 13.5,
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    fill: "none",
    style: ar ? null : {
      transform: 'scaleX(-1)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M15 6l-6 6 6 6",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), t.back);
}

/* ---------- New Launches (navy band) ---------- */
function TCLaunches({
  lang,
  t,
  layout,
  onOpenProject,
  onSeeMore
}) {
  const ar = lang === 'ar';
  const launches = window.TYCOONS_DATA.PROJECTS.filter(p => p.is_launch).sort((a, b) => (b._recency_ts || 0) - (a._recency_ts || 0));
  const spotlight = layout !== 'grid';
  const feat = launches[0];
  const restCap = spotlight ? 2 : 3;
  const rest = launches.slice(1, 1 + restCap);
  const hasMore = launches.length > 1 + restCap;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      margin: '46px 0',
      padding: 'clamp(26px,4vw,40px)',
      borderRadius: 'var(--radius-2xl)',
      overflow: 'hidden',
      background: 'var(--navy)',
      backgroundImage: 'radial-gradient(120% 130% at 88% -12%, rgba(184,137,57,.34), transparent 48%), radial-gradient(90% 120% at 6% 120%, rgba(184,137,57,.14), transparent 46%)',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 20,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'rgba(255,77,64,.16)',
      border: '1px solid rgba(255,120,110,.5)',
      color: '#ff9b91',
      borderRadius: 999,
      padding: '4px 11px',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 11,
      letterSpacing: ar ? 0 : '.1em',
      textTransform: ar ? 'none' : 'uppercase'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: '#ff6b60',
      animation: 'tcBlink 1.1s var(--ease) infinite'
    }
  }), ar ? 'مباشر' : 'LIVE')), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      color: '#fff',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'clamp(26px,3.4vw,40px)',
      lineHeight: ar ? 1.18 : 1.06,
      letterSpacing: ar ? 0 : '-.025em'
    }
  }, t.launchesTitle), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      color: 'rgba(255,255,255,.66)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 15.5,
      lineHeight: 1.55
    }
  }, t.launchesSub))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: spotlight ? 'minmax(0,1.5fr) minmax(0,1fr)' : 'repeat(auto-fit,minmax(240px,1fr))',
      gap: 18,
      marginTop: 26,
      alignItems: 'stretch'
    },
    className: spotlight ? 'tc-launch-spot' : ''
  }, feat && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(TCResultCard, {
    project: feat,
    lang: lang,
    variant: "big",
    onOpen: onOpenProject,
    style: {
      width: '100%'
    }
  })), spotlight ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateRows: `repeat(${rest.length},1fr)`,
      gap: 18
    }
  }, rest.map(p => /*#__PURE__*/React.createElement(TCResultCard, {
    key: p.id,
    project: p,
    lang: lang,
    variant: "compact",
    onOpen: onOpenProject
  }))) : rest.map(p => /*#__PURE__*/React.createElement(TCResultCard, {
    key: p.id,
    project: p,
    lang: lang,
    variant: "big",
    onOpen: onOpenProject
  }))), hasMore && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(TCSeeMoreButton, {
    lang: lang,
    t: t,
    onClick: () => onSeeMore('launches'),
    dark: true
  })));
}

/* ---------- Featured areas ---------- */
function TCAreas({
  lang,
  t,
  onSearch,
  onSeeMore,
  forceAll
}) {
  const ar = lang === 'ar';
  const D = window.TYCOONS_DATA;
  const mobile = useTCMobile();
  const allKeys = Object.keys(D.AREAS);
  const cap = 3;
  const keys = forceAll || !mobile ? allKeys : allKeys.slice(0, cap);
  function countFor(k) {
    return D.PROJECTS.filter(p => p.area === k).length;
  }
  return /*#__PURE__*/React.createElement("section", {
    style: {
      margin: '46px 0'
    }
  }, !forceAll && /*#__PURE__*/React.createElement(TCSectionHead, {
    eyebrow: t.areasEyebrow,
    title: t.areasTitle,
    sub: t.areasSub,
    lang: lang
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
      gap: 14
    }
  }, keys.map((k, i) => {
    const a = D.AREAS[k];
    const label = ar ? a.ar : a.en;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      type: "button",
      onClick: () => onSearch(label),
      style: {
        position: 'relative',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        height: 150,
        textAlign: 'start',
        background: `repeating-linear-gradient(${120 + i * 20}deg,#e9edf3,#e9edf3 12px,#f4eddd 12px,#f4eddd 24px)`,
        transition: 'transform .18s var(--ease), box-shadow .18s var(--ease)'
      },
      onMouseEnter: e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg,rgba(16,24,39,0) 30%,rgba(16,24,39,.72) 100%)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        insetInlineStart: 14,
        bottom: 12,
        insetInlineEnd: 14,
        color: '#fff'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
        fontWeight: 800,
        fontSize: 18
      }
    }, label), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
        fontSize: 12.5,
        color: 'rgba(255,255,255,.8)',
        marginTop: 2
      }
    }, ar ? `${window.TC.toArabicDigits(countFor(k))} مشروع متاح` : `${countFor(k)} projects`)), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        insetInlineEnd: 12,
        top: 12,
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: 'rgba(255,255,255,.85)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--gold)'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 24 24",
      width: "15",
      height: "15",
      fill: "none",
      style: ar ? {
        transform: 'scaleX(-1)'
      } : null
    }, /*#__PURE__*/React.createElement("path", {
      d: "M5 12h14M13 6l6 6-6 6",
      stroke: "currentColor",
      strokeWidth: "2.4",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))));
  })), !forceAll && mobile && allKeys.length > cap && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(TCSeeMoreButton, {
    lang: lang,
    t: t,
    onClick: () => onSeeMore('areas')
  })));
}

/* ---------- Trusted developers + trust points ---------- */
function TCDevelopers({
  lang,
  t,
  onSeeMore,
  forceAll
}) {
  const ar = lang === 'ar';
  const D = window.TYCOONS_DATA;
  const mobile = useTCMobile();
  const cap = 4;
  const devs = forceAll || !mobile ? D.DEVELOPERS : D.DEVELOPERS.slice(0, cap);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      margin: '46px 0'
    }
  }, !forceAll && /*#__PURE__*/React.createElement(TCSectionHead, {
    eyebrow: t.devsEyebrow,
    title: t.devsTitle,
    sub: t.devsSub,
    lang: lang
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
      gap: 12,
      marginBottom: 26
    }
  }, devs.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '16px 16px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 17,
      color: 'var(--navy)'
    }
  }, ar ? d.ar : d.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 12.5,
      color: 'var(--muted)'
    }
  }, t.devProjects(d.projects))))), !forceAll && mobile && D.DEVELOPERS.length > cap && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: -8,
      marginBottom: 26
    }
  }, /*#__PURE__*/React.createElement(TCSeeMoreButton, {
    lang: lang,
    t: t,
    onClick: () => onSeeMore('developers')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
      gap: 14
    }
  }, t.trust.map((tr, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '20px',
      borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(140deg,#fff,var(--surface-warm))',
      border: '1px solid var(--line-gold)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 12,
      background: 'var(--surface-warm)',
      border: '1px solid var(--line-gold)',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--gold)',
      marginBottom: 4
    }
  }, i === 0 ? /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "19",
    height: "19",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 12l2 2 4-4",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })) : i === 1 ? /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "19",
    height: "19",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "18",
    height: "14",
    rx: "2",
    stroke: "currentColor",
    strokeWidth: "1.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18",
    stroke: "currentColor",
    strokeWidth: "1.8"
  })) : /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "19",
    height: "19",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 12a8 8 0 1 1 3.5 6.6L4 20l1.2-3.4A7.9 7.9 0 0 1 4 12z",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinejoin: "round"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 16,
      color: 'var(--navy)'
    }
  }, tr.t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 13.5,
      lineHeight: 1.55,
      color: 'var(--slate)'
    }
  }, tr.d)))));
}

/* ---------- Installment calculator ---------- */
function TCCalculator({
  lang,
  t,
  initialPrice,
  initialDown,
  initialYears,
  hideHead
}) {
  const ar = lang === 'ar';
  const {
    formatEGPFull,
    toArabicDigits
  } = window.TC;
  const [price, setPrice] = React.useState(initialPrice || 8400000);
  const [downPct, setDownPct] = React.useState(initialDown || 10);
  const [years, setYears] = React.useState(initialYears || 8);
  const down = Math.round(price * downPct / 100);
  const monthly = Math.round((price - down) / (years * 12));
  const num = n => ar ? toArabicDigits(n) : n;
  const rangeStyle = {
    width: '100%',
    accentColor: 'var(--gold)',
    cursor: 'pointer'
  };
  const rowLabel = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      margin: hideHead ? 0 : '46px 0'
    }
  }, !hideHead && /*#__PURE__*/React.createElement(TCSectionHead, {
    eyebrow: t.calcEyebrow,
    title: t.calcTitle,
    sub: t.calcSub,
    lang: lang
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)',
      gap: 18,
      alignItems: 'stretch'
    },
    className: "tc-calc"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'clamp(18px,3vw,26px)',
      borderRadius: 'var(--radius-xl)',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: rowLabel
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      color: 'var(--navy)',
      fontSize: 14
    }
  }, t.calcPrice), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      color: 'var(--gold-deep)',
      fontSize: 15
    }
  }, formatEGPFull(price, lang))), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 2000000,
    max: 100000000,
    step: 100000,
    value: price,
    onChange: e => setPrice(+e.target.value),
    style: rangeStyle
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: rowLabel
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      color: 'var(--navy)',
      fontSize: 14
    }
  }, t.calcDown), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      color: 'var(--gold-deep)',
      fontSize: 15
    }
  }, num(downPct), "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 5,
    max: 40,
    step: 1,
    value: downPct,
    onChange: e => setDownPct(+e.target.value),
    style: rangeStyle
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: rowLabel
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      color: 'var(--navy)',
      fontSize: 14
    }
  }, t.calcYears), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      color: 'var(--gold-deep)',
      fontSize: 15
    }
  }, t.calcYearsUnit(years))), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 3,
    max: 15,
    step: 1,
    value: years,
    onChange: e => setYears(+e.target.value),
    style: rangeStyle
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 14,
      padding: 'clamp(18px,3vw,26px)',
      borderRadius: 'var(--radius-xl)',
      background: 'linear-gradient(140deg,var(--navy),var(--navy-600))',
      color: '#fff',
      boxShadow: 'var(--shadow-primary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      fontSize: 13,
      color: 'var(--gold-light)'
    }
  }, t.calcMonthly), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 'clamp(28px,4vw,38px)',
      lineHeight: 1
    }
  }, formatEGPFull(monthly, lang)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'rgba(255,255,255,.14)',
      margin: '4px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 13.5,
      color: 'rgba(255,255,255,.78)'
    }
  }, /*#__PURE__*/React.createElement("span", null, t.calcDownAmount), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#fff'
    }
  }, formatEGPFull(down, lang))))));
}

/* ---------- Popular quick searches ---------- */
function TCPopular({
  lang,
  t,
  onSearch,
  onSeeMore,
  forceAll
}) {
  const ar = lang === 'ar';
  const mobile = useTCMobile();
  const cap = 6;
  const items = forceAll || !mobile ? t.popular : t.popular.slice(0, cap);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      margin: '46px 0'
    }
  }, !forceAll && /*#__PURE__*/React.createElement(TCSectionHead, {
    eyebrow: t.popularEyebrow,
    title: t.popularTitle,
    lang: lang
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10
    }
  }, items.map((label, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    onClick: () => onSearch(label),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      border: '1px solid var(--line-strong)',
      background: 'var(--surface)',
      color: 'var(--navy)',
      borderRadius: 999,
      padding: '11px 18px',
      cursor: 'pointer',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 14,
      fontWeight: 700,
      boxShadow: 'var(--shadow-sm)',
      transition: 'border-color .16s var(--ease), color .16s var(--ease)'
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = 'var(--gold)';
      e.currentTarget.style.color = 'var(--gold)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = 'var(--line-strong)';
      e.currentTarget.style.color = 'var(--navy)';
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "15",
    height: "15",
    fill: "none"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7",
    stroke: "currentColor",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 20l-3.5-3.5",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  })), label))), !forceAll && mobile && t.popular.length > cap && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-start',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(TCSeeMoreButton, {
    lang: lang,
    t: t,
    onClick: () => onSeeMore('popular')
  })));
}

/* ---------- Footer ---------- */
function TCFooter({
  lang
}) {
  const ar = lang === 'ar';
  const cols = ar ? [['المنصة', ['البحث الذكي', 'البحث الصوتي', 'الطرح الجديد', 'الحاسبة']], ['المناطق', ['الساحل', 'التجمع', 'السخنة', 'زايد']], ['Tycoons', ['من نحن', 'المطوّرون', 'تواصل معنا', 'الوظائف']]] : [['Platform', ['AI search', 'Voice search', 'New launches', 'Calculator']], ['Areas', ['North Coast', 'New Cairo', 'Ain Sokhna', 'Zayed']], ['Tycoons', ['About', 'Developers', 'Contact', 'Careers']]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      marginTop: 30,
      background: 'var(--navy)',
      color: '#fff',
      borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 'min(1240px,calc(100% - 32px))',
      margin: '0 auto',
      padding: '40px 0 26px',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.4fr) repeat(3,minmax(0,1fr))',
      gap: 24
    },
    className: "tc-foot"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/tycoons-logo-light.svg",
    alt: "Tycoons",
    style: {
      height: 42,
      marginBottom: 12
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'rgba(255,255,255,.6)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 13.5,
      lineHeight: 1.6,
      maxWidth: 280
    }
  }, ar ? 'ابحث عن عقارك بالذكاء الاصطناعي والصوت — من المطوّرين مباشرة.' : 'Find your property with AI and voice — direct from developers.')), cols.map(([head, links], i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 13,
      color: 'var(--gold-light)',
      marginBottom: 12
    }
  }, head), links.map((l, j) => /*#__PURE__*/React.createElement("a", {
    key: j,
    href: "#",
    style: {
      display: 'block',
      color: 'rgba(255,255,255,.72)',
      textDecoration: 'none',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 13.5,
      padding: '5px 0'
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,.1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 'min(1240px,calc(100% - 32px))',
      margin: '0 auto',
      padding: '16px 0',
      color: 'rgba(255,255,255,.5)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 12.5
    }
  }, "\xA9 ", ar ? '٢٠٢٦ تايكونز للاستثمار' : '2026 Tycoons Investments')));
}

/* ---------- Full listing page (reached via "See more") ---------- */
function TCListPage({
  lang,
  t,
  kind,
  project,
  onBack,
  onOpenProject,
  onSearch
}) {
  const ar = lang === 'ar';
  const D = window.TYCOONS_DATA;
  const byRecency = (a, b) => (b._recency_ts || 0) - (a._recency_ts || 0);
  let head = null,
    body = null;
  if (kind === 'launches') {
    const items = D.PROJECTS.filter(p => p.is_launch).sort(byRecency);
    head = {
      eyebrow: t.launchesEyebrow || (ar ? 'الطرح الجديد' : 'New launches'),
      title: t.launchesTitle,
      sub: t.launchesSub
    };
    body = /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
        gap: 16
      }
    }, items.map(p => /*#__PURE__*/React.createElement(TCResultCard, {
      key: p.id,
      project: p,
      lang: lang,
      variant: "big",
      onOpen: onOpenProject
    })));
  } else if (kind === 'similar' && project) {
    const items = D.PROJECTS.filter(x => x.id !== project.id && (x.area === project.area || x.unit_type === project.unit_type)).sort((a, b) => (a.area === project.area ? -1 : 1) - (b.area === project.area ? -1 : 1));
    head = {
      eyebrow: t.similar,
      title: t.similar,
      sub: t.similarSub
    };
    body = /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
        gap: 16
      }
    }, items.map(p => /*#__PURE__*/React.createElement(TCResultCard, {
      key: p.id,
      project: p,
      lang: lang,
      variant: "big",
      onOpen: onOpenProject
    })));
  } else if (kind === 'areas') {
    head = {
      eyebrow: t.areasEyebrow,
      title: t.areasTitle,
      sub: t.areasSub
    };
    body = /*#__PURE__*/React.createElement(TCAreas, {
      lang: lang,
      t: t,
      onSearch: onSearch,
      forceAll: true
    });
  } else if (kind === 'developers') {
    head = {
      eyebrow: t.devsEyebrow,
      title: t.devsTitle,
      sub: t.devsSub
    };
    body = /*#__PURE__*/React.createElement(TCDevelopers, {
      lang: lang,
      t: t,
      forceAll: true
    });
  } else if (kind === 'popular') {
    head = {
      eyebrow: t.popularEyebrow,
      title: t.popularTitle
    };
    body = /*#__PURE__*/React.createElement(TCPopular, {
      lang: lang,
      t: t,
      onSearch: onSearch,
      forceAll: true
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'tcFade .25s var(--ease) both',
      paddingBottom: 40
    }
  }, /*#__PURE__*/React.createElement(TCBackButton, {
    lang: lang,
    t: t,
    onBack: onBack
  }), head && /*#__PURE__*/React.createElement(TCSectionHead, {
    eyebrow: head.eyebrow,
    title: head.title,
    sub: head.sub,
    lang: lang
  }), body);
}
Object.assign(window, {
  TCSectionHead,
  TCSeeMoreButton,
  TCBackButton,
  TCLaunches,
  TCAreas,
  TCDevelopers,
  TCCalculator,
  TCPopular,
  TCListPage,
  TCFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/HomeSections.jsx", error: String((e && e.message) || e) }); }

// demos/tycoons-site/ProjectPage.jsx
try { (() => {
/* Tycoons site — project detail page + similar units. */
function TCProjectPage({
  lang,
  t,
  project: p,
  onBack,
  onOpenProject,
  onSeeMore
}) {
  const {
    Badge,
    WhatsAppButton,
    Button
  } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const {
    formatEGPFull,
    toArabicDigits
  } = window.TC;
  const D = window.TYCOONS_DATA;
  const ar = lang === 'ar';
  const areaLabel = D.AREAS[p.area] ? D.AREAS[p.area][ar ? 'ar' : 'en'] : p.area_raw || p.area || '';
  const typeLabel = D.TYPES[p.unit_type] ? D.TYPES[p.unit_type][ar ? 'ar' : 'en'] : p.unit_type_raw || p.unit_type || '';
  const title = ar ? p.title_ar : p.title_en;
  const developer = ar ? D.DEVELOPERS.find(d => d.name === p.developer)?.ar || p.developer : p.developer;
  const isReady = p.delivery === 'Ready' || window.TC_HELPERS && window.TC_HELPERS.isReadyDelivery(p.delivery);
  const deliveryLabel = isReady ? t.ready : p.delivery;
  const amenities = (ar ? p.amenities_ar : p.amenities_en) || [];
  const waMsg = ar ? `مهتم بـ ${p.compound} — ${title} (${formatEGPFull(p.price, 'ar')}). ممكن تفاصيل أكتر؟` : `Interested in ${p.compound} — ${title} (${formatEGPFull(p.price, 'en')}). Could you share more?`;
  const waHref = `https://wa.me/201200704344?text=${encodeURIComponent(waMsg)}`;
  const allSimilar = D.PROJECTS.filter(x => x.id !== p.id && (x.area === p.area || x.unit_type === p.unit_type)).sort((a, b) => (a.area === p.area ? -1 : 1) - (b.area === p.area ? -1 : 1));
  const similar = allSimilar.slice(0, 3);
  const facts = [{
    l: t.fArea,
    v: p.size_sqm ? (ar ? toArabicDigits(p.size_sqm) : p.size_sqm) + (ar ? ' م²' : ' m²') : '—'
  }, {
    l: t.fBeds,
    v: p.bedrooms ? ar ? toArabicDigits(p.bedrooms) : p.bedrooms : '—'
  }, {
    l: t.fDelivery,
    v: deliveryLabel
  }, {
    l: t.fDown,
    v: (ar ? toArabicDigits(p.down_pct) : p.down_pct) + '%'
  }, {
    l: t.fType,
    v: typeLabel || '—'
  }, {
    l: t.fDeveloper,
    v: developer
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'tcFade .25s var(--ease) both'
    }
  }, /*#__PURE__*/React.createElement(TCBackButton, {
    lang: lang,
    t: t,
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 'clamp(220px,38vw,380px)',
      borderRadius: 'var(--radius-2xl)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(window.TCImageCarousel, {
    images: p.gallery && p.gallery.length ? p.gallery : p.image_url ? [p.image_url] : [],
    height: '100%',
    ar: ar
  }), (!p.gallery || !p.gallery.length) && !p.image_url && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--faint)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      background: 'rgba(255,255,255,.75)',
      padding: '6px 12px',
      borderRadius: 999
    }
  }, p.compound, " \u2014 ", t.galleryNote)), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--img-scrim)',
      pointerEvents: 'none'
    }
  }), p.is_launch && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      insetInlineStart: 16,
      top: 16,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '8px 14px',
      borderRadius: 999,
      color: '#fff',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 12,
      background: 'linear-gradient(135deg,#d7a748,#b88939 46%,#9c7529)',
      boxShadow: '0 8px 20px rgba(184,137,57,.5), inset 0 1px 0 rgba(255,255,255,.45)',
      border: '1px solid rgba(255,255,255,.4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 0 9px #fff',
      animation: 'tcSpark 2.1s var(--ease) infinite'
    }
  }), ar ? p.launch_ar : p.launch_en), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      insetInlineStart: 16,
      bottom: 16,
      background: 'rgba(16,24,39,.72)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,.18)',
      borderRadius: 999,
      padding: '7px 13px',
      fontSize: 13,
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      backdropFilter: 'blur(8px)',
      whiteSpace: 'nowrap'
    }
  }, areaLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)',
      gap: 20,
      alignItems: 'start',
      marginTop: 24
    },
    className: "tc-proj-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 12.5,
      fontWeight: 900,
      letterSpacing: ar ? 0 : '.06em',
      textTransform: ar ? 'none' : 'uppercase'
    }
  }, typeLabel ? `${typeLabel} · ` : '', developer, " \xB7 ", p.compound), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '8px 0 0',
      color: 'var(--navy)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'clamp(24px,3.2vw,38px)',
      lineHeight: ar ? 1.2 : 1.05,
      letterSpacing: ar ? 0 : '-.03em'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 10,
      marginTop: 22
    },
    className: "tc-facts"
  }, facts.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      border: '1px solid var(--line)',
      background: 'var(--surface)',
      borderRadius: 'var(--radius-sm)',
      padding: '13px 14px',
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--faint)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 10.5,
      fontWeight: 900,
      letterSpacing: ar ? 0 : '.06em',
      textTransform: ar ? 'none' : 'uppercase',
      marginBottom: 5
    }
  }, f.l), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--navy)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 15
    }
  }, f.v)))), amenities.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--navy)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 14,
      marginBottom: 10
    }
  }, t.amenities), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, amenities.map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      border: '1px solid var(--line-gold)',
      background: 'var(--surface-warm)',
      color: '#7f6c49',
      borderRadius: 999,
      padding: '8px 14px',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      fontSize: 13,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--gold)'
    }
  }), a))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 88,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: 'clamp(18px,3vw,24px)',
      borderRadius: 'var(--radius-xl)',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: p.status === 'available' ? 'available' : p.status === 'sold_out' ? 'soldout' : 'gold',
    style: ar ? {
      fontFamily: 'var(--font-arabic)',
      letterSpacing: 0,
      textTransform: 'none'
    } : null
  }, t.status[p.status])), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: '#7f6c49',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 11.5,
      letterSpacing: ar ? 0 : '.06em',
      textTransform: ar ? 'none' : 'uppercase',
      marginBottom: 6
    }
  }, t.startPrice), /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      color: 'var(--navy)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 'clamp(24px,3.4vw,32px)',
      lineHeight: 1
    }
  }, formatEGPFull(p.price, lang))), /*#__PURE__*/React.createElement(WhatsAppButton, {
    href: waHref,
    style: {
      width: '100%',
      minHeight: 50,
      fontSize: 15
    }
  }, t.askWa))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 34
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--navy)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 800,
      fontSize: 20,
      marginBottom: 16
    }
  }, t.calcTitle), /*#__PURE__*/React.createElement(TCCalculator, {
    lang: lang,
    t: t,
    initialPrice: p.price,
    initialDown: p.down_pct,
    initialYears: p.payment_years,
    hideHead: true
  })), similar.length > 0 && /*#__PURE__*/React.createElement("section", {
    style: {
      margin: '40px 0 10px'
    }
  }, /*#__PURE__*/React.createElement(TCSectionHead, {
    eyebrow: t.similar,
    title: t.similar,
    sub: t.similarSub,
    lang: lang
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
      gap: 16
    }
  }, similar.map(s => /*#__PURE__*/React.createElement(TCResultCard, {
    key: s.id,
    project: s,
    lang: lang,
    variant: "big",
    onOpen: onOpenProject
  }))), allSimilar.length > 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(TCSeeMoreButton, {
    lang: lang,
    t: t,
    onClick: () => onSeeMore('similar')
  }))));
}
window.TCProjectPage = TCProjectPage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/ProjectPage.jsx", error: String((e && e.message) || e) }); }

// demos/tycoons-site/ResultCard.jsx
try { (() => {
/* Tycoons site — result card. Composes DS Badge / Tag / WhatsAppButton / Button.
   Two densities via `variant`: 'big' (large photo) and 'compact'.
   Used both inside the conversation rail and on the project page. */

// Small swipeable image carousel — used by both the card and the project
// hero. Falls back to a single striped placeholder when there's no photo.
function TCImageCarousel({
  images,
  height,
  ar
}) {
  const [idx, setIdx] = React.useState(0);
  const imgs = images && images.length ? images : [];
  const has = imgs.length > 0;
  const many = imgs.length > 1;
  function go(dir) {
    return e => {
      e.stopPropagation();
      setIdx(i => (i + dir + imgs.length) % imgs.length);
    };
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height,
      overflow: 'hidden',
      background: has ? '#eef1f5' : 'repeating-linear-gradient(135deg,#edf0f5,#edf0f5 11px,#f5eede 11px,#f5eede 22px)'
    }
  }, has ? /*#__PURE__*/React.createElement("img", {
    src: imgs[idx],
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : null, many && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: go(-1),
    "aria-label": "prev",
    style: {
      position: 'absolute',
      insetInlineStart: 6,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 2,
      width: 26,
      height: 26,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'rgba(16,24,39,.5)',
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      fontSize: 13
    }
  }, "\u2039"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: go(1),
    "aria-label": "next",
    style: {
      position: 'absolute',
      insetInlineEnd: 6,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 2,
      width: 26,
      height: 26,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'rgba(16,24,39,.5)',
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      fontSize: 13
    }
  }, "\u203A"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 8,
      insetInlineStart: 0,
      insetInlineEnd: 0,
      zIndex: 2,
      display: 'flex',
      justifyContent: 'center',
      gap: 5
    }
  }, imgs.map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: i === idx ? 14 : 5,
      height: 5,
      borderRadius: 999,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.5)',
      transition: 'width .15s var(--ease)'
    }
  })))));
}
window.TCImageCarousel = TCImageCarousel;
function TCResultCard({
  project: p,
  lang,
  variant = 'big',
  onOpen,
  style
}) {
  const {
    Badge,
    Tag,
    WhatsAppButton,
    Button
  } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const {
    COPY,
    formatEGP
  } = window.TC;
  const t = COPY[lang];
  const D = window.TYCOONS_DATA;
  const ar = lang === 'ar';
  const [hover, setHover] = React.useState(false);
  const areaLabel = D.AREAS[p.area] ? D.AREAS[p.area][ar ? 'ar' : 'en'] : p.area_raw || p.area || '';
  const typeLabel = D.TYPES[p.unit_type] ? D.TYPES[p.unit_type][ar ? 'ar' : 'en'] : p.unit_type_raw || p.unit_type || '';
  const title = ar ? p.title_ar : p.title_en;
  const developer = ar ? D.DEVELOPERS.find(d => d.name === p.developer)?.ar || p.developer : p.developer;
  const isReady = p.delivery === 'Ready' || window.TC_HELPERS && window.TC_HELPERS.isReadyDelivery(p.delivery);
  const deliveryLabel = isReady ? t.ready : p.delivery;
  const imgH = variant === 'big' ? 168 : 120;
  const waMsg = ar ? `مهتم بـ ${p.compound} — ${title} (${formatEGP(p.price, 'ar')}). ممكن تفاصيل أكتر؟` : `Interested in ${p.compound} — ${title} (${formatEGP(p.price, 'en')}). Could you share more details?`;
  const waHref = `https://wa.me/201200704344?text=${encodeURIComponent(waMsg)}`;
  const metrics = [{
    label: t.fBeds,
    value: p.bedrooms ? ar ? window.TC.toArabicDigits(p.bedrooms) : String(p.bedrooms) : '—'
  }, {
    label: t.fArea,
    value: p.size_sqm ? (ar ? window.TC.toArabicDigits(p.size_sqm) : p.size_sqm) + (ar ? ' م²' : ' m²') : '—'
  }, {
    label: t.fDelivery,
    value: deliveryLabel
  }];
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: `1px solid ${hover ? 'var(--line-strong)' : 'var(--line)'}`,
      boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      transform: hover ? 'translateY(-3px)' : 'none',
      transition: 'transform .18s var(--ease), box-shadow .18s var(--ease), border-color .18s var(--ease)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "button",
    tabIndex: 0,
    onClick: () => onOpen && onOpen(p),
    onKeyDown: e => {
      if (e.key === 'Enter') onOpen && onOpen(p);
    },
    style: {
      position: 'relative',
      height: imgH,
      cursor: 'pointer',
      width: '100%',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(TCImageCarousel, {
    images: p.gallery && p.gallery.length ? p.gallery : p.image_url ? [p.image_url] : [],
    height: imgH,
    ar: ar
  }), (!p.gallery || !p.gallery.length) && !p.image_url && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--faint)',
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      background: 'rgba(255,255,255,.72)',
      padding: '4px 9px',
      borderRadius: 999
    }
  }, p.compound)), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--img-scrim)',
      pointerEvents: 'none'
    }
  }), p.is_launch && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      insetInlineStart: 10,
      top: 10,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 11px',
      borderRadius: 999,
      color: '#fff',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 11,
      whiteSpace: 'nowrap',
      background: 'linear-gradient(135deg,#d7a748,#b88939 46%,#9c7529)',
      boxShadow: '0 6px 16px rgba(184,137,57,.45), inset 0 1px 0 rgba(255,255,255,.4)',
      border: '1px solid rgba(255,255,255,.4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 0 8px #fff'
    }
  }), ar ? p.launch_ar : p.launch_en), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      insetInlineStart: 10,
      bottom: 10,
      background: 'rgba(16,24,39,.72)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,.18)',
      borderRadius: 999,
      padding: '5px 10px',
      fontSize: 11.5,
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)',
      backdropFilter: 'blur(8px)',
      whiteSpace: 'nowrap'
    }
  }, areaLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: variant === 'big' ? 15 : 13,
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 11.5,
      fontWeight: 900,
      letterSpacing: ar ? 0 : '.06em',
      textTransform: ar ? 'none' : 'uppercase'
    }
  }, typeLabel ? `${typeLabel} · ` : '', developer), /*#__PURE__*/React.createElement(Badge, {
    tone: p.status === 'available' ? 'available' : p.status === 'sold_out' ? 'soldout' : 'gold',
    style: ar ? {
      fontFamily: 'var(--font-arabic)',
      letterSpacing: 0,
      textTransform: 'none'
    } : null
  }, t.status[p.status])), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onOpen && onOpen(p),
    style: {
      textAlign: ar ? 'right' : 'left',
      border: 'none',
      background: 'none',
      padding: 0,
      cursor: 'pointer',
      color: 'var(--navy)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 700,
      fontSize: variant === 'big' ? 17 : 15.5,
      lineHeight: ar ? 1.35 : 1.22,
      letterSpacing: ar ? 0 : '-.02em'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--surface-warm)',
      border: '1px solid var(--line-gold)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#7f6c49',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontWeight: 900,
      fontSize: 10.5,
      letterSpacing: ar ? 0 : '.06em',
      textTransform: ar ? 'none' : 'uppercase'
    }
  }, t.startPrice), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--navy)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: variant === 'big' ? 16 : 14.5,
      whiteSpace: 'nowrap'
    }
  }, formatEGP(p.price, lang))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 7
    }
  }, metrics.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      border: '1px solid var(--line)',
      background: 'var(--surface-soft)',
      borderRadius: 12,
      padding: '7px 8px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--faint)',
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: ar ? 0 : '.05em',
      textTransform: ar ? 'none' : 'uppercase',
      marginBottom: 3
    }
  }, m.label), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--navy)',
      display: 'block',
      fontSize: 12,
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, m.value)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => onOpen && onOpen(p),
    style: {
      flex: 1,
      fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)'
    }
  }, t.viewProject), /*#__PURE__*/React.createElement(WhatsAppButton, {
    href: waHref,
    style: {
      flex: '0 0 auto',
      minHeight: 36,
      padding: '0 14px',
      fontSize: 13
    }
  }, t.wa))));
}
window.TCResultCard = TCResultCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/ResultCard.jsx", error: String((e && e.message) || e) }); }

// demos/tycoons-site/copy.js
try { (() => {
/* Tycoons site — bilingual copy + formatting helpers (global: window.TC). */
(function () {
  const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  function toArabicDigits(s) {
    return String(s).replace(/[0-9]/g, d => AR_DIGITS[+d]);
  }

  // EGP formatter. Compact for large numbers; lang controls digits + label side.
  function formatEGP(n, lang) {
    const ar = lang === 'ar';
    let out;
    if (n >= 1000000) {
      const m = n / 1000000;
      const val = Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1);
      out = ar ? `${toArabicDigits(val)} مليون جنيه` : `EGP ${val}M`;
    } else if (n >= 1000) {
      const k = Math.round(n / 1000);
      out = ar ? `${toArabicDigits(k)} ألف جنيه` : `EGP ${k}K`;
    } else {
      out = ar ? `${toArabicDigits(n)} جنيه` : `EGP ${n}`;
    }
    return out;
  }

  // full price with separators for the detail page
  function formatEGPFull(n, lang) {
    const grouped = n.toLocaleString('en-US');
    return lang === 'ar' ? `${toArabicDigits(grouped)} ج.م` : `EGP ${grouped}`;
  }
  const COPY = {
    ar: {
      nav: ['البحث', 'المشاريع', 'الطرح الجديد', 'الحاسبة', 'تواصل'],
      wa: 'واتساب',
      // concierge
      eyebrow: 'بحث عقاري بالذكاء الاصطناعي',
      h1a: 'ابحث بصوتك بأي حاجة تيجي في بالك،',
      h1b: 'وإحنا نوصّلك للعقار المناسب.',
      lede: 'اكتب أو اتكلم بطريقتك — «عايز شاليه في الساحل تحت ٩ مليون» — والنتائج تظهر هنا جوه المحادثة على طول، من غير ما تدوّر.',
      inputPlaceholder: 'عايز شاليه في الساحل أو آي فيلا في التجمع…',
      send: 'ابحث',
      listening: 'بسمعك…',
      tapToTalk: 'اضغط وابدأ اتكلم',
      thinking: 'بدوّر في مخزون Tycoons…',
      resultsLead: (n, area) => {
        const phrase = n === 1 ? 'نتيجة واحدة مناسبة' : n === 2 ? 'نتيجتين مناسبين' : `${toArabicDigits(n)} نتايج مناسبة`;
        return `لقيتلك ${phrase}${area ? ' في ' + area : ''}. دي أقرب الوحدات لطلبك:`;
      },
      noResults: 'مفيش نتيجة مطابقة تمامًا — جرّب توسّع الميزانية أو المنطقة، أو قولّي بطريقة تانية.',
      refineHint: 'عدّل طلبك:',
      refines: ['أرخص شوية', 'استلام فوري', 'قريّب من البحر', 'غرفتين بس', 'أقساط أطول'],
      viewProject: 'تفاصيل المشروع',
      examplesLabel: 'جرّب:',
      // sections
      launchesEyebrow: 'الطرح الجديد',
      launchesTitle: 'بتتطرح دلوقتي',
      launchesSub: 'أول فرصة لمشاريع لسه نازلة — من المطوّرين مباشرة، قبل السوق كله.',
      areasEyebrow: 'استكشف بالمنطقة',
      areasTitle: 'مناطق مميزة',
      areasSub: 'اختار منطقة والمساعد يبدأ البحث فيها فورًا.',
      devsEyebrow: 'شركاء موثوقون',
      devsTitle: 'مطوّرون موثوقون',
      devsSub: 'كل الوحدات مباشرة من المطوّر — بيانات وأسعار موثّقة، من غير وسطاء وهميين.',
      devProjects: n => `${toArabicDigits(n)} مشروع`,
      calcEyebrow: 'خطّط قبل ما تسأل',
      calcTitle: 'حاسبة الأقساط',
      calcSub: 'اعرف القسط الشهري التقريبي قبل ما تكلّم أي حد.',
      calcPrice: 'سعر الوحدة',
      calcDown: 'المقدم',
      calcYears: 'مدة التقسيط',
      calcMonthly: 'القسط الشهري التقريبي',
      calcYearsUnit: y => {
        const word = y === 1 ? 'سنة' : y === 2 ? 'سنتين' : y <= 10 ? 'سنين' : 'سنة';
        return `${toArabicDigits(y)} ${word}`;
      },
      calcDownAmount: 'قيمة المقدم',
      popularEyebrow: 'الأكثر بحثًا',
      popularTitle: 'بحث سريع',
      popular: ['شاليه في الساحل', 'آي فيلا في التجمع', 'شقة تحت ٧ مليون', 'استلام فوري', 'فيلا في زايد', 'بنتهاوس في العاصمة'],
      trust: [{
        t: 'موثّق من المطوّر',
        d: 'كل وحدة مباشرة من الشركة المطوّرة — مفيش إعلانات مكررة ولا أسعار وهمية.'
      }, {
        t: 'أقساط تناسبك',
        d: 'خطط سداد لحد ١٠ سنين، وحاسبة قسط شفافة على كل مشروع.'
      }, {
        t: 'رد فوري على واتساب',
        d: 'المساعد بيكمّل معاك على واتساب بتفاصيل الوحدة اللي عايزها.'
      }],
      // project page
      back: 'رجوع',
      keyFacts: 'أهم التفاصيل',
      fArea: 'المساحة',
      fBeds: 'غرف النوم',
      fDelivery: 'الاستلام',
      fDown: 'المقدم',
      fType: 'النوع',
      fDeveloper: 'المطوّر',
      amenities: 'المميزات',
      similar: 'وحدات مشابهة',
      similarSub: 'نفس المنطقة أو النوع — قريبة من اللي بتدوّر عليه.',
      startPrice: 'يبدأ من',
      askWa: 'كن الأول — اسأل على واتساب',
      askWaShort: 'اسأل على واتساب',
      ready: 'استلام فوري',
      galleryNote: 'صور المشروع',
      status: {
        available: 'متاح',
        limited: 'كميات محدودة',
        sold_out: 'اكتمل الحجز'
      },
      seeMore: 'عرض المزيد',
      showLess: 'عرض أقل'
    },
    en: {
      nav: ['Search', 'Projects', 'New Launches', 'Calculator', 'Contact'],
      wa: 'WhatsApp',
      eyebrow: 'AI-powered property search',
      h1a: 'Search by voice for anything on your mind,',
      h1b: 'we’ll get you to the right property.',
      lede: 'Type or talk your way — “a chalet on the North Coast under 9M” — and results appear right here inside the conversation, no scrolling required.',
      inputPlaceholder: 'a chalet on the North Coast, or an iVilla in New Cairo…',
      send: 'Search',
      listening: 'Listening…',
      tapToTalk: 'Tap and start talking',
      thinking: 'Searching Tycoons inventory…',
      resultsLead: (n, area) => `Found ${n} ${n === 1 ? 'match' : 'matches'}${area ? ' in ' + area : ''}. Here are the closest units to your request:`,
      noResults: 'No exact match — try widening your budget or area, or rephrase it for me.',
      refineHint: 'Refine:',
      refines: ['Cheaper', 'Ready to move', 'Closer to the sea', '2 bedrooms', 'Longer plan'],
      viewProject: 'View project',
      examplesLabel: 'Try:',
      launchesEyebrow: 'New launches',
      launchesTitle: 'Launching Now',
      launchesSub: 'First access to brand-new projects — straight from developers, before the general market.',
      areasEyebrow: 'Explore by area',
      areasTitle: 'Featured areas',
      areasSub: 'Pick an area and the assistant starts searching it instantly.',
      devsEyebrow: 'Trusted partners',
      devsTitle: 'Trusted developers',
      devsSub: 'Every unit direct from the developer — verified data and prices, no fake middlemen.',
      devProjects: n => `${n} projects`,
      calcEyebrow: 'Plan before you ask',
      calcTitle: 'Installment calculator',
      calcSub: 'Know the approximate monthly installment before you talk to anyone.',
      calcPrice: 'Unit price',
      calcDown: 'Down payment',
      calcYears: 'Plan length',
      calcMonthly: 'Approx. monthly installment',
      calcYearsUnit: y => `${y} years`,
      calcDownAmount: 'Down payment amount',
      popularEyebrow: 'Most searched',
      popularTitle: 'Quick search',
      popular: ['Chalet on the North Coast', 'iVilla in New Cairo', 'Apartment under 7M', 'Ready to move', 'Villa in Zayed', 'Penthouse in New Capital'],
      trust: [{
        t: 'Developer-verified',
        d: 'Every unit is direct from the developer — no duplicate ads, no fake prices.'
      }, {
        t: 'Plans that fit',
        d: 'Payment plans up to 10 years, with a transparent installment calculator on every project.'
      }, {
        t: 'Instant on WhatsApp',
        d: 'The assistant continues on WhatsApp with the exact unit details you want.'
      }],
      back: 'Back',
      keyFacts: 'Key facts',
      fArea: 'Size',
      fBeds: 'Bedrooms',
      fDelivery: 'Delivery',
      fDown: 'Down pmt',
      fType: 'Type',
      fDeveloper: 'Developer',
      amenities: 'Amenities',
      similar: 'Similar units',
      similarSub: 'Same area or type — close to what you’re looking for.',
      startPrice: 'Starting price',
      askWa: 'Be first — ask on WhatsApp',
      askWaShort: 'Ask on WhatsApp',
      ready: 'Ready to move',
      galleryNote: 'Project imagery',
      status: {
        available: 'Available',
        limited: 'Limited',
        sold_out: 'Sold out'
      },
      seeMore: 'See more',
      showLess: 'Show less'
    }
  };
  window.TC = {
    COPY,
    formatEGP,
    formatEGPFull,
    toArabicDigits
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/copy.js", error: String((e && e.message) || e) }); }

// demos/tycoons-site/data.js
try { (() => {
/* ============================================================
   TYCOONS — sample inventory, shaped to a Supabase `projects` table.
   Swap window.TYCOONS_DATA for a fetch from Supabase later; keep the
   same column names and the rest of the app works unchanged.

   Suggested Supabase schema (table: projects)
   ------------------------------------------------------------
   id            bigint (pk)
   developer     text
   compound      text
   unit_type     text     -- chalet | ivilla | apartment | villa | studio | penthouse
   area          text     -- slug: north-coast | new-cairo | ain-sokhna | sheikh-zayed | new-capital
   title_ar      text
   title_en      text
   price         bigint   -- EGP, numeric for range filtering
   bedrooms      int
   size_sqm      int
   delivery      text     -- 'Ready' | year
   down_pct      int
   payment_years int
   sea_view      bool
   status        text     -- available | limited | sold_out
   is_launch     bool
   launch_ar     text     -- null unless is_launch
   launch_en     text
   image_url     text     -- CDN/Supabase storage URL (null -> striped placeholder)
   gallery       text[]
   amenities_ar  text[]
   amenities_en  text[]
   ============================================================ */
(function () {
  const AREAS = {
    'north-coast': {
      ar: 'الساحل الشمالي',
      en: 'North Coast',
      keys: ['ساحل', 'north coast', 'coast', 'sahel']
    },
    'new-cairo': {
      ar: 'التجمع / القاهرة الجديدة',
      en: 'New Cairo',
      keys: ['تجمع', 'قاهرة جديدة', 'new cairo', 'cairo']
    },
    'ain-sokhna': {
      ar: 'العين السخنة',
      en: 'Ain Sokhna',
      keys: ['سخنة', 'sokhna', 'sukhna']
    },
    'sheikh-zayed': {
      ar: 'الشيخ زايد',
      en: 'Sheikh Zayed',
      keys: ['زايد', 'zayed', 'zayd']
    },
    'new-capital': {
      ar: 'العاصمة الإدارية',
      en: 'New Capital',
      keys: ['عاصمة', 'اداريه', 'capital', 'administrative']
    }
  };
  const TYPES = {
    chalet: {
      ar: 'شاليه',
      en: 'Chalet',
      keys: ['شاليه', 'chalet']
    },
    ivilla: {
      ar: 'آي فيلا',
      en: 'iVilla',
      keys: ['اي فيلا', 'آي فيلا', 'ivilla', 'i villa']
    },
    apartment: {
      ar: 'شقة',
      en: 'Apartment',
      keys: ['شقة', 'شقه', 'apartment', 'apart', 'flat']
    },
    villa: {
      ar: 'فيلا',
      en: 'Villa',
      keys: ['فيلا', 'فيلة', 'villa']
    },
    studio: {
      ar: 'استوديو',
      en: 'Studio',
      keys: ['استوديو', 'studio']
    },
    penthouse: {
      ar: 'بنتهاوس',
      en: 'Penthouse',
      keys: ['بنتهاوس', 'penthouse']
    }
  };
  const DEVELOPERS = [{
    name: 'La Vista',
    ar: 'لافيستا',
    projects: 42
  }, {
    name: 'Mountain View',
    ar: 'ماونتن ڤيو',
    projects: 38
  }, {
    name: 'Tatweer Misr',
    ar: 'تطوير مصر',
    projects: 21
  }, {
    name: 'Palm Hills',
    ar: 'بالم هيلز',
    projects: 55
  }, {
    name: 'Ora',
    ar: 'أورا',
    projects: 12
  }, {
    name: 'SODIC',
    ar: 'سوديك',
    projects: 34
  }, {
    name: 'Emaar Misr',
    ar: 'إعمار مصر',
    projects: 18
  }, {
    name: 'Hyde Park',
    ar: 'هايد بارك',
    projects: 15
  }];

  // price is a real number (EGP) so natural-language budget filters work.
  const P = [{
    id: 1,
    developer: 'La Vista',
    compound: 'La Vista Bay East',
    unit_type: 'chalet',
    area: 'north-coast',
    title_ar: 'شاليه بإطلالة بحر — أول مرحلة',
    title_en: 'Sea-view chalet — first release',
    price: 8400000,
    bedrooms: 3,
    size_sqm: 140,
    delivery: '2027',
    down_pct: 5,
    payment_years: 8,
    sea_view: true,
    status: 'available',
    is_launch: true,
    launch_ar: 'بتتطرح دلوقتي',
    launch_en: 'Launching Now',
    image_url: null,
    amenities_ar: ['بيتش فرونت', 'حمام سباحة', 'كلوب هاوس', 'أمن ٢٤/٧'],
    amenities_en: ['Beachfront', 'Pool', 'Clubhouse', '24/7 security']
  }, {
    id: 2,
    developer: 'Mountain View',
    compound: 'Mountain View iCity',
    unit_type: 'ivilla',
    area: 'new-cairo',
    title_ar: 'آي فيلا في التجمع — لقطة جديدة',
    title_en: 'iVilla in New Cairo — new phase',
    price: 12900000,
    bedrooms: 4,
    size_sqm: 210,
    delivery: 'Ready',
    down_pct: 10,
    payment_years: 6,
    sea_view: false,
    status: 'available',
    is_launch: true,
    launch_ar: 'جديد',
    launch_en: 'New',
    image_url: null,
    amenities_ar: ['حديقة خاصة', 'لاند سكيب', 'مسارات جري', 'مول تجاري'],
    amenities_en: ['Private garden', 'Landscape', 'Running tracks', 'Retail mall']
  }, {
    id: 3,
    developer: 'Tatweer Misr',
    compound: 'IL Monte Galala',
    unit_type: 'apartment',
    area: 'ain-sokhna',
    title_ar: 'شقة بإطلالة على الجبل والبحر',
    title_en: 'Apartment with mountain & sea view',
    price: 6200000,
    bedrooms: 2,
    size_sqm: 95,
    delivery: '2026',
    down_pct: 5,
    payment_years: 7,
    sea_view: true,
    status: 'available',
    is_launch: true,
    launch_ar: 'جديد',
    launch_en: 'New',
    image_url: null,
    amenities_ar: ['فنيكيولار', 'شاطئ خاص', 'أكوا بارك'],
    amenities_en: ['Funicular', 'Private beach', 'Aqua park']
  }, {
    id: 4,
    developer: 'Palm Hills',
    compound: 'Palm Hills New Cairo',
    unit_type: 'apartment',
    area: 'new-cairo',
    title_ar: 'شقة بتشطيب كامل بجاردن',
    title_en: 'Fully-finished apartment with garden',
    price: 8900000,
    bedrooms: 3,
    size_sqm: 140,
    delivery: '2028',
    down_pct: 5,
    payment_years: 8,
    sea_view: false,
    status: 'available',
    is_launch: false,
    image_url: null,
    amenities_ar: ['تشطيب كامل', 'جيم', 'كلوب هاوس'],
    amenities_en: ['Fully finished', 'Gym', 'Clubhouse']
  }, {
    id: 5,
    developer: 'La Vista',
    compound: 'Direction White',
    unit_type: 'ivilla',
    area: 'north-coast',
    title_ar: 'آي فيلا جاردن على البحر',
    title_en: 'iVilla Garden by the sea',
    price: 15400000,
    bedrooms: 4,
    size_sqm: 230,
    delivery: '2029',
    down_pct: 10,
    payment_years: 9,
    sea_view: true,
    status: 'limited',
    is_launch: false,
    image_url: null,
    amenities_ar: ['لاجونات', 'مارينا', 'بيتش كلوب'],
    amenities_en: ['Lagoons', 'Marina', 'Beach club']
  }, {
    id: 6,
    developer: 'La Vista',
    compound: 'La Vista Sokhna',
    unit_type: 'chalet',
    area: 'ain-sokhna',
    title_ar: 'شاليه استلام فوري بإطلالة بحر',
    title_en: 'Ready chalet with sea view',
    price: 5600000,
    bedrooms: 2,
    size_sqm: 88,
    delivery: 'Ready',
    down_pct: 5,
    payment_years: 5,
    sea_view: true,
    status: 'available',
    is_launch: false,
    image_url: null,
    amenities_ar: ['استلام فوري', 'حمام سباحة', 'شاطئ'],
    amenities_en: ['Ready to move', 'Pool', 'Beach']
  }, {
    id: 7,
    developer: 'SODIC',
    compound: 'SODIC West',
    unit_type: 'villa',
    area: 'sheikh-zayed',
    title_ar: 'فيلا مستقلة بحديقة كبيرة',
    title_en: 'Standalone villa with large garden',
    price: 22500000,
    bedrooms: 5,
    size_sqm: 340,
    delivery: '2027',
    down_pct: 10,
    payment_years: 8,
    sea_view: false,
    status: 'available',
    is_launch: false,
    image_url: null,
    amenities_ar: ['حديقة ٤٠٠م', 'حمام سباحة خاص', 'جراج'],
    amenities_en: ['400m garden', 'Private pool', 'Garage']
  }, {
    id: 8,
    developer: 'Hyde Park',
    compound: 'Hyde Park New Cairo',
    unit_type: 'studio',
    area: 'new-cairo',
    title_ar: 'استوديو بعائد إيجاري عالي',
    title_en: 'Studio with high rental yield',
    price: 3900000,
    bedrooms: 1,
    size_sqm: 55,
    delivery: '2026',
    down_pct: 5,
    payment_years: 6,
    sea_view: false,
    status: 'available',
    is_launch: false,
    image_url: null,
    amenities_ar: ['بيزنس هَب', 'مطاعم', 'كوَرك سبيس'],
    amenities_en: ['Business hub', 'Dining', 'Co-work']
  }, {
    id: 9,
    developer: 'Ora',
    compound: 'ZED East',
    unit_type: 'apartment',
    area: 'new-cairo',
    title_ar: 'شقة بانوراما في كمباوند متكامل',
    title_en: 'Panorama apartment in a full compound',
    price: 11200000,
    bedrooms: 3,
    size_sqm: 165,
    delivery: '2028',
    down_pct: 10,
    payment_years: 8,
    sea_view: false,
    status: 'limited',
    is_launch: false,
    image_url: null,
    amenities_ar: ['سبورتنج كلوب', 'مدارس', 'مول'],
    amenities_en: ['Sporting club', 'Schools', 'Mall']
  }, {
    id: 10,
    developer: 'Emaar Misr',
    compound: 'Marassi',
    unit_type: 'chalet',
    area: 'north-coast',
    title_ar: 'شاليه في مارينا مارَسي',
    title_en: 'Chalet at Marassi Marina',
    price: 9800000,
    bedrooms: 3,
    size_sqm: 130,
    delivery: '2027',
    down_pct: 5,
    payment_years: 7,
    sea_view: true,
    status: 'available',
    is_launch: false,
    image_url: null,
    amenities_ar: ['مارينا يخوت', 'جولف', 'فنادق'],
    amenities_en: ['Yacht marina', 'Golf', 'Hotels']
  }, {
    id: 11,
    developer: 'SODIC',
    compound: 'SODIC East',
    unit_type: 'penthouse',
    area: 'new-capital',
    title_ar: 'بنتهاوس بروف جاردن في العاصمة',
    title_en: 'Penthouse with roof garden, New Capital',
    price: 14700000,
    bedrooms: 4,
    size_sqm: 220,
    delivery: '2029',
    down_pct: 10,
    payment_years: 10,
    sea_view: false,
    status: 'available',
    is_launch: true,
    launch_ar: 'بتتطرح دلوقتي',
    launch_en: 'Launching Now',
    image_url: null,
    amenities_ar: ['روف جاردن', 'سمارت هوم', 'نهر أخضر'],
    amenities_en: ['Roof garden', 'Smart home', 'Green river']
  }, {
    id: 12,
    developer: 'Palm Hills',
    compound: 'Badya',
    unit_type: 'apartment',
    area: 'sheikh-zayed',
    title_ar: 'شقة في بادية بأقساط ٩ سنين',
    title_en: 'Apartment in Badya, 9-year plan',
    price: 7300000,
    bedrooms: 2,
    size_sqm: 110,
    delivery: '2028',
    down_pct: 5,
    payment_years: 9,
    sea_view: false,
    status: 'available',
    is_launch: false,
    image_url: null,
    amenities_ar: ['مدينة ذكية', 'مسارات دراجات', 'بحيرات'],
    amenities_en: ['Smart city', 'Bike lanes', 'Lakes']
  }];
  window.TYCOONS_DATA = {
    PROJECTS: P,
    AREAS,
    TYPES,
    DEVELOPERS
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/data.js", error: String((e && e.message) || e) }); }

// demos/tycoons-site/intent.js
try { (() => {
/* Tycoons site — natural-language query parser (AR + EN).
   window.TC_INTENT.search(query, projects, lang) -> { items, filters, areaLabel }
   Pure client-side heuristic parse. On the real site this maps to the
   LLM tool-call that builds the same filter object against Supabase. */
(function () {
  const AR2LAT = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9'
  };
  function normalize(q) {
    return String(q || '').replace(/[٠-٩]/g, d => AR2LAT[d]).replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase().trim();
  }
  function matchDict(dict, q) {
    for (const key of Object.keys(dict)) {
      const entry = dict[key];
      const keys = entry.keys || [];
      for (const k of keys) {
        if (q.includes(normalize(k))) return key;
      }
    }
    return null;
  }

  // budget words → EGP multiplier
  function parseBudget(q) {
    // capture "N million/مليون" or bare "N m"
    let max = null,
      min = null;
    const milMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:m|مليون|million|mil)/);
    let val = null;
    if (milMatch) val = parseFloat(milMatch[1]) * 1000000;else {
      const kMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:k|الف|ألف|thousand)/);
      if (kMatch) val = parseFloat(kMatch[1]) * 1000;
    }
    if (val != null) {
      const underWords = ['تحت', 'اقل من', 'اقل', 'حدود', 'في حدود', 'لحد', 'under', 'below', 'less than', 'max', 'up to', 'budget'];
      const overWords = ['فوق', 'اكتر من', 'اكثر من', 'من', 'over', 'above', 'more than', 'min', 'starting'];
      const isOver = overWords.some(w => q.includes(normalize(w))) && !underWords.some(w => q.includes(normalize(w)));
      if (isOver) min = val;else max = val;
    }
    return {
      max,
      min
    };
  }
  function parseBedrooms(q) {
    if (/(استوديو|studio)/.test(q)) return 1;
    if (/(غرفتين|روم?تين|2\s*(?:bed|bedroom|br|غرف|غرفه|غرفة))/.test(q)) return 2;
    if (/(3\s*(?:bed|bedroom|br|غرف|غرفه|غرفة)|تلات غرف|ثلاث غرف|تلاته غرف)/.test(q)) return 3;
    if (/(4\s*(?:bed|bedroom|br|غرف|غرفه|غرفة)|اربع غرف|أربع غرف)/.test(q)) return 4;
    if (/(5\s*(?:bed|bedroom|br|غرف|غرفه|غرفة)|خمس غرف)/.test(q)) return 5;
    return null;
  }
  function parseQuery(rawQuery) {
    const q = normalize(rawQuery);
    const D = window.TYCOONS_DATA;
    const area = matchDict(D.AREAS, q);
    const type = matchDict(D.TYPES, q);
    const {
      max,
      min
    } = parseBudget(q);
    const bedrooms = parseBedrooms(q);
    const ready = /(استلام فوري|استلام فورى|فوري|جاهز|جاهزه|ready|move now|immediate)/.test(q);
    const seaView = /(بحر|سي فيو|اطلاله بحر|إطلالة بحر|sea|beach|beachfront|waterfront)/.test(q);
    return {
      area,
      type,
      maxPrice: max,
      minPrice: min,
      bedrooms,
      ready,
      seaView
    };
  }

  // apply refine chips onto an existing filter set
  function applyRefine(filters, refineKey) {
    const f = {
      ...filters
    };
    switch (refineKey) {
      case 'cheaper':
        f.maxPrice = f.maxPrice ? Math.round(f.maxPrice * 0.8) : 7000000;
        break;
      case 'ready':
        f.ready = true;
        break;
      case 'sea':
        f.seaView = true;
        break;
      case 'beds2':
        f.bedrooms = 2;
        break;
      case 'longplan':
        f.minYears = 8;
        break;
      default:
        break;
    }
    return f;
  }
  function passes(p, f) {
    if (f.area && p.area !== f.area) return false;
    if (f.type && p.unit_type !== f.type) return false;
    if (f.maxPrice && p.price > f.maxPrice) return false;
    if (f.minPrice && p.price < f.minPrice) return false;
    if (f.bedrooms && p.bedrooms !== f.bedrooms) return false;
    if (f.ready && !(p.delivery === 'Ready' || window.TC_HELPERS && window.TC_HELPERS.isReadyDelivery(p.delivery))) return false;
    if (f.seaView && !p.sea_view) return false;
    if (f.minYears && p.payment_years < f.minYears) return false;
    return true;
  }

  // progressive relaxation so we (almost) always return something sensible
  function search(rawQuery, projects, lang, presetFilters) {
    const filters = presetFilters || parseQuery(rawQuery);
    const relaxOrder = ['minYears', 'seaView', 'bedrooms', 'ready', 'maxPrice', 'minPrice', 'type'];
    let active = {
      ...filters
    };
    let items = projects.filter(p => passes(p, active));
    let relaxed = [];
    for (const key of relaxOrder) {
      if (items.length >= 2) break;
      if (active[key] != null && active[key] !== false) {
        relaxed.push(key);
        active = {
          ...active,
          [key]: typeof active[key] === 'boolean' ? false : null
        };
        items = projects.filter(p => passes(p, active));
      }
    }
    // rank: launches first, then price ascending
    items = items.slice().sort((a, b) => b.is_launch - a.is_launch || a.price - b.price);
    const D = window.TYCOONS_DATA;
    const areaLabel = filters.area ? D.AREAS[filters.area][lang === 'ar' ? 'ar' : 'en'] : null;
    return {
      items,
      filters,
      areaLabel,
      relaxed
    };
  }
  window.TC_INTENT = {
    parseQuery,
    search,
    applyRefine,
    normalize
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/intent.js", error: String((e && e.message) || e) }); }

// demos/tycoons-site/supabase.js
try { (() => {
/* Tycoons site — Supabase data adapter.
   Fetches `projects` + `units` via the REST API (anon key, read-only) and
   normalizes rows into the same shape data.js's mock uses, so every
   component keeps working unchanged. Falls back to the bundled mock data
   (already loaded by data.js) if the fetch fails for any reason.

   Schema assumptions (tell me if your columns differ and I'll adjust):
   projects: id, name, developer, location, min_price, image_url,
             gallery_urls (comma-separated URL string), is_new_launch,
             status, delivery_text
   units:    id, project_id, unit_type, bedrooms_text, area_sqm,
             starting_price, image_url, gallery_urls, status,
             delivery_text, down_payment_pct, payment_years
*/
(function () {
  const SUPABASE_URL = 'https://coqnjymekrkoausiiytm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcW5qeW1la3Jrb2F1c2lpeXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDg3NjYsImV4cCI6MjA5NzM4NDc2Nn0.EIaGjkVORMuHelyUuMIA8EinAIlyY84sqQpgnEjPxEY';
  function normalizeTxt(s) {
    return String(s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase().trim();
  }

  // best-effort match of a free-text location/unit-type string against our
  // known AREAS/TYPES dictionaries (data.js). Returns the slug or null.
  function resolveKey(dict, text) {
    const n = normalizeTxt(text);
    if (!n) return null;
    for (const key of Object.keys(dict)) {
      const keys = dict[key].keys || [];
      if (keys.some(k => n.includes(normalizeTxt(k)))) return key;
    }
    return null;
  }
  function parseGallery(row) {
    const raw = row.gallery_urls;
    if (!raw) return row.image_url ? [row.image_url] : [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return String(raw).split(',').map(s => s.trim()).filter(Boolean);
  }
  function parseBedrooms(text) {
    const n = normalizeTxt(text);
    if (!n) return null;
    if (/استوديو|studio/.test(n)) return 1;
    const m = n.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }
  function isReadyDelivery(text) {
    return /ready|جاهز|فور|استلام فوري/i.test(String(text || ''));
  }
  window.TC_HELPERS = {
    isReadyDelivery,
    resolveKey,
    normalizeTxt
  };

  // "20%", "5% down payment + 5% after 3 months" -> 20 / 5. Falls back to 10.
  function parseDownPct(text) {
    const m = String(text || '').match(/(\d+(?:\.\d+)?)\s*%/);
    return m ? Math.round(parseFloat(m[1])) : 10;
  }
  // "20% on delivery - 5 years", "Installments over 10 years" -> 5 / 10. Falls back to 7.
  function parsePaymentYears(text) {
    const m = String(text || '').match(/(\d+(?:\.\d+)?)\s*(?:year|yr|سن)/i);
    return m ? Math.round(parseFloat(m[1])) : 7;
  }
  function normalizeStatus(s) {
    const n = normalizeTxt(s);
    if (/sold|مباع|اكتمل/.test(n)) return 'sold_out';
    if (/limited|محدود/.test(n)) return 'limited';
    return 'available';
  }

  // Some rows are explicitly marked by the source as not-yet-verified
  // (scraped from chat, pending manual review) — keep them out of the
  // searchable marketplace entirely rather than show incomplete cards.
  function isUnreliableRow(unit) {
    const s = normalizeTxt(unit.availability_status);
    return s === 'review_only' || s === 'not_confirmed';
  }
  function isLaunchSignal(unit) {
    const s = normalizeTxt(unit.availability_status);
    return s === 'new_launch' || s === 'new release';
  }
  // The source uses "Launch / Project Card" as a placeholder unit_type on
  // launch-announcement rows scraped from marketing messages — it isn't a
  // real unit type, so never surface it as one.
  function isPlaceholderType(text) {
    return /launch\s*\/\s*project card/i.test(String(text || ''));
  }

  // Egypt-market defaults when a numeric field genuinely isn't in the row.
  const FALLBACK_DOWN_PCT = 10;
  const FALLBACK_PAYMENT_YEARS = 7;

  // "New Launches" is driven purely by recency now — no fixed date window.
  // Whatever you add to Supabase most recently floats to the top of the
  // section automatically, so it self-refreshes on every insert without any
  // status needing to be toggled or aging out on a timer. Explicitly-flagged
  // launch rows are always included; the rest of the slots fill with the
  // newest listings by timestamp.
  const LAUNCH_COUNT = 9;
  function mostRecentDate(unit, project) {
    const dates = [unit.last_updated_at, unit.created_at, project && project.last_updated_at, project && project.created_at].filter(Boolean).map(d => new Date(d).getTime()).filter(n => !isNaN(n));
    return dates.length ? Math.max(...dates) : null;
  }
  async function fetchTable(name, limit) {
    const url = `${SUPABASE_URL}/rest/v1/${name}?select=*&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!res.ok) throw new Error(`${name} fetch failed: ${res.status}`);
    return res.json();
  }
  function mapRow(unit, project) {
    const D = window.TYCOONS_DATA;
    const locationText = project && project.location || '';
    const placeholderType = isPlaceholderType(unit.unit_type);
    const typeText = placeholderType ? '' : unit.unit_type || '';
    const areaKey = resolveKey(D.AREAS, locationText);
    const typeKey = placeholderType ? null : resolveKey(D.TYPES, typeText);
    const gallery = parseGallery(unit.gallery_urls ? unit : project || unit);
    const price = unit.starting_price ?? (project && project.min_price) ?? 0;
    const deliveryText = unit.delivery_text || project && project.delivery_text || '';
    const compound = project && project.name || 'Tycoons project';
    const developer = project && project.developer || '—';
    const title = typeText ? `${typeText} ${compound}`.trim() : compound;
    const seaView = /بحر|sea|beach/i.test(locationText + ' ' + compound);
    const downText = unit.down_payment_text || project && project.down_payment_text || '';
    const yearsText = unit.installments_text || project && project.installments_text || '';
    const status = unit.availability_status || unit.status || project && project.status;
    const bedrooms = placeholderType ? null : parseBedrooms(unit.bedrooms_text);
    const sizeSqm = unit.area_sqm ? Math.round(unit.area_sqm) : null;
    const recencyTs = mostRecentDate(unit, project);
    const launchFlag = isLaunchSignal(unit);
    return {
      id: `u-${unit.id}`,
      developer,
      compound,
      unit_type: typeKey || typeText || null,
      unit_type_raw: !typeKey ? typeText || null : null,
      area: areaKey || locationText,
      area_raw: !areaKey ? locationText : null,
      title_ar: title,
      title_en: title,
      price: Number(price) || 0,
      bedrooms,
      size_sqm: sizeSqm,
      delivery: isReadyDelivery(deliveryText) ? 'Ready' : deliveryText || '—',
      down_pct: unit.down_payment_pct ?? parseDownPct(downText) ?? FALLBACK_DOWN_PCT,
      payment_years: unit.payment_years ?? parsePaymentYears(yearsText) ?? FALLBACK_PAYMENT_YEARS,
      sea_view: seaView,
      status: normalizeStatus(status),
      is_launch: false,
      _launch_flag: launchFlag,
      _project_id: unit.project_id,
      _recency_ts: recencyTs,
      launch_ar: 'بتتطرح دلوقتي',
      launch_en: 'Launching Now',
      image_url: gallery[0] || unit.image_url || project && project.image_url || null,
      gallery: gallery.length ? gallery : unit.image_url ? [unit.image_url] : [],
      amenities_ar: [],
      amenities_en: []
    };
  }
  async function loadFromSupabase() {
    const [units, projects] = await Promise.all([fetchTable('units', 1000), fetchTable('projects', 300)]);
    const byId = {};
    projects.forEach(p => {
      byId[p.id] = p;
    });
    let mapped = units.filter(u => !isUnreliableRow(u)).map(u => mapRow(u, byId[u.project_id])).filter(p => p.price > 0);

    // New Launches = newest additions, self-refreshing on every insert.
    // Explicitly-flagged launch rows always qualify; remaining slots fill
    // with the most-recently-added listings by timestamp. Nothing ages out
    // on a timer — the moment you add a row to Supabase it surfaces here.
    const byRecency = [...mapped].sort((a, b) => (b._recency_ts || 0) - (a._recency_ts || 0));
    const launchSet = new Set(byRecency.filter(p => p._launch_flag));
    for (const p of byRecency) {
      if (launchSet.size >= LAUNCH_COUNT) break;
      launchSet.add(p);
    }
    launchSet.forEach(p => {
      p.is_launch = true;
      if (!p._launch_flag) {
        p.launch_en = 'New';
        p.launch_ar = 'جديد';
      }
    });

    // dynamic developer roster (project counts, since units-per-developer
    // would double count multi-unit projects)
    const devCounts = {};
    projects.forEach(p => {
      const d = p.developer || '—';
      devCounts[d] = (devCounts[d] || 0) + 1;
    });
    const developers = Object.keys(devCounts).sort((a, b) => devCounts[b] - devCounts[a]).slice(0, 8).map(name => ({
      name,
      ar: name,
      projects: devCounts[name]
    }));
    window.TYCOONS_DATA.PROJECTS = mapped;
    window.TYCOONS_DATA.DEVELOPERS = developers.length ? developers : window.TYCOONS_DATA.DEVELOPERS;
    window.dispatchEvent(new CustomEvent('tycoons:data-ready', {
      detail: {
        count: mapped.length,
        source: 'supabase'
      }
    }));
  }
  loadFromSupabase().catch(err => {
    console.warn('[Tycoons] Supabase fetch failed, staying on mock data:', err.message);
    window.dispatchEvent(new CustomEvent('tycoons:data-ready', {
      detail: {
        count: window.TYCOONS_DATA.PROJECTS.length,
        source: 'mock',
        error: err.message
      }
    }));
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/supabase.js", error: String((e && e.message) || e) }); }

// demos/tycoons-site/voice.js
try { (() => {
/* Tycoons site — voice layer.
   Uses the browser Web Speech API for speech-to-text (mic). Text-to-speech
   defaults to a server-side ElevenLabs proxy (keeps the API key off the
   client) with the browser's built-in speechSynthesis as a fallback if the
   proxy is unreachable or errors.

   tts-proxy contract: POST { text, voice_id, model_id } -> raw audio/mpeg
   stream (not JSON). voice_id/model_id are fixed constants below. */
(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  const TTS_PROXY_URL = 'https://coqnjymekrkoausiiytm.supabase.co/functions/v1/tts-proxy';
  function sttSupported() {
    return !!SR;
  }
  function ttsSupported() {
    return !!synth;
  }
  function langCode(lang) {
    return lang === 'ar' ? 'ar-EG' : 'en-US';
  }

  // ---- Speech to text ----
  // opts: { lang, onInterim(text), onFinal(text), onStart, onEnd, onError }
  function listen(opts) {
    if (!SR) {
      opts.onError && opts.onError('unsupported');
      return () => {};
    }
    const rec = new SR();
    rec.lang = langCode(opts.lang);
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onstart = () => opts.onStart && opts.onStart();
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;else interim += t;
      }
      if (interim) opts.onInterim && opts.onInterim((finalText + ' ' + interim).trim());
      if (finalText) opts.onFinal && opts.onFinal(finalText.trim());
    };
    rec.onerror = e => opts.onError && opts.onError(e.error || 'error');
    rec.onend = () => opts.onEnd && opts.onEnd(finalText.trim());
    try {
      rec.start();
    } catch (_) {}
    return () => {
      try {
        rec.stop();
      } catch (_) {}
    };
  }

  // ---- Text to speech ----
  let customSpeaker = null;
  function setSpeaker(fn) {
    customSpeaker = fn;
  }
  function pickVoice(lang) {
    if (!synth) return null;
    const voices = synth.getVoices() || [];
    const want = lang === 'ar' ? 'ar' : 'en';
    return voices.find(v => v.lang && v.lang.toLowerCase().startsWith(want)) || null;
  }

  // Browser speechSynthesis — used directly, and as the fallback when the
  // ElevenLabs proxy call fails.
  function browserSpeak(text, lang, onEnd) {
    if (!synth) {
      onEnd && onEnd();
      return;
    }
    try {
      synth.cancel();
    } catch (_) {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode(lang);
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = lang === 'ar' ? 0.98 : 1.02;
    u.pitch = 1;
    u.onend = () => onEnd && onEnd();
    u.onerror = () => onEnd && onEnd();
    if (!synth.getVoices().length) {
      synth.onvoiceschanged = () => {
        const vv = pickVoice(lang);
        if (vv) u.voice = vv;
        synth.speak(u);
        synth.onvoiceschanged = null;
      };
    } else {
      synth.speak(u);
    }
  }
  let currentAudio = null;
  const EL_VOICE_ID = '9SPZl4Mlgwj7QT4gVprb';
  const EL_MODEL_ID = 'eleven_multilingual_v2';
  async function elevenLabsSpeak(text, lang) {
    const res = await fetch(TTS_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voice_id: EL_VOICE_ID,
        model_id: EL_MODEL_ID
      })
    });
    if (!res.ok) throw new Error('tts-proxy ' + res.status);
    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      audio.onended = resolve;
      audio.onerror = () => reject(new Error('audio playback failed'));
      audio.play().catch(reject);
    });
  }
  function speak(text, lang, onEnd) {
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch (_) {}
      currentAudio = null;
    }
    if (customSpeaker) {
      Promise.resolve(customSpeaker(text, lang)).then(() => onEnd && onEnd()).catch(() => onEnd && onEnd());
      return;
    }
    elevenLabsSpeak(text, lang).then(() => onEnd && onEnd()).catch(err => {
      console.warn('[Tycoons] ElevenLabs TTS failed, falling back to browser voice:', err.message);
      browserSpeak(text, lang, onEnd);
    });
  }
  function stopSpeaking() {
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch (_) {}
      currentAudio = null;
    }
    try {
      synth && synth.cancel();
    } catch (_) {}
  }
  window.TC_VOICE = {
    sttSupported,
    ttsSupported,
    listen,
    speak,
    stopSpeaking,
    setSpeaker
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "demos/tycoons-site/voice.js", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
/* Tycoons website kit — shared header. Loaded via Babel; exports to window. */
function KitHeader({
  lang,
  setLang
}) {
  const {
    WhatsAppButton,
    LanguageSwitch
  } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const navAr = ['البحث', 'الصوت', 'المشاريع', 'تواصل'];
  const navEn = ['Search', 'Voice', 'Projects', 'Contact'];
  const nav = lang === 'ar' ? navAr : navEn;
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      minHeight: 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 20,
      padding: '14px clamp(18px,4vw,48px)',
      background: 'var(--glass-bg)',
      borderBottom: '1px solid var(--glass-border)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      boxShadow: '0 10px 28px rgba(16,24,39,.055)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/tycoons-logo-header.svg",
    alt: "Tycoons Investments",
    style: {
      height: 46
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'flex-end'
    }
  }, nav.map((n, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    style: {
      color: 'var(--muted)',
      fontFamily: 'var(--font-display)',
      fontSize: 14,
      fontWeight: 700,
      padding: '9px 13px',
      borderRadius: 'var(--radius-pill)'
    }
  }, n)), /*#__PURE__*/React.createElement(LanguageSwitch, {
    value: lang,
    onChange: setLang
  }), /*#__PURE__*/React.createElement(WhatsAppButton, {
    href: "https://wa.me/201200704344",
    style: {
      minHeight: 40,
      fontSize: 14,
      padding: '0 13px'
    }
  }, lang === 'ar' ? 'واتساب' : 'WhatsApp')));
}
window.KitHeader = KitHeader;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Tycoons website kit — voice-first hero with the AI search card. */
function KitHero({
  lang,
  query,
  setQuery,
  onSearch
}) {
  const {
    Eyebrow,
    SearchBar,
    Button
  } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const ar = lang === 'ar';
  const copy = ar ? {
    eyebrow: 'بحث عقاري بالصوت والكتابة',
    h1: 'قول للـ AI بتدور على إيه بالصوت أو بالكتابة.',
    lede: 'ابدأ بطلب طبيعي زي «عايز شاليه في الساحل» أو اكتب طلبك تحت. المساعد هيبحث في مخزون Tycoons ويعرض الوحدات المناسبة فورًا.',
    voice: 'استخدم البحث الصوتي لو تفضّل تتكلم. ابدأ المساعد، وبعدها اضغط مطولًا على زر التحدث وانت بتتكلم.',
    start: 'ابدأ المساعد الصوتي',
    talk: 'اضغط للتحدث'
  } : {
    eyebrow: 'Search by voice or text',
    h1: 'Tell the AI what you’re looking for — by voice or text.',
    lede: 'Start with a natural request like “a chalet on the North Coast,” or type it below. The assistant searches live Tycoons inventory and shows matching units instantly.',
    voice: 'Prefer to talk? Start the voice agent, then press and hold to talk while you speak.',
    start: 'Start voice agent',
    talk: 'Hold to talk'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,#fff 0%,#fff 58%,var(--surface-warm) 100%)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-2xl)',
      padding: 'clamp(24px,4vw,40px)',
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, copy.eyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '14px 0 16px',
      maxWidth: 820
    }
  }, copy.h1), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 720,
      marginBottom: 22,
      fontSize: 18,
      lineHeight: 1.55,
      color: 'var(--ink)'
    }
  }, copy.lede), /*#__PURE__*/React.createElement(SearchBar, _extends({
    value: query,
    onChange: e => setQuery(e.target.value),
    onSearch: onSearch
  }, ar ? {} : {
    label: 'Search by voice or text',
    action: 'Talk to the assistant',
    placeholder: 'e.g. a chalet on the North Coast, or iVilla in New Cairo',
    buttonLabel: 'Search',
    examples: ['Chalet on the North Coast', 'iVilla in New Cairo', 'Apartment under 9M', 'Ready to move']
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      marginTop: 14,
      padding: 14,
      borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(135deg,rgba(255,248,233,.85),rgba(255,255,255,.92))',
      border: '1px solid var(--line-gold)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'var(--navy)',
      fontSize: 14,
      lineHeight: 1.45
    }
  }, copy.voice), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    style: {
      flex: '1 1 150px'
    }
  }, copy.start), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    disabled: true,
    style: {
      flex: '1 1 150px'
    }
  }, copy.talk))));
}
window.KitHero = KitHero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HowPanel.jsx
try { (() => {
/* Tycoons website kit — "How it works" side panel (static 3-step). */
function KitHowPanel({
  lang
}) {
  const ar = lang === 'ar';
  const steps = ar ? [['01', 'قول اللي محتاجه', 'المنطقة، نوع الوحدة، الميزانية، التسليم أو اسم المشروع.'], ['02', 'الـ AI بيدور في المخزون', 'النتائج من قاعدة بيانات Tycoons، مش إعلانات عامة.'], ['03', 'شوف الكروت المطابقة', 'السعر، المساحة، التسليم، الصورة والخطوة الجاية.']] : [['01', 'Say what you want', 'Location, unit type, budget, delivery, or project name.'], ['02', 'AI searches live stock', 'Results come from the Tycoons database, not generic ads.'], ['03', 'See matching cards', 'Price, area, delivery, image, and the next action.']];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      background: 'linear-gradient(180deg,#ffffff,#fffaf0)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-2xl)',
      padding: 22,
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minHeight: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 11,
      letterSpacing: '.16em',
      color: 'var(--gold)',
      textTransform: 'uppercase'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--gold)'
    }
  }), ar ? 'كيف يعمل' : 'How it works')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 12
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'relative',
      paddingInlineStart: 54,
      background: 'var(--surface-soft)',
      border: '1px solid var(--line)',
      borderRadius: 18,
      padding: '14px 15px 14px 15px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      insetInlineStart: 14,
      top: 14,
      width: 28,
      height: 28,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--navy)',
      color: '#fff',
      fontSize: 11,
      fontWeight: 900,
      fontFamily: 'var(--font-display)'
    }
  }, s[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingInlineStart: 40
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      color: 'var(--navy)',
      fontFamily: 'var(--font-display)',
      fontSize: 16,
      lineHeight: 1.2,
      marginBottom: 4
    }
  }, s[1]), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--muted)',
      fontSize: 13,
      lineHeight: 1.5
    }
  }, s[2]))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '12px 14px',
      borderRadius: 13,
      background: 'var(--surface-soft)',
      border: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--wa)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--navy)',
      fontWeight: 700
    }
  }, ar ? 'مخزون حي' : 'Live inventory'), /*#__PURE__*/React.createElement("span", {
    style: {
      marginInlineStart: 'auto',
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, "456 ", ar ? 'وحدة' : 'units', " \xB7 66 ", ar ? 'مشروع' : 'projects')));
}
window.KitHowPanel = KitHowPanel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HowPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Results.jsx
try { (() => {
/* Tycoons website kit — results grid of property cards. */
function KitResults({
  lang,
  items,
  searched
}) {
  const {
    Eyebrow,
    PropertyCard
  } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const ar = lang === 'ar';
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '28px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, searched ? ar ? 'نتائج البحث' : 'Search results' : ar ? 'وحدات مقترحة' : 'Suggested units'), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '10px 0 8px'
    }
  }, ar ? 'وحدات مقترحة' : 'Matching units'), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 720
    }
  }, ar ? 'الكروت بتعرض الأهم أولًا: الصورة، المشروع، نوع الوحدة، السعر، المساحة، التسليم، والروابط.' : 'Cards lead with what matters: image, project, unit type, price, area, delivery, and links.')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: 20
    }
  }, items.map(p => /*#__PURE__*/React.createElement(PropertyCard, {
    key: p.id,
    label: p.label,
    kicker: p.kicker,
    title: p.title,
    price: p.price,
    tags: p.tags,
    metrics: p.metrics,
    availability: p.availability,
    waHref: "https://wa.me/201200704344"
  }))));
}
window.KitResults = KitResults;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Results.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/data.js
try { (() => {
/* Tycoons website kit — sample live-inventory data (mock). */
window.KIT_PROPERTIES = [{
  id: 1,
  label: 'North Coast',
  kicker: 'Chalet',
  title: 'La Vista · Chalet on the North Coast',
  price: 'EGP 8,400,000',
  tags: ['120 m²', 'Sea view'],
  metrics: [{
    label: 'Area',
    value: '120 m²'
  }, {
    label: 'Delivery',
    value: '2027'
  }, {
    label: 'Down pmt',
    value: '5%'
  }],
  availability: 'available',
  area: 'north coast',
  type: 'chalet'
}, {
  id: 2,
  label: 'New Cairo',
  kicker: 'iVilla',
  title: 'Mountain View · iVilla in New Cairo',
  price: 'EGP 12,900,000',
  tags: ['210 m²', 'Ready'],
  metrics: [{
    label: 'Area',
    value: '210 m²'
  }, {
    label: 'Delivery',
    value: 'Ready'
  }, {
    label: 'Down pmt',
    value: '10%'
  }],
  availability: 'available',
  area: 'new cairo',
  type: 'ivilla'
}, {
  id: 3,
  label: 'Ain Sokhna',
  kicker: 'Apartment',
  title: 'Tatweer Misr · Apartment in Ain Sokhna',
  price: 'EGP 6,200,000',
  tags: ['95 m²', 'Sea view'],
  metrics: [{
    label: 'Area',
    value: '95 m²'
  }, {
    label: 'Delivery',
    value: '2026'
  }, {
    label: 'Down pmt',
    value: '5%'
  }],
  availability: 'available',
  area: 'ain sokhna',
  type: 'apartment'
}, {
  id: 4,
  label: 'New Cairo',
  kicker: 'Apartment',
  title: 'Palm Hills · Apartment in New Cairo',
  price: 'EGP 8,900,000',
  tags: ['140 m²', 'Semi-finished'],
  metrics: [{
    label: 'Area',
    value: '140 m²'
  }, {
    label: 'Delivery',
    value: '2028'
  }, {
    label: 'Down pmt',
    value: '5%'
  }],
  availability: 'available',
  area: 'new cairo',
  type: 'apartment'
}, {
  id: 5,
  label: 'North Coast',
  kicker: 'iVilla',
  title: 'Direction White · iVilla Garden',
  price: 'EGP 15,400,000',
  tags: ['230 m²', 'Garden'],
  metrics: [{
    label: 'Area',
    value: '230 m²'
  }, {
    label: 'Delivery',
    value: '2029'
  }, {
    label: 'Down pmt',
    value: '10%'
  }],
  availability: 'sold_out',
  area: 'north coast',
  type: 'ivilla'
}, {
  id: 6,
  label: 'Ain Sokhna',
  kicker: 'Chalet',
  title: 'La Vista · Chalet with sea view',
  price: 'EGP 5,600,000',
  tags: ['88 m²', 'Finished'],
  metrics: [{
    label: 'Area',
    value: '88 m²'
  }, {
    label: 'Delivery',
    value: 'Ready'
  }, {
    label: 'Down pmt',
    value: '5%'
  }],
  availability: 'available',
  area: 'ain sokhna',
  type: 'chalet'
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.LanguageSwitch = __ds_scope.LanguageSwitch;

__ds_ns.StatusNote = __ds_scope.StatusNote;

__ds_ns.WhatsAppButton = __ds_scope.WhatsAppButton;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SearchBar = __ds_scope.SearchBar;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.PropertyCard = __ds_scope.PropertyCard;

})();
