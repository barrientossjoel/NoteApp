import { Parser } from 'hot-formula-parser';

export class FormulaEngine {
    private parser: Parser;
    private data: string[][] = [];

    constructor() {
        this.parser = new Parser();

        this.parser.on('callCellValue', (cellCoord: any, done: any) => {
            const row = cellCoord.row.index;
            const col = cellCoord.column.index;

            if (row >= 0 && row < this.data.length && col >= 0 && col < this.data[row].length) {
                const rawValue = this.data[row][col];
                if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
                    // Prevent infinite loops by keeping track of evaluating cells?
                    // For now, assume simple trees.
                    const result = this.parser.parse(rawValue.substring(1));
                    done(result.error || result.result);
                } else {
                    const num = Number(rawValue);
                    done(isNaN(num) ? rawValue : num);
                }
            } else {
                done("");
            }
        });

        this.parser.on('callRangeValue', (startCellCoord: any, endCellCoord: any, done: any) => {
            const startRow = Math.min(startCellCoord.row.index, endCellCoord.row.index);
            const endRow = Math.max(startCellCoord.row.index, endCellCoord.row.index);
            const startCol = Math.min(startCellCoord.column.index, endCellCoord.column.index);
            const endCol = Math.max(startCellCoord.column.index, endCellCoord.column.index);

            const fragment: any[] = [];
            for (let r = startRow; r <= endRow; r++) {
                const rowBlock: any[] = [];
                for (let c = startCol; c <= endCol; c++) {
                    if (r >= 0 && r < this.data.length && c >= 0 && c < this.data[r].length) {
                        const rawValue = this.data[r][c];
                        if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
                            const result = this.parser.parse(rawValue.substring(1));
                            rowBlock.push(result.error || result.result);
                        } else {
                            const num = Number(rawValue);
                            rowBlock.push(isNaN(num) ? rawValue : num);
                        }
                    } else {
                        rowBlock.push("");
                    }
                }
                fragment.push(rowBlock);
            }
            done(fragment);
        });
    }

    public evaluateGrid(grid: string[][]): string[][] {
        this.data = grid;
        const evaluated: string[][] = [];

        for (let r = 0; r < grid.length; r++) {
            const newRow: string[] = [];
            for (let c = 0; c < grid[r].length; c++) {
                const rawValue = grid[r][c];
                if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
                    const result = this.parser.parse(rawValue.substring(1));
                    if (result.error) {
                        newRow.push(result.error);
                    } else {
                        // Avoid precision issues on floats 
                        const val = typeof result.result === 'number' ? parseFloat(result.result.toFixed(10)) : result.result;
                        newRow.push(String(val));
                    }
                } else {
                    newRow.push(rawValue);
                }
            }
            evaluated.push(newRow);
        }
        return evaluated;
    }
}

export function getColumnLetter(colIndex: number): string {
    let letter = '';
    while (colIndex >= 0) {
        letter = String.fromCharCode(65 + (colIndex % 26)) + letter;
        colIndex = Math.floor(colIndex / 26) - 1;
    }
    return letter;
}
