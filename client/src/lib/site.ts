import { env } from "@/env";
import { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  name: "Tundra - Team1 Tournament Platform",
  author: "Isbjorn DAO",
  description: "Global tournament platform for Team1 community events",
  keywords: ["web3", "crypto", "tournaments", "avalanche"],
  url: {
    base: env.NEXT_PUBLIC_APP_URL,
    author: "https://x.com/IsbjornDAO",
  },
  links: {
    twitter: "https://x.com/IsbjornDAO",
  },
  ogImage: `${env.NEXT_PUBLIC_APP_URL}/og.jpg`,
};
