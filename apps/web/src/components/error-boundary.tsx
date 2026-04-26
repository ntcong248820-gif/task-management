'use client';

import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    margin: '2rem'
                }}>
                    <h2>Something went wrong</h2>
                    <p>Please refresh the page or try again later.</p>
                </div>
            );
        }
        return this.props.children;
    }
}