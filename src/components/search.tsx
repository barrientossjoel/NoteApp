'use client'

import { useTransition } from 'react'
import { SearchIcon } from 'lucide-react'
import { Input } from "./ui/input"
import { searchItems } from '../actions/actions'
import type { Note, Folder } from '@/app/types/notes'

interface SearchProps {
  onResult: (notes: Note[], folders: Folder[]) => void
}

export function Search({ onResult }: SearchProps) {
  const [, startTransition] = useTransition()
  
  return (
    <div className="relative">
      <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
      <Input 
        placeholder="Search" 
        className="pl-8 w-[300px]"
        onChange={(e) => {
          startTransition(() => {
            searchItems(e.target.value).then(result => {
              onResult(result.notes, result.folders)
            })
          })
        }}
      />
    </div>
  )
}

