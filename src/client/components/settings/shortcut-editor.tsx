'use client'

import React from 'react'
import { AlertTriangle, RotateCcw, Keyboard } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils/utils'
import {
    type ShortcutConfig,
    type ShortcutId,
    type ShortcutsMap,
    isBrowserReserved,
    DEFAULT_SHORTCUTS,
} from '../../context/KeyboardShortcutsContext'
import { useLanguage } from '../../context/LanguageContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatModifier(mod: string): string {
    switch (mod) {
        case 'ctrl':  return 'Ctrl'
        case 'alt':   return 'Alt'
        case 'shift': return 'Shift'
        case 'meta':  return '⌘'
        default:      return mod
    }
}

function formatKey(key: string): string {
    if (key === ' ') return 'Space'
    if (key.length === 1) return key.toUpperCase()
    // Capitalize first letter
    return key.charAt(0).toUpperCase() + key.slice(1)
}

function shortcutToString(config: ShortcutConfig): string {
    const mods = config.modifiers.map(formatModifier)
    const key = formatKey(config.key)
    return [...mods, key].join(' + ')
}

/** Returns the id of another shortcut that uses the same combo, or null */
function findConflict(
    id: ShortcutId,
    config: ShortcutConfig,
    shortcuts: ShortcutsMap,
): ShortcutId | null {
    const key = config.key.toLowerCase()
    const mods = JSON.stringify([...config.modifiers].sort())
    for (const [otherId, other] of Object.entries(shortcuts) as [ShortcutId, ShortcutConfig][]) {
        if (otherId === id) continue
        if (
            other.key.toLowerCase() === key &&
            JSON.stringify([...other.modifiers].sort()) === mods
        ) return otherId
    }
    return null
}

// ─── KeyBadges ────────────────────────────────────────────────────────────────

function KeyBadges({ config, dim = false }: { config: ShortcutConfig; dim?: boolean }) {
    const parts: string[] = [
        ...config.modifiers.map(formatModifier),
        formatKey(config.key),
    ]
    return (
        <div className="flex items-center gap-1 flex-wrap">
            {parts.map((part, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="text-muted-foreground/50 text-[10px] font-bold">+</span>}
                    <Badge
                        variant="secondary"
                        className={cn(
                            'h-6 px-2 font-mono text-[10px] border border-border shadow-sm tracking-wide',
                            dim && 'opacity-50',
                        )}
                    >
                        {part}
                    </Badge>
                </React.Fragment>
            ))}
        </div>
    )
}

// ─── Recording overlay ────────────────────────────────────────────────────────

interface RecordingOverlayProps {
    onCapture: (config: ShortcutConfig) => void
    onCancel: () => void
}

function RecordingOverlay({ onCapture, onCancel }: RecordingOverlayProps) {
    const { t } = useLanguage()
    const [pressed, setPressed] = React.useState<{ mods: string[]; key: string } | null>(null)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            e.preventDefault()
            e.stopPropagation()

            if (e.key === 'Escape') {
                onCancel()
                return
            }

            // Ignore lone modifier keys
            const MODIFIER_KEYS = ['Control', 'Alt', 'Shift', 'Meta']
            if (MODIFIER_KEYS.includes(e.key)) return

            const mods: ShortcutConfig['modifiers'] = []
            if (e.ctrlKey)  mods.push('ctrl')
            if (e.altKey)   mods.push('alt')
            if (e.shiftKey) mods.push('shift')
            if (e.metaKey)  mods.push('meta')

            setPressed({ mods, key: e.key.toLowerCase() })
            onCapture({ modifiers: mods, key: e.key.toLowerCase() })
        }

        window.addEventListener('keydown', down, true)
        return () => window.removeEventListener('keydown', down, true)
    }, [onCapture, onCancel])

    return (
        <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/40 animate-pulse">
                <Keyboard className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[12px] text-primary font-medium truncate">
                    {pressed
                        ? shortcutToString({ modifiers: pressed.mods as any, key: pressed.key })
                        : t('pressAnyKey')}
                </span>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[12px] shrink-0"
                onClick={onCancel}
            >
                {t('cancelEdit')}
            </Button>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ShortcutEditorRowProps {
    id: ShortcutId
    label: string
    config: ShortcutConfig
    shortcuts: ShortcutsMap
    onSave: (config: ShortcutConfig) => void
    onReset: () => void
}

export function ShortcutEditorRow({
    id,
    label,
    config,
    shortcuts,
    onSave,
    onReset,
}: ShortcutEditorRowProps) {
    const { t } = useLanguage()
    const [recording, setRecording] = React.useState(false)

    const conflict = findConflict(id, config, shortcuts)
    const browserConflict = isBrowserReserved(config)
    const isDefault = JSON.stringify(config) === JSON.stringify(DEFAULT_SHORTCUTS[id])

    const CONFLICT_LABELS: Record<ShortcutId, string> = {
        splitHorizontal: t('labelSplitHorizontal'),
        splitVertical:   t('labelSplitVertical'),
        closePane:       t('labelClosePaneShortcut'),
        globalSearch:    t('labelGlobalSearch'),
        canvasPan:       t('labelCanvasPan'),
        canvasDelete:    t('labelCanvasDelete'),
    }

    const handleCapture = React.useCallback(
        (captured: ShortcutConfig) => {
            onSave(captured)
            setRecording(false)
        },
        [onSave],
    )

    const handleCancelRecording = React.useCallback(() => {
        setRecording(false)
    }, [])

    return (
        <div className={cn(
            'flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-[clamp(0.6rem,1.5vw,0.875rem)] transition-colors rounded-md',
            recording && 'bg-primary/5',
        )}>
            {/* Label */}
            <span className="text-[clamp(13px,1.5vw,14px)] text-foreground/80 shrink-0">
                {label}
            </span>

            {/* Right side */}
            <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap justify-end">
                {recording ? (
                    <RecordingOverlay
                        onCapture={handleCapture}
                        onCancel={handleCancelRecording}
                    />
                ) : (
                    <>
                        {/* Shortcut display */}
                        <button
                            title={t('shortcutClickEdit')}
                            onClick={() => setRecording(true)}
                            className={cn(
                                'flex items-center gap-1.5 flex-wrap rounded-md px-2 py-1 cursor-pointer transition-colors border border-transparent',
                                'hover:border-border hover:bg-muted/50',
                                conflict && 'border-destructive/30 bg-destructive/5',
                            )}
                            aria-label={t('shortcutClickEdit')}
                        >
                            <KeyBadges config={config} />
                        </button>

                        {/* Browser conflict warning */}
                        {browserConflict && (
                            <div className="relative group shrink-0">
                                <AlertTriangle className="h-4 w-4 text-amber-500 cursor-help" />
                                {/* Tooltip */}
                                <div className={cn(
                                    'absolute z-[200] right-0 top-5 w-64 p-3 rounded-lg shadow-xl',
                                    'bg-popover border border-border text-[11px] leading-relaxed text-foreground/80',
                                    'pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                                )}>
                                    <p className="font-semibold text-amber-500 mb-1 flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5 inline" />
                                        {t('shortcutConflictTitle')}
                                    </p>
                                    <p>{t('shortcutBrowserConflict')}</p>
                                </div>
                            </div>
                        )}

                        {/* App-level conflict */}
                        {conflict && (
                            <div className="relative group shrink-0">
                                <AlertTriangle className="h-4 w-4 text-destructive cursor-help" />
                                <div className={cn(
                                    'absolute z-[200] right-0 top-5 w-56 p-3 rounded-lg shadow-xl',
                                    'bg-popover border border-border text-[11px] leading-relaxed text-foreground/80',
                                    'pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                                )}>
                                    <p className="font-semibold text-destructive mb-1">
                                        {t('shortcutAlreadyUsed')}
                                    </p>
                                    <p className="text-muted-foreground">{t('shortcutAlreadyUsedBy')} <span className="font-medium text-foreground">{CONFLICT_LABELS[conflict]}</span></p>
                                </div>
                            </div>
                        )}

                        {/* Reset button */}
                        {!isDefault && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                title={t('shortcutReset')}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onReset()
                                }}
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
