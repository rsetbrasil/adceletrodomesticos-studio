
'use client';

import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="40"
      viewBox="0 0 256 259"
      fill="none"
    >
      <path
        d="M255.5 129.25C255.5 199.99 198.49 257 127.75 257C100.33 257 74.41 249.52 52.5 236.56L0.5 258.5L22.95 207.03C9.52 185.11 2 157.69 2 129.25C2 58.51 59.01 1.5 129.75 1.5C199.99 1.5 255.5 59.01 255.5 129.25Z"
        fill="#25D366"
      ></path>
      <path
        d="M192.13 163.63C189.63 164.88 177.4 171.13 175.15 172.12C172.9 173.11 171.4 173.61 169.65 175.86C167.9 178.11 161.89 184.84 159.89 187.09C157.89 189.34 155.89 189.59 152.64 188.09C149.39 186.59 139.15 183.34 127.15 172.1C117.41 162.84 111.41 152.84 109.66 150.09C107.91 147.34 109.16 146.09 110.66 144.59C111.91 143.34 113.41 141.34 114.91 139.59C116.16 138.09 116.66 136.84 117.66 135.09C118.66 133.34 118.41 132.09 117.41 130.84C116.41 129.59 109.42 112.87 107.17 107.12C104.92 101.37 102.67 102.12 100.92 102.09C99.42 102.09 97.42 101.84 95.42 101.84C93.42 101.84 90.17 102.59 87.92 105.34C85.67 108.09 79.41 114.34 77.16 123.34C74.91 132.34 74.91 142.34 77.41 145.09C79.91 147.84 85.91 153.84 88.16 156.34C90.41 158.84 100.41 170.84 114.91 180.57C126.91 188.57 135.66 191.82 142.91 193.57C149.16 195.07 155.66 194.82 160.41 193.57C165.91 192.07 177.16 185.82 179.91 178.82C182.66 171.82 182.66 165.82 181.91 164.88C181.41 163.88 180.41 163.38 178.91 162.13"
        fill="white"
      ></path>
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
        className="w-16 h-16 p-0 rounded-full bg-transparent hover:bg-transparent text-white shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
        aria-label="Fale conosco pelo WhatsApp"
      >
        <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon />
        </Link>
      </Button>
    </div>
  );
}
