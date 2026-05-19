import { redirect } from "next/navigation"

export default function RankingsRedirectPage() {
  redirect("/dashboard/analytics/keywords")
}
