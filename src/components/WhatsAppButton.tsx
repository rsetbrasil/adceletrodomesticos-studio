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
      <path
        d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413 0 6.557-5.338 11.892-11.894 11.892-1.99 0-3.903-.5-5.613-1.426l-6.248 1.658zm5.972-3.886l.221.133c1.533.918 3.282 1.401 5.105 1.401 5.478 0 9.94-4.463 9.94-9.94s-4.462-9.94-9.94-9.94-9.94 4.462-9.94 9.94c0 2.006.593 3.927 1.691 5.605l.174.289-1.127 4.105 4.214-1.106zm5.705-5.136c-2.022-.999-2.38-1.32-2.712-1.766-.333-.446-.559-.685-.847-.98-.287-.296-.603-.354-.847-.354-.245 0-.51.105-.728.163-.218.058-1.393.676-1.698 1.32-.305.644-.459 1.426-.592 1.665-.133.239-.266.295-.484.295-.218 0-.51-.058-.847-.296-1.533-1.04-2.712-2.38-3.045-3.37-.333-1.04.166-1.547.446-1.825.28-.278.51-.354.685-.472.174-.117.266-.239.38-.38.113-.142.17-.266.058-.446-.113-.181-.51-.98-.685-1.32-.174-.338-.354-.415-.592-.415-.24 0-.458.058-.685.058-.227 0-.51.058-.728.117-1.335.354-2.022 1.169-2.022 2.446 0 1.277.685 2.503 1.426 3.597 1.533 2.181 3.597 3.849 5.895 4.545.472.174.985.295 1.593.354.847.058 1.533.058 1.99 0 .685-.058 1.804-.676 2.083-1.378.28-.702.28-1.32.222-1.426-.058-.117-.222-.174-.484-.295z"
      />
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
