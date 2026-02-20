import { z } from 'zod'

// Esquemas de validación para notas
export const createNoteSchema = z.object({
  title: z.string()
    .min(1, 'El título es requerido')
    .max(255, 'El título no puede exceder 255 caracteres'),
  content: z.string()
    .min(1, 'El contenido es requerido')
    .max(10000, 'El contenido no puede exceder 10,000 caracteres'),
  folderId: z.string().uuid().optional(),
  color: z.string()
    .regex(/^bg-\w+-\d+$/, 'Formato de color inválido')
    .optional()
})

export const updateNoteSchema = z.object({
  title: z.string()
    .min(1, 'El título es requerido')
    .max(255, 'El título no puede exceder 255 caracteres')
    .optional(),
  content: z.string()
    .min(1, 'El contenido es requerido')
    .max(10000, 'El contenido no puede exceder 10,000 caracteres')
    .optional(),
  folderId: z.string().uuid().optional(),
  color: z.string()
    .regex(/^bg-\w+-\d+$/, 'Formato de color inválido')
    .optional()
})

export const noteIdSchema = z.object({
  id: z.string().uuid('ID de nota inválido')
})

// Esquemas de validación para carpetas
export const createFolderSchema = z.object({
  title: z.string()
    .min(1, 'El título es requerido')
    .max(255, 'El título no puede exceder 255 caracteres'),
  color: z.string()
    .regex(/^bg-\w+-\d+$/, 'Formato de color inválido')
    .optional()
})

export const updateFolderSchema = z.object({
  title: z.string()
    .min(1, 'El título es requerido')
    .max(255, 'El título no puede exceder 255 caracteres')
    .optional(),
  color: z.string()
    .regex(/^bg-\w+-\d+$/, 'Formato de color inválido')
    .optional()
})

export const folderIdSchema = z.object({
  id: z.string().uuid('ID de carpeta inválido')
})

// Esquema para búsqueda
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'La consulta de búsqueda es requerida')
    .max(100, 'La consulta no puede exceder 100 caracteres')
})

// Esquema para filtros de tiempo
export const timeFilterSchema = z.object({
  filter: z.enum(['todays', 'week', 'month'], {
    errorMap: () => ({ message: 'Filtro de tiempo inválido' })
  })
})

// Tipos inferidos de los esquemas
export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
export type NoteIdInput = z.infer<typeof noteIdSchema>
export type CreateFolderInput = z.infer<typeof createFolderSchema>
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>
export type FolderIdInput = z.infer<typeof folderIdSchema>
export type SearchInput = z.infer<typeof searchSchema>
export type TimeFilterInput = z.infer<typeof timeFilterSchema>
