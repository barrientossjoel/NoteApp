import { executeQuery, executeSingleQuery } from '../database/connection'
import { TABLES, NOTE_STATUS } from '../../constants/database'
import type { Note } from '../../types/notes'

const DEFAULT_USER_ID = 'default-user' // En producción, esto vendría del contexto de autenticación

export class NotesService {
  // Crear una nueva nota
  static async createNote(noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note> {
    const id = crypto.randomUUID()
    const query = `
      INSERT INTO ${TABLES.NOTES} (id, user_id, folder_id, title, content, color, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      id,
      DEFAULT_USER_ID,
      noteData.folderId || null,
      noteData.title,
      noteData.content,
      noteData.color || 'bg-yellow-50',
      NOTE_STATUS.ACTIVE
    ]

    await executeSingleQuery(query, params)
    
    return {
      id,
      ...noteData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  // Obtener todas las notas activas del usuario
  static async getNotes(): Promise<Note[]> {
    const query = `
      SELECT id, folder_id as folderId, title, content, color, status, 
             created_at as date, updated_at
      FROM ${TABLES.NOTES}
      WHERE user_id = ? AND status = ?
      ORDER BY created_at DESC
    `
    const params = [DEFAULT_USER_ID, NOTE_STATUS.ACTIVE]
    
    const rows = await executeQuery(query, params)
    return rows.map(row => ({
      id: row.id,
      folderId: row.folderId,
      title: row.title,
      content: row.content,
      color: row.color,
      status: row.status,
      date: row.date,
      archived: row.status === NOTE_STATUS.ARCHIVED,
      deleted: row.status === NOTE_STATUS.DELETED
    }))
  }

  // Obtener nota por ID
  static async getNoteById(id: string): Promise<Note | null> {
    const query = `
      SELECT id, folder_id as folderId, title, content, color, status,
             created_at as date, updated_at
      FROM ${TABLES.NOTES}
      WHERE id = ? AND user_id = ?
    `
    const params = [id, DEFAULT_USER_ID]
    
    const rows = await executeQuery(query, params)
    if (rows.length === 0) return null
    
    const row = rows[0]
    return {
      id: row.id,
      folderId: row.folderId,
      title: row.title,
      content: row.content,
      color: row.color,
      status: row.status,
      date: row.date,
      archived: row.status === NOTE_STATUS.ARCHIVED,
      deleted: row.status === NOTE_STATUS.DELETED
    }
  }

  // Actualizar una nota
  static async updateNote(id: string, updateData: Partial<Pick<Note, 'title' | 'content' | 'color' | 'folderId'>>): Promise<Note | null> {
    const fields = []
    const params = []
    
    if (updateData.title !== undefined) {
      fields.push('title = ?')
      params.push(updateData.title)
    }
    if (updateData.content !== undefined) {
      fields.push('content = ?')
      params.push(updateData.content)
    }
    if (updateData.color !== undefined) {
      fields.push('color = ?')
      params.push(updateData.color)
    }
    if (updateData.folderId !== undefined) {
      fields.push('folder_id = ?')
      params.push(updateData.folderId)
    }
    
    if (fields.length === 0) return null
    
    fields.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id, DEFAULT_USER_ID)
    
    const query = `
      UPDATE ${TABLES.NOTES}
      SET ${fields.join(', ')}
      WHERE id = ? AND user_id = ?
    `
    
    const result = await executeSingleQuery(query, params)
    if (result.affectedRows === 0) return null
    
    return await this.getNoteById(id)
  }

  // Eliminar una nota (soft delete)
  static async deleteNote(id: string): Promise<boolean> {
    const query = `
      UPDATE ${TABLES.NOTES}
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `
    const params = [NOTE_STATUS.DELETED, id, DEFAULT_USER_ID]
    
    const result = await executeSingleQuery(query, params)
    return result.affectedRows > 0
  }

  // Eliminar permanentemente una nota
  static async deleteNotePermanently(id: string): Promise<boolean> {
    const query = `DELETE FROM ${TABLES.NOTES} WHERE id = ? AND user_id = ?`
    const params = [id, DEFAULT_USER_ID]
    
    const result = await executeSingleQuery(query, params)
    return result.affectedRows > 0
  }

  // Restaurar una nota
  static async restoreNote(id: string): Promise<boolean> {
    const query = `
      UPDATE ${TABLES.NOTES}
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `
    const params = [NOTE_STATUS.ACTIVE, id, DEFAULT_USER_ID]
    
    const result = await executeSingleQuery(query, params)
    return result.affectedRows > 0
  }

  // Buscar notas
  static async searchNotes(query: string): Promise<Note[]> {
    const searchQuery = `
      SELECT id, folder_id as folderId, title, content, color, status,
             created_at as date, updated_at
      FROM ${TABLES.NOTES}
      WHERE user_id = ? AND status = ? AND (
        MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE) OR
        title LIKE ? OR content LIKE ?
      )
      ORDER BY created_at DESC
    `
    const searchTerm = `%${query}%`
    const params = [DEFAULT_USER_ID, NOTE_STATUS.ACTIVE, query, searchTerm, searchTerm]
    
    const rows = await executeQuery(searchQuery, params)
    return rows.map(row => ({
      id: row.id,
      folderId: row.folderId,
      title: row.title,
      content: row.content,
      color: row.color,
      status: row.status,
      date: row.date,
      archived: row.status === NOTE_STATUS.ARCHIVED,
      deleted: row.status === NOTE_STATUS.DELETED
    }))
  }

  // Obtener notas eliminadas
  static async getDeletedNotes(): Promise<Note[]> {
    const query = `
      SELECT id, folder_id as folderId, title, content, color, status,
             created_at as date, updated_at
      FROM ${TABLES.NOTES}
      WHERE user_id = ? AND status = ?
      ORDER BY updated_at DESC
    `
    const params = [DEFAULT_USER_ID, NOTE_STATUS.DELETED]
    
    const rows = await executeQuery(query, params)
    return rows.map(row => ({
      id: row.id,
      folderId: row.folderId,
      title: row.title,
      content: row.content,
      color: row.color,
      status: row.status,
      date: row.date,
      archived: row.status === NOTE_STATUS.ARCHIVED,
      deleted: row.status === NOTE_STATUS.DELETED
    }))
  }
}
