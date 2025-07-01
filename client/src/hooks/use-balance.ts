import { Address } from "viem";
import { useBalance } from "wagmi";

export function useNativeBalance(address: Address) {
  const { data, isError, isLoading } = useBalance({
    address
  });

  return {
    balance: data?.value ?? null,
    symbol: data?.symbol ?? "AVAX",
    isError,
    isLoading,
  };
}
