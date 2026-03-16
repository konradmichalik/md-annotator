import { useState, useEffect, useRef } from 'react'
import { CloseIcon } from './Icons.jsx'

const TABS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'shortcuts', label: 'Shortcuts' },
]

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="settings-segmented" role="radiogroup">
      {options.map(opt => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          className={`settings-segmented-btn${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
          type="button"
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
      <div className="settings-row-control">
        {children}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`settings-toggle${checked ? ' active' : ''}`}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="settings-toggle-thumb" />
    </button>
  )
}

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

const AutoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor"/>
  </svg>
)

function AppearanceTab({ settings, updateSetting }) {
  return (
    <div className="settings-tab-content">
      <SettingRow label="Theme" description="Choose light, dark, or follow system preference">
        <SegmentedControl
          options={[
            { value: 'light', label: 'Light', icon: <SunIcon /> },
            { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
            { value: 'auto', label: 'Auto', icon: <AutoIcon /> },
          ]}
          value={settings.theme}
          onChange={v => updateSetting('theme', v)}
        />
      </SettingRow>

      <SettingRow label="Content width" description="Maximum width of the rendered markdown">
        <SegmentedControl
          options={[
            { value: 680, label: 'Narrow' },
            { value: 900, label: 'Default' },
            { value: 1200, label: 'Wide' },
            { value: 9999, label: 'Full' },
          ]}
          value={settings.contentWidth}
          onChange={v => updateSetting('contentWidth', v)}
        />
      </SettingRow>

      <SettingRow label="Font size" description="Base font size for the preview">
        <SegmentedControl
          options={[
            { value: 13, label: 'S' },
            { value: 15, label: 'M' },
            { value: 17, label: 'L' },
            { value: 20, label: 'XL' },
          ]}
          value={settings.fontSize}
          onChange={v => updateSetting('fontSize', v)}
        />
      </SettingRow>
    </div>
  )
}

function BehaviorTab({ settings, updateSetting }) {
  return (
    <div className="settings-tab-content">
      <SettingRow label="Default annotation mode" description="Start in selection or pinpoint mode">
        <SegmentedControl
          options={[
            { value: 'select', label: 'Select' },
            { value: 'pinpoint', label: 'Pinpoint' },
          ]}
          value={settings.defaultMode}
          onChange={v => updateSetting('defaultMode', v)}
        />
      </SettingRow>

      <SettingRow label="Auto-close after submit" description="Automatically close the tab after feedback is submitted">
        <SegmentedControl
          options={[
            { value: 'off', label: 'Off' },
            { value: '0', label: 'Instant' },
            { value: '3', label: '3s' },
            { value: '5', label: '5s' },
          ]}
          value={settings.autoCloseDelay}
          onChange={v => updateSetting('autoCloseDelay', v)}
        />
      </SettingRow>

      <SettingRow label="Auto-save drafts" description="Save annotation progress to restore on reload">
        <Toggle
          checked={settings.autoSaveDrafts}
          onChange={v => updateSetting('autoSaveDrafts', v)}
          label="Auto-save drafts"
        />
      </SettingRow>
    </div>
  )
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const MOD = isMac ? '\u2318' : 'Ctrl'

const SHORTCUT_GROUPS = [
  {
    title: 'Annotations',
    items: [
      { keys: `${MOD} + Z`, desc: 'Undo' },
      { keys: `${MOD} + Shift + Z`, desc: 'Redo' },
      { keys: `${MOD} + D`, desc: 'Delete selected text' },
      { keys: `${MOD} + K`, desc: 'Comment on selected text' },
      { keys: `${MOD} + Enter`, desc: 'Submit comment' },
      { keys: 'Alt + Click', desc: 'Insert text at position' },
    ],
  },
  {
    title: 'Modes',
    items: [
      { keys: 'Hold Shift', desc: 'Temporarily toggle Select / Pinpoint' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { keys: 'Escape', desc: 'Close toolbar, popover, or modal' },
      { keys: 'Type any key', desc: 'Quick-start comment from toolbar' },
    ],
  },
]

function ShortcutsTab() {
  return (
    <div className="settings-tab-content">
      {SHORTCUT_GROUPS.map(group => (
        <div key={group.title} className="shortcuts-group">
          <h3 className="shortcuts-group-title">{group.title}</h3>
          <div className="shortcuts-list">
            {group.items.map(item => (
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

const TAB_COMPONENTS = {
  appearance: AppearanceTab,
  behavior: BehaviorTab,
  shortcuts: ShortcutsTab,
}

export function SettingsModal({ isOpen, onClose, settings, updateSetting, resetSettings }) {
  const [activeTab, setActiveTab] = useState('appearance')
  const dialogRef = useRef(null)
  const prevFocusedRef = useRef(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {onClose()}
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

  if (!isOpen) {return null}

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {onClose()}
  }

  const TabContent = TAB_COMPONENTS[activeTab]

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className="modal-header">
          <h2 id="settings-modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose} title="Close" aria-label="Close settings">
            <CloseIcon />
          </button>
        </div>

        <div className="settings-tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`settings-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-body settings-body" role="tabpanel">
          <TabContent settings={settings} updateSetting={updateSetting} />
        </div>

        <div className="modal-footer settings-footer">
          {activeTab !== 'shortcuts' && (
            <button className="btn settings-reset-btn" onClick={resetSettings} type="button">
              Reset to defaults
            </button>
          )}
          <button className="btn btn-primary" onClick={onClose} type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
