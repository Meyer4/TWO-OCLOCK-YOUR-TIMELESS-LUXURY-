'use client';

import { MessageCircle } from 'lucide-react';
import { useStoreSettings } from '@/hooks/use-store';

export function WhatsAppButton() {
  const { data } = useStoreSettings();
  if (!data?.whatsappNumber) return null;
  return (
    <a
      href={`https://wa.me/${data.whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-ink shadow-xl transition-transform hover:scale-105"
    >
      <MessageCircle className="h-5 w-5" />
    </a>
  );
}
