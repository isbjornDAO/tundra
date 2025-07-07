'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/tournament/register', label: 'Register' },
    { href: '/tournament/bracket', label: 'Brackets' },
    { href: '/results', label: 'Results' },
    { href: '/admin', label: 'Admin' },
  ];

  return (
    <nav className="flex space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-link ${
            pathname === item.href ? 'nav-link-active' : ''
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}