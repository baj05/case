import Image from 'next/image';
import { initials } from '@lexhall/core';

/**
 * Portrait, or a monogram when we have no sourced photograph.
 *
 * Deliberately never falls back to stock imagery: putting an invented face on a
 * real, named advocate would be fabrication.
 */
export function Avatar({
  name, src, size = 64, priority = false,
}: { name: string; src?: string | null; size?: number; priority?: boolean }) {
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={src}
          alt={`Photograph of ${name}, published by their Bar Council`}
          width={size}
          height={size}
          priority={priority}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      ) : (
        <span className="monogram" style={{ fontSize: Math.round(size * 0.36) }} aria-hidden="true">
          {initials(name)}
        </span>
      )}
    </span>
  );
}
