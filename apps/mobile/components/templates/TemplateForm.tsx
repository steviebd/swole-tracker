import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { Input, Button } from '../ui';
import { ExerciseList } from './ExerciseList';
import type { Template } from '../../lib/shared-types';

interface Exercise {
  id: string;
  name: string;
}

interface TemplateFormProps {
  template?: Template;
  isEdit?: boolean;
}

export function TemplateForm({ template, isEdit = false }: TemplateFormProps) {
  const router = useRouter();
  const submitRef = useRef(false);
  const [name, setName] = useState(template?.name ?? '');
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    if (template?.exercises?.length) {
      return template.exercises.map((ex, index) => ({
        id: `${ex.id || index}`,
        name: ex.exerciseName,
      }));
    }
    return [{ id: '1', name: '' }];
  });

  const utils = trpc.useUtils();

  const createTemplate = trpc.templates.create.useMutation({
    onMutate: async () => {
      await utils.templates.getAll.cancel();
      const previousTemplates = utils.templates.getAll.getData();
      return { previousTemplates };
    },
    onError: (err, newTemplate, context) => {
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(undefined, context.previousTemplates);
      }
      submitRef.current = false;
      Alert.alert('Error', 'Failed to create template. Please try again.');
    },
    onSuccess: (data) => {
      submitRef.current = false;
      utils.templates.getAll.setData(undefined, (old) => {
        return old ? [data, ...old] : [data];
      });
      router.back();
    },
    onSettled: () => {
      void utils.templates.getAll.invalidate();
    },
  });

  const updateTemplate = trpc.templates.update.useMutation({
    onMutate: async (updatedTemplate) => {
      await utils.templates.getAll.cancel();
      const previousTemplates = utils.templates.getAll.getData();
      
      utils.templates.getAll.setData(undefined, (old) =>
        old?.map(t => 
          t.id === updatedTemplate.id 
            ? {
                ...t,
                name: updatedTemplate.name,
                updatedAt: new Date(),
                exercises: updatedTemplate.exercises.map((exerciseName, index) => ({
                  id: t.exercises[index]?.id ?? -index - 1,
                  user_id: t.exercises[index]?.user_id ?? 'temp-user',
                  templateId: t.id,
                  exerciseName,
                  orderIndex: index,
                  linkingRejected: t.exercises[index]?.linkingRejected ?? false,
                  createdAt: t.exercises[index]?.createdAt ?? new Date(),
                })),
              }
            : t
        ) ?? []
      );

      return { previousTemplates };
    },
    onError: (err, updatedTemplate, context) => {
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(undefined, context.previousTemplates);
      }
      submitRef.current = false;
      Alert.alert('Error', 'Failed to update template. Please try again.');
    },
    onSuccess: () => {
      submitRef.current = false;
      router.back();
    },
    onSettled: () => {
      void utils.templates.getAll.invalidate();
    },
  });

  const isLoading = createTemplate.isPending || updateTemplate.isPending;

  const handleExerciseChange = (id: string, name: string) => {
    setExercises(prev => 
      prev.map(ex => ex.id === id ? { ...ex, name } : ex)
    );
  };

  const addExercise = () => {
    const newId = Date.now().toString();
    setExercises(prev => [...prev, { id: newId, name: '' }]);
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    setExercises(prev => {
      const newExercises = [...prev];
      const [movedExercise] = newExercises.splice(fromIndex, 1);
      newExercises.splice(toIndex, 0, movedExercise);
      return newExercises;
    });
  };

  const handleSubmit = async () => {
    if (isLoading || submitRef.current) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    const filteredExercises = exercises
      .map(ex => ex.name.trim())
      .filter(name => name !== '');

    if (filteredExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    submitRef.current = true;

    try {
      if (isEdit && template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          name: trimmedName,
          exercises: filteredExercises,
        });
      } else {
        await createTemplate.mutateAsync({
          name: trimmedName,
          exercises: filteredExercises,
        });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      submitRef.current = false;
    }
  };

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="p-4 space-y-6">
        {/* Template Name */}
        <Input
          label="Template Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Push Day, Pull Day, Legs"
          autoCapitalize="words"
        />

        {/* Exercises Section */}
        <ExerciseList
          exercises={exercises}
          onExerciseChange={handleExerciseChange}
          onAddExercise={addExercise}
          onRemoveExercise={removeExercise}
          onMoveExercise={moveExercise}
        />

        {/* Action Buttons */}
        <View className="flex-row gap-4 pt-4">
          <View className="flex-1">
            <Button
              title={
                isLoading || submitRef.current
                  ? 'Saving...'
                  : isEdit
                    ? 'Update Template'
                    : 'Create Template'
              }
              onPress={handleSubmit}
              loading={isLoading || submitRef.current}
              disabled={isLoading || submitRef.current}
              variant="primary"
              size="lg"
            />
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            className="items-center justify-center px-6 py-3"
            disabled={isLoading}
          >
            <Text className="text-gray-600 font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}