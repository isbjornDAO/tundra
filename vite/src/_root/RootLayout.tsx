import { Outlet } from 'react-router-dom';
import { LoginDialog, Topbar } from '@/components/shared';
import { useEffect, useState } from 'react';
import { useUserContext } from '@/context/AuthContext';

const RootLayout = () => {
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const { isConnected, user, loading } = useUserContext();

    const closeLoginDialog = () => {
        setIsLoginDialogOpen(false);
    };

    useEffect(() => {
        if (!isConnected && !loading) {
            setIsLoginDialogOpen(true);
        } else if (isConnected && user) {
            setIsLoginDialogOpen(false);
        } else {
            setIsLoginDialogOpen(true);
        }
    }, [isConnected, user, loading]);

    return (
        <div className="w-full flex flex-col min-h-screen overflow-y-scroll">
            <Topbar />
            <section className="flex-1">
                <Outlet />
            </section>

            <LoginDialog
                isOpen={isLoginDialogOpen}
                onClose={closeLoginDialog}
            />
        </div>
    );
}

export default RootLayout;