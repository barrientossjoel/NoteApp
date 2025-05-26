import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRandomColor(): string {
  const colors = [
    "bg-blue-50",
    "bg-pink-50",
    "bg-yellow-50",
    "bg-green-50",
    "bg-purple-50"
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export function filterByTime(date: string, filter: string): boolean {
  const itemDate = new Date(date)
  const today = new Date()
  
  switch(filter) {
    case "todays":
      return itemDate.toDateString() === today.toDateString()
    case "week":
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      return itemDate >= weekAgo
    case "month":
      return itemDate.getMonth() === today.getMonth() && 
             itemDate.getFullYear() === today.getFullYear()
    default:
      return true
  }
}

