import { createContext, useContext, useState } from "react";

export type Account = {
    address: string | null;
    name: string | null;
};


export const INITIAL_ACCOUNT = {
    address: null,
    name: null
}

const INITIAL_STATE = {
    account: INITIAL_ACCOUNT,
    setAccount: () => { },
    isConnected: false,
    setIsConnected: () => { },
    refresh: 0,
    update: () => { },
}

type IContextType = {
    account: Account;
    setAccount: React.Dispatch<React.SetStateAction<Account>>;
    isConnected: boolean;
    setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
    refresh: number;
    update: () => void;
}

const AuthContext = createContext<IContextType>(INITIAL_STATE);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [account, setAccount] = useState<Account>(INITIAL_ACCOUNT);
    const [isConnected, setIsConnected] = useState(false);
    // const [isLoading, setIsLoading] = useState(false);
    const [refresh, setRefresh] = useState(0);

    const update = () => {
        setRefresh(prev => prev + 1);
    }
    const value = {
        account,
        setAccount,
        isConnected,
        setIsConnected,
        refresh,
        update,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useUserContext = () => useContext(AuthContext);