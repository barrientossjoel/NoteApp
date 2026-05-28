import { useState, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import { cn } from '../../../lib/utils/utils';

export function InteractiveSearchMockup() {
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<'all'|'text'|'canvas'|'books'>('all');
    const [landingSearchData, setLandingSearchData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/landing/search-data')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setLandingSearchData(data.data);
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const filtered = landingSearchData.filter(d => {
        if (filter === 'text' && d.type !== 'text') return false;
        if (filter === 'canvas' && d.type !== 'canvas') return false;
        if (filter === 'books' && d.type !== 'pdf' && d.type !== 'epub') return false;
        if (query && !d.title.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="relative rounded-none border border-white/10 bg-black/10 backdrop-blur-md shadow-2xl font-sans group overflow-hidden h-[350px] flex flex-col transition-transform duration-700 hover:scale-[1.02]">
            <div className="p-4 pb-0 z-10 relative">
                <div className="flex items-center px-4 h-[46px] rounded-lg border border-white/10 bg-black/20 text-[14px]">
                    <Search className="w-4 h-4 mr-3 text-muted-foreground" />
                    <input 
                        className="bg-transparent border-0 outline-none w-full text-white placeholder:text-muted-foreground/50"
                        placeholder="Search notes, tags, or commands... (⌘B)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                    <button onClick={() => setFilter('all')} className={cn("px-3 py-1 rounded-full text-[11px] whitespace-nowrap font-medium transition-colors", filter === 'all' ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5")}>Todos</button>
                    <button onClick={() => setFilter('text')} className={cn("px-3 py-1 rounded-full text-[11px] whitespace-nowrap font-medium transition-colors", filter === 'text' ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5")}>Documentos</button>
                    <button onClick={() => setFilter('canvas')} className={cn("px-3 py-1 rounded-full text-[11px] whitespace-nowrap font-medium transition-colors", filter === 'canvas' ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5")}>Canvas</button>
                    <button onClick={() => setFilter('books')} className={cn("px-3 py-1 rounded-full text-[11px] whitespace-nowrap font-medium transition-colors", filter === 'books' ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5")}>Libros (PDF/EPUB)</button>
                </div>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto no-scrollbar z-10 relative">
                <div>
                    <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">NOTES</div>
                    {isLoading ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">Loading...</div>
                    ) : (
                        filtered.map((d, i) => (
                            <div key={d.id} className="w-full flex items-start px-3 py-3 rounded-lg transition-colors border border-transparent group hover:bg-neutral-800/40 hover:border-white/5">
                                <div className="mt-0.5 mr-3 w-8 h-8 rounded shrink-0 flex items-center justify-center transition-colors bg-white/5 text-muted-foreground group-hover:bg-white/20 group-hover:text-white">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-[13px] text-neutral-200 group-hover:text-white transition-colors">{d.title}</span>
                                        <span className="text-[11px] shrink-0 ml-4 text-muted-foreground group-hover:text-white/70 transition-colors">{d.dateStr}</span>
                                    </div>
                                    <div className="text-[13px] truncate mt-0.5 text-muted-foreground/60 group-hover:text-white/60 transition-colors">{d.description}</div>
                                </div>
                            </div>
                        ))
                    )}
                    {!isLoading && filtered.length === 0 && (
                        <div className="text-center py-4 text-xs text-muted-foreground">No results found.</div>
                    )}
                </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
        </div>
    );
}
