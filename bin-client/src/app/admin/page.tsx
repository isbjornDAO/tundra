"use client";

import { TournamentAdmin } from "@/components/tournament-admin";
import { RootLayout } from "@/components/root-layout";

export default function AdminPage() {
  return (
    <RootLayout title="Tournament Administration">
      <TournamentAdmin />
    </RootLayout>
  );
}