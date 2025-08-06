import { ConnectButton, ThemeToggle } from '@/components/shared';
import { NavLink } from 'react-router-dom';

const Topbar = () => {
    return (
        <div className='topbar-container'>
            <div className='topbar'>
                <NavLink to="/" className='logo'>LOGO_HERE</NavLink>
                <div className='topbar-links'>
                    <NavLink to="/1" className='topbar-link'>Link1</NavLink>
                    <NavLink to="/2" className='topbar-link'>Link2</NavLink>
                </div>
                <div className='connect-and-theme-button-wrapper'>
                    <ThemeToggle />
                    <ConnectButton />
                </div>
            </div>
        </div>
    )
}

export default Topbar