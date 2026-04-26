import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectStore {
    selectedProjectId: number | null;
    setSelectedProjectId: (id: number) => void;
}

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set) => ({
            selectedProjectId: null,
            setSelectedProjectId: (id) => set({ selectedProjectId: id }),
        }),
        { name: 'selected-project' }
    )
);