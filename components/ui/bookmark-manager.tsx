"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bookmark, Plus, X } from "lucide-react"
import { formatTime } from "@/lib/time-utils"

interface AudioBookmark {
  id: string
  name: string
  time: number
}

interface BookmarkManagerProps {
  currentTime: number
  onJumpToBookmark: (time: number) => void
}

export function BookmarkManager({ currentTime, onJumpToBookmark }: BookmarkManagerProps) {
  const [bookmarks, setBookmarks] = useState<AudioBookmark[]>([])
  const [bookmarkName, setBookmarkName] = useState("")

  const addBookmark = () => {
    const newBookmark: AudioBookmark = {
      id: Date.now().toString(),
      name: bookmarkName || `Bookmark at ${formatTime(currentTime)}`,
      time: currentTime,
    }

    setBookmarks([...bookmarks, newBookmark])
    setBookmarkName("")
  }

  const removeBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((bookmark) => bookmark.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={bookmarkName}
          onChange={(e) => setBookmarkName(e.target.value)}
          placeholder="Bookmark name"
          className="flex-1"
        />
        <Button onClick={addBookmark} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {bookmarks.length > 0 ? (
        <div className="space-y-2">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              <div className="flex items-center">
                <Bookmark className="h-4 w-4 mr-2 text-primary" />
                <span className="text-sm font-medium">{bookmark.name}</span>
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{formatTime(bookmark.time)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onJumpToBookmark(bookmark.time)}
                >
                  <span className="sr-only">Jump to bookmark</span>→
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  onClick={() => removeBookmark(bookmark.id)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove bookmark</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
          No bookmarks yet. Add one to mark important points in your audio.
        </div>
      )}
    </div>
  )
}
