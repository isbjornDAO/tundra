import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { AdminData, User } from "@/types";

interface IContextType {
    user: User | null;
    address: string | undefined;
    isConnected: boolean;
    loading: boolean;
    needsSignup: boolean;
    createUser: (userData: User) => Promise<void>;
    updateUser: (userData: User) => Promise<void>;
    refetchUser: () => void;
    adminData: AdminData | null;
    isLoadingAdmin: boolean;
}

const INITIAL_STATE: IContextType = {
    user: null,
    address: undefined,
    isConnected: false,
    loading: false,
    needsSignup: false,
    createUser: async () => { },
    updateUser: async () => { },
    refetchUser: () => { },
    adminData: null,
    isLoadingAdmin: true,
};

const AuthContext = createContext<IContextType>(INITIAL_STATE);

export const useUserContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [adminData, setAdminData] = useState<AdminData | null>(null);
    const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);

    // Get address and connection status from existing providers
    const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
    const { authenticated, user: privyUser } = usePrivy();

    const address = wagmiAddress || privyUser?.wallet?.address;
    const isConnected = wagmiConnected || (authenticated && !!privyUser?.wallet?.address);
    const needsSignup = !user && isConnected && !loading;

    const fetchUser = useCallback(async (walletAddress: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users?walletAddress=${walletAddress}`);
            const data = await res.json();
            const userData = data.user || data;
            setUser(userData?._id ? userData : null);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const createUser = async (userData: User) => {
        const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create user");
        setUser(data);
        return data;
    };

    const updateUser = async (updates: User) => {
        if (!address) return;
        const res = await fetch("/api/users", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update user");
        setUser(data);
        return data;
    };

    const refetchUser = useCallback(() => {
        if (address) fetchUser(address);
    }, [address, fetchUser]);

    // Fetch user data when address changes
    useEffect(() => {
        if (address) {
            fetchUser(address);
        } else {
            setUser(null);
        }
    }, [address, fetchUser]);

    // Fetch admin data when address changes
    useEffect(() => {
        if (address) {
            setIsLoadingAdmin(true);
            fetch(`/api/admin/check?walletAddress=${address}`)
                .then(res => res.json())
                .then(data => setAdminData(data))
                .catch(() => setAdminData(null))
                .finally(() => setIsLoadingAdmin(false));
        } else {
            setAdminData(null);
            setIsLoadingAdmin(false);
        }
    }, [address]);

    const value: IContextType = {
        user,
        address,
        isConnected,
        loading,
        needsSignup,
        createUser,
        updateUser,
        refetchUser,
        adminData,
        isLoadingAdmin,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}