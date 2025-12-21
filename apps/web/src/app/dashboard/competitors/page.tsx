import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Users } from "lucide-react"

export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Competitor Tracking</h1>
        <p className="text-muted-foreground">
          Monitor competitor metrics and share of voice
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Competitor Analysis</CardTitle>
          <CardDescription>
            Compare your metrics with competitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
            <div className="flex flex-col items-center gap-1 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-xl font-semibold">Competitor Dashboard</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Competitor tracking will be available after Ahrefs API integration
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Phase 3 - Ahrefs Integration
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
