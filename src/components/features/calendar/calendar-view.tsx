import { useState } from 'react'
import { Calendar } from "../../../components/ui/calendar"
import { Card, CardContent } from "../../../components/ui/card"
import type { Note } from '../../../types/notes'

interface CalendarViewProps {
  notes: Note[]
}

export function CalendarView({ notes }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const notesForSelectedDate = notes.filter(note => 
    new Date(note.date).toDateString() === selectedDate?.toDateString()
  )

  return (
    <div className="flex gap-4">
      <div className="w-1/2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
        />
      </div>
      <div className="w-1/2">
        <h2 className="text-2xl font-bold mb-4">Notes for {selectedDate?.toDateString()}</h2>
        {notesForSelectedDate.length === 0 ? (
          <p>No notes for this date.</p>
        ) : (
          notesForSelectedDate.map(note => (
            <Card key={note.id} className="mb-4">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold">{note.title}</h3>
                <p className="text-sm text-gray-500">{note.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

