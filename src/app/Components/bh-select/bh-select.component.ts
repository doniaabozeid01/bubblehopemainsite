import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface BhSelectOption {
  value: unknown;
  label: string;
}

let nextId = 0;

/**
 * Site-styled dropdown that replaces the native <select> popup (which cannot be styled).
 * Works with formControlName / ngModel and supports the usual select keyboard keys.
 */
@Component({
  selector: 'app-bh-select',
  templateUrl: './bh-select.component.html',
  styleUrls: ['./bh-select.component.scss'],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BhSelectComponent), multi: true },
  ],
})
export class BhSelectComponent implements ControlValueAccessor {
  @Input() options: BhSelectOption[] = [];
  @Input() placeholder = '';
  @Input() emptyText = '—';
  @Input() loading = false;
  @Input() invalid = false;
  /** Id of the trigger button, so a <label for="…"> focuses it. */
  @Input() inputId?: string;

  readonly listId = `bh-select-${++nextId}`;
  value: unknown = null;
  disabled = false;
  open = false;
  activeIndex = -1;

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};
  private typeahead = '';
  private typeaheadTimer?: ReturnType<typeof setTimeout>;

  constructor(private host: ElementRef<HTMLElement>, private cdr: ChangeDetectorRef) {}

  get selectedIndex(): number {
    return this.options.findIndex((o) => o.value === this.value);
  }

  get selectedLabel(): string {
    return this.options[this.selectedIndex]?.label ?? '';
  }

  optionId(i: number): string {
    return `${this.listId}-${i}`;
  }

  writeValue(value: unknown): void {
    this.value = value ?? null;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.open = false;
    this.cdr.markForCheck();
  }

  toggle(): void {
    if (this.open) this.close();
    else this.openPanel();
  }

  choose(index: number): void {
    const option = this.options[index];
    if (!option) return;
    if (option.value !== this.value) {
      this.value = option.value;
      this.onChange(option.value);
    }
    this.close();
    this.focusTrigger();
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;
    const last = this.options.length - 1;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.open) {
          this.openPanel();
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.setActive(Math.min(last, Math.max(0, this.activeIndex + step)));
        return;
      }
      case 'Home':
      case 'End':
        if (!this.open) return;
        event.preventDefault();
        this.setActive(event.key === 'Home' ? 0 : last);
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.open && this.activeIndex >= 0) this.choose(this.activeIndex);
        else this.toggle();
        return;
      case 'Escape':
        if (!this.open) return;
        event.preventDefault();
        this.close();
        return;
      case 'Tab':
        this.close();
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          this.jumpByTyping(event.key);
        }
    }
  }

  onBlur(): void {
    if (!this.open) this.onTouched();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private openPanel(): void {
    if (this.disabled || this.loading) return;
    this.open = true;
    this.setActive(this.selectedIndex >= 0 ? this.selectedIndex : 0);
  }

  private close(): void {
    if (!this.open) return;
    this.open = false;
    this.activeIndex = -1;
    this.onTouched();
  }

  private setActive(index: number): void {
    this.activeIndex = index;
    this.cdr.detectChanges();
    const el = this.host.nativeElement.querySelector<HTMLElement>(`#${this.optionId(index)}`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  private jumpByTyping(char: string): void {
    if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer);
    this.typeahead += char.toLowerCase();
    this.typeaheadTimer = setTimeout(() => (this.typeahead = ''), 600);

    const index = this.options.findIndex((o) => o.label.toLowerCase().startsWith(this.typeahead));
    if (index < 0) return;
    if (this.open) this.setActive(index);
    else this.choose(index);
  }

  private focusTrigger(): void {
    this.host.nativeElement.querySelector<HTMLButtonElement>('.bh-select__trigger')?.focus();
  }
}
