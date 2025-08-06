//import { Bottombar, Navbar } from '@/components/shared';
import { Outlet } from 'react-router-dom';
import { Bottombar, Topbar } from '@/components/shared';

const RootLayout = () => {
    return (
        <div className="w-full flex flex-col min-h-screen overflow-y-scroll">
            <Topbar />
            <section className="flex-1">
                <Outlet />
            </section>
            <Bottombar />
        </div>
    );
}

export default RootLayout;