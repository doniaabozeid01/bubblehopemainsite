import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import gsap from 'gsap';
import { Subscription } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { AdvertisementDto, HeroAdSlide } from './hero-banner.model';

type HeroCup = { src: string; alt: string; slot: string };
type FocusProduct = { src: string; label: string; labelAr: string };

const CLOUD = 'https://res.cloudinary.com/dvo2qoi4s/image/upload';
const cup = (path: string, alt: string) => ({ src: `${CLOUD}/${path}`, alt });
const focus = (path: string, label: string, labelAr: string): FocusProduct => ({
  src: `${CLOUD}/${path}`,
  label,
  labelAr,
});

const SLOTS = ['back-left', 'back-right', 'mid-left', 'mid-right', 'front'] as const;

@Component({
  selector: 'app-hero-banner',
  templateUrl: './hero-banner.component.html',
  styleUrls: ['./hero-banner.component.scss'],
})
export class HeroBannerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroRoot', { static: true }) heroRoot!: ElementRef<HTMLElement>;

  drinkImage = `${CLOUD}/v1772444895/categories/a6yylqur6ifgnlx9mp02.png`;
  readonly promoImage = '/assets/Untitled-1 (4).png';
  readonly appPhoneImage = '/assets/9 1.png';
  readonly appLogo = '/assets/Group 73.png';
  readonly appleBadge = '/assets/apple.png';
  readonly playBadge = '/assets/google_play1-removebg-preview.png';
  readonly appStoreUrl = 'https://apps.apple.com';
  readonly playStoreUrl = 'https://play.google.com/store/apps/details?id=com.hendal.bubble_hope';

  /**
   * Coded app-download hero slide — kept in code but hidden.
   * Set to `true` when you want it visible in the carousel.
   */
  readonly showAppSlide = true;

  /** Coded HOPE20 / 20% off slide — replaces the flat Discounts API creative. */
  readonly showOfferSlide = true;
  readonly offerCode = 'HOPE20';
  offerDrinkIndex = 0;
  offerCopied = false;
  private offerCopyTimer?: ReturnType<typeof setTimeout>;
  private offerTimer?: ReturnType<typeof setInterval>;

  offerCopy = {
    useCode: 'Use code',
    off: 'to enjoy 20% off',
    flavorTag: "Today's sip",
    flavorNote: 'Tropical · layered · loud',
    hint: 'Fresh tropical layers — limited drop',
    cta: 'Grab the deal',
    copied: 'Copied!',
    copy: 'Copy code',
  };

  /** Per-branch hero cups — different look for each store. */
  chillDrinks: HeroCup[] = [];
  focusProducts: FocusProduct[] = [];

  /**
   * Branch packs:
   * 2 Hadayek Al-Ahram — tropical fruit
   * 3 Fuel Up — coffee & frappe energy
   * 5 Zeweil — matcha & signature
   */
  private readonly branchCupPacks: Record<number, { src: string; alt: string }[]> = {
    2: [
      cup('v1772444696/categories/szquqljudeihvjfp2unq.png', 'Taro milk tea'),
      cup('v1772445356/categories/zszfyegnznz5ezpcaoln.png', 'Lemon green tea'),
      cup('v1772444816/categories/g8j6nmccogirfsqtn3eo.png', 'Strawberry latte boba'),
      cup('v1772445376/categories/f9rqgamglpnfuo4t1cud.png', 'Green lemon mojito'),
      cup('v1772445265/categories/kotlzcxxdrsu8fqzipyd.png', 'Mango colada boba'),
    ],
    3: [
      cup('v1772531237/categories/yksyjixsllozws5pmij4.png', 'Iced americano'),
      cup('v1772444653/categories/cgfjbbg8r7ms5n3wtx34.png', 'Vanilla frappe'),
      cup('v1772445400/categories/vybbx6tzm7etzyjrjnny.png', 'Chocolate frappe'),
      cup('v1772531362/categories/f1dyunwqg9cmcqldy3wq.png', 'Iced mocha'),
      cup('v1772445503/categories/ub3a9izosm7utzcvnlzq.png', 'Brown sugar latte boba'),
    ],
    5: [
      cup('v1772444671/categories/x3xlemrbgw24umdzxqot.png', 'Thai milk tea'),
      cup('v1772445287/categories/rxzlusq6cn6tczdwhlkc.png', 'Lychee mojito'),
      cup('v1772445309/categories/hwggjyyy3azfxtfg1b5x.png', 'Lotus frappe'),
      cup('v1772445329/categories/xurvmewaspoh2wdvwt8p.png', 'Hawaii vibes'),
      cup('v1772444986/categories/i2jysbf2nfntm2we75el.png', 'Matcha strawberry boba'),
    ],
  };

  private readonly defaultCupPack = [
    cup('v1772531539/categories/qqtzq47gt4xmfiyfux0p.png', 'Iced white mocha'),
    cup('v1772445242/categories/cyakiekalpj1rqmogxqc.png', 'Mango black tea'),
    cup('v1772445769/categories/ppbug6qihbsmyfw6zf9s.png', 'Brown sugar milk boba'),
    cup('v1772531394/categories/c0gflykeaqkhfgqkgufz.png', 'Iced salted caramel latte'),
    cup('v1772444895/categories/a6yylqur6ifgnlx9mp02.png', 'Mix berries mojito'),
  ];

  private readonly branchFocusPacks: Record<number, FocusProduct[]> = {
    2: [
      focus('v1772445265/categories/kotlzcxxdrsu8fqzipyd.png', 'Mango Colada', 'مانجو كولادا'),
      focus('v1772444696/categories/szquqljudeihvjfp2unq.png', 'Taro Milk Tea', 'تارو ميلك تي'),
      focus('v1772444816/categories/g8j6nmccogirfsqtn3eo.png', 'Strawberry Latte', 'فراولة لاتيه'),
      focus('v1772445376/categories/f9rqgamglpnfuo4t1cud.png', 'Green Lemon', 'جرين ليمون'),
      focus('v1772445356/categories/zszfyegnznz5ezpcaoln.png', 'Lemon Green Tea', 'شاي ليمون أخضر'),
    ],
    3: [
      focus('v1772445503/categories/ub3a9izosm7utzcvnlzq.png', 'Brown Sugar Latte', 'براون شوجر لاتيه'),
      focus('v1772531362/categories/f1dyunwqg9cmcqldy3wq.png', 'Iced Mocha', 'آيسد موكا'),
      focus('v1772445400/categories/vybbx6tzm7etzyjrjnny.png', 'Chocolate Frappe', 'شوكولاتة فرابيه'),
      focus('v1772444653/categories/cgfjbbg8r7ms5n3wtx34.png', 'Vanilla Frappe', 'فانيلا فرابيه'),
      focus('v1772531237/categories/yksyjixsllozws5pmij4.png', 'Iced Americano', 'آيسد أمريكانو'),
    ],
    5: [
      focus('v1772444986/categories/i2jysbf2nfntm2we75el.png', 'Matcha Strawberry', 'ماتشا فراولة'),
      focus('v1772444671/categories/x3xlemrbgw24umdzxqot.png', 'Thai Milk Tea', 'شاي تايلاندي'),
      focus('v1772445309/categories/hwggjyyy3azfxtfg1b5x.png', 'Lotus Frappe', 'لوتس فرابيه'),
      focus('v1772445329/categories/xurvmewaspoh2wdvwt8p.png', 'Hawaii Vibes', 'هاواي فايبس'),
      focus('v1772445009/categories/pbwyere0xxw9agj99s9k.png', 'Matcha Mango', 'ماتشا مانجو'),
    ],
  };

  private readonly defaultFocusPack: FocusProduct[] = [
    focus('v1772444895/categories/a6yylqur6ifgnlx9mp02.png', 'Mix Berries', 'مكس بيريز'),
    focus('v1772445078/categories/aqz3lbb06tle9fnclol9.png', 'Matcha Latte', 'ماتشا لاتيه'),
    focus('v1772444609/categories/z1g1g18lmcbqeffqduzv.png', 'Brown Sugar', 'براون شوجر'),
    focus('v1772444875/categories/tnnt8qxl1ok02yq2gynl.png', 'Peach Black Tea', 'شاي خوخ'),
    focus('v1772445242/categories/cyakiekalpj1rqmogxqc.png', 'Mango Black Tea', 'مانجو بلاك تي'),
  ];

  focusIndex = 0;
  focusCopy = {
    brand: 'Bubble Hope',
    eyebrow: 'Ultimate taste',
    title1: 'Pick',
    title2: 'your pour',
    subtitle: 'Spin the drop — every cup hits different.',
    cta: 'Explore menu',
    order: 'Order now',
  };

  appCopy = {
    ticker: 'DOWNLOAD APP',
    watermark: "BURSTIN' TASTES, POPPIN' DELIGHT!",
    line1: 'Download the',
    accent1: 'App',
    line2: 'and get',
    accent2: '20%',
    line3: 'Off',
    subtitle: 'Order ahead, earn rewards, and unlock exclusive offers.',
    storeSmall: 'Download on the',
    storeApple: 'App Store',
    playSmall: 'Get it on',
    playGoogle: 'Google Play',
  };

  /** 0 = chill, 1 = promo, 2 = focus, (3 = app if enabled), then API ads */
  activeIndex = 0;
  adSlides: HeroAdSlide[] = [];

  chillCopy = {
    brand: 'Bubble Hope',
    eyebrow: 'Iced · Layered · Loud',
    title1: 'Mood',
    title2: 'Loaded',
    subtitle: 'Matcha over mango. Soft foam. Zero rush.',
    cta: 'Sip this',
  };

  promoCopy = {
    brand: 'Bubble Hope',
    eyebrow: "Burstin' bites · Poppin' delight",
    title1: "Burstin'",
    title2: 'Bubble',
    title3: 'Delight',
    subtitle: 'Sip, smile & enjoy the fun — fresh cups made for every moment.',
    order: 'Order Now',
    menu: 'View Menu',
  };

  private gsapCtx?: gsap.Context;
  private autoTimer?: ReturnType<typeof setInterval>;
  private focusTimer?: ReturnType<typeof setInterval>;
  private langSub?: { unsubscribe: () => void };
  private adsSub?: { unsubscribe: () => void };
  private branchSub?: Subscription;

  constructor(
    private api: ApiService,
    private branchService: BranchService,
    public languageService: LanguageService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.applyBranchPack(this.branchService.getCurrentBranch() ?? 2);
  }

  /** chill + promo + focus (+ optional offer + app) */
  get brandSlideCount(): number {
    let n = 3;
    if (this.showOfferSlide) n += 1;
    if (this.showAppSlide) n += 1;
    return n;
  }

  get offerSlideIndex(): number {
    return this.showAppSlide ? 4 : 3;
  }

  get appSlideIndex(): number {
    return 3;
  }

  get offerDrinks(): FocusProduct[] {
    return this.focusProducts.length ? this.focusProducts : this.defaultFocusPack;
  }

  get offerDrink(): FocusProduct {
    const list = this.offerDrinks;
    return list[this.offerDrinkIndex] || list[0];
  }

  get offerDrinkImage(): string {
    return this.offerDrink?.src || '';
  }

  get offerDrinkName(): string {
    if (!this.offerDrink) return '';
    return this.isArabic() ? this.offerDrink.labelAr : this.offerDrink.label;
  }

  get slideCount(): number {
    return this.brandSlideCount + this.adSlides.length;
  }

  get dotIndexes(): number[] {
    return Array.from({ length: this.slideCount }, (_, i) => i);
  }

  trackById = (_: number, s: HeroAdSlide) => s.id;

  ngOnInit(): void {
    this.syncCopy(this.isArabic() ? 'ar' : 'en');
    this.langSub = this.languageService.languageChanged$.subscribe((lang) => {
      this.syncCopy(lang);
      this.cdr.detectChanges();
    });

    this.branchSub = this.branchService.currentBranch$.subscribe((id) => {
      if (!id) return;
      this.applyBranchPack(id);
      this.cdr.detectChanges();
      if (this.activeIndex === 0 || this.activeIndex === 2) {
        setTimeout(() => this.playIntro(), 40);
      }
      if (this.activeIndex === 2) {
        setTimeout(() => this.layoutFocus(true), 80);
      }
    });

    this.adsSub = this.api.GetAllAdvertisements().subscribe({
      next: (res) => {
        this.adSlides = this.mapAds(this.unwrapAds(res));
        if (this.activeIndex >= this.slideCount) this.activeIndex = 0;
        this.cdr.detectChanges();
        this.startAutoplay();
      },
      error: () => undefined,
    });
  }

  private applyBranchPack(branchId: number): void {
    const cups = this.branchCupPacks[branchId] || this.defaultCupPack;
    this.chillDrinks = cups.map((d, i) => ({
      ...d,
      slot: SLOTS[i] || 'front',
    }));
    this.focusProducts = this.branchFocusPacks[branchId] || this.defaultFocusPack;
    this.focusIndex = Math.floor(this.focusProducts.length / 2);
    this.offerDrinkIndex = 0;
    this.drinkImage = this.chillDrinks[this.chillDrinks.length - 1]?.src || this.drinkImage;
  }

  ngAfterViewInit(): void {
    this.startAutoplay();
    setTimeout(() => this.playIntro(), 80);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.adsSub?.unsubscribe();
    this.branchSub?.unsubscribe();
    if (this.offerCopyTimer) clearTimeout(this.offerCopyTimer);
    this.stopAutoplay();
    this.stopFocusSpin();
    this.stopOfferSpin();
    this.gsapCtx?.revert();
  }

  copyOfferCode(): void {
    const code = this.offerCode;
    const done = () => {
      this.offerCopied = true;
      this.cdr.detectChanges();
      if (this.offerCopyTimer) clearTimeout(this.offerCopyTimer);
      this.offerCopyTimer = setTimeout(() => {
        this.offerCopied = false;
        this.cdr.detectChanges();
      }, 1800);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(() => done());
    } else {
      done();
    }
  }

  goTo(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.slideCount - 1));
    if (clamped === this.activeIndex) return;
    this.activeIndex = clamped;
    this.cdr.detectChanges();
    if (clamped < this.brandSlideCount) setTimeout(() => this.playIntro(), 40);
    if (clamped === 2) {
      this.startFocusSpin();
      setTimeout(() => this.layoutFocus(true), 80);
    } else {
      this.stopFocusSpin();
    }
    if (this.showOfferSlide && clamped === this.offerSlideIndex) {
      this.startOfferSpin();
    } else {
      this.stopOfferSpin();
    }
    this.startAutoplay();
  }

  nextOfferDrink(): void {
    const n = this.offerDrinks.length;
    if (n < 2) return;
    this.offerDrinkIndex = (this.offerDrinkIndex + 1) % n;
    this.cdr.detectChanges();
  }

  next(): void {
    this.goTo((this.activeIndex + 1) % this.slideCount);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.activeIndex === 2) {
      this.layoutFocus(false);
    }
  }

  setFocus(index: number): void {
    if (index === this.focusIndex) return;
    this.focusIndex = index;
    this.layoutFocus(true);
    this.startFocusSpin();
  }

  focusLabel(p: { label: string; labelAr: string }): string {
    return this.isArabic() ? p.labelAr : p.label;
  }

  /** Signed circular distance from focused card. */
  focusDelta(i: number): number {
    const n = this.focusProducts.length;
    let d = i - this.focusIndex;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  }

  private isArabic(lang?: string): boolean {
    return (
      (lang || '').startsWith('ar') ||
      document.documentElement.dir === 'rtl' ||
      (document.documentElement.lang || '').startsWith('ar')
    );
  }

  private syncCopy(lang?: string): void {
    if (this.isArabic(lang)) {
      this.chillCopy = {
        brand: 'Bubble Hope',
        eyebrow: 'بارد · طبقات · مود عالي',
        title1: 'المود',
        title2: 'جاهز',
        subtitle: 'ماتشا فوق مانجو. فوم ناعم. من غير استعجال.',
        cta: 'ارشف دي',
      };
      this.promoCopy = {
        brand: 'Bubble Hope',
        eyebrow: 'رشفات مبهجة · نكهات بتفرقع',
        title1: "Burstin'",
        title2: 'Bubble',
        title3: 'Delight',
        subtitle: 'ارشف، ابتسم، واستمتع — أكواب فريش لكل لحظة.',
        order: 'اطلب الآن',
        menu: 'شوف المنيو',
      };
      this.focusCopy = {
        brand: 'Bubble Hope',
        eyebrow: 'الطعم الأقوى',
        title1: 'اختار',
        title2: 'رشفتك',
        subtitle: 'لفّ على الدروب — كل كوباية مود مختلف.',
        cta: 'شوف المنيو',
        order: 'اطلب الآن',
      };
      this.appCopy = {
        ticker: 'حمّل التطبيق',
        watermark: 'نكهات بتفرقع · رشفات مبهجة!',
        line1: 'حمّل',
        accent1: 'التطبيق',
        line2: 'واحصل على',
        accent2: '20%',
        line3: 'خصم',
        subtitle: 'اطلب مقدمًا، اجمع نقاط، وافتح عروض حصرية.',
        storeSmall: 'متاح على',
        storeApple: 'App Store',
        playSmall: 'حمّله من',
        playGoogle: 'Google Play',
      };
      this.offerCopy = {
        useCode: 'استخدم الكود',
        off: 'واستمتع بخصم 20%',
        flavorTag: 'رشفة النهاردة',
        flavorNote: 'استوائي · طبقات · مود عالي',
        hint: 'طبقات استوائية فريش — عرض محدود',
        cta: 'خد العرض',
        copied: 'تم النسخ!',
        copy: 'انسخ الكود',
      };
    } else {
      this.chillCopy = {
        brand: 'Bubble Hope',
        eyebrow: 'Iced · Layered · Loud',
        title1: 'Mood',
        title2: 'Loaded',
        subtitle: 'Matcha over mango. Soft foam. Zero rush.',
        cta: 'Sip this',
      };
      this.promoCopy = {
        brand: 'Bubble Hope',
        eyebrow: "Burstin' bites · Poppin' delight",
        title1: "Burstin'",
        title2: 'Bubble',
        title3: 'Delight',
        subtitle: 'Sip, smile & enjoy the fun — fresh cups made for every moment.',
        order: 'Order Now',
        menu: 'View Menu',
      };
      this.focusCopy = {
        brand: 'Bubble Hope',
        eyebrow: 'Ultimate taste',
        title1: 'Pick',
        title2: 'your pour',
        subtitle: 'Spin the drop — every cup hits different.',
        cta: 'Explore menu',
        order: 'Order now',
      };
      this.appCopy = {
        ticker: 'DOWNLOAD APP',
        watermark: "BURSTIN' TASTES, POPPIN' DELIGHT!",
        line1: 'Download the',
        accent1: 'App',
        line2: 'and get',
        accent2: '20%',
        line3: 'Off',
        subtitle: 'Order ahead, earn rewards, and unlock exclusive offers.',
        storeSmall: 'Download on the',
        storeApple: 'App Store',
        playSmall: 'Get it on',
        playGoogle: 'Google Play',
      };
      this.offerCopy = {
        useCode: 'Use code',
        off: 'to enjoy 20% off',
        flavorTag: "Today's sip",
        flavorNote: 'Tropical · layered · loud',
        hint: 'Fresh tropical layers — limited drop',
        cta: 'Grab the deal',
        copied: 'Copied!',
        copy: 'Copy code',
      };
    }
  }

  private unwrapAds(res: any): AdvertisementDto[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.value)) return res.value;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.result)) return res.result;
    return [];
  }

  private mapAds(list: AdvertisementDto[]): HeroAdSlide[] {
    const isAr = this.isArabic();
    return (list || [])
      .filter((x) => !!(x && (x.imageUrl || x.url || x.image)))
      .filter((x) => {
        // Hide flat creatives replaced by coded slides (app + HOPE20 offer)
        const id = String(x.id ?? '');
        if (id === '6' || id === '4') return false;
        const t = `${x.title || ''} ${x.titleAr || ''} ${x.imageUrl || x.url || x.image || ''}`.toLowerCase();
        if (/ca50aancjdky0ri6r563|hope\s*20|use.?code/i.test(t)) return false;
        return !/(download|تحميل|20\s*%|app.?store|google.?play|get.?it.?on)/i.test(t);
      })
      .map((x, i) => ({
        id: `ad-${x.id ?? i}`,
        image: (x.imageUrl || x.url || x.image) as string,
        imageAlt: (isAr ? x.titleAr || x.title : x.title || x.titleAr) || 'Offer',
        href: `/advertisementProducts/${x.id}`,
      }));
  }

  private startAutoplay(): void {
    this.stopAutoplay();
    if (this.slideCount < 2) return;
    // Stay longer on the focus product showcase
    const ms = this.activeIndex === 2 ? 12000 : 6500;
    this.autoTimer = setInterval(() => this.next(), ms);
  }

  private stopAutoplay(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = undefined;
    }
  }

  private startFocusSpin(): void {
    this.stopFocusSpin();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.focusTimer = setInterval(() => {
      this.focusIndex = (this.focusIndex + 1) % this.focusProducts.length;
      this.layoutFocus(true);
      this.cdr.detectChanges();
    }, 2200);
  }

  private stopFocusSpin(): void {
    if (this.focusTimer) {
      clearInterval(this.focusTimer);
      this.focusTimer = undefined;
    }
  }

  private startOfferSpin(): void {
    this.stopOfferSpin();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (this.offerDrinks.length < 2) return;
    this.offerTimer = setInterval(() => {
      this.nextOfferDrink();
    }, 2800);
  }

  private stopOfferSpin(): void {
    if (this.offerTimer) {
      clearInterval(this.offerTimer);
      this.offerTimer = undefined;
    }
  }

  /**
   * Focus Slider — floating full cups (no card frame).
   */
  private layoutFocus(animate: boolean): void {
    const root = this.heroRoot?.nativeElement;
    if (!root) return;
    const stage = root.querySelector('.focus__stage') as HTMLElement | null;
    const cups = root.querySelectorAll<HTMLElement>('.focus__cup');
    if (!stage || !cups.length) return;

    const isMobile = window.matchMedia('(max-width: 767.98px)').matches;
    const w = stage.clientWidth || 1;
    const cupW = Math.min(w * (isMobile ? 0.26 : 0.26), isMobile ? 112 : 190);
    const step = cupW * (isMobile ? 1.08 : 1.28);
    const zig = cupW * (isMobile ? 0.08 : 0.2);
    const centerScale = isMobile ? 1.12 : 1.42;
    const sideScale = isMobile ? 0.8 : 0.82;

    this.ngZone.runOutsideAngular(() => {
      cups.forEach((cup, i) => {
        const d = this.focusDelta(i);
        const abs = Math.abs(d);
        const visible = abs <= 1;
        const ySign = d === 0 ? 0 : d < 0 ? -1 : 1;

        const props: gsap.TweenVars = {
          x: d * step,
          y: ySign * zig,
          xPercent: -50,
          yPercent: -50,
          scale: abs === 0 ? centerScale : sideScale,
          opacity: visible ? 1 : 0,
          zIndex: abs === 0 ? 40 : 20,
          rotate: d === 0 ? 0 : d * (isMobile ? 3 : 5),
          filter: abs === 0 ? 'none' : 'brightness(0.96)',
          pointerEvents: visible ? 'auto' : 'none',
          duration: animate ? 0.65 : 0,
          ease: 'power3.out',
        };

        if (animate) gsap.to(cup, props);
        else gsap.set(cup, props);
      });
    });
  }

  private playIntro(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (this.activeIndex === 2) {
      this.layoutFocus(false);
      this.startFocusSpin();
      return;
    }

    const selector =
      this.activeIndex === 0
        ? '.chill.is-active'
        : this.activeIndex === 1
          ? '.promo.is-active'
          : this.showOfferSlide && this.activeIndex === this.offerSlideIndex
            ? '.offer.is-active'
            : this.showAppSlide && this.activeIndex === this.appSlideIndex
              ? '.app.is-active'
              : null;
    if (!selector) return;

    const slide = this.heroRoot.nativeElement.querySelector(selector) as HTMLElement | null;
    if (!slide) return;

    this.ngZone.runOutsideAngular(() => {
      this.gsapCtx?.revert();
      this.gsapCtx = gsap.context(() => {
        if (this.showOfferSlide && this.activeIndex === this.offerSlideIndex) {
          this.startOfferSpin();
          gsap.set(
            ['.offer__kicker', '.offer__code', '.offer__off', '.offer__actions', '.offer__flavor', '.offer__drink'],
            { clearProps: 'all', opacity: 1 }
          );
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          tl.from('.offer__kicker', { y: 18, duration: 0.4, clearProps: 'transform' })
            .from('.offer__code', { y: 22, scale: 0.96, duration: 0.5, clearProps: 'transform' }, '-=0.15')
            .from('.offer__off', { y: 14, duration: 0.35, clearProps: 'transform' }, '-=0.2')
            .from('.offer__actions > *', { y: 12, duration: 0.35, stagger: 0.06, clearProps: 'transform' }, '-=0.15')
            .from('.offer__drink', { y: 28, scale: 0.92, duration: 0.7, clearProps: 'transform' }, '-=0.45')
            .from('.offer__flavor', { opacity: 0, y: 12, duration: 0.45 }, '-=0.4');
          return;
        }

        if (this.showAppSlide && this.activeIndex === this.appSlideIndex) {
          gsap.set(
            ['.app__title-word', '.app__subtitle', '.app__store', '.app__phone', '.app__badge', '.app__orb'],
            { clearProps: 'all', opacity: 1 }
          );
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          tl.from('.app__title-word', { y: 28, duration: 0.55, stagger: 0.05, clearProps: 'transform' })
            .from('.app__subtitle', { y: 12, duration: 0.35, clearProps: 'transform' }, '-=0.2')
            .from('.app__store', { y: 12, duration: 0.35, stagger: 0.06, clearProps: 'transform' }, '-=0.18')
            .from('.app__phone', { y: 24, scale: 0.94, duration: 0.75, clearProps: 'transform' }, '-=0.45')
            .from('.app__badge', { scale: 0.6, duration: 0.45, clearProps: 'transform' }, '-=0.4')
            .from('.app__orb', { scale: 0.5, duration: 0.5, stagger: 0.06, clearProps: 'transform' }, '-=0.45');
          return;
        }

        const targets =
          this.activeIndex === 0
            ? [
                '.chill__brand',
                '.chill__eyebrow',
                '.chill__title-line',
                '.chill__subtitle',
                '.chill__cta',
                '.chill__cup',
              ]
            : [
                '.promo__brand',
                '.promo__eyebrow',
                '.promo__title-line',
                '.promo__subtitle',
                '.promo__cta',
                '.promo__img',
              ];

        gsap.set(targets, { clearProps: 'all', opacity: 1 });
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        if (this.activeIndex === 0) {
          tl.from('.chill__brand', { y: 16, duration: 0.4, clearProps: 'transform' })
            .from('.chill__eyebrow', { y: 12, duration: 0.35, clearProps: 'transform' }, '-=0.2')
            .from(
              '.chill__title-line',
              { y: 28, duration: 0.55, stagger: 0.08, clearProps: 'transform' },
              '-=0.15'
            )
            .from('.chill__subtitle', { y: 12, duration: 0.35, clearProps: 'transform' }, '-=0.22')
            .from('.chill__cta', { y: 10, duration: 0.35, clearProps: 'transform' }, '-=0.18')
            .from(
              '.chill__cup',
              { y: 28, opacity: 0, duration: 0.75, stagger: 0.06, clearProps: 'opacity' },
              '-=0.55'
            );
        } else {
          tl.from('.promo__brand', { y: 16, duration: 0.4, clearProps: 'transform' })
            .from('.promo__eyebrow', { y: 12, duration: 0.35, clearProps: 'transform' }, '-=0.2')
            .from(
              '.promo__title-line',
              { y: 28, duration: 0.55, stagger: 0.08, clearProps: 'transform' },
              '-=0.15'
            )
            .from('.promo__subtitle', { y: 12, duration: 0.35, clearProps: 'transform' }, '-=0.22')
            .from('.promo__cta', { y: 10, duration: 0.35, stagger: 0.06, clearProps: 'transform' }, '-=0.18')
            .from(
              '.promo__img',
              { y: 20, scale: 0.94, duration: 0.8, clearProps: 'transform' },
              '-=0.55'
            );
        }
      }, slide);
    });
  }
}
