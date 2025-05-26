export interface Note {
  id: string
  title: string
  content: string
  date: string
  color: string
  folderId?: string
  archived: boolean
  deleted: boolean
}

export interface Folder {
  id: string
  title: string
  date: string
  color: string
  deleted: boolean
}

export type TimeFilter = "todays" | "week" | "month"

