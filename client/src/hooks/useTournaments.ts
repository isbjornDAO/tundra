import { TournamentSummary } from "@/types/tournament";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useTournaments() {
  return useQuery<{ tournaments: TournamentSummary[] }>({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const res = await fetch("/api/tournaments/mongo");
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });
}

export const useCreateTournament = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { game: string; region: string; maxTeams?: number }) => {
      const response = await fetch("/api/tournaments/mongo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create tournament");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
};

export const useRegisterTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { tournamentId: string; team: any }) => {
      const response = await fetch("/api/tournaments/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to register team");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
};

export const useTeams = (tournamentId: string) => {
  return useQuery({
    queryKey: ["teams", tournamentId],
    queryFn: async () => {
      const response = await fetch(`/api/tournaments/teams?tournamentId=${tournamentId}`);
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
    enabled: !!tournamentId,
  });
};

export const useGenerateBracket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { tournamentId: string }) => {
      const response = await fetch("/api/tournaments/brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to generate bracket");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
};

export const useDeleteTournament = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { tournamentId: string; walletAddress: string }) => {
      const response = await fetch(`/api/tournaments/mongo?tournamentId=${data.tournamentId}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${data.walletAddress}`
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete tournament");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
};

export const useBracket = (tournamentId: string) => {
  return useQuery({
    queryKey: ["bracket", tournamentId],
    queryFn: async () => {
      if (!tournamentId) throw new Error("No tournament ID provided");
      const response = await fetch(`/api/tournaments/brackets?tournamentId=${tournamentId}`);
      if (!response.ok) throw new Error("Failed to fetch bracket");
      return response.json();
    },
    enabled: !!tournamentId && tournamentId.length > 0,
  });
};

export const useMatches = (bracketId?: string, organizerAddress?: string) => {
  return useQuery({
    queryKey: ["matches", bracketId, organizerAddress],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (bracketId && bracketId.length > 0) params.append("bracketId", bracketId);
      if (organizerAddress && organizerAddress.length > 0) params.append("organizer", organizerAddress);
      
      if (params.toString().length === 0) {
        throw new Error("No valid parameters provided for matches query");
      }
      
      const response = await fetch(`/api/tournaments/matches?${params}`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    enabled: !!(bracketId && bracketId.length > 0) || !!(organizerAddress && organizerAddress.length > 0),
  });
};

export const useProposeTime = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { matchId: string; proposedTime: string; proposedBy: string }) => {
      const response = await fetch("/api/tournaments/matches/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to propose time");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
};

export const useRespondToTime = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { timeSlotId: string; action: "accepted" | "rejected"; respondedBy: string }) => {
      const response = await fetch("/api/tournaments/matches/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to respond to time");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
};

export const useReportResult = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { matchId: string; winnerId: string; reportedBy: string }) => {
      const response = await fetch("/api/tournaments/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to report result");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["bracket"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
};

export const useResults = (game?: string, status?: string) => {
  return useQuery({
    queryKey: ["results", game, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (game) params.append("game", game);
      if (status) params.append("status", status);
      
      const response = await fetch(`/api/tournaments/results?${params}`);
      if (!response.ok) throw new Error("Failed to fetch results");
      return response.json();
    },
  });
};

export const useStats = (organizerAddress?: string, game?: string) => {
  return useQuery({
    queryKey: ["stats", organizerAddress, game],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (organizerAddress) params.append("organizer", organizerAddress);
      if (game) params.append("game", game);
      
      const response = await fetch(`/api/tournaments/stats?${params}`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!(organizerAddress || game),
  });
};