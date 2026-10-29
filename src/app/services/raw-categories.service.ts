import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';

const CLOUDINARY_UPLOAD = '/image/upload/';
/* Strip the studio backdrop, then trim the leftover transparent margin so every
   product fills its card instead of floating in dead space. */
const CUTOUT_TRANSFORM = 'e_background_removal/e_trim/c_limit,w_640,f_auto,q_auto/';

export interface RawCategory {
  id: number;
  name: string;
  name_ar: string;
  slug?: string;
  titleKey?: string | null;
  categoryGroupId?: number;
  products?: any[];
  /** Background-stripped variant used for display. */
  imageUrl: string;
  /** Untouched dashboard URL, used if the cutout fails to load. */
  originalImageUrl: string;
  [key: string]: any;
}

/**
 * Dashboard photos are shot on studio backdrops. Cloudinary strips the backdrop
 * on the fly so the products sit cleanly on the page.
 */
export function toCutoutUrl(url: string): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes(CLOUDINARY_UPLOAD)) {
    return url;
  }
  if (url.includes('e_background_removal')) return url;
  return url.replace(CLOUDINARY_UPLOAD, CLOUDINARY_UPLOAD + CUTOUT_TRANSFORM);
}

export function asItemList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  if (payload?.value && Array.isArray(payload.value)) return payload.value;
  if (payload && typeof payload === 'object' && (payload.id || payload.name)) return [payload];
  return [];
}

export function cloudinaryFileId(url?: string | null): string {
  if (!url) return '';
  const file = url.split('?')[0].split('/').pop() || '';
  return file.replace(/\.[a-zA-Z0-9]+$/, '').toLowerCase();
}

export function rawProductImage(product: any): string {
  const fromImages = product?.images?.[0];
  const nested = typeof fromImages === 'string' ? fromImages : fromImages?.imagePath;
  const fromBest = Array.isArray(product?.productImages) ? product.productImages[0] : '';
  return nested || product?.imagePath || product?.imageUrl || fromBest || '';
}

function resolveShopPrice(product: any): number {
  const price = Number(
    product?.newPrice ?? product?.dineInNewPrice ?? product?.oldPrice ?? product?.dineInPrice ?? product?.price ?? 0
  );
  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function asShopProduct(product: any, category?: { id?: number; name?: string; name_ar?: string }): any {
  const original = rawProductImage(product);
  const stock = Number(product?.stock ?? product?.quantity ?? 0);
  return {
    ...product,
    originalImageUrl: original,
    imageUrl: original ? toCutoutUrl(original) : '',
    imagePath: original ? toCutoutUrl(original) : '',
    newPrice: resolveShopPrice(product),
    oldPrice: Number(product?.oldPrice) > 0 ? Number(product.oldPrice) : resolveShopPrice(product),
    stock: Number.isFinite(stock) ? stock : 0,
    currency: product?.currency || 'LE',
    currency_ar: product?.currency_ar || 'ج.م',
    isFavorite: !!product?.isFavorite || !!product?.isFavourite,
    category: product?.category || (category
      ? { id: category.id, name: category.name, name_ar: category.name_ar }
      : product?.category),
  };
}

/** Dashboard names → the labels used in the navbar. Matched by name, not id: the
 *  dashboard recreates these categories, so their ids are not stable. */
export function rawCategoryTitleKey(cat: { name?: string; name_ar?: string; slug?: string; id?: number }): string | null {
  const blob = `${cat?.slug || ''} ${cat?.name || ''} ${cat?.name_ar || ''}`.toLowerCase();
  if (/popping|بوبا/.test(blob)) return 'navbar.popping';
  if (/powder|مساحيق|مسحوق|بودر|tapioca|pearl|تابيو/.test(blob)) return 'navbar.tapioca';
  if (/juice|syrup|شراب|سيرب|عصير/.test(blob)) return 'navbar.juice';
  if (/sauce|صلصة/.test(blob) && !/waffle/.test(blob)) return 'navbar.sauce';
  return null;
}

export interface RawCategoryLink {
  route: string;
  queryParams?: Record<string, any>;
  titleKey: string | null;
  name?: string;
  name_ar?: string;
  categoryId: number;
}

/** Pretty route per navbar label, in the order the raw-material categories are shown. */
export const RAW_CATEGORY_ROUTES: Record<string, string> = {
  'navbar.tapioca': '/tapioca',
  'navbar.juice': '/juice',
  'navbar.popping': '/popping',
  'navbar.sauce': '/sauce',
};
const RAW_CATEGORY_ORDER = Object.keys(RAW_CATEGORY_ROUTES);

/** Pretty route for the known categories, otherwise the filtered products page. */
export function rawCategoryLink(cat: any): RawCategoryLink {
  const id = Number(cat?.id);
  const titleKey = cat?.titleKey !== undefined ? cat.titleKey : rawCategoryTitleKey(cat);
  const route = titleKey ? RAW_CATEGORY_ROUTES[titleKey] : undefined;
  return {
    route: route ?? '/rawMaterialProducts',
    queryParams: route ? undefined : { categoryId: id },
    titleKey: route ? titleKey : null,
    name: cat?.name,
    name_ar: cat?.name_ar,
    categoryId: id,
  };
}

@Injectable({ providedIn: 'root' })
export class RawCategoriesService {
  private categories$?: Observable<RawCategory[]>;

  constructor(private api: ApiService) {}

  /** Group-2 categories with the products nested inside each one. */
  getCategories(): Observable<RawCategory[]> {
    this.categories$ ??= this.fetchCategories();
    return this.categories$;
  }

  private fetchCategories(): Observable<RawCategory[]> {
    return this.api.GetAllCategoriesWithProducts().pipe(
      map((res) => asItemList(res)),
      map((list: any[]) => {
        const cats = list.filter((cat) => Number(cat?.categoryGroupId) === 2);

        const claimed = new Set<string>();
        const fromApi = cats.map((cat) => {
          const catId = Number(cat?.id);
          const products = asItemList(cat?.products)
            .filter((p) => p?.categoryId == null || Number(p.categoryId) === catId)
            .map((p) => asShopProduct(p, cat));

          // One category per label/route; a second "syrup" falls back to its own name and link.
          let titleKey = rawCategoryTitleKey(cat);
          if (titleKey && claimed.has(titleKey)) titleKey = null;
          if (titleKey) claimed.add(titleKey);

          return {
            ...cat,
            titleKey,
            products,
            imageUrl: toCutoutUrl(cat?.imageUrl),
            originalImageUrl: cat?.imageUrl,
          };
        });

        return this.sortCategories(fromApi);
      }),
      catchError(() => {
        this.categories$ = undefined;
        return of([]);
      }),
      shareReplay(1)
    );
  }

  private sortCategories(cats: RawCategory[]): RawCategory[] {
    const rank = (cat: RawCategory) => {
      const i = cat.titleKey ? RAW_CATEGORY_ORDER.indexOf(cat.titleKey) : -1;
      return i === -1 ? RAW_CATEGORY_ORDER.length : i;
    };
    return [...cats].sort((a, b) => rank(a) - rank(b));
  }

  getCategory(id: number): Observable<RawCategory | null> {
    return this.getCategories().pipe(
      map((cats) => cats.find((cat) => Number(cat.id) === Number(id)) || null)
    );
  }
}
