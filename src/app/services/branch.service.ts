import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const ACCOUNTS_KEY = 'br_chosen_accounts';

@Injectable({
  providedIn: 'root'
})
export class BranchService {

  private showModalSource = new BehaviorSubject<boolean>(false);
  showModal$ = this.showModalSource.asObservable();

  // private selectedBranchId = new BehaviorSubject<number | null>(null);
  // currentBranch$ = this.selectedBranchId.asObservable();

// في ملف branch.service.ts
private selectedBranchId = new BehaviorSubject<number | null>(
  localStorage.getItem('br') ? Number(localStorage.getItem('br')) : null
);
currentBranch$ = this.selectedBranchId.asObservable();

  constructor() { }


  /** Signed-in account the branch picker was opened for; its pick (or dismiss) is remembered per account. */
  private promptedUserId: string | null = null;

  openModal() { this.showModalSource.next(true); }
  closeModal() {
    this.rememberAccountChoice();
    this.showModalSource.next(false);
  }

  /**
   * The device-wide choice is not enough: a new account made on a device that already picked a
   * branch must still choose its own, once.
   */
  promptForAccount(userId: string) {
    if (!userId || this.hasAccountChosen(userId)) return;
    this.promptedUserId = userId;
    this.openModal();
  }

  hasAccountChosen(userId: string): boolean {
    return this.accountsWithBranch().includes(userId);
  }

  setBranch(branchId: number) {
    this.selectedBranchId.next(branchId);
    localStorage.setItem('br', branchId.toString());
    localStorage.setItem('br_chosen', '1');
    this.closeModal();
  }

  private rememberAccountChoice() {
    const userId = this.promptedUserId;
    if (!userId) return;
    this.promptedUserId = null;
    const accounts = this.accountsWithBranch();
    if (!accounts.includes(userId)) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, userId].slice(-20)));
    }
  }

  private accountsWithBranch(): string[] {
    try {
      const list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
      return Array.isArray(list) ? list.map(String) : [];
    } catch {
      return [];
    }
  }

  /** True only after the customer picks a branch. Auto-filled defaults do not count. */
  hasChosenBranch(): boolean {
    return localStorage.getItem('br_chosen') === '1' && this.getCurrentBranch() != null;
  }

  // getCurrentBranch(): number {
  //   const current = this.selectedBranchId.value;
  //   if (current !== null) {
  //     return current;
  //   }
  //   const fromStorage = localStorage.getItem('br');
  //   return fromStorage ? Number(fromStorage) : 0;
  // }


  getCurrentBranch() {
    const current = this.selectedBranchId.value;
    if (current != null) return current;
    const fromStorage = localStorage.getItem('br');
    return fromStorage ? Number(fromStorage) : null;
  }


}
