import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements AfterViewInit, OnDestroy {

  /**
   * Every page except Home gets breathing room between its last section and
   * the footer. Home is excluded because its contact section flows straight
   * into the footer scoop on purpose.
   */
  footerGap = false;

  private sub: Subscription;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private resizeObserver?: ResizeObserver;
  private observedEl: Element | null = null;
  private raf = 0;

  constructor(
    private router: Router,
    private host: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {
    this.footerGap = !this.isHomeUrl(this.router.url);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.footerGap = !this.isHomeUrl(e.urlAfterRedirects);
        this.scheduleColorSync();
      });
  }

  ngAfterViewInit(): void {
    this.scheduleColorSync();
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.clearTimers();
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => this.syncGapColor();

  private isHomeUrl(url: string): boolean {
    const path = (url || '').split('?')[0].split('#')[0].replace(/\/+$/, '');
    return path === '' || path === '/home';
  }

  // ---------------------------------------------------------------------------
  // The gap above the footer must continue whatever colour the page itself ends
  // with (cream, white, a gradient end, ...). Instead of hard-coding it per page
  // we read the colour at the bottom edge of the routed page and reuse it.
  // ---------------------------------------------------------------------------

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  /** Pages render/load data after navigation, so re-sync a few times. */
  private scheduleColorSync(): void {
    this.clearTimers();
    [0, 150, 500, 1200, 2500].forEach((ms) =>
      this.timers.push(setTimeout(() => this.syncGapColor(), ms))
    );
  }

  private get transitionEl(): HTMLElement | null {
    return this.host.nativeElement.querySelector('app-page-transition');
  }

  private get routedEl(): HTMLElement | null {
    const wrapper = this.host.nativeElement.querySelector('.page-transition');
    if (!wrapper) return null;
    const kids = Array.from(wrapper.children) as HTMLElement[];
    return kids.filter((k) => k.tagName !== 'ROUTER-OUTLET').pop() ?? null;
  }

  private syncGapColor(): void {
    const target = this.transitionEl;
    const page = this.routedEl;
    if (!target) return;

    if (!this.footerGap || !page) {
      target.style.removeProperty('background');
      return;
    }

    this.observe(page);

    const color = this.sampleBottomColor(page);
    if (color) {
      target.style.background = color;
    } else {
      target.style.removeProperty('background');
    }
  }

  private observe(page: Element): void {
    if (this.observedEl === page || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver?.disconnect();
    this.observedEl = page;
    this.resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => this.syncGapColor());
    });
    this.resizeObserver.observe(page);
  }

  /** Colour painted along the bottom edge of the page (deepest element wins). */
  private sampleBottomColor(root: HTMLElement): string | null {
    const rootRect = root.getBoundingClientRect();
    if (rootRect.height === 0) return null;

    let found: string | null = null;

    const visit = (el: Element, depth: number): void => {
      if (depth > 12) return;
      const r = el.getBoundingClientRect();
      const reachesBottom = Math.abs(r.bottom - rootRect.bottom) <= 2;
      const coversWidth = r.width >= rootRect.width * 0.9;

      if (r.height > 0 && reachesBottom && coversWidth) {
        const c = this.paintedColor(el);
        if (c) found = c;
      }
      for (const child of Array.from(el.children)) {
        const cr = child.getBoundingClientRect();
        // Only descend into children that still touch the bottom edge.
        if (cr.height > 0 && cr.bottom >= rootRect.bottom - 2) {
          visit(child, depth + 1);
        }
      }
    };

    visit(root, 0);
    return found;
  }

  /** Solid colour, or the last colour stop of a gradient, if clearly visible. */
  private paintedColor(el: Element): string | null {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return null;

    const image = cs.backgroundImage;
    if (image && image !== 'none' && image.includes('gradient')) {
      const stops = image.match(/rgba?\([^)]*\)/g);
      const last = stops?.[stops.length - 1];
      if (last && this.alpha(last) >= 0.5) return last;
    }

    const bg = cs.backgroundColor;
    return bg && this.alpha(bg) >= 0.5 ? bg : null;
  }

  private alpha(color: string): number {
    const m = color.match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const parts = m[1].split(/[,\s/]+/).filter(Boolean);
    return parts.length >= 4 ? parseFloat(parts[3]) : 1;
  }
}
