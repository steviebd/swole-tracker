'use client'

import { useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '~/lib/supabase-client'

interface WorkoutSession {
  id: number
  templateId: number
  workoutDate: string
  createdAt: string
  workout_template: {
    name: string
  }
}

export function ClientWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useUser()
  const { session } = useSession()

  // We'll create the client inside the useEffect with the session

  useEffect(() => {
    if (!user || !session) return

    async function loadWorkouts() {
      setLoading(true)
      
      const client = createClerkSupabaseClient(session ?? null)
      
      // Query recent workout sessions first
      const { data: workoutData, error } = await client
        .from('swole-tracker_workout_session')
        .select('id, templateId, workoutDate, createdAt')
        .order('workoutDate', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error loading workouts:', error)
        setWorkouts([])
      } else {
        // Get template names for each workout
        const workoutsWithTemplates = await Promise.all(
          (workoutData || []).map(async (workout: any) => {
            const { data: templateData } = await client
              .from('swole-tracker_workout_template')
              .select('name')
              .eq('id', workout.templateId)
              .single()

            return {
              ...workout,
              workout_template: templateData || { name: 'Unknown Template' }
            }
          })
        )

        setWorkouts(workoutsWithTemplates)
      }
      
      setLoading(false)
    }

    loadWorkouts()
  }, [user, session])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!workouts.length) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-center py-4">
          No recent workouts found
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-medium">
            {workout.workout_template?.name || 'Unknown Template'}
          </h3>
          <p className="text-sm text-gray-400">
            Workout Date: {new Date(workout.workoutDate).toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-500">Session ID: {workout.id}</p>
        </div>
      ))}
    </div>
  )
}
