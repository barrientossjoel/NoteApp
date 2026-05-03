import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils/utils'
import { Button } from '../../../components/ui/button'
import { FormulaEngine, getColumnLetter } from '../utils/formula-engine'
import { CanvasTableNodeProps } from '../types'

export function CanvasTableNode({ node, isEditing, draggedNodeId, updateNodeContent, setEditingId, handleNodeMouseDown }: CanvasTableNodeProps) {
    const parseMarkdown = (content: string) => {
        const lines = content.trim().split('\n').filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
        if (lines.length > 0) {
            return lines.filter((_, i) => i !== 1).map(line => line.split('|').slice(1, -1).map(c => c.trim()));
        }
        return [
            ['Column 1', 'Column 2', 'Column 3'],
            ['Cell 1', 'Cell 2', 'Cell 3'],
            ['Cell 4', 'Cell 5', 'Cell 6']
        ];
    }

    const [localRows, setLocalRows] = useState<string[][]>(() => parseMarkdown(node.content))
    const [focusedCell, setFocusedCell] = useState<{ r: number, c: number } | null>(null);

    const engine = useMemo(() => new FormulaEngine(), []);
    const evaluatedRows = useMemo(() => engine.evaluateGrid(localRows), [localRows, engine]);

    useEffect(() => {
        if (!isEditing) {
            setLocalRows(parseMarkdown(node.content))
        }
    }, [isEditing, node.content])

    const generateMarkdown = (newRows: string[][]) => {
        if (newRows.length === 0) return '';
        const header = '| ' + newRows[0].join(' | ') + ' |';
        const separator = '|' + newRows[0].map(() => '---').join('|') + '|';
        const body = newRows.slice(1).map(row => '| ' + row.join(' | ') + ' |').join('\n');
        return [header, separator, body].join('\n');
    };

    const updateCell = (r: number, c: number, val: string) => {
        const newRows = localRows.map((row, i) => i === r ? row.map((cell, j) => j === c ? val : cell) : row);
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    };

    const addRow = () => {
        const cols = localRows[0].length;
        const newRows = [...localRows, Array(cols).fill('')];
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    };

    const addCol = () => {
        const newRows = localRows.map(row => [...row, '']);
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    };

    const deleteRow = (r: number) => {
        if (localRows.length <= 1) return;
        const newRows = localRows.filter((_, i) => i !== r);
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    }

    const deleteCol = (c: number) => {
        if (localRows[0].length <= 1) return;
        const newRows = localRows.map(row => row.filter((_, j) => j !== c));
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    }

    const [tableContextMenu, setTableContextMenu] = useState<{ x: number, y: number, r?: number, c?: number } | null>(null);
    const tableRef = useRef<HTMLTableElement>(null);

    const handleContextMenu = (e: React.MouseEvent, r?: number, c?: number) => {
        e.preventDefault();
        e.stopPropagation();

        if (tableRef.current) {
            const rect = tableRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / (rect.width / tableRef.current.offsetWidth);
            const y = (e.clientY - rect.top) / (rect.height / tableRef.current.offsetHeight);
            setTableContextMenu({ x, y, r, c });
        } else {
            setTableContextMenu({ x: 0, y: 0, r, c });
        }
    };

    useEffect(() => {
        const handleClick = () => setTableContextMenu(null);
        if (tableContextMenu) document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [tableContextMenu]);

    if (isEditing) {
        return (
            <div
                className={cn(
                    "flex-1 overflow-visible bg-transparent p-1 pointer-events-auto",
                    "cursor-default"
                )}
                onMouseDown={(e) => {
                    e.stopPropagation()
                }}
                style={{ marginLeft: '-32px', marginTop: '-28px', width: 'calc(100% + 32px)' }}
            >
                <div className="relative w-full flex flex-col">
                    <table ref={tableRef} className="w-full border-collapse text-sm table-fixed relative">
                        <thead>
                            <tr>
                                <th className="border border-border/50 bg-muted/50 p-1 w-8" />
                                {localRows[0].map((_, j) => (
                                    <th
                                        key={j}
                                        className="border border-border/50 bg-muted/50 p-1 text-center font-medium text-xs text-muted-foreground w-full relative group/col select-none cursor-default"
                                        onContextMenu={(e) => handleContextMenu(e, undefined, j)}
                                    >
                                        <span>{getColumnLetter(j)}</span>
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                <th className="border border-border/50 bg-muted/50 p-1 text-center text-xs text-muted-foreground font-medium w-8 relative group">
                                    1
                                </th>
                                {localRows[0].map((col, j) => (
                                    <th key={j} className="border border-border/50 bg-background p-0 text-left font-medium text-foreground relative">
                                        <input
                                            className="w-full bg-transparent px-3 py-1.5 outline-none focus:bg-background/50 placeholder:text-muted-foreground/30 font-medium min-w-0 focus:ring-1 focus:ring-primary focus:z-10 relative cursor-text"
                                            value={focusedCell?.r === 0 && focusedCell?.c === j ? localRows[0][j] : evaluatedRows[0][j]}
                                            onChange={(e) => updateCell(0, j, e.target.value)}
                                            onFocus={() => setFocusedCell({ r: 0, c: j })}
                                            onBlur={() => setFocusedCell(null)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            placeholder="Header"
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {localRows.slice(1).map((row, i) => (
                                <tr key={i + 1} className="transition-colors focus-within:bg-muted/10">
                                    <td
                                        className="border border-border/50 bg-muted/50 p-1 text-center text-xs text-muted-foreground font-medium w-8 relative group/row select-none cursor-default"
                                        onContextMenu={(e) => handleContextMenu(e, i + 1)}
                                    >
                                        <span>{i + 2}</span>
                                    </td>
                                    {row.map((cell, j) => (
                                        <td
                                            key={j}
                                            className="border border-border/50 p-0 text-muted-foreground relative"
                                            onContextMenu={(e) => handleContextMenu(e, i + 1, j)}
                                        >
                                            <input
                                                className="w-full bg-transparent px-3 py-1.5 outline-none focus:bg-background/50 placeholder:text-muted-foreground/30 min-w-0 focus:ring-1 focus:ring-primary focus:z-10 relative cursor-text"
                                                value={focusedCell?.r === i + 1 && focusedCell?.c === j ? localRows[i + 1][j] : evaluatedRows[i + 1][j]}
                                                onChange={(e) => updateCell(i + 1, j, e.target.value)}
                                                onFocus={() => setFocusedCell({ r: i + 1, c: j })}
                                                onBlur={() => setFocusedCell(null)}
                                                onKeyDown={(e) => e.stopPropagation()}
                                                placeholder="Cell"
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="absolute -right-11 top-0 bottom-0 w-8 flex items-center justify-center pointer-events-none">
                        <Button
                            variant="ghost"
                            className="w-full h-full p-0 opacity-20 hover:opacity-100 shrink-0 border border-dashed border-border/50 rounded-sm hover:border-primary/50 text-muted-foreground hover:text-primary transition-opacity pointer-events-auto"
                            onClick={addCol}
                            title="Add Column"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {tableContextMenu && (
                    <div
                        className="absolute z-[100] min-w-[160px] overflow-hidden rounded-md border border-border/30 bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                        style={{ left: tableContextMenu.x, top: tableContextMenu.y }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {tableContextMenu.c !== undefined && localRows[0].length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteCol(tableContextMenu.c!); setTableContextMenu(null); }}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Column {getColumnLetter(tableContextMenu.c)}</span>
                            </button>
                        )}
                        {tableContextMenu.r !== undefined && localRows.length > 2 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteRow(tableContextMenu.r!); setTableContextMenu(null); }}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Row {tableContextMenu.r + 1}</span>
                            </button>
                        )}
                    </div>
                )}

                <div className="absolute -bottom-11 left-0 right-0 h-8 flex items-center justify-center pointer-events-none">
                    <Button
                        variant="ghost"
                        className="w-full h-full p-0 opacity-20 hover:opacity-100 shrink-0 border border-dashed border-border/50 rounded-sm hover:border-primary/50 text-muted-foreground hover:text-primary transition-opacity pointer-events-auto"
                        onClick={addRow}
                        title="Add Row"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div
            className={cn(
                "flex-1 overflow-auto bg-transparent p-1 pointer-events-auto",
                draggedNodeId === node.id ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={(e) => {
                e.stopPropagation()
                handleNodeMouseDown(e, node)
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingId(node.id);
            }}
        >
            <table className="w-full border-collapse text-sm table-fixed">
                <thead>
                    <tr>
                        {evaluatedRows[0].map((col, i) => (
                            <th key={i} className="border border-border/50 bg-muted/30 px-3 py-1.5 text-left font-medium text-foreground relative">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {evaluatedRows.slice(1).map((row, i) => (
                        <tr key={i} className="hover:bg-muted/10 transition-colors">
                            {row.map((cell, j) => (
                                <td key={j} className="border border-border/50 px-3 py-1.5 text-muted-foreground relative whitespace-pre-wrap word-break">
                                    {cell || '\u00A0'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
