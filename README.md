# NoteApp 📝

Una aplicación moderna de notas construida con React, TypeScript, Vite y MySQL. Permite a los usuarios crear, organizar, buscar y gestionar sus notas de manera eficiente.

## ✨ Características

- 📝 **Gestión de Notas**: Crear, editar, eliminar y organizar notas
- 📁 **Sistema de Carpetas**: Organizar notas en carpetas personalizables
- 🗓️ **Vista de Calendario**: Visualizar notas por fecha
- 🗑️ **Papelera**: Recuperar notas eliminadas
- 🔍 **Búsqueda Avanzada**: Buscar en títulos y contenido
- 🎨 **Colores Personalizables**: Personalizar el color de notas y carpetas
- 📱 **Responsive**: Diseño adaptativo para todos los dispositivos
- 🚀 **Drag & Drop**: Reorganizar notas y carpetas fácilmente

## 🏗️ Estructura del Proyecto

```
src/
├── components/
│   ├── features/           # Componentes específicos por funcionalidad
│   │   ├── notes/         # Componentes relacionados con notas
│   │   ├── folders/       # Componentes relacionados con carpetas
│   │   ├── calendar/      # Componentes de vista de calendario
│   │   └── trash/         # Componentes de papelera
│   ├── layout/            # Componentes de layout (header, sidebar)
│   └── ui/               # Componentes de UI reutilizables
├── services/
│   ├── api/              # Servicios de API para MySQL
│   └── database/         # Configuración y esquemas de BD
├── lib/
│   ├── utils/            # Utilidades generales
│   └── validations/      # Esquemas de validación con Zod
├── constants/            # Constantes de la aplicación
├── types/               # Definiciones de tipos TypeScript
└── hooks/               # Hooks personalizados de React
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+ 
- MySQL 8.0+
- npm, yarn, pnpm o bun

### 1. Instalar Dependencias

```bash
npm install
# o
yarn install
# o
pnpm install
```

### 2. Configurar Base de Datos

1. Crea una base de datos MySQL:
```sql
CREATE DATABASE notes_app;
```

2. Ejecuta el script de esquema:
```bash
mysql -u root -p notes_app < src/services/database/schema.sql
```

3. Configura las variables de entorno:
```bash
cp env.example .env
# Edita .env con tus credenciales de MySQL
```

### 3. Ejecutar la Aplicación

```bash
npm run dev
# o
yarn dev
# o
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📜 Scripts Disponibles

- `npm run dev` — Inicia el servidor de desarrollo
- `npm run build` — Compila la app para producción
- `npm run preview` — Previsualiza la build de producción
- `npm run lint` — Ejecuta el linter
- `npm run type-check` — Verifica tipos TypeScript

## 🗄️ Base de Datos

### Esquema Principal

- **users**: Información de usuarios
- **folders**: Carpetas de organización
- **notes**: Notas del usuario

### Características de la BD

- ✅ Soft delete para notas y carpetas
- ✅ Índices optimizados para búsquedas
- ✅ Búsqueda full-text en contenido
- ✅ Relaciones con claves foráneas
- ✅ Timestamps automáticos

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Radix UI, Tailwind CSS, Lucide React
- **Base de Datos**: MySQL 8.0, mysql2
- **Validación**: Zod
- **Drag & Drop**: react-beautiful-dnd
- **Calendario**: react-day-picker
- **Utilidades**: date-fns, clsx, tailwind-merge

## 🔧 Configuración Avanzada

### Variables de Entorno

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=notes_app

# Aplicación
NODE_ENV=development
PORT=3000
```

### Personalización

- **Colores**: Edita `src/constants/colors.ts`
- **Configuración BD**: Modifica `src/constants/database.ts`
- **Validaciones**: Ajusta esquemas en `src/lib/validations/`

## 📝 Próximas Características

- [ ] Autenticación de usuarios
- [ ] Sincronización en tiempo real
- [ ] Exportar/Importar notas
- [ ] Temas personalizables
- [ ] Notas colaborativas
- [ ] Aplicación móvil

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.
