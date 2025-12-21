import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import type { Task, Project, TaskStatus, TaskPriority } from '@/types/task.types';

interface UseTaskFormProps {
    /** Mode: create new task or edit existing */
    mode: 'create' | 'edit';
    /** Task data for edit mode */
    task?: Task;
    /** Callback when form is successfully submitted */
    onSuccess?: () => void;
}

interface TaskFormData {
    projectId: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    estimatedTime: string;
    tags: string;
}

export function useTaskForm({ mode, task, onSuccess }: UseTaskFormProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<TaskFormData>({
        projectId: '',
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        estimatedTime: '',
        tags: '',
    });

    const isEditMode = mode === 'edit';

    // Fetch projects on mount
    useEffect(() => {
        fetchProjects();
    }, []);

    // Pre-fill form data in edit mode
    useEffect(() => {
        if (isEditMode && task) {
            setFormData({
                projectId: task.projectId.toString(),
                title: task.title,
                description: task.description || '',
                status: task.status,
                priority: task.priority,
                estimatedTime: task.estimatedTime ? (task.estimatedTime / 3600).toString() : '',
                tags: task.tags?.join(', ') || '',
            });
        }
    }, [isEditMode, task]);

    const fetchProjects = async () => {
        try {
            const response = await fetch(getApiUrl('/api/projects'));
            const data = await response.json();

            if (data.success) {
                setProjects(data.data);

                // Set first project as default for create mode
                if (!isEditMode && data.data.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        projectId: data.data[0].id.toString()
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Parse tags
            const tagsArray = formData.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);

            // Convert hours to seconds
            const estimatedTimeSeconds = formData.estimatedTime
                ? parseInt(formData.estimatedTime) * 3600
                : undefined;

            // Prepare request body
            const requestBody = {
                projectId: parseInt(formData.projectId),
                title: formData.title,
                description: formData.description || undefined,
                status: formData.status,
                priority: formData.priority,
                estimatedTime: estimatedTimeSeconds,
                tags: tagsArray.length > 0 ? tagsArray : undefined,
            };

            // API endpoint and method based on mode
            const url = isEditMode
                ? getApiUrl(`/api/tasks/${task!.id}`)
                : getApiUrl('/api/tasks');

            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (data.success) {
                // Reset form in create mode
                if (!isEditMode) {
                    setFormData({
                        projectId: projects[0]?.id.toString() || '',
                        title: '',
                        description: '',
                        status: 'todo',
                        priority: 'medium',
                        estimatedTime: '',
                        tags: '',
                    });
                }

                onSuccess?.();
            } else {
                console.error(`Failed to ${mode} task:`, data.error);
            }
        } catch (error) {
            console.error(`Failed to ${mode} task:`, error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = <K extends keyof TaskFormData>(
        field: K,
        value: TaskFormData[K]
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return {
        // State
        formData,
        projects,
        isSubmitting,
        isEditMode,

        // Actions
        handleSubmit,
        updateField,
    };
}
