
'use client';

import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-8 h-8"
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 12c0 1.77.46 3.45 1.28 4.95L2 22l5.05-1.34c1.45.77 3.06 1.22 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.89s-4.45-9.89-9.91-9.89zM17.2 14.25c-.22-.11-1.28-.63-1.48-.7-.2-.07-.35-.11-.49.11-.15.22-.56.7-.68.85-.13.15-.25.17-.47.06-.22-.11-.94-.35-1.78-1.1-.66-.58-1.1-1.3-1.23-1.51s0-.3.1-.41c.1-.11.22-.28.33-.42.11-.15.15-.25.22-.42.07-.17.04-.31-.02-.42-.06-.11-.49-1.18-.68-1.61-.18-.42-.36-.36-.49-.37-.13-.01-.28-.01-.42-.01-.15 0-.38.06-.58.3-.2.25-.78.76-.78 1.85s.8 2.15.91 2.3c.11.15 1.56 2.38 3.78 3.35.54.23.96.36 1.29.47.65.21 1.24.18 1.7.11.5-.07 1.28-.52 1.46-.98.18-.47.18-.87.13-.98s-.22-.18-.48-.29z"></path>
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
        className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform hover:scale-110"
        aria-label="Fale conosco pelo WhatsApp"
      >
        <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon />
        </Link>
      </Button>
    </div>
  );
}
