import React from 'react';
import { View, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../providers/AuthProvider';
import { Card, EmptyState, Skeleton } from '../ui';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
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
    <Card 
      variant="glass" 
      className="p-component-md mb-component-sm mx-component-sm border border-glass-border bg-glass-card/90 backdrop-blur-sm shadow-token-md"
    >
      {/* Header with template name and actions */}
      <View className="flex-row justify-between items-start mb-component-sm">
        <Text 
          variant="heading" 
          size="lg" 
          weight="semibold"
          className="text-text-primary flex-1 mr-2"
        >
          {template.name}
        </Text>
        
        <View className="flex-row gap-gap-xs">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onEdit(template)}
            className="min-w-[44px]"
          >
            <Text variant="body" size="sm" className="text-info">
              Edit
            </Text>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            visualStyle="danger"
            onPress={() => onDelete(template)}
            className="min-w-[52px]"
          >
            <Text variant="body" size="sm" className="text-danger">
              Delete
            </Text>
          </Button>
        </View>
      </View>
      
      {/* Exercise count and names */}
      <Text 
        variant="body" 
        size="sm" 
        className="text-text-secondary mb-component-sm leading-relaxed"
      >
        {exerciseCount === 0 
          ? 'No exercises configured' 
          : `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}: ${exerciseNames.length > 50 ? exerciseNames.substring(0, 47) + '...' : exerciseNames}`
        }
      </Text>
      
      {/* Start workout button */}
      <View className="flex-row justify-between items-center">
        <Button 
          variant="primary"
          size="sm"
          loading={isStarting}
          onPress={() => onStartWorkout(template)}
          disabled={isStarting || exerciseCount === 0}
          className="min-w-[120px] bg-gradient-dark-primary shadow-token-sm"
        >
          {isStarting ? 'Starting...' : 'Start Workout'}
        </Button>
        
        {/* Exercise count badge */}
        <View className="bg-bg-surface/80 px-component-sm py-1 rounded-token-md border border-border-muted">
          <Text variant="body" size="xs" className="text-text-muted font-token-medium">
            {exerciseCount} exercises
          </Text>
        </View>
      </View>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card 
      variant="glass" 
      className="p-component-md mb-component-sm mx-component-sm border border-glass-border bg-glass-card/60 backdrop-blur-sm"
    >
      <View className="flex-row justify-between items-start mb-component-sm">
        <Skeleton width="60%" height={24} className="mr-2 bg-bg-surface/40" />
        <View className="flex-row gap-gap-xs">
          <Skeleton width={44} height={32} className="bg-bg-surface/40" />
          <Skeleton width={52} height={32} className="bg-bg-surface/40" />
        </View>
      </View>
      <Skeleton width="85%" height={16} className="mb-component-sm bg-bg-surface/30" />
      <View className="flex-row justify-between items-center">
        <Skeleton width={120} height={32} className="bg-bg-surface/40" />
        <Skeleton width={80} height={24} className="bg-bg-surface/30" />
      </View>
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
      <View className="flex-1 bg-bg-app py-component-sm">
        {[...Array(3)].map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg-app py-component-sm">
        {[...Array(3)].map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </View>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-app px-component-lg">
        <EmptyState
          title="No templates yet"
          description="Create your first workout template to get started with structured training"
          icon="🏋️‍♂️"
          actionTitle="Create Template"
          onAction={handleCreateTemplate}
          className="flex-1 bg-glass-card/50 backdrop-blur-sm border border-glass-border rounded-token-card p-component-lg shadow-token-sm"
        />
      </View>
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
      contentContainerStyle={{ 
        paddingTop: 16,
        paddingBottom: 32,
        backgroundColor: 'transparent',
      }}
      style={{
        backgroundColor: 'transparent',
      }}
      showsVerticalScrollIndicator={false}
      // Enhanced scroll behavior
      bounces={true}
      decelerationRate="normal"
      // Pull to refresh functionality
      refreshing={isLoading}
      onRefresh={() => refetch()}
    />
  );
}