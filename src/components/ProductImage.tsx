"use client";
import { useState } from 'react';
import { getMediaUrl } from '../../config';
export function ProductImage({banner, name, className}: {banner?: string | null; name: string; className?: string}) {
 const [failed, setFailed] = useState<string | null>(null);
 const source = banner && failed !== banner ? getMediaUrl(banner) : '/product-placeholder.svg';
 return <img src={source} alt={name} className={className} loading="lazy" onError={() => { if (banner && source !== '/product-placeholder.svg') setFailed(banner); }} />;
}
