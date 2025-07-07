"use client";

import { WagmiGuard } from "@/components/WagmiGuard";
import { Layout } from "@/components/Layout";
import { TournamentAdmin } from "@/components/TournamentAdmin";

export default function AdminClient() {
  return (
    <WagmiGuard>
      <Layout>
        <TournamentAdmin />
      </Layout>
    </WagmiGuard>
  );
}