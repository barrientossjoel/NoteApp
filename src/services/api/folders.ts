import { executeQuery, executeSingleQuery } from '../database/connection'
import { TABLES, FOLDER_STATUS } from '../../constants/database'
import type { Folder } from '../../types/notes'

const DEFAULT_USER_ID = 'default-user' // En producción, esto vendría del contexto de autenticación

export class FoldersService {
  // Crear una nueva carpeta
  static async createFolder(folderData: Omit<Folder, 'id' | 'created_at' | 'updated_at'>): Promise<Folder> {
    const id = crypto.randomUUID()
    const query = `
      INSERT INTO ${TABLES.FOLDERS} (id, user_id, title, color, status)
      VALUES (?, ?, ?, ?, ?)
    `
    const params = [
      id,
      DEFAULT_USER_ID,
      folderData.title,
      folderData.color || 'bg-blue-50',
      FOLDER_STATUS.ACTIVE
    ]

    await executeSingleQuery(query, params)
    
    return {
      id,
      ...folderData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  // Obtener todas las carpetas activas del usuario
  static async getFolders(): Promise<Folder[]> {
    const query = `
      SELECT id, title, color, status, created_at as date, updated_at
      FROM ${TABLES.FOLDERS}
      WHERE user_id = ? AND status = ?
      ORDER BY created_at DESC
    `
    const params = [DEFAULT_USER_ID, FOLDER_STATUS.ACTIVE]
    
    const rows = await executeQuery(query, params)
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      color: row.color,
      status: row.status,
      date: row.date,
      deleted: row.status === FOLDER_STATUS.DELETED
    }))
  }

  // Obtener carpeta por ID
  static async getFolderById(id: string): Promise<Folder | null> {
    const query = `
      SELECT id, title, color, status, created_at as date, updated_at
      FROM ${TABLES.FOLDERS}
      WHERE id = ? AND user_id = ?
    `
    const params = [id, DEFAULT_USER_ID]
    
    const rows = await executeQuery(query, params)
    if (rows.length === 0) return null
    
    const row = rows[0]
    return {
      id: row.id,
      title: row.title,
      color: row.color,
      status: row.status,
      date: row.date,
      deleted: row.status === FOLDER_STATUS.DELETED
    }
  }

  // Actualizar una carpeta
  static async updateFolder(id: string, updateData: Partial<Pick<Folder, 'title' | 'color'>>): Promise<Folder | null> {
    const fields = []
    const params = []
    
    if (updateData.title !== undefined) {
      fields.push('title = ?')
      params.push(updateData.title)
    }
    if (updateData.color !== undefined) {
      fields.push('color = ?')
      params.push(updateData.color)
    }
    
    if (fields.length === 0) return null
    
    fields.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id, DEFAULT_USER_ID)
    
    const query = `
      UPDATE ${TABLES.FOLDERS}
      SET ${fields.join(', ')}
      WHERE id = ? AND user_id = ?
    `
    
    const result = await executeSingleQuery(query, params)
    if (result.affectedRows === 0) return null
    
    return await this.getFolderById(id)
  }

  // Eliminar una carpeta (soft delete)
  static async deleteFolder(id: string): Promise<boolean> {
    // Primero eliminamos todas las notas de la carpeta
    const notesQuery = `
      UPDATE ${TABLES.NOTES}
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE folder_id = ? AND user_id = ?
    `
    await executeSingleQuery(notesQuery, [id, DEFAULT_USER_ID])
    
    // Luego eliminamos la carpeta
    const folderQuery = `
      UPDATE ${TABLES.FOLDERS}
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `
    const params = [FOLDER_STATUS.DELETED, id, DEFAULT_USER_ID]
    
    const result = await executeSingleQuery(folderQuery, params)
    return result.affectedRows > 0
  }

  // Eliminar permanentemente una carpeta
  static async deleteFolderPermanently(id: string): Promise<boolean> {
    // Primero eliminamos permanentemente todas las notas de la carpeta
    const notesQuery = `DELETE FROM ${TABLES.NOTES} WHERE folder_id = ? AND user_id = ?`
    await executeSingleQuery(notesQuery, [id, DEFAULT_USER_ID])
    
    // Luego eliminamos la carpeta
    const folderQuery = `DELETE FROM ${TABLES.FOLDERS} WHERE id = ? AND user_id = ?`
    const params = [id, DEFAULT_USER_ID]
    
    const result = await executeSingleQuery(folderQuery, params)
    return result.affectedRows > 0
  }

  // Restaurar una carpeta
  static async restoreFolder(id: string): Promise<boolean> {
    // Restauramos la carpeta
    const folderQuery = `
      UPDATE ${TABLES.FOLDERS}
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `
    const params = [FOLDER_STATUS.ACTIVE, id, DEFAULT_USER_ID]
    
    const result = await executeSingleQuery(folderQuery, params)
    return result.affectedRows > 0
  }

  // Buscar carpetas
  static async searchFolders(query: string): Promise<Folder[]> {
    const searchQuery = `
      SELECT id, title, color, status, created_at as date, updated_at
      FROM ${TABLES.FOLDERS}
      WHERE user_id = ? AND status = ? AND title LIKE ?
      ORDER BY created_at DESC
    `
    const searchTerm = `%${query}%`
    const params = [DEFAULT_USER_ID, FOLDER_STATUS.ACTIVE, searchTerm]
    
    const rows = await executeQuery(searchQuery, params)
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      color: row.color,
      status: row.status,
      date: row.date,
      deleted: row.status === FOLDER_STATUS.DELETED
    }))
  }

  // Obtener carpetas eliminadas
  static async getDeletedFolders(): Promise<Folder[]> {
    const query = `
      SELECT id, title, color, status, created_at as date, updated_at
      FROM ${TABLES.FOLDERS}
      WHERE user_id = ? AND status = ?
      ORDER BY updated_at DESC
    `
    const params = [DEFAULT_USER_ID, FOLDER_STATUS.DELETED]
    
    const rows = await executeQuery(query, params)
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      color: row.color,
      status: row.status,
      date: row.date,
      deleted: row.status === FOLDER_STATUS.DELETED
    }))
  }
}
