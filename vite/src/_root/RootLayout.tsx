import { Outlet } from 'react-router-dom';
import { Topbar } from '@/components/shared';

const RootLayout = () => {
    return (
        <div className="w-full flex flex-col min-h-screen overflow-y-scroll">
            <Topbar />
            <section className="flex-1">
                <Outlet />
            </section>
        </div>
    );
}

export default RootLayout;