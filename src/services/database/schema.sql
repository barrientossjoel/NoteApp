-- Esquema de base de datos para NoteApp
-- Ejecutar este script en MySQL para crear las tablas necesarias

CREATE DATABASE IF NOT EXISTS notes_app;
USE notes_app;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de carpetas
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT 'bg-blue-50',
    status ENUM('active', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_created_at (created_at)
);

-- Tabla de notas
CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    folder_id VARCHAR(36) NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    color VARCHAR(50) DEFAULT 'bg-yellow-50',
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
    INDEX idx_user_status (user_id, status),
    INDEX idx_folder_status (folder_id, status),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_search (title, content)
);

-- Insertar usuario por defecto (opcional)
INSERT IGNORE INTO users (id, email, name) VALUES 
('default-user', 'user@example.com', 'Usuario Principal');
