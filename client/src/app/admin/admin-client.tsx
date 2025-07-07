"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { WagmiGuard } from "@/components/WagmiGuard";
import { Layout } from "@/components/Layout";
import { TournamentAdmin } from "@/components/TournamentAdmin";

export default function AdminClient() {
  return (
    <WagmiGuard>
      <AuthGuard>
        <Layout>
          <TournamentAdmin />
        </Layout>
      </AuthGuard>
    </WagmiGuard>
  );
}