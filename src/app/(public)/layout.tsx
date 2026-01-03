'use client';

import { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ChatWidget from "@/components/ChatWidget";

export default function PublicPageLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Header />
            <main>{children}</main>
            <Footer />
            <ChatWidget />
        </>
    );
}
