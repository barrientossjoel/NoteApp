// Colores predefinidos para notas y carpetas
export const NOTE_COLORS = [
  { value: 'bg-yellow-50', label: 'Amarillo Claro', class: 'bg-yellow-50' },
  { value: 'bg-blue-50', label: 'Azul Claro', class: 'bg-blue-50' },
  { value: 'bg-green-50', label: 'Verde Claro', class: 'bg-green-50' },
  { value: 'bg-pink-50', label: 'Rosa Claro', class: 'bg-pink-50' },
  { value: 'bg-purple-50', label: 'Morado Claro', class: 'bg-purple-50' },
  { value: 'bg-orange-50', label: 'Naranja Claro', class: 'bg-orange-50' },
  { value: 'bg-red-50', label: 'Rojo Claro', class: 'bg-red-50' },
  { value: 'bg-indigo-50', label: 'Índigo Claro', class: 'bg-indigo-50' },
] as const

export const FOLDER_COLORS = [
  { value: 'bg-blue-50', label: 'Azul Claro', class: 'bg-blue-50' },
  { value: 'bg-green-50', label: 'Verde Claro', class: 'bg-green-50' },
  { value: 'bg-purple-50', label: 'Morado Claro', class: 'bg-purple-50' },
  { value: 'bg-orange-50', label: 'Naranja Claro', class: 'bg-orange-50' },
  { value: 'bg-pink-50', label: 'Rosa Claro', class: 'bg-pink-50' },
  { value: 'bg-yellow-50', label: 'Amarillo Claro', class: 'bg-yellow-50' },
  { value: 'bg-red-50', label: 'Rojo Claro', class: 'bg-red-50' },
  { value: 'bg-indigo-50', label: 'Índigo Claro', class: 'bg-indigo-50' },
] as const

export const DEFAULT_NOTE_COLOR = 'bg-yellow-50'
export const DEFAULT_FOLDER_COLOR = 'bg-blue-50'

// Función para obtener un color aleatorio
export const getRandomColor = (type: 'note' | 'folder' = 'note'): string => {
  const colors = type === 'note' ? NOTE_COLORS : FOLDER_COLORS
  const randomIndex = Math.floor(Math.random() * colors.length)
  return colors[randomIndex].value
}
