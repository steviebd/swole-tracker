import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../providers/AuthProvider';
import { Card, EmptyState, Skeleton } from '../ui';
import type { Template } from '../../lib/shared-types';

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onStartWorkout: (template: Template) => void;
  isStarting?: boolean;
}

function TemplateCard({ template, onEdit, onDelete, onStartWorkout, isStarting }: TemplateCardProps) {
  const exerciseCount = template.exercises?.length || 0;
  const exerciseNames = template.exercises?.map(ex => ex.exerciseName).join(', ') || 'No exercises';

  return (
    <Card variant="elevated" className="p-4 mb-4">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900 flex-1 mr-2">
          {template.name}
        </Text>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={() => onEdit(template)}>
            <Text className="text-blue-600 text-sm font-medium">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(template)}>
            <Text className="text-red-600 text-sm font-medium">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <Text className="text-gray-600 text-sm mb-3">
        {exerciseCount === 0 
          ? 'No exercises' 
          : `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}: ${exerciseNames}`
        }
      </Text>
      
      <TouchableOpacity 
        className={`rounded-lg py-2 px-3 self-start ${isStarting ? 'bg-blue-400' : 'bg-blue-600'}`}
        onPress={() => onStartWorkout(template)}
        disabled={isStarting}
      >
        <Text className="text-white text-sm font-medium">
          {isStarting ? 'Starting...' : 'Start Workout'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card variant="elevated" className="p-4 mb-4">
      <View className="flex-row justify-between items-start mb-2">
        <Skeleton width="60%" height={20} className="mr-2" />
        <View className="flex-row gap-2">
          <Skeleton width={30} height={16} />
          <Skeleton width={40} height={16} />
        </View>
      </View>
      <Skeleton width="80%" height={16} className="mb-3" />
      <Skeleton width={100} height={32} />
    </Card>
  );
}

export function TemplatesList() {
  const router = useRouter();
  const { session } = useAuth();
  
  // Only fetch templates if user is authenticated
  const { data: templates, isLoading, refetch } = trpc.templates.getAll.useQuery(
    undefined,
    {
      enabled: !!session, // Only run query when authenticated
    }
  );
  const utils = trpc.useUtils();
  const [startingTemplateId, setStartingTemplateId] = React.useState<number | null>(null);
  
  const deleteTemplate = trpc.templates.delete.useMutation({
    onMutate: async (deletedTemplate) => {
      await utils.templates.getAll.cancel();
      const previousTemplates = utils.templates.getAll.getData();
      utils.templates.getAll.setData(
        undefined,
        old => old?.filter(template => template.id !== deletedTemplate.id) ?? []
      );
      return { previousTemplates };
    },
    onError: (err, deletedTemplate, context) => {
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(undefined, context.previousTemplates);
      }
      Alert.alert('Error', 'Failed to delete template. Please try again.');
    },
    onSettled: () => {
      void utils.templates.getAll.invalidate();
    },
  });

  const handleEdit = (template: Template) => {
    router.push(`/templates/${template.id}/edit`);
  };

  const handleDelete = (template: Template) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTemplate.mutate({ id: template.id }),
        },
      ]
    );
  };

  const startWorkout = trpc.workouts.start.useMutation({
    onSuccess: (result) => {
      // Navigate to the active workout session
      router.push(`/workout/${result.sessionId}`);
      setStartingTemplateId(null);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to start workout: ${error.message}`);
      setStartingTemplateId(null);
    },
  });

  const handleStartWorkout = async (template: Template) => {
    if (template.exercises.length === 0) {
      Alert.alert('No Exercises', 'This template has no exercises. Please add exercises before starting a workout.');
      return;
    }

    Alert.alert(
      'Start Workout',
      `Start workout with "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            setStartingTemplateId(template.id);
            startWorkout.mutate({
              templateId: template.id,
              workoutDate: new Date(),
              device_type: 'ios', // TODO: Detect device type
              theme_used: 'system', // TODO: Get from theme context
            });
          },
        },
      ]
    );
  };

  const handleCreateTemplate = () => {
    router.push('/templates/new');
  };

  // Show loading if not authenticated yet
  if (!session) {
    return (
      <View className="p-4">
        {[...Array(3)].map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="p-4">
        {[...Array(3)].map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </View>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <EmptyState
        title="No templates yet"
        description="Create your first workout template to get started"
        icon="📋"
        actionTitle="Create Template"
        onAction={handleCreateTemplate}
        className="flex-1"
      />
    );
  }

  return (
    <FlatList
      data={templates}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TemplateCard
          template={item}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStartWorkout={handleStartWorkout}
          isStarting={startingTemplateId === item.id}
        />
      )}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    />
  );
}