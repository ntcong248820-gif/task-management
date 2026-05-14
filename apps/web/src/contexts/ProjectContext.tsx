'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface ProjectContextType {
    selectedProjectId: string | null;
    setSelectedProjectId: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Component that handles URL params - must be wrapped in Suspense
function ProjectInitializer({
    setSelectedProjectIdState
}: {
    setSelectedProjectIdState: (id: string | null) => void
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize from URL or localStorage
    useEffect(() => {
        const urlProjectId = searchParams.get('projectId');
        const storedProjectId = localStorage.getItem('selectedProjectId');

        if (urlProjectId) {
            setSelectedProjectIdState(urlProjectId);
            localStorage.setItem('selectedProjectId', urlProjectId);
        } else if (storedProjectId) {
            setSelectedProjectIdState(storedProjectId);
            // Update URL with stored projectId
            const params = new URLSearchParams(searchParams.toString());
            params.set('projectId', storedProjectId);
            router.replace(`${pathname}?${params.toString()}`);
        }
    }, [searchParams, pathname, router, setSelectedProjectIdState]);

    return null;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);

    const setSelectedProjectId = (id: string) => {
        setSelectedProjectIdState(id);
        localStorage.setItem('selectedProjectId', id);

        // Update URL - we need to get current search params
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            params.set('projectId', id);
            router.push(`${pathname}?${params.toString()}`);
        }
    };

    return (
        <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
            <Suspense fallback={null}>
                <ProjectInitializer setSelectedProjectIdState={setSelectedProjectIdState} />
            </Suspense>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}
