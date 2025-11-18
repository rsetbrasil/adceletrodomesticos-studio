

'use client';

import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from './WhatsAppIcon';

export default function WhatsAppButton() {
  const { settings } = useSettings();

  if (!settings.storePhone || !settings.showWhatsAppButton) return null;

  const phoneNumber = settings.storePhone.replace(/\D/g, '');
  const message = encodeURIComponent(`Olá! Gostaria de mais informações sobre os produtos.`);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 print-hidden">
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <Button
            className="h-14 w-auto rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg transition-transform hover:scale-105 flex items-center justify-center text-base font-bold px-6"
            aria-label="Falar com um vendedor pelo WhatsApp"
        >
            <WhatsAppIcon />
            <span className="ml-2">Falar com vendedor</span>
        </Button>
      </a>
    </div>
  );
}
