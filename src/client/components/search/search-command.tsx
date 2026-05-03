import * as React from "react"
import { Search, FileText } from "lucide-react"
import { Dialog, DialogContent } from "../ui/dialog"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"
import { cn } from "../../lib/utils/utils"
import type { Document } from "../../../core/types/notes"
import { useLanguage } from "../../context/LanguageContext"

interface SearchCommandProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    documents: Document[]
    onSelect: (documentId: string, inPane?: boolean) => void
}

function formatTimeAgo(dateInput?: string | Date | null) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function SearchCommand({
    isOpen,
    onOpenChange,
    documents,
    onSelect,
}: SearchCommandProps) {
    const { t } = useLanguage()
    const [query, setQuery] = React.useState("")
    const [selectedIndex, setSelectedIndex] = React.useState(0)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const filteredDocuments = React.useMemo(() => {
        if (!query) return documents.slice(0, 4)
        return documents
            .filter((doc) =>
                (doc.title || t('untitledDocument')).toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 4)
    }, [query, documents, t])

    const allTags = React.useMemo(() => {
        const tagSet = new Set<string>()
        documents.forEach(doc => {
            if (doc.tags) {
                try {
                    const parsed = JSON.parse(doc.tags);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(t => {
                            if (typeof t === 'string' && t.trim()) tagSet.add(t.trim())
                        })
                    } else {
                        throw new Error('Not an array');
                    }
                } catch (e) {
                    doc.tags.split(',').forEach(tag => {
                        const t = tag.trim().replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').trim();
                        if (t) tagSet.add(t);
                    })
                }
            }
        })
        if (tagSet.size === 0) {
            return ['#design', '#ux', '#roadmap', '#ux-ui']
        }
        return Array.from(tagSet).map(tag => tag.startsWith('#') ? tag : `#${tag}`).slice(0, 8)
    }, [documents])

    const commands = [
        { id: 'cmd-new', title: 'Create new note...' },
        { id: 'cmd-theme', title: 'Toggle dark mode' },
        { id: 'cmd-archive', title: 'Archive note...' }
    ]

    const filteredCommands = React.useMemo(() => {
        if (!query) return commands
        return commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
    }, [query])

    const totalItems = filteredDocuments.length + filteredCommands.length

    React.useEffect(() => {
        if (isOpen) {
            setQuery("")
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 10)
        }
    }, [isOpen])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (totalItems === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedIndex((prev) => (prev + 1) % totalItems)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedIndex((prev) =>
                prev === 0 ? totalItems - 1 : prev - 1
            )
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (selectedIndex < filteredDocuments.length) {
                const selected = filteredDocuments[selectedIndex]
                if (selected) {
                    onSelect(selected.id, e.altKey)
                    onOpenChange(false)
                }
            } else {
                const cmdIndex = selectedIndex - filteredDocuments.length;
                const selectedCmd = filteredCommands[cmdIndex];
                if (selectedCmd) {
                    // Command execution stub
                    onOpenChange(false)
                }
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[640px] p-0 overflow-hidden border border-white/10 shadow-2xl bg-[#1e1e1e]/60 backdrop-blur-3xl rounded-xl [&>button.absolute]:hidden">
                <div className="p-3 pb-0">
                    <div className="flex items-center px-4 h-[52px] rounded-lg border border-white/10 bg-black/20">
                        <Search className="w-5 h-5 mr-3 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            placeholder="Search notes, tags, or commands... (⌘B)"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value)
                                setSelectedIndex(0)
                            }}
                            onKeyDown={handleKeyDown}
                            className="flex-1 h-full bg-transparent border-0 focus:border-0 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none placeholder:text-muted-foreground/50 text-[15px]"
                        />
                    </div>
                </div>

                <ScrollArea className="max-h-[500px]">
                    <div className="p-3 space-y-6">
                        {/* NOTES SECTION */}
                        {filteredDocuments.length > 0 && (
                            <div>
                                <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">NOTES</div>
                                <div className="space-y-1">
                                    {filteredDocuments.map((doc, idx) => {
                                        const isSelected = selectedIndex === idx;
                                        return (
                                            <button
                                                key={doc.id}
                                                onClick={() => {
                                                    onSelect(doc.id)
                                                    onOpenChange(false)
                                                }}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                className={cn(
                                                    "w-full flex items-start px-3 py-3 rounded-lg text-sm transition-colors text-left group border border-transparent",
                                                    isSelected
                                                        ? "bg-[#2b3343]/80 border-white/5"
                                                        : "hover:bg-white/5"
                                                )}
                                            >
                                                <div className={cn("mt-0.5 mr-3 w-8 h-8 rounded shrink-0 flex items-center justify-center transition-colors", isSelected ? "bg-[#384b6b] text-[#8ab4f8]" : "bg-white/5 text-muted-foreground")}>
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex items-center justify-between">
                                                        <span className={cn("font-medium truncate transition-colors", isSelected ? "text-[#8ab4f8]" : "text-neutral-200")}>
                                                            {doc.title || t('untitledDocument')}
                                                        </span>
                                                        <span className={cn("text-xs shrink-0 ml-4 transition-colors", isSelected ? "text-[#8ab4f8]/70" : "text-muted-foreground")}>
                                                            {formatTimeAgo(doc.createdAt || doc.updatedAt)}
                                                        </span>
                                                    </div>
                                                    <div className={cn("text-[13px] truncate mt-0.5 transition-colors", isSelected ? "text-[#8ab4f8]/60" : "text-muted-foreground/60")}>
                                                        {doc.type === 'canvas' ? 'Canvas Workspace' : 
                                                         doc.type === 'pdf' ? 'PDF Document' : 
                                                         doc.content ? doc.content
                                                            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                                                            .replace(/[-*]\s+\[[ x]\]/gi, '')
                                                            .replace(/[#*`>_~-]/g, '')
                                                            .replace(/\s+/g, ' ')
                                                            .trim()
                                                            .substring(0, 80) + '...' : '...'}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAGS SECTION */}
                        {allTags.length > 0 && (
                            <div>
                                <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">TAGS</div>
                                <div className="px-3 flex flex-wrap gap-2">
                                    {allTags.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md text-[12px] text-muted-foreground hover:text-neutral-200 cursor-pointer transition-colors font-medium">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* COMMANDS SECTION */}
                        {filteredCommands.length > 0 && (
                            <div className="pb-2">
                                <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">COMMANDS</div>
                                <div className="space-y-1">
                                    {filteredCommands.map((cmd, idx) => {
                                        const globalIdx = filteredDocuments.length + idx;
                                        const isSelected = selectedIndex === globalIdx;
                                        return (
                                            <button
                                                key={cmd.id}
                                                onClick={() => {
                                                    onOpenChange(false)
                                                }}
                                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                className={cn(
                                                    "w-full flex items-center px-4 py-2.5 rounded-lg text-[14px] transition-colors text-left font-medium",
                                                    isSelected
                                                        ? "bg-white/10 text-white"
                                                        : "text-muted-foreground hover:bg-white/5 hover:text-neutral-300"
                                                )}
                                            >
                                                {cmd.title}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {totalItems === 0 && (
                            <div className="py-12 text-center text-muted-foreground">
                                {t('noResultsFound')}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
