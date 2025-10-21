
'use client';

import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-10 h-10"
    >
      <path d="M16.75 13.96c-.25.13-1.47.72-1.69.81-.23.08-.39.13-.56.4s-.68.81-.83 1-.3.18-.56.05c-.26-.13-1.1-.4-2.1-1.28-.78-.68-1.3-1.53-1.47-1.79-.16-.25-.03-.39.1-.51.11-.11.25-.28.38-.42.13-.13.16-.23.25-.38.08-.16.05-.28-.03-.4s-.56-1.34-.76-1.84c-.2-.48-.4-.42-.56-.42-.16 0-.34-.03-.51-.03-.18 0-.45.05-.68.32-.23.26-.88.86-1.12 1.76s-1.25 2.53-1.25 2.53c0 .28.25.73.56 1.13.3.4.88 1.41 2.22 2.62 1.7 1.56 2.92 2.2 3.82 2.53.53.18.96.16 1.32.1.4-.05 1.47-.6 1.69-1.18.22-.58.22-1.08.16-1.18s-.23-.16-.48-.28zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
    </svg>
);


export default function WhatsAppButton() {
  const { settings } = useSettings();

  if (!settings.storePhone) return null;

  const phoneNumber = settings.storePhone.replace(/\D/g, '');
  const message = encodeURIComponent(`Olá! Gostaria de mais informações sobre os produtos.`);
  const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${message}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 print-hidden">
      <Button
        asChild
        size="icon"
        className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
        aria-label="Fale conosco pelo WhatsApp"
      >
        <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon />
        </Link>
      </Button>
    </div>
  );
}
