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
function toCutoutUrl(url: string): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes(CLOUDINARY_UPLOAD)) {
    return url;
  }
  if (url.includes('e_background_removal')) return url;
  return url.replace(CLOUDINARY_UPLOAD, CLOUDINARY_UPLOAD + CUTOUT_TRANSFORM);
}

@Injectable({ providedIn: 'root' })
export class RawCategoriesService {
  private categories$?: Observable<RawCategory[]>;

  constructor(private api: ApiService) {}

  /** Raw-material categories as configured in the dashboard, cached for the session. */
  getCategories(): Observable<RawCategory[]> {
    if (!this.categories$) {
      this.categories$ = this.api.getAllCategories(this.api.rawMaterials).pipe(
        map((res) =>
          Array.isArray(res) ? res : res?.data || res?.result || res?.categories || []
        ),
        map((list: any[]) =>
          list.map((cat) => ({
            ...cat,
            imageUrl: toCutoutUrl(cat?.imageUrl),
            originalImageUrl: cat?.imageUrl,
          }))
        ),
        catchError(() => of([] as RawCategory[])),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.categories$;
  }
}
