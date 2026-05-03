import { CanvasNode } from '../types'

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
