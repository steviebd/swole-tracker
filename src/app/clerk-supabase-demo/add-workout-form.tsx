'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addWorkoutTemplate } from './actions'

export function AddWorkoutForm() {
  const [templateName, setTemplateName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!templateName.trim()) return

    setIsSubmitting(true)
    
    try {
      await addWorkoutTemplate(templateName.trim())
      setTemplateName('')
      router.refresh() // Refresh to show new template in server-side section
    } catch (error) {
      console.error('Error adding template:', error)
      alert('Failed to add workout template')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="templateName" className="block text-sm font-medium mb-2">
          Add New Workout Template
        </label>
        <input
          id="templateName"
          type="text"
          placeholder="Enter template name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={isSubmitting}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !templateName.trim()}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md transition-colors"
      >
        {isSubmitting ? 'Adding...' : 'Add Template'}
      </button>
    </form>
  )
}
