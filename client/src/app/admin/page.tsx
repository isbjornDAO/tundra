"use client";

// Prevent SSR for this page since it uses wagmi hooks
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { AuthGuard } from "@/components/AuthGuard";
import { WagmiGuard } from "@/components/WagmiGuard";
import { Layout } from "@/components/Layout";
import { TournamentAdmin } from "@/components/TournamentAdmin";

export default function AdminPage() {
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