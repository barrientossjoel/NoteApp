# NoteApp 📝

Una aplicación moderna de notas y canvas construida con React, TypeScript, Hono, Drizzle ORM y SQLite (Turso). Permite a los usuarios crear, organizar y visualizar sus ideas de manera eficiente.

## ✨ Características Principales

### 📝 Notas y Documentos
- **Editor de Texto Rico**: Basado en Tiptap, soporta formato, listas, tareas y más.
- **Soporte Multimedia**: Agrega imágenes y audio directamente en tus notas mediante comandos slash (`/image`, `/audio`).
- **Documentos Anidados**: Estructura de documentos jerárquica ilimitada.

### 🎨 Canvas Infinito
- **Pizarra Visual**: Integración completa con `tldraw` para dibujar, crear diagramas y organizar ideas espacialmente.
- **Tipos de Documento**: Crea documentos de tipo "Texto" o "Canvas" indistintamente.
- **Context Menu Personalizado**: Acciones rápidas adaptadas al flujo de trabajo.

### 🖥️ Interfaz y Navegación
- **Sistema de Pestañas (Tabs)**: Abre múltiples documentos simultáneamente.
- **Split Panes**: Divide la vista horizontal o verticalmente para multitarea.
- **Persistencia de Estado**: La aplicación recuerda tu layout y pestañas abiertas al recargar.
- **Sidebar Dinámico**: Navegación fluida con soporte para arrastrar y soltar (Drag & Drop).
- **Vistas del Sistema**: Dashboard, Calendario y Papelera integrados como pestañas.

### 🔍 Herramientas
- **Búsqueda Global (Command K/Alt+B)**: Acceso rápido a cualquier documento.
- **Favoritos**: Acceso directo a tus documentos más importantes.
- **Modo Oscuro/Claro**: Adaptable a tus preferencias.

## 🏗️ Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI.
- **Backend**: Hono (API), Bun (Runtime).
- **Base de Datos**: SQLite (LibSQL/Turso), Drizzle ORM.
- **Editor**: Tiptap.
- **Canvas**: tldraw.
- **Estado/Gestión**: React Query, Zustand (si aplica), LocalStorage para persistencia de UI.

## 🚀 Instalación y Configuración

### Prerrequisitos

- [Bun](https://bun.sh/) instalado.
- Cuenta en [Turso](https://turso.tech/) (opcional si usas SQLite local).

### 1. Instalar Dependencias

```bash
bun install
```

### 2. Configurar Base de Datos

Crea un archivo `.env` basado en `.env.example`:

```env
DATABASE_URL=libsql://...
DATABASE_AUTH_TOKEN=...
```

Ejecuta las migraciones:

```bash
bun db:push
```

### 3. Ejecutar la Aplicación

```bash
bun run dev
```

La aplicación estará disponible en `http://localhost:5173` (o el puerto que indique Vite).

## 🗄️ Estructura de Base de Datos

El esquema principal utiliza una tabla `documents` recursiva:

- `id`: UUID
- `type`: 'text' | 'canvas'
- `parentId`: Referencia al documento padre
- `content`: JSON o HTML (dependiendo del tipo)
- `isFavorite`: Booleano
- `isExpanded`: Estado de la UI en el sidebar

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request
