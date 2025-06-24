import { env } from "@/env";
import { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  name: "Start3r",
  author: "Vitagliano",
  description: "A web3 boilerplate for your next project.",
  keywords: ["web3", "crypto", "nft", "boilerplate"],
  url: {
    base: env.NEXT_PUBLIC_APP_URL,
    author: "https://gabrielrusso.me",
  },
  links: {
    twitter: "https://x.com/gabrielrvita",
  },
  ogImage: `${env.NEXT_PUBLIC_APP_URL}/og.jpg`,
};
