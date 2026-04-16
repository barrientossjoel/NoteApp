import React from 'react';
import { Settings, RotateCcw, X, Plus, Filter, Monitor, Zap, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { GraphSettings, DEFAULT_GRAPH_SETTINGS } from './graph-types';
import { cn } from '../../lib/utils/utils';

interface GraphSettingsPanelProps {
    settings: GraphSettings;
    onChange: (settings: GraphSettings) => void;
    onClose: () => void;
}

export function GraphSettingsPanel({ settings, onChange, onClose }: GraphSettingsPanelProps) {
    const handleReset = () => {
        onChange(DEFAULT_GRAPH_SETTINGS);
    };

    const updateFilter = (key: keyof GraphSettings['filters'], value: any) => {
        onChange({
            ...settings,
            filters: { ...settings.filters, [key]: value }
        });
    };

    const updateDisplay = (key: keyof GraphSettings['display'], value: any) => {
        onChange({
            ...settings,
            display: { ...settings.display, [key]: value }
        });
    };

    const updateForce = (key: keyof GraphSettings['forces'], value: any) => {
        onChange({
            ...settings,
            forces: { ...settings.forces, [key]: value }
        });
    };

    const addGroup = () => {
        const newGroup = {
            id: Math.random().toString(36).substring(7),
            query: '',
            color: '#3b82f6',
            label: 'New Group'
        };
        onChange({
            ...settings,
            groups: [...settings.groups, newGroup]
        });
    };

    const updateGroup = (id: string, updates: Partial<GraphSettings['groups'][0]>) => {
        onChange({
            ...settings,
            groups: settings.groups.map(g => g.id === id ? { ...g, ...updates } : g)
        });
    };

    const removeGroup = (id: string) => {
        onChange({
            ...settings,
            groups: settings.groups.filter(g => g.id !== id)
        });
    };

    return (
        <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-2rem)] bg-background/95 backdrop-blur-md border border-border/50 rounded-lg shadow-2xl flex flex-col z-[100] animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between p-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm uppercase tracking-wider">Graph Settings</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Restore default settings">
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4">
                    <Tabs defaultValue="filters" className="w-full">
                        <TabsList className="w-full mb-4 grid grid-cols-3">
                            <TabsTrigger value="filters" className="text-xs">
                                <Filter className="h-3.5 w-3.5 mr-2" />
                                Filters
                            </TabsTrigger>
                            <TabsTrigger value="display" className="text-xs">
                                <Monitor className="h-3.5 w-3.5 mr-2" />
                                Display
                            </TabsTrigger>
                            <TabsTrigger value="forces" className="text-xs">
                                <Zap className="h-3.5 w-3.5 mr-2" />
                                Forces
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="filters" className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Search files</label>
                                <input
                                    type="text"
                                    className="w-full h-8 px-2 bg-muted/50 border border-border/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Search..."
                                    value={settings.filters.search}
                                    onChange={(e) => updateFilter('search', e.target.value)}
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <ToggleItem
                                    label="Tags"
                                    checked={settings.filters.showTags}
                                    onCheckedChange={(v) => updateFilter('showTags', v)}
                                />
                                <ToggleItem
                                    label="Attachments"
                                    checked={settings.filters.showAttachments}
                                    onCheckedChange={(v) => updateFilter('showAttachments', v)}
                                />
                                <ToggleItem
                                    label="Existing files only"
                                    checked={settings.filters.showExistingOnly}
                                    onCheckedChange={(v) => updateFilter('showExistingOnly', v)}
                                />
                                <ToggleItem
                                    label="Orphans"
                                    checked={settings.filters.showOrphans}
                                    onCheckedChange={(v) => updateFilter('showOrphans', v)}
                                />
                            </div>

                            <div className="pt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Groups</h3>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addGroup}>
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {settings.groups.map((group) => (
                                        <div key={group.id} className="p-2 border border-border/50 rounded-md bg-muted/20 space-y-2 relative group-item">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    className="w-4 h-4 rounded-full border-none p-0 bg-transparent cursor-pointer"
                                                    value={group.color}
                                                    onChange={(e) => updateGroup(group.id, { color: e.target.value })}
                                                />
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-transparent border-none text-[10px] font-medium focus:ring-0 p-0"
                                                    value={group.query}
                                                    onChange={(e) => updateGroup(group.id, { query: e.target.value })}
                                                    placeholder="Search query..."
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 opacity-0 group-[.group-item]:hover:opacity-100 transition-opacity"
                                                    onClick={() => removeGroup(group.id)}
                                                >
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {settings.groups.length === 0 && (
                                        <p className="text-[10px] text-muted-foreground italic">Add groups to color nodes by search query.</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="display" className="space-y-4">
                            <ToggleItem
                                label="Arrows"
                                checked={settings.display.showArrows}
                                onCheckedChange={(v) => updateDisplay('showArrows', v)}
                            />
                            <ToggleItem
                                label="Show labels on hover"
                                checked={settings.display.showLabels}
                                onCheckedChange={(v) => updateDisplay('showLabels', v)}
                            />
                            <ToggleItem
                                label="Show labels always"
                                checked={settings.display.showLabelsAlways}
                                onCheckedChange={(v) => updateDisplay('showLabelsAlways', v)}
                            />

                            <SliderItem
                                label="Node size"
                                value={settings.display.nodeSize}
                                min={0.5} max={5} step={0.1}
                                onChange={(v) => updateDisplay('nodeSize', v)}
                            />
                            <SliderItem
                                label="Link thickness"
                                value={settings.display.linkThickness}
                                min={0.5} max={5} step={0.1}
                                onChange={(v) => updateDisplay('linkThickness', v)}
                            />
                        </TabsContent>

                        <TabsContent value="forces" className="space-y-4">
                            <SliderItem
                                label="Center force"
                                value={settings.forces.centerForce}
                                min={0} max={1} step={0.01}
                                onChange={(v) => updateForce('centerForce', v)}
                            />
                            <SliderItem
                                label="Repel force"
                                value={settings.forces.repelForce}
                                min={0} max={100} step={1}
                                onChange={(v) => updateForce('repelForce', v)}
                            />
                            <SliderItem
                                label="Link force"
                                value={settings.forces.linkForce}
                                min={0} max={2} step={0.1}
                                onChange={(v) => updateForce('linkForce', v)}
                            />
                            <SliderItem
                                label="Link distance"
                                value={settings.forces.linkDistance}
                                min={10} max={200} step={1}
                                onChange={(v) => updateForce('linkDistance', v)}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </ScrollArea>
        </div>
    );
}

function ToggleItem({ label, checked, onCheckedChange }: { label: string, checked: boolean, onCheckedChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between cursor-pointer group" onClick={() => onCheckedChange(!checked)}>
            <span className="text-xs text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
            <div className={cn(
                "w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out",
                checked ? "bg-primary" : "bg-muted"
            )}>
                <div className={cn(
                    "w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm",
                    checked ? "translate-x-4" : "translate-x-0"
                )} />
            </div>
        </div>
    );
}

function SliderItem({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/80">{label}</span>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted/30 px-1 rounded">{value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
            />
        </div>
    );
}
