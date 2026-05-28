import { useState } from 'react';
import { Layers, Cloud, Lock } from 'lucide-react';

export function InteractiveCanvasMockup() {
    const [nodes, setNodes] = useState([
        { id: 1, x: 32, y: 40 },
        { id: 2, x: 310, y: 112 },
        { id: 3, x: 340, y: 192 }
    ]);
    const [dragging, setDragging] = useState<number | null>(null);

    const handlePointerDown = (id: number, e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(id);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (dragging === null) return;
        setNodes(prev => prev.map(n =>
            n.id === dragging ? { ...n, x: n.x + e.movementX, y: n.y + e.movementY } : n
        ));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setDragging(null);
    };

    const p1 = `M ${nodes[0].x + 192} ${nodes[0].y + 45} C ${nodes[0].x + 248} ${nodes[0].y + 45}, ${nodes[1].x - 30} ${nodes[1].y + 20}, ${nodes[1].x} ${nodes[1].y + 20}`;
    const p2 = `M ${nodes[0].x + 192} ${nodes[0].y + 45} C ${nodes[0].x + 228} ${nodes[0].y + 45}, ${nodes[2].x - 80} ${nodes[2].y + 35}, ${nodes[2].x} ${nodes[2].y + 35}`;

    return (
        <div
            className="w-full h-full relative group-hover:scale-[1.02] transition-transform duration-700 select-none cursor-default"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                <path d={p1} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                <path d={p2} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />
            </svg>

            <div
                className="absolute w-48 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl font-sans text-sm z-10 cursor-grab active:cursor-grabbing"
                style={{ transform: `translate(${nodes[0].x}px, ${nodes[0].y}px)` }}
                onPointerDown={(e) => handlePointerDown(1, e)}
            >
                <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 bg-white/5 font-medium text-neutral-200">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Core Concept
                </div>
                <div className="p-3 text-neutral-400 text-xs">
                    NoteApp features a completely block-based canvas.
                </div>
                <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-400 rounded-full border border-[#1e1e1e]"></div>
            </div>

            <div
                className="absolute w-40 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl font-sans text-sm z-10 cursor-grab active:cursor-grabbing"
                style={{ transform: `translate(${nodes[1].x}px, ${nodes[1].y}px)` }}
                onPointerDown={(e) => handlePointerDown(2, e)}
            >
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white/50 rounded-full border border-[#1e1e1e]"></div>
                <div className="px-3 py-2 flex items-center gap-2 bg-white/5 font-medium text-neutral-200">
                    <Cloud className="w-3.5 h-3.5 text-sky-400" /> Synced Data
                </div>
            </div>

            <div
                className="absolute w-44 bg-[#1e1e1e] border border-[#8ab4f8]/30 rounded-lg shadow-[0_0_15px_rgba(138,180,248,0.1)] font-sans text-sm z-10 cursor-grab active:cursor-grabbing"
                style={{ transform: `translate(${nodes[2].x}px, ${nodes[2].y}px)` }}
                onPointerDown={(e) => handlePointerDown(3, e)}
            >
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-[#8ab4f8] rounded-full border border-[#1e1e1e]"></div>
                <div className="px-3 py-2 border-b border-[#8ab4f8]/20 flex items-center gap-2 bg-[#8ab4f8]/10 font-medium text-[#8ab4f8]">
                    <Lock className="w-3.5 h-3.5" /> E2E Encryption
                </div>
                <div className="p-3 text-neutral-300 text-xs">
                    Zero-knowledge payload wrapping.
                </div>
            </div>
        </div>
    );
}
