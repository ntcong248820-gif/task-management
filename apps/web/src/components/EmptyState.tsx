import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
    /** Icon to display */
    icon: LucideIcon;
    /** Main title */
    title: string;
    /** Optional description */
    description?: string;
    /** Optional action button */
    action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    {description}
                </p>
            )}
            {action && <div>{action}</div>}
        </div>
    )
}
