
'use client';

import Link from 'next/link';
import Logo from './Logo';

export default function Header() {
  return (
    <header className="bg-card/80 backdrop-blur-lg border-b sticky top-0 z-40">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/">
          <Logo />
        </Link>
      </div>
    </header>
  );
}
