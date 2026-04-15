import { useState, useEffect } from 'react'

export const useThemeColors = () => {
    const [colors, setColors] = useState({
        primary: '#3b82f6',
        destructive: '#ef4444',
        accent: '#eab308',
        muted: '#94a3b8',
        border: '#cbd5e1'
    })

    useEffect(() => {
        const updateColors = () => {
            const style = getComputedStyle(document.documentElement)
            const getCol = (name: string, fallback: string) => {
                const val = style.getPropertyValue(name).trim()
                if (!val) return fallback
                return `hsl(${val.replace(/ /g, ', ')})`
            }

            setColors(prev => {
                const newPrimary = getCol('--primary', '#3b82f6');
                const newDestructive = getCol('--destructive', '#ef4444');
                const newAccent = getCol('--accent', '#eab308');
                const newMuted = getCol('--muted-foreground', '#94a3b8');
                const newBorder = getCol('--border', '#cbd5e1');

                if (
                    prev.primary === newPrimary &&
                    prev.destructive === newDestructive &&
                    prev.accent === newAccent &&
                    prev.muted === newMuted &&
                    prev.border === newBorder
                ) {
                    return prev;
                }

                return {
                    primary: newPrimary,
                    destructive: newDestructive,
                    accent: newAccent,
                    muted: newMuted,
                    border: newBorder
                };
            })
        }

        updateColors()
        setTimeout(updateColors, 50)

        const observer = new MutationObserver(() => updateColors())
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => observer.disconnect()
    }, [])

    return colors
}
