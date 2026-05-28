export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string | null;
  parentId: string | null;
  status: 'active' | 'deleted' | 'archived' | null;
  isExpanded?: boolean | null;
  isFavorite?: boolean | null;
  tags?: string | null;
  order?: number | null;
  date?: string; // Mapped from createdAt in actions
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  type?: 'text' | 'canvas' | 'pdf' | 'epub';
  scrollPosition?: string | null;
  children?: Document[]; // For recursive tree structure on client
}

export type TimeFilter = 'todays' | 'week' | 'month';

export type LayoutNodeType = 'group' | 'pane' | 'dashboard';
export type LayoutDirection = 'horizontal' | 'vertical';

export interface LayoutNode {
  id: string;
  type: LayoutNodeType;
  direction?: LayoutDirection;
  children?: LayoutNode[];
  tabs?: string[]; // Array of document IDs
  activeTabId?: string | null;
  size?: number; // percentage
  showTabs?: boolean;
  previewTabId?: string | null;
}

export interface Message {
  id: string;
  content: string;
  type: 'text' | 'audio';
  documentId?: string | null;
  createdAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceState {
  layout: LayoutNode;
  currentView: string;
  activePaneId: string;
  showSidebar: boolean;
  showResizeHandles: boolean;
}
