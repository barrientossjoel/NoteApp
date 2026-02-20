// Configuración de la base de datos MySQL
export const DATABASE_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'notes_app',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
}

export const TABLES = {
  NOTES: 'notes',
  FOLDERS: 'folders',
  USERS: 'users',
} as const

export const NOTE_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const

export const FOLDER_STATUS = {
  ACTIVE: 'active',
  DELETED: 'deleted',
} as const
