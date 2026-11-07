/**
 * Products shown under the "New" tab of the menu.
 *
 * The API has no creation date, so a product counts as new when its image was
 * uploaded to Cloudinary within `windowDays` (the `/v<unix-seconds>/` part of
 * the image URL) and its id is higher than almost every product whose image is
 * older. The id rule keeps old products whose photo was merely replaced out of
 * the tab; the top few old ids are ignored so one old product holding a high id
 * cannot hide all the new ones.
 */
export interface NewProductsConfig {
  windowDays: number;
  /**
   * Slugs always shown as new, whatever their age. They lead the New tab and
   * their own category, in this order.
   */
  pinned: string[];
  /** Slugs never shown as new. */
  hidden: string[];
}

export const NEW_PRODUCTS: NewProductsConfig = {
  windowDays: 30,
  pinned: ['scoop-cookie', 'molten-cake'],
  hidden: [],
};

/** Pinned products first (in config order); everything else keeps its API order. */
export function pinnedFirst<T extends { slug?: string }>(
  products: T[],
  config: NewProductsConfig = NEW_PRODUCTS
): T[] {
  const rank = (p: T) => {
    const i = p.slug != null ? config.pinned.indexOf(p.slug) : -1;
    return i < 0 ? Infinity : i;
  };
  return products
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r - b.r))
    .map(({ p }) => p);
}

const DAY_MS = 86_400_000;
/** Share of old products whose ids may sit above the new ones. */
const OLD_ID_OUTLIERS = 0.05;

function imageUploadedAt(imagePath: unknown): number | null {
  const match = /\/v(\d{9,11})\//.exec(String(imagePath ?? ''));
  return match ? Number(match[1]) * 1000 : null;
}

/** Pinned first (in config order), then newest first. */
export function pickNewProducts<T extends { id?: number; slug?: string; imagePath?: string }>(
  products: T[],
  config: NewProductsConfig = NEW_PRODUCTS,
  now = Date.now()
): T[] {
  const cutoff = now - config.windowDays * DAY_MS;
  const pinnedRank = new Map(config.pinned.map((slug, i) => [slug, i]));
  const hidden = new Set(config.hidden);

  const oldIds = products
    .filter((p) => {
      const uploadedAt = imageUploadedAt(p.imagePath);
      return uploadedAt != null && uploadedAt < cutoff;
    })
    .map((p) => Number(p.id) || 0)
    .sort((a, b) => b - a);
  const idFloor = oldIds.length ? oldIds[Math.floor(oldIds.length * OLD_ID_OUTLIERS)] : -Infinity;

  const rank = (p: T) => (p.slug != null ? pinnedRank.get(p.slug) : undefined) ?? Infinity;
  const seen = new Set<number | string>();
  return products
    .filter((p) => {
      const key = p.id ?? p.slug ?? '';
      if (seen.has(key)) return false;
      seen.add(key);
      if (p.slug && hidden.has(p.slug)) return false;
      if (rank(p) !== Infinity) return true;
      const uploadedAt = imageUploadedAt(p.imagePath);
      return uploadedAt != null && uploadedAt >= cutoff && (Number(p.id) || 0) > idFloor;
    })
    .sort((a, b) => rank(a) - rank(b) || (Number(b.id) || 0) - (Number(a.id) || 0));
}
