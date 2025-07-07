"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/Layout";
import { TournamentAdmin } from "@/components/TournamentAdmin";

export default function AdminPage() {
  return (
    <AuthGuard>
      <Layout>
        <TournamentAdmin />
      </Layout>
    </AuthGuard>
  );
}