import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { audioBufferToWav, renderSoundtrack } from './recipe-audio';
import { RENDER_ASSETS, RecipeScene, RecipeSceneLabels, SIZE } from './recipe-scene';

/** Bare 1080×1080 scene for frame-by-frame video export (`window.seek(t)`). */
@Component({
  selector: 'app-recipe-render',
  template: `<div class="render-host" #host></div>`,
  styles: [
    `
      .render-host {
        position: fixed;
        inset: 0 auto auto 0;
        z-index: 2147483000;
        width: ${SIZE}px;
        height: ${SIZE}px;
        background: #fffbf5;
      }
    `,
  ],
})
export class RecipeRenderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host') hostRef?: ElementRef<HTMLElement>;
  private scene?: RecipeScene;

  constructor(private translate: TranslateService, private route: ActivatedRoute) {}

  async ngAfterViewInit(): Promise<void> {
    const lang = this.route.snapshot.queryParamMap.get('lang') === 'ar' ? 'ar' : 'en';
    await firstValueFrom(this.translate.use(lang));
    const labels = this.translate.instant('recipeMotion.scene') as RecipeSceneLabels;
    const host = this.hostRef?.nativeElement;
    if (!host) return;
    await document.fonts?.ready;
    await Promise.all(
      [...RENDER_ASSETS, 'assets/Group%2073.png'].map((src) => {
        const im = new Image();
        im.src = src;
        return im.decode().catch(() => undefined);
      })
    );
    this.scene = new RecipeScene(host, labels, lang === 'ar');
    this.scene.seek(0);

    const w = window as any;
    w.seek = (t: number) => this.scene?.seek(t);
    w.recipeWav = async () => {
      const buf = await renderSoundtrack(48000);
      const bytes = new Uint8Array(audioBufferToWav(buf));
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(bin);
    };
    w.recipeReady = true;
  }

  ngOnDestroy(): void {
    this.scene?.destroy();
  }
}
