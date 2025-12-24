import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
    it('should render button with text', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render button with default variant', () => {
        render(<Button>Default</Button>);
        const button = screen.getByText('Default');
        expect(button).toBeInTheDocument();
    });

    it('should render button with destructive variant', () => {
        render(<Button variant="destructive">Delete</Button>);
        const button = screen.getByText('Delete');
        expect(button).toBeInTheDocument();
    });

    it('should render button with outline variant', () => {
        render(<Button variant="outline">Outline</Button>);
        const button = screen.getByText('Outline');
        expect(button).toBeInTheDocument();
    });

    it('should render disabled button', () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByText('Disabled');
        expect(button).toBeDisabled();
    });
});
