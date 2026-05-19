import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

interface ProjectStore {
    selectedProjectId: string | null;
    setSelectedProjectId: (id: string | null) => void;
    clearSelectedProjectId: () => void;
}

const noopStorage: StateStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
};

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set) => ({
            selectedProjectId: null,
            setSelectedProjectId: (id) => set({ selectedProjectId: id }),
            clearSelectedProjectId: () => set({ selectedProjectId: null }),
        }),
        {
            name: 'selected-project',
            storage: createJSONStorage(() =>
                typeof window === 'undefined' ? noopStorage : window.localStorage
            ),
        }
    )
);
