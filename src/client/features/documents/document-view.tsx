'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useAutoSave } from '../../hooks/useAutoSave'
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { ChevronLeft, Loader2, Eye, Pencil, Star, Tag, Columns, Rows, MoreVertical, Check, Plus, PanelLeft, PanelTop, MessageSquare } from 'lucide-react'
import type { Document } from '../../../core/types/notes'
import { cn } from '../../lib/utils/utils'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "../../components/ui/breadcrumb"
import { CommandMenu } from '../../components/editor/command-menu'
import { Badge } from '../../components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Editor, EditorRef } from '../../components/editor/editor'
import { NotesPanel } from '../notes/components/notes-panel'


interface DocumentViewProps {
    document: Document
    documents: Document[]
    onUpdateDocument: (doc: Document) => void
    onOpenDocument?: (docId: string) => void
    onClose?: () => void
    onSplit?: (direction: 'horizontal' | 'vertical') => void
    showSidebar?: boolean
    onToggleSidebar?: () => void
    showTabs?: boolean
    onToggleTabs?: () => void
    onReplaceDocument?: (docId: string) => void
    forwardPath?: string[]
    onNavigate?: (id: string) => void
}

export function DocumentView({
    document,
    documents,
    onUpdateDocument,
    onOpenDocument,
    onClose,
    onSplit,
    showSidebar,
    onToggleSidebar,
    showTabs,
    onToggleTabs,
    onReplaceDocument,
    forwardPath,
    onNavigate
}: DocumentViewProps) {
    // State for local changes (now just content, as title is derived)
    const [content, setContent] = useState(() => {
        const docTitle = document.title || 'Untitled'
        const docContent = document.content || ''
        if (!docContent.startsWith('# ')) {
            return `# ${docTitle}\n\n${docContent}`
        }
        return docContent
    })
    const [isEditing, setIsEditing] = useState(true)
    const [localShowNotes, setLocalShowNotes] = useState(false)
    const [tags, setTags] = useState<string[]>(tryParseTags(document.tags))
    const [tagInput, setTagInput] = useState('')
    const isMobile = useMediaQuery('(max-width: 768px)')

    // Command Menu State
    const [commandMenu, setCommandMenu] = useState<{
        isOpen: boolean
        type: 'slash' | 'mention'
        query: string
        position: { top: number; left: number }
        triggerIndex: number
    }>({
        isOpen: false,
        type: 'slash',
        query: '',
        position: { top: 0, left: 0 },
        triggerIndex: -1
    })

    const editorRef = useRef<EditorRef>(null)

    // Helper to parse tags
    function tryParseTags(tags: string | undefined | null): string[] {
        if (!tags) return [];
        try {
            const parsed = JSON.parse(tags);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return tags.split(',').filter(Boolean);
        }
    }

    // Auto-save hook
    // We'll extract the title from content for saving
    const currentTitle = useMemo(() => {
        const firstLine = content.split('\n')[0]
        if (firstLine.startsWith('# ')) {
            return firstLine.replace('# ', '').trim() || 'Untitled'
        }
        return 'Untitled'
    }, [content])

    const { isSaving, lastSaved } = useAutoSave(document.id, content, currentTitle);

    // Sync changes to parent state when auto-save completes
    useEffect(() => {
        if (lastSaved) {
            onUpdateDocument({
                ...document,
                title: currentTitle,
                content: content,
                updatedAt: new Date() // Optimistic update
            })
        }
    }, [lastSaved])


    // Sync state when document prop changes
    useEffect(() => {
        const docTitle = document.title || 'Untitled'
        const docContent = document.content || ''
        let newContent = docContent
        if (!docContent.startsWith('# ')) {
            newContent = `# ${docTitle}\n\n${docContent}`
        }
        setContent(newContent)
        setTags(tryParseTags(document.tags))
    }, [document.id])

    // Calculate breadcrumbs
    const breadcrumbs = useMemo(() => {
        const path: Document[] = [];
        let current: Document | undefined = document;
        while (current) {
            path.unshift(current);
            if (current.parentId) {
                current = documents.find(d => d.id === current?.parentId);
            } else {
                current = undefined;
            }
        }
        return path;
    }, [document, documents]);

    // Calculate breadcrumb items including forward path
    const breadcrumbItems = useMemo(() => {
        const items = breadcrumbs.map(doc => ({ ...doc, isForward: false }));

        if (forwardPath && forwardPath.length > 0) {
            // Find the documents for the forward path, filtering those already in parent path
            const parentIds = new Set(breadcrumbs.map(d => d.id));
            forwardPath.forEach(id => {
                if (!parentIds.has(id)) {
                    const doc = documents.find(d => d.id === id);
                    if (doc) {
                        items.push({ ...doc, isForward: true });
                    }
                }
            });
        }
        return items;
    }, [breadcrumbs, forwardPath, documents]);


    const toggleFavorite = () => {
        const newStatus = !document.isFavorite;
        onUpdateDocument({ ...document, isFavorite: newStatus });
        import('../../actions/actions').then(({ updateDocument: updateDocApi }) => {
            updateDocApi(document.id, { isFavorite: newStatus });
        });
    };

    const handleAddTag = () => {
        if (!tagInput.trim()) return;
        if (tags.includes(tagInput.trim())) {
            setTagInput('');
            return;
        }
        const newTags = [...tags, tagInput.trim()];
        setTags(newTags);
        setTagInput('');
        updateTags(newTags);
    }

    const removeTag = (tagToRemove: string) => {
        const newTags = tags.filter(t => t !== tagToRemove);
        setTags(newTags);
        updateTags(newTags);
    }

    const updateTags = (newTags: string[]) => {
        const tagsString = JSON.stringify(newTags);
        onUpdateDocument({ ...document, tags: tagsString });
        import('../../actions/actions').then(({ updateDocument: updateDocApi }) => {
            updateDocApi(document.id, { tags: tagsString });
        });
    }

    const handleCommandSelect = (value: string) => {
        if (!editorRef.current?.editor) return
        const editor = editorRef.current.editor

        // Calculate range to delete (trigger + query)
        const range = {
            from: commandMenu.triggerIndex,
            to: commandMenu.triggerIndex + 1 + (commandMenu.query?.length || 0)
        }

        // Apply command
        if (value === '# ') {
            editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
        } else if (value === '## ') {
            editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
        } else if (value === '### ') {
            editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
        } else if (value === '- ') {
            editor.chain().focus().deleteRange(range).toggleBulletList().run()
        } else if (value === '1. ') {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        } else if (value === '- [ ] ') {
            editor.chain().focus().deleteRange(range).toggleTaskList().run()
        } else if (value === '> ') {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run()
        } else if (value.startsWith('```')) {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
        } else if (value === 'image') {
            const url = window.prompt('Enter image URL')
            if (url) {
                editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
            } else {
                // Clean up the slash command if cancelled
                editor.chain().focus().deleteRange(range).run()
            }
        } else if (value === 'audio') {
            const url = window.prompt('Enter audio URL')
            if (url) {
                // @ts-ignore
                editor.chain().focus().deleteRange(range).insertContent({ type: 'audio', attrs: { src: url } }).run()
            } else {
                editor.chain().focus().deleteRange(range).run()
            }
        } else {
            // Mentions or links
            editor.chain().focus().deleteRange(range).insertContent(value).run()
        }

        setCommandMenu(prev => ({ ...prev, isOpen: false }))
    }



    return (
        <div className="flex flex-col h-full bg-muted/50 animate-in fade-in duration-300">
            {/* Header / Toolbar */}
            <div className="h-16 flex items-center justify-between px-4 bg-transparent sticky top-0 z-10">
                <div className="flex items-center gap-2">

                    {onToggleSidebar && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleSidebar}
                            title={showSidebar ? "Close Sidebar" : "Open Sidebar"}
                            className="bg-transparent"
                        >
                            <PanelLeft className="h-4 w-4" />
                        </Button>
                    )}

                    {!isMobile && (
                        <Breadcrumb>
                            <BreadcrumbList>
                                {breadcrumbItems.map((item, index) => {
                                    const isCurrent = item.id === document.id;
                                    const isLast = index === breadcrumbItems.length - 1;

                                    return (
                                        <div key={item.id} className="flex items-center">
                                            <BreadcrumbItem>
                                                {isCurrent ? (
                                                    <BreadcrumbPage className="font-bold">{item.title || "Untitled"}</BreadcrumbPage>
                                                ) : (
                                                    <BreadcrumbLink
                                                        className={cn(
                                                            "cursor-pointer hover:text-foreground transition-colors",
                                                            item.isForward ? "text-muted-foreground/40 italic" : "text-muted-foreground"
                                                        )}
                                                        onClick={() => {
                                                            if (item.isForward || index < breadcrumbs.length - 1) {
                                                                onReplaceDocument?.(item.id);
                                                            }
                                                        }}
                                                    >
                                                        {item.title || "Untitled"}
                                                    </BreadcrumbLink>
                                                )}
                                            </BreadcrumbItem>
                                            {!isLast && <BreadcrumbSeparator />}
                                        </div>
                                    );
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    )}
                </div>

                {isMobile && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center max-w-[50%] pointer-events-none">
                        <span className="text-sm font-bold truncate pointer-events-auto">
                            {document.title || "Untitled"}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-1">
                    {!isMobile && (
                        <>
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 transition-opacity duration-300 min-w-[100px] justify-end mr-2">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Saving...
                                    </>
                                ) : lastSaved ? (
                                    `Saved`
                                ) : (
                                    `All changes saved`
                                )}
                            </span>

                            <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)} title={isEditing ? "View Mode" : "Edit Mode"}>
                                {isEditing ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                            </Button>

                            {onToggleTabs && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onToggleTabs}
                                    title={showTabs ? "Hide Tabs" : "Show Tabs"}
                                    className={cn(!showTabs && "text-muted-foreground/50")}
                                >
                                    <PanelTop className="h-4 w-4" />
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLocalShowNotes(!localShowNotes)}
                                title={localShowNotes ? "Close Notes" : "Open Notes"}
                                className={cn(localShowNotes && "bg-accent text-accent-foreground")}
                            >
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                        </>
                    )}


                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <div className="p-2">
                                {isMobile && (
                                    <>
                                        <div className="flex items-center justify-between px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer" onClick={() => setIsEditing(!isEditing)}>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? <Eye className="h-4 w-4 text-muted-foreground" /> : <Pencil className="h-4 w-4 text-muted-foreground" />}
                                                <span>{isEditing ? "View Mode" : "Edit Mode"}</span>
                                            </div>
                                        </div>
                                        {onToggleTabs && (
                                            <div className="flex items-center justify-between px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer" onClick={onToggleTabs}>
                                                <div className="flex items-center gap-2">
                                                    <PanelTop className="h-4 w-4 text-muted-foreground" />
                                                    <span>{showTabs ? "Hide Tabs" : "Show Tabs"}</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer" onClick={() => setLocalShowNotes(!localShowNotes)}>
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                <span>{localShowNotes ? "Close Notes" : "Open Notes"}</span>
                                            </div>
                                        </div>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <div className="flex items-center justify-between px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer" onClick={toggleFavorite}>
                                    <div className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-muted-foreground" />
                                        <span>Favorite</span>
                                    </div>
                                    {document.isFavorite && <Check className="h-4 w-4 ml-auto" />}
                                </div>



                                {onSplit && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onSplit('horizontal')}>
                                            <Columns className="h-4 w-4 mr-2" />
                                            <span>Split Right</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onSplit('vertical')}>
                                            <Rows className="h-4 w-4 mr-2" />
                                            <span>Split Down</span>
                                        </DropdownMenuItem>
                                    </>
                                )}

                                <DropdownMenuSeparator />
                                <div className="px-2 py-1.5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4" />
                                        <span className="text-sm font-medium">Tags</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-destructive/10 text-[10px] px-1 py-0" onClick={(e) => {
                                                e.stopPropagation();
                                                removeTag(tag);
                                            }}>
                                                {tag} &times;
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex gap-1">
                                        <Input
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            placeholder="Add tag..."
                                            className="h-7 text-xs bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleAddTag();
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleAddTag();
                                        }}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Tags Display */}
            {tags.length > 0 && (
                <div className="px-4 lg:px-8 pt-4 pb-0 max-w-3xl mx-auto w-full">
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs text-muted-foreground border-transparent bg-secondary/50">
                                #{tag}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Content Area and Notes Panel */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 overflow-auto relative">
                    <div className="max-w-3xl mx-auto py-8 px-4 lg:px-8 min-h-full pb-[50vh]">
                        <div className="space-y-6">
                            {/* Title input removed */}
                            <Editor
                                ref={editorRef}
                                content={content}
                                onChange={setContent}
                                editable={isEditing}
                                onCommandTrigger={(position, query, triggerIndex, type) => {
                                    setCommandMenu({ isOpen: true, position, query, triggerIndex, type })
                                }}
                                onCommandUpdate={(query) => {
                                    setCommandMenu(prev => ({ ...prev, query }))
                                }}
                                onCommandClose={() => {
                                    setCommandMenu(prev => ({ ...prev, isOpen: false }))
                                }}
                                onKeyDown={(e) => {
                                    if (commandMenu.isOpen && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Escape')) {
                                        return true // Prevent Tiptap from handling these keys
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <CommandMenu
                        isOpen={commandMenu.isOpen}
                        position={commandMenu.position}
                        query={commandMenu.query}
                        type={commandMenu.type}
                        documents={documents}
                        onSelect={handleCommandSelect}
                        onClose={() => setCommandMenu(prev => ({ ...prev, isOpen: false }))}
                    />
                </div>

                {/* Local Notes Panel */}
                {localShowNotes && (
                    <div className="w-[300px] border-l border-border/50 bg-background shrink-0 flex flex-col animate-in slide-in-from-right duration-300">
                        <NotesPanel
                            documentId={document.id}
                            title={document.title}
                            documents={documents}
                            onNavigate={onOpenDocument}
                            className="h-full border-l-0"
                            onClose={() => setLocalShowNotes(false)}
                        />
                    </div>
                )}
            </div>


        </div>
    )
}
