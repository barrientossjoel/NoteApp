import { useState } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '../../../lib/utils/utils';

const landingMarkdownData = {
    'architecture.md': {
        title: '# System Architecture',
        desc: 'The key to <span class="text-orange-300 font-bold">scalability</span> is modularity.',
        code: '<span class="text-pink-400">import</span> { createClient } <span class="text-pink-400">from</span> <span class="text-green-300">"@libsql/client"</span>;<br/><br/><span class="text-pink-400">const</span> db = createClient({<br/>&nbsp;&nbsp;url: process.env.TURSO_URL<br/>});',
        tasks: [{ id: 1, text: 'Design DB schema', done: true }, { id: 2, text: 'Setup Drizzle', done: true }, { id: 3, text: 'Write queries', done: false }]
    },
    'roadmap.md': {
        title: '# Q3 Roadmap',
        desc: 'Focusing on <span class="text-orange-300 font-bold">collaboration</span> and performance.',
        code: '<span class="text-pink-400">function</span> prioritize() {<br/>&nbsp;&nbsp;<span class="text-pink-400">return</span> <span class="text-green-300">"user experience"</span>;<br/>}',
        tasks: [{ id: 1, text: 'Real-time sync', done: true }, { id: 2, text: 'Offline mode', done: false }]
    },
    'ideas.md': {
        title: '# Thought Process',
        desc: 'The key to <span class="text-orange-300 font-bold">productivity</span> isn\'t finding more time, but using time with <span class="italic text-emerald-300">clarity</span>.',
        code: '<span class="text-pink-400">function</span> <span class="text-yellow-200">think</span>() {<br/>&nbsp;&nbsp;<span class="text-pink-400">return</span> <span class="text-green-300">"clarity"</span>;<br/>}',
        tasks: [{ id: 1, text: 'Capture tasks instantly', done: true }, { id: 2, text: 'Forget ideas', done: false }]
    }
};

export function InteractiveMarkdownMockup() {
    const [activeTab, setActiveTab] = useState<'architecture.md' | 'roadmap.md' | 'ideas.md'>('ideas.md');
    const [docStates, setDocStates] = useState(landingMarkdownData);

    const toggleTask = (docId: string, taskId: number) => {
        setDocStates(prev => ({
            ...prev,
            [docId]: {
                ...prev[docId as keyof typeof landingMarkdownData],
                tasks: prev[docId as keyof typeof landingMarkdownData].tasks.map((t: {id: number, text: string, done: boolean}) => t.id === taskId ? { ...t, done: !t.done } : t)
            }
        }));
    };

    const doc = docStates[activeTab];

    return (
        <div className="w-full h-full flex p-6 gap-6 font-mono text-sm group-hover:scale-[1.02] transition-transform duration-700">
            <div className="w-1/3 hidden sm:flex flex-col gap-3 opacity-60 border-r border-white/10 pr-6 pt-2 z-10 relative">
                <button onClick={() => setActiveTab('architecture.md')} className={cn("flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full text-left", activeTab === 'architecture.md' ? "text-white bg-white/10" : "text-neutral-400 hover:bg-white/5 hover:text-neutral-300")}><FileText className="w-4 h-4 shrink-0" /> <span className="truncate">architecture.md</span></button>
                <button onClick={() => setActiveTab('roadmap.md')} className={cn("flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full text-left", activeTab === 'roadmap.md' ? "text-white bg-white/10" : "text-neutral-400 hover:bg-white/5 hover:text-neutral-300")}><FileText className="w-4 h-4 shrink-0" /> <span className="truncate">roadmap.md</span></button>
                <button onClick={() => setActiveTab('ideas.md')} className={cn("flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full text-left", activeTab === 'ideas.md' ? "text-white bg-white/10" : "text-neutral-400 hover:bg-white/5 hover:text-neutral-300")}><FileText className="w-4 h-4 shrink-0" /> <span className="truncate">ideas.md</span></button>
            </div>
            <div className="flex-1 min-w-0 pt-2 outline-none cursor-text flex flex-col gap-4 overflow-y-auto no-scrollbar z-10 relative" contentEditable suppressContentEditableWarning>
                <div className="text-blue-400 text-xl font-bold">{doc.title}</div>
                <div className="text-neutral-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: doc.desc }} />
                
                <div className="bg-black/40 border border-white/5 p-4 rounded-lg text-neutral-400 font-mono whitespace-pre outline-none overflow-x-auto no-scrollbar" contentEditable suppressContentEditableWarning>
                    <span dangerouslySetInnerHTML={{ __html: doc.code }} />
                </div>

                <div className="flex flex-col gap-2 mt-2" contentEditable={false}>
                    {doc.tasks.map((t: {id: number, text: string, done: boolean}) => (
                        <div key={t.id} className={cn("flex items-center gap-3 cursor-pointer group", t.done ? "text-neutral-600 line-through" : "text-neutral-300")} onClick={() => toggleTask(activeTab, t.id)}>
                            <div className={cn("w-4 h-4 border rounded flex items-center justify-center transition-colors", t.done ? "border-white/10" : "border-white/30 group-hover:border-white/50")}>
                                {t.done && <div className="w-2 h-2 bg-emerald-400 rounded-sm"></div>}
                            </div>
                            <span>{t.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
