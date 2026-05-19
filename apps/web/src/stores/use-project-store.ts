import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectStore {
    selectedProjectId: string | null;
    setSelectedProjectId: (id: string | null) => void;
    clearSelectedProjectId: () => void;
}

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set) => ({
            selectedProjectId: null,
            setSelectedProjectId: (id) => set({ selectedProjectId: id }),
            clearSelectedProjectId: () => set({ selectedProjectId: null }),
        }),
        { name: 'selected-project' }
    )
);
