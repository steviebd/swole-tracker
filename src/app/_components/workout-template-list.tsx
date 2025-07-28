"use client";

import { useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { useWorkoutOperations, type WorkoutTemplate } from '~/lib/workout-operations'
import Link from "next/link";

export function WorkoutTemplateList() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useUser()
  const { session } = useSession()

  useEffect(() => {
    if (!user || !session) return

    async function loadTemplates() {
      setIsLoading(true)
      setError(null)
      
      try {
        const workoutOps = useWorkoutOperations(session ?? null)
        const templatesData = await workoutOps.getWorkoutTemplates(user!.id)
        setTemplates(templatesData)
      } catch (err: unknown) {
        console.error('Error loading templates:', err)
        setError(err instanceof Error ? err.message : 'Failed to load templates')
      } finally {
        setIsLoading(false)
      }
    }

    void loadTemplates()
  }, [user, session])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3) as number[]].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error loading templates: {error}</p>
      </div>
    )
  }

  if (!templates?.length) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-center py-4">
          No workout templates yet. Create your first template!
        </p>
        <div className="text-center mt-4">
          <Link
            href="/templates/create"
            className="inline-block bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md transition-colors"
          >
            Create Template
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <div key={template.id} className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{template.name}</h4>
            <div className="text-xs text-gray-400">
              {new Date(template.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/templates/${template.id}`}
              className="text-purple-400 hover:text-purple-300"
            >
              Edit
            </Link>
            <Link
              href={`/workout/start?templateId=${template.id}`}
              className="text-gray-400 hover:text-white"
            >
              Start Workout
            </Link>
          </div>
        </div>
      ))}
      <div className="text-xs text-gray-500 text-center pt-2">
        ✨ Powered by Supabase + Clerk
      </div>
    </div>
  )
}
