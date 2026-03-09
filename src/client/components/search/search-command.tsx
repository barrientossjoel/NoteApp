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
        if (!query) return documents.slice(0, 10)
        return documents
            .filter((doc) =>
                (doc.title || t('untitledDocument')).toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 10)
    }, [query, documents, t])

    React.useEffect(() => {
        if (isOpen) {
            setQuery("")
            setSelectedIndex(0)
            // Small timeout to ensure input is rendered
            setTimeout(() => inputRef.current?.focus(), 10)
        }
    }, [isOpen])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedIndex((prev) => (prev + 1) % filteredDocuments.length)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedIndex((prev) =>
                prev === 0 ? filteredDocuments.length - 1 : prev - 1
            )
        } else if (e.key === "Enter") {
            e.preventDefault()
            const selected = filteredDocuments[selectedIndex]
            if (selected) {
                onSelect(selected.id, e.altKey)
                onOpenChange(false)
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-[#1e1e1e]/95 backdrop-blur-xl">
                <div className="flex items-center px-4 border-b border-white/10 h-14">
                    <Search className="w-5 h-5 mr-3 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        placeholder={t('searchCommandPlaceholder')}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setSelectedIndex(0)
                        }}
                        onKeyDown={handleKeyDown}
                        className="flex-1 h-full bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/50 text-base"
                    />
                </div>
                <ScrollArea className="max-h-[400px]">
                    <div className="p-2 space-y-1">
                        {filteredDocuments.length > 0 ? (
                            filteredDocuments.map((doc, index) => (
                                <button
                                    key={doc.id}
                                    onClick={() => {
                                        onSelect(doc.id)
                                        onOpenChange(false)
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={cn(
                                        "w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                        index === selectedIndex
                                            ? "bg-white/10 text-white"
                                            : "text-muted-foreground hover:bg-white/5"
                                    )}
                                >
                                    <FileText className="w-4 h-4 mr-3 opacity-60" />
                                    <span className="truncate flex-1">
                                        {doc.title || t('untitledDocument')}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="py-12 text-center text-muted-foreground">
                                {t('noResultsFound')}
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="flex items-center px-4 py-3 border-t border-white/5 bg-black/20">
                    <div className="flex items-center gap-4 ml-auto text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-medium">
                            <span>{t('openInPane')}</span>
                            <kbd className="h-5 px-1.5 flex items-center justify-center rounded border border-white/10 bg-white/5 text-[11px]">
                                Alt+↵
                            </kbd>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                            <span>{t('open')}</span>
                            <kbd className="h-5 px-1.5 flex items-center justify-center rounded border border-white/10 bg-white/5 text-[11px]">
                                ↵
                            </kbd>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
