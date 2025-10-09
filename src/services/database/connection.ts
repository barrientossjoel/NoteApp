import mysql from 'mysql2/promise'
import { DATABASE_CONFIG } from '../../constants/database'

// Pool de conexiones para MySQL
let pool: mysql.Pool | null = null

export const getConnection = async (): Promise<mysql.Pool> => {
  if (!pool) {
    pool = mysql.createPool({
      ...DATABASE_CONFIG,
      waitForConnections: true,
      queueLimit: 0,
    })
  }
  return pool
}

export const closeConnection = async (): Promise<void> => {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// Función para ejecutar consultas
export const executeQuery = async <T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> => {
  const connection = await getConnection()
  const [rows] = await connection.execute(query, params)
  return rows as T[]
}

// Función para ejecutar una sola consulta (INSERT, UPDATE, DELETE)
export const executeSingleQuery = async (
  query: string,
  params: any[] = []
): Promise<mysql.ResultSetHeader> => {
  const connection = await getConnection()
  const [result] = await connection.execute(query, params)
  return result as mysql.ResultSetHeader
}
