"use client";

import { useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '~/lib/supabase-client'
import Link from "next/link";

interface WorkoutWithTemplate {
  id: number
  templateId: number
  workoutDate: string
  createdAt: string
  swole_tracker_workout_template: {
    name: string
  } | null
  exercise_count?: number
}

export function RecentWorkoutsSupabase() {
  const [workouts, setWorkouts] = useState<WorkoutWithTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useUser()
  const { session } = useSession()

  // We'll create the client inside the useEffect with the session

  useEffect(() => {
    if (!user || !session) return

    async function loadWorkouts() {
      setLoading(true)
      setError(null)
      
      try {
        const client = createClerkSupabaseClient(session ?? null)
        
        // Query recent workout sessions first
        const { data: workoutData, error: workoutError } = await client
          .from('swole-tracker_workout_session')
          .select('id, templateId, workoutDate, createdAt')
          .eq('user_id', user!.id)
          .order('workoutDate', { ascending: false })
          .limit(3)

        if (workoutError) {
          throw workoutError
        }

        // Get template names and exercise counts for each workout session
        const workoutsWithDetails = await Promise.all(
          (workoutData || []).map(async (workout: any) => {
            // Get template name
            const { data: templateData } = await client
              .from('swole-tracker_workout_template')
              .select('name')
              .eq('id', workout.templateId)
              .single()

            // Get exercise count
            const { count } = await client
              .from('swole-tracker_session_exercise')
              .select('*', { count: 'exact', head: true })
              .eq('sessionId', workout.id)
              .eq('user_id', user!.id)

            return {
              ...workout,
              swole_tracker_workout_template: templateData,
              exercise_count: count || 0
            }
          })
        )

        setWorkouts(workoutsWithDetails)
      } catch (err: any) {
        console.error('Error loading workouts:', err)
        setError(err.message || 'Failed to load workouts')
      } finally {
        setLoading(false)
      }
    }

    loadWorkouts()
  }, [user, session])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3) as number[]].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error loading workouts: {error}</p>
      </div>
    )
  }

  if (!workouts?.length) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-center py-4">
          No recent workouts. Start your first workout!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="bg-gray-800 rounded-lg p-4 relative">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">
              {workout.swole_tracker_workout_template?.name || 'Unknown Template'}
            </h4>
            <div className="text-xs text-gray-400">
              {new Date(workout.workoutDate).toLocaleDateString()}
            </div>
          </div>
          
          <div className="text-sm text-gray-400 mb-2">
            {workout.exercise_count} exercise{workout.exercise_count !== 1 ? "s" : ""} logged
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/workout/session/${workout.id}`}
              className="text-purple-400 hover:text-purple-300"
            >
              View
            </Link>
            <Link
              href={`/workout/start?templateId=${workout.templateId}`}
              className="text-gray-400 hover:text-white"
            >
              Repeat
            </Link>
          </div>
        </div>
      ))}
      <div className="text-xs text-gray-500 text-center pt-2">
        ✨ Powered by Supabase + Clerk
      </div>
    </div>
  );
}
