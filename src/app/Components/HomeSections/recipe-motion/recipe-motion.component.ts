import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { LanguageService } from 'src/app/services/language.service';
import { renderSoundtrack } from './recipe-audio';
import { DURATION, RecipeScene, RecipeSceneLabels, STEP_COUNT, stepStart } from './recipe-scene';

@Component({
  selector: 'app-recipe-motion',
  templateUrl: './recipe-motion.component.html',
  styleUrls: ['./recipe-motion.component.scss'],
})
export class RecipeMotionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stage') stageRef?: ElementRef<HTMLElement>;
  @ViewChild('root') rootRef?: ElementRef<HTMLElement>;
  @ViewChild('progress') progressRef?: ElementRef<HTMLElement>;
  @ViewChild('clock') clockRef?: ElementRef<HTMLElement>;

  playing = false;
  soundOn = false;
  soundLoading = false;
  readonly markers = Array.from({ length: STEP_COUNT }, (_, i) => (stepStart(i) / DURATION) * 100);

  private scene?: RecipeScene;
  private raf = 0;
  private clockStart = 0;
  private t = 0;
  private inView = false;
  private userPaused = false;
  private reduceMotion = false;
  private observer?: IntersectionObserver;
  private langSub?: Subscription;
  private audioCtx?: AudioContext;
  private audioBuffer?: AudioBuffer;
  private audioSrc?: AudioBufferSourceNode;
  private audioGain?: GainNode;

  constructor(
    public languageService: LanguageService,
    private translate: TranslateService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.reduceMotion =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reduceMotion) this.t = stepStart(STEP_COUNT) + 3;

    this.langSub = this.translate.stream('recipeMotion.scene').subscribe((labels) => {
      if (!labels || typeof labels !== 'object') return;
      this.mountScene(labels as RecipeSceneLabels);
    });

    const root = this.rootRef?.nativeElement;
    if (root && typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.inView = entry.isIntersecting;
          if (this.inView && !this.userPaused && !this.reduceMotion) this.play();
          if (!this.inView) this.pause(false);
        },
        { threshold: 0.35 }
      );
      this.observer.observe(root);
    }
  }

  ngOnDestroy(): void {
    this.pause(false);
    this.observer?.disconnect();
    this.langSub?.unsubscribe();
    this.scene?.destroy();
    this.audioCtx?.close();
  }

  togglePlay(): void {
    if (this.playing) this.pause(true);
    else {
      this.userPaused = false;
      if (this.t >= DURATION - 0.05) this.t = 0;
      this.play();
    }
  }

  async toggleSound(): Promise<void> {
    if (this.soundOn) {
      this.soundOn = false;
      this.stopAudio();
      return;
    }
    this.soundLoading = true;
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      await this.audioCtx.resume();
      if (!this.audioBuffer) this.audioBuffer = await renderSoundtrack(this.audioCtx.sampleRate);
      this.soundOn = true;
      if (this.playing) this.startAudio();
    } catch {
      this.soundOn = false;
    } finally {
      this.soundLoading = false;
      this.cdr.detectChanges();
    }
  }

  seekFromPointer(ev: PointerEvent): void {
    const bar = ev.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const isRtl = getComputedStyle(bar).direction === 'rtl';
    const raw = (ev.clientX - rect.left) / rect.width;
    const p = Math.min(1, Math.max(0, isRtl ? 1 - raw : raw));
    this.seekTo(p * DURATION);
  }

  seekToStep(i: number): void {
    this.seekTo(stepStart(i));
  }

  private seekTo(time: number): void {
    this.t = time;
    this.clockStart = performance.now() - time * 1000;
    this.render();
    if (this.playing && this.soundOn) this.startAudio();
  }

  private mountScene(labels: RecipeSceneLabels): void {
    const host = this.stageRef?.nativeElement;
    if (!host) return;
    const rtl = (this.translate.currentLang || 'en').startsWith('ar');
    if (this.scene) this.scene.setLabels(labels, rtl);
    else this.scene = new RecipeScene(host, labels, rtl);
    this.render();
  }

  private play(): void {
    if (this.playing) return;
    this.playing = true;
    this.clockStart = performance.now() - this.t * 1000;
    if (this.soundOn) this.startAudio();
    this.ngZone.runOutsideAngular(() => {
      const loop = (now: number) => {
        let t = (now - this.clockStart) / 1000;
        if (t >= DURATION) {
          t = 0;
          this.clockStart = now;
          if (this.soundOn) this.startAudio();
        }
        this.t = t;
        this.render();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    });
    this.cdr.detectChanges();
  }

  private pause(byUser: boolean): void {
    if (byUser) this.userPaused = true;
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.stopAudio();
    this.cdr.detectChanges();
  }

  private render(): void {
    this.scene?.seek(this.t);
    const bar = this.progressRef?.nativeElement;
    if (bar) bar.style.transform = `scaleX(${(this.t / DURATION).toFixed(4)})`;
    const clock = this.clockRef?.nativeElement;
    if (clock) {
      const s = Math.floor(this.t);
      const label = `0:${String(s).padStart(2, '0')}`;
      if (clock.textContent !== label) clock.textContent = label;
    }
  }

  private startAudio(): void {
    if (!this.audioCtx || !this.audioBuffer) return;
    this.stopAudio();
    this.audioGain = this.audioCtx.createGain();
    this.audioGain.gain.value = 0.9;
    this.audioGain.connect(this.audioCtx.destination);
    const src = this.audioCtx.createBufferSource();
    src.buffer = this.audioBuffer;
    src.connect(this.audioGain);
    src.start(0, Math.min(this.t, DURATION - 0.01));
    this.audioSrc = src;
  }

  private stopAudio(): void {
    try {
      this.audioSrc?.stop();
    } catch {
      /* already stopped */
    }
    this.audioSrc?.disconnect();
    this.audioGain?.disconnect();
    this.audioSrc = undefined;
  }
}
