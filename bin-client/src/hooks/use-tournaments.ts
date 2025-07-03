import { TournamentSummary } from "@/types/tournament";
import { useQuery } from "@tanstack/react-query";

export function useTournaments() {
  return useQuery<TournamentSummary[]>({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const res = await fetch("/api/tournaments");
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });
}
