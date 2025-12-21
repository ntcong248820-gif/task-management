import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export default function RankingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keyword Rankings</h1>
        <p className="text-muted-foreground">
          Track keyword position changes from Ahrefs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranking History</CardTitle>
          <CardDescription>
            Monitor your keyword positions over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
            <div className="flex flex-col items-center gap-1 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-xl font-semibold">Rankings Dashboard</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Keyword ranking tracking will be available after Ahrefs API integration
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
