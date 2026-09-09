import { useState, useEffect, useRef } from 'react'

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'shortcuts', label: 'Shortcuts' }
]

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="settings-segmented" role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`settings-segmented-btn${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon && <span className="settings-segmented-icon">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SettingRow({ label, description, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row-info">
        <span className="settings-row-label">{label}</span>
        {description && <span className="settings-row-desc">{description}</span>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  )
}

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const AutoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" />
  </svg>
)

function GeneralTab({ settings, updateSetting }) {
  return (
    <div className="settings-tab-content">
      <SettingRow label="Theme" description="Choose light, dark, or follow system preference">
        <SegmentedControl
          options={[
            { value: 'light', label: 'Light', icon: <SunIcon /> },
            { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
            { value: 'auto', label: 'Auto', icon: <AutoIcon /> }
          ]}
          value={settings.theme}
          onChange={(v) => updateSetting('theme', v)}
        />
      </SettingRow>

      <SettingRow label="Auto-close after submit" description="Automatically close the tab after feedback is submitted">
        <SegmentedControl
          options={[
            { value: 'off', label: 'Off' },
            { value: '0', label: 'Instant' },
            { value: '3', label: '3s' },
            { value: '5', label: '5s' }
          ]}
          value={settings.autoCloseDelay}
          onChange={(v) => updateSetting('autoCloseDelay', v)}
        />
      </SettingRow>
    </div>
  )
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const MOD = isMac ? '⌘' : 'Ctrl'

const SHORTCUT_GROUPS = [
  {
    title: 'Annotations',
    items: [
      { keys: 'Click a mark', desc: 'Select it (shows resize handles)' },
      { keys: 'Click again', desc: 'Edit its comment and color' },
      { keys: 'Drag a mark', desc: 'Move it' },
      { keys: 'Drag a corner handle', desc: 'Resize it' },
      { keys: 'Delete / Backspace', desc: 'Remove the selected mark' },
      { keys: 'Escape', desc: 'Close the comment popover' }
    ]
  },
  {
    title: 'View',
    items: [
      { keys: `${MOD} + Scroll`, desc: 'Zoom in / out' }
    ]
  }
]

function ShortcutsTab() {
  return (
    <div className="settings-tab-content">
      {SHORTCUT_GROUPS.map((group) => (
        <div key={group.title} className="shortcuts-group">
          <h3 className="shortcuts-group-title">{group.title}</h3>
          <div className="shortcuts-list">
            {group.items.map((item) => (
              <div key={item.keys} className="shortcut-row">
                <kbd className="shortcut-keys">{item.keys}</kbd>
                <span className="shortcut-desc">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const TAB_COMPONENTS = { general: GeneralTab, shortcuts: ShortcutsTab }

export default function SettingsModal({ isOpen, onClose, settings, updateSetting, resetSettings }) {
  const [activeTab, setActiveTab] = useState('general')
  const dialogRef = useRef(null)
  const prevFocusedRef = useRef(null)

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') { onClose() }
    }
    if (isOpen) {
      prevFocusedRef.current = document.activeElement
      document.addEventListener('keydown', handleEscape)
      dialogRef.current?.focus()
      return () => {
        document.removeEventListener('keydown', handleEscape)
        prevFocusedRef.current?.focus?.()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) { return null }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) { onClose() }
  }

  const TabContent = TAB_COMPONENTS[activeTab]

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div ref={dialogRef} tabIndex={-1} className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
        <div className="modal-header">
          <h2 id="settings-modal-title">Settings</h2>
          <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`settings-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-body" role="tabpanel">
          <TabContent settings={settings} updateSetting={updateSetting} />
        </div>

        <div className="modal-footer settings-footer">
          {activeTab !== 'shortcuts' && (
            <button type="button" className="btn settings-reset-btn" onClick={resetSettings}>Reset to defaults</button>
          )}
          <button type="button" className="btn btn-approve" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
