export interface GraphSettings {
    filters: {
        search: string;
        showTags: boolean;
        showAttachments: boolean;
        showExistingOnly: boolean;
        showOrphans: boolean;
    };
    groups: GraphGroup[];
    display: {
        showArrows: boolean;
        textFadeThreshold: number;
        nodeSize: number;
        linkThickness: number;
        showLabels: boolean;
    };
    forces: {
        centerForce: number;
        repelForce: number;
        linkForce: number;
        linkDistance: number;
    };
}

export interface GraphGroup {
    id: string;
    query: string;
    color: string;
    label: string;
}

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
    filters: {
        search: '',
        showTags: false,
        showAttachments: false,
        showExistingOnly: true,
        showOrphans: true,
    },
    groups: [],
    display: {
        showArrows: true,
        textFadeThreshold: 0,
        nodeSize: 1,
        linkThickness: 1,
        showLabels: true,
    },
    forces: {
        centerForce: 0.5,
        repelForce: 30,
        linkForce: 1,
        linkDistance: 30,
    },
};
