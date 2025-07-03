'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Home' },
        { href: '/tournament/register', label: 'Register' },
        { href: '/tournament/bracket', label: 'Brackets' },
    ];

    return (
        <nav className="border-b border-white/[0.08] bg-black/30 backdrop-blur-sm">
            <div className="container-main">
                <div className="flex space-x-8 py-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-link ${pathname === item.href ? 'nav-link-active' : ''
                                }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}