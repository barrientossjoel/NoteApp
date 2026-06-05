import { CanvasNode, Camera } from '../types'

// ─── General ─────────────────────────────────────────────────────────────────

/** Collision-safe ID generator. Prefer crypto.randomUUID() where available. */
export const generateId = (): string =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9);

/** Convert a DOM mouse/touch event coordinate to canvas-space. */
export const toCanvasCoords = (
    clientX: number, clientY: number,
    rect: DOMRect, camera: Camera
): { x: number; y: number } => ({
    x: (clientX - rect.left - camera.x) / camera.zoom,
    y: (clientY - rect.top  - camera.y) / camera.zoom,
});

// ─── Arrow geometry ──────────────────────────────────────────────────────────

/** Returns the world-space attachment point on a node's named side. */
export const sideToPoint = (
    node: CanvasNode, side: string
): { x: number; y: number } => {
    const w = node.width  || 0;
    const h = node.height || 0;
    return {
        x: node.x + (side === 'left' ? 0 : side === 'right' ? w : w / 2),
        y: node.y + (side === 'top'  ? 0 : side === 'bottom' ? h : h / 2),
    };
};

/** Derives a cardinal side string from a node-relative offset vector. */
export const offsetToSide = (
    offset?: { x: number; y: number } | null
): string | null => {
    if (!offset) return null;
    if (Math.abs(offset.x) > Math.abs(offset.y)) return offset.x > 0 ? 'right' : 'left';
    return offset.y > 0 ? 'bottom' : 'top';
};

type ArrowPoints = {
    start: { x: number; y: number };
    end:   { x: number; y: number };
    control?:  { x: number; y: number };
    control2?: { x: number; y: number };
};

/** Computes the bounding-box (x, y, width, height) for a set of arrow points. */
export const arrowBounds = (pts: ArrowPoints) => {
    const xs = [pts.start.x, pts.end.x, pts.control?.x ?? pts.start.x, pts.control2?.x ?? pts.end.x];
    const ys = [pts.start.y, pts.end.y, pts.control?.y ?? pts.start.y, pts.control2?.y ?? pts.end.y];
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
};



export const isPointInNode = (x: number, y: number, node: CanvasNode) => {
    return x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height;
}

export const isPathIntersectingNode = (start: { x: number, y: number }, end: { x: number, y: number }, cp1: { x: number, y: number }, cp2: { x: number, y: number }, node: CanvasNode) => {
    // Broad phase: Bounding box check
    const minX = Math.min(start.x, end.x, cp1.x, cp2.x);
    const maxX = Math.max(start.x, end.x, cp1.x, cp2.x);
    const minY = Math.min(start.y, end.y, cp1.y, cp2.y);
    const maxY = Math.max(start.y, end.y, cp1.y, cp2.y);

    if (maxX < node.x || minX > node.x + (node.width || 0) || maxY < node.y || minY > node.y + (node.height || 0)) {
        return false;
    }

    // Narrow phase: Sampling
    const steps = 10;
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * cp1.x + 3 * (1 - t) * Math.pow(t, 2) * cp2.x + Math.pow(t, 3) * end.x;
        const y = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * cp1.y + 3 * (1 - t) * Math.pow(t, 2) * cp2.y + Math.pow(t, 3) * end.y;

        // Padding of 5px to avoid grazing edges
        if (x > node.x + 5 && x < node.x + (node.width || 0) - 5 && y > node.y + 5 && y < node.y + (node.height || 0) - 5) {
            return true;
        }
    }
    return false;
}

export const calculateBezierControls = (start: { x: number, y: number }, end: { x: number, y: number }, startSide?: string | null, endSide?: string | null) => {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const offset = Math.min(dist * 0.5, 100)

    let cp1 = { x: start.x + dx * 0.25, y: start.y + dy * 0.25 }
    let cp2 = { x: start.x + dx * 0.75, y: start.y + dy * 0.75 }

    // Default heuristic if sides are unknown
    if (!startSide && !endSide) {
        if (Math.abs(dx) > Math.abs(dy)) {
            cp1 = { x: start.x + dx * 0.5, y: start.y }
            cp2 = { x: end.x - dx * 0.5, y: end.y }
        } else {
            cp1 = { x: start.x, y: start.y + dy * 0.5 }
            cp2 = { x: end.x, y: end.y - dy * 0.5 }
        }
    }

    if (startSide === 'right') cp1 = { x: start.x + offset, y: start.y }
    if (startSide === 'left') cp1 = { x: start.x - offset, y: start.y }
    if (startSide === 'top') cp1 = { x: start.x, y: start.y - offset }
    if (startSide === 'bottom') cp1 = { x: start.x, y: start.y + offset }

    if (endSide === 'right') cp2 = { x: end.x + offset, y: end.y }
    if (endSide === 'left') cp2 = { x: end.x - offset, y: end.y }
    if (endSide === 'top') cp2 = { x: end.x, y: end.y - offset }
    if (endSide === 'bottom') cp2 = { x: end.x, y: end.y + offset }

    // If only one side is known, make the other follow a logical flow
    if (startSide && !endSide) {
        if (startSide === 'left' || startSide === 'right') {
            cp2 = { x: end.x - (startSide === 'right' ? offset : -offset), y: end.y }
        } else {
            cp2 = { x: end.x, y: end.y - (startSide === 'bottom' ? offset : -offset) }
        }
    }

    return { cp1, cp2 }
}

export const getArrowMidpoint = (node: CanvasNode) => {
    if (!node.points) return { x: 0, y: 0 }
    const { start, end, control, control2 } = node.points
    const sx = start.x - node.x
    const sy = start.y - node.y
    const ex = end.x - node.x
    const ey = end.y - node.y

    // If we have Cubic Bezier (both control points)
    if (control && control2) {
        const c1x = control.x - node.x
        const c1y = control.y - node.y
        const c2x = control2.x - node.x
        const c2y = control2.y - node.y
        const t = 0.5
        // B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
        const x = Math.pow(1 - t, 3) * sx + 3 * Math.pow(1 - t, 2) * t * c1x + 3 * (1 - t) * Math.pow(t, 2) * c2x + Math.pow(t, 3) * ex
        const y = Math.pow(1 - t, 3) * sy + 3 * Math.pow(1 - t, 2) * t * c1y + 3 * (1 - t) * Math.pow(t, 2) * c2y + Math.pow(t, 3) * ey
        return { x, y }
    } else if (control) {
        // Fallback for Quadratic
        const cx = control.x - node.x
        const cy = control.y - node.y
        const t = 0.5
        const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex
        const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey
        return { x, y }
    } else {
        return { x: (sx + ex) / 2, y: (sy + ey) / 2 }
    }
}

export const getBestDynamicEnd = (startPos: { x: number, y: number }, startSide: string | undefined, endNode: CanvasNode, allNodes: CanvasNode[]) => {
    const sides = ['top', 'bottom', 'left', 'right'];
    let bestCombo = { endSide: 'left', score: Infinity };

    for (const s2 of sides) {
        const endPos = {
            x: endNode.x + (s2 === 'left' ? 0 : s2 === 'right' ? endNode.width : endNode.width / 2),
            y: endNode.y + (s2 === 'top' ? 0 : s2 === 'bottom' ? endNode.height : endNode.height / 2)
        };

        const { cp1, cp2 } = calculateBezierControls(startPos, endPos, startSide, s2);

        let intersections = 0;
        if (isPathIntersectingNode(startPos, endPos, cp1, cp2, endNode)) intersections += 10;

        for (const node of allNodes) {
            if (node.id === endNode.id || node.type === 'arrow') continue;
            if (isPathIntersectingNode(startPos, endPos, cp1, cp2, node)) intersections += 20;
        }

        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const score = dist + intersections * 1000;

        if (score < bestCombo.score) {
            bestCombo = { endSide: s2, score };
        }
    }
    return bestCombo;
}

/** Shortens the endpoint of a segment by `pad` pixels toward the direction of travel.
 * Used to hide the stroke cleanly behind the arrowhead marker. */
export const shortenLineEnd = (
    x1: number, y1: number, x2: number, y2: number, pad: number
): { x: number; y: number } => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: x2, y: y2 };
    return { x: x2 - (dx / len) * pad, y: y2 - (dy / len) * pad };
};

/** Pixels to pull back the visible stroke so it hides cleanly behind the arrowhead. */
export const ARROW_STROKE_PAD = 6;

interface ArrowPathResult {
    /** Full-length path for the transparent wide hit-area stroke. */
    hitPath: string;
    /** Shortened visible path ending just before the arrowhead tip. */
    visiblePath: string;
}

/** Converts an arrow CanvasNode's world-space points to local SVG path strings. */
export const getArrowPaths = (node: CanvasNode): ArrowPathResult => {
    const p = node.points;
    const sx = (p?.start.x ?? node.x) - node.x;
    const sy = (p?.start.y ?? node.y) - node.y;
    const ex = (p?.end.x ?? node.x + node.width) - node.x;
    const ey = (p?.end.y ?? node.y + node.height) - node.y;
    const c1x = (p?.control?.x ?? node.x + sx + (ex - sx) / 3) - node.x;
    const c1y = (p?.control?.y ?? node.y + sy + (ey - sy) / 3) - node.y;
    const c2x = (p?.control2?.x ?? node.x + sx + (ex - sx) * 2 / 3) - node.x;
    const c2y = (p?.control2?.y ?? node.y + sy + (ey - sy) * 2 / 3) - node.y;
    const { x: finalEx, y: finalEy } = shortenLineEnd(c2x, c2y, ex, ey, ARROW_STROKE_PAD);
    return {
        hitPath:     `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`,
        visiblePath: `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${finalEx} ${finalEy}`,
    };
};

/** Returns true if a canvas coordinate (x,y) intersects the erase radius of a node. */
export const shouldEraseNode = (n: CanvasNode, x: number, y: number): boolean => {
    if (n.type === 'pencil' && n.path) {
        return n.path.some(p => Math.hypot(n.x + p.x - x, n.y + p.y - y) < 20);
    }
    if (n.type === 'arrow') {
        const sx = n.points?.start.x ?? n.x;
        const sy = n.points?.start.y ?? n.y;
        const ex = n.points?.end.x ?? n.x + (n.width || 0);
        const ey = n.points?.end.y ?? n.y + (n.height || 0);
        const midX = (sx + ex) / 2;
        const midY = (sy + ey) / 2;
        return Math.hypot(sx - x, sy - y) < 30 || Math.hypot(ex - x, ey - y) < 30 || Math.hypot(midX - x, midY - y) < 30;
    }
    return x >= n.x && x <= n.x + (n.width || 0) && y >= n.y && y <= n.y + (n.height || 0);
};

/** Recalculates start, end, control, and control2 points of an arrow node when its connected nodes move. */
export const updateConnectedArrow = (
    n: CanvasNode,
    allNodes: CanvasNode[],
    selection: Set<string>,
    dx: number,
    dy: number
): ArrowPoints | null => {
    if (!n.points || !n.startNodeId || !n.endNodeId) return null;
    const startNode = allNodes.find(node => node.id === n.startNodeId);
    const endNode = allNodes.find(node => node.id === n.endNodeId);
    if (!startNode || !endNode) return null;

    const sNode = selection.has(startNode.id) ? { ...startNode, x: startNode.x + dx, y: startNode.y + dy } : startNode;
    const eNode = selection.has(endNode.id) ? { ...endNode, x: endNode.x + dx, y: endNode.y + dy } : endNode;

    let s1 = n.startSide || 'right';
    let s2 = 'left';
    let startPos = n.points.start;
    let endPos = n.points.end;

    if (n.isDynamicEnd) {
        startPos = { x: sNode.x + (n.startOffset?.x || 0), y: sNode.y + (n.startOffset?.y || 0) };
        const bestEnd = getBestDynamicEnd(startPos, s1, eNode, allNodes);
        s2 = bestEnd.endSide;
        endPos = sideToPoint(eNode, s2);
    } else {
        s1 = n.startSide || offsetToSide(n.startOffset) || 'right';
        s2 = offsetToSide(n.endOffset) || 'left';
        startPos = { x: sNode.x + (n.startOffset?.x || 0), y: sNode.y + (n.startOffset?.y || 0) };
        endPos = { x: eNode.x + (n.endOffset?.x || 0), y: eNode.y + (n.endOffset?.y || 0) };
    }

    const { cp1, cp2 } = calculateBezierControls(startPos, endPos, s1, s2);
    return {
        start: startPos,
        end: endPos,
        control: cp1,
        control2: cp2
    };
};

/** Recalculates and rotates control points when the start or end point of an arrow is moved. */
export const rotateControlPoints = (
    initial: {
        start: { x: number; y: number };
        end: { x: number; y: number };
        control?: { x: number; y: number };
        control2?: { x: number; y: number };
    },
    newStart: { x: number; y: number },
    newEnd: { x: number; y: number }
): { control: { x: number; y: number }; control2?: { x: number; y: number } } => {
    const oldCenter = { x: (initial.start.x + initial.end.x) / 2, y: (initial.start.y + initial.end.y) / 2 };
    const newCenter = { x: (newStart.x + newEnd.x) / 2, y: (newStart.y + newEnd.y) / 2 };

    const vOld = { x: initial.end.x - initial.start.x, y: initial.end.y - initial.start.y };
    const vNew = { x: newEnd.x - newStart.x, y: newEnd.y - newStart.y };

    const rotation = Math.atan2(vNew.y, vNew.x) - Math.atan2(vOld.y, vOld.x);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const rotatePoint = (p: { x: number; y: number }) => {
        const dx = p.x - oldCenter.x;
        const dy = p.y - oldCenter.y;
        return {
            x: newCenter.x + (dx * cos - dy * sin),
            y: newCenter.y + (dx * sin + dy * cos)
        };
    };

    return {
        control: initial.control ? rotatePoint(initial.control) : newCenter,
        control2: initial.control2 ? rotatePoint(initial.control2) : undefined
    };
};

