'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface ProjectContextType {
    selectedProjectId: number | null;
    setSelectedProjectId: (id: number) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selectedProjectId, setSelectedProjectIdState] = useState<number | null>(null);

    // Initialize from URL or localStorage
    useEffect(() => {
        const urlProjectId = searchParams.get('projectId');
        const storedProjectId = localStorage.getItem('selectedProjectId');

        if (urlProjectId) {
            const id = parseInt(urlProjectId);
            setSelectedProjectIdState(id);
            localStorage.setItem('selectedProjectId', id.toString());
        } else if (storedProjectId) {
            const id = parseInt(storedProjectId);
            setSelectedProjectIdState(id);
            // Update URL with stored projectId
            const params = new URLSearchParams(searchParams.toString());
            params.set('projectId', id.toString());
            router.replace(`${pathname}?${params.toString()}`);
        }
    }, [searchParams, pathname, router]);

    const setSelectedProjectId = (id: number) => {
        setSelectedProjectIdState(id);
        localStorage.setItem('selectedProjectId', id.toString());

        // Update URL
        const params = new URLSearchParams(searchParams.toString());
        params.set('projectId', id.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
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
