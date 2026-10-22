'use client';

import { asset } from '@/lib/demo/asset';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProductGallery({ images, video, name }: { images: string[]; video?: string | undefined; name: string }) {
  const sources = images.length ? images : [asset('/placeholders/watches.svg')];
  const [active, setActive] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number; on: boolean }>({ x: 50, y: 50, on: false });
  const frame = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    setZoom({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100, on: true });
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row-reverse">
      <div
        ref={frame}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
        className="relative aspect-square flex-1 overflow-hidden bg-ink-soft"
      >
        {showVideo && video ? (
          <video src={video} controls autoPlay muted playsInline className="h-full w-full object-cover" />
        ) : (
          <Image
            src={sources[active] ?? sources[0]!}
            alt={`${name}, image ${active + 1}`}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300"
            style={{
              transform: zoom.on ? 'scale(2)' : 'scale(1)',
              transformOrigin: `${zoom.x}% ${zoom.y}%`,
            }}
          />
        )}
        <span className="pointer-events-none absolute bottom-3 right-3 bg-ink/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-stone">
          Hover to zoom
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto md:w-20 md:flex-col">
        {sources.map((src, i) => (
          <button
            key={`${src}-${i}`}
            onClick={() => {
              setActive(i);
              setShowVideo(false);
            }}
            aria-label={`Show image ${i + 1}`}
            className={cn('relative h-20 w-20 shrink-0 overflow-hidden border', active === i && !showVideo ? 'border-gold' : 'border-ink-line')}
          >
            <Image src={src} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
        {video ? (
          <button
            onClick={() => setShowVideo(true)}
            aria-label="Play product video"
            className={cn('flex h-20 w-20 shrink-0 items-center justify-center border bg-ink-soft', showVideo ? 'border-gold text-gold' : 'border-ink-line text-stone')}
          >
            <PlayCircle className="h-6 w-6" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
