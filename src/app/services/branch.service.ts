import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BranchService {

  private selectedBranchId = new BehaviorSubject<number | null>(null);
  currentBranch$ = this.selectedBranchId.asObservable();

  constructor() { }

  setBranch(branchId: number) {
    this.selectedBranchId.next(branchId);
    localStorage.setItem('br', branchId.toString())
  }

  getCurrentBranch(): number {
    const current = this.selectedBranchId.value;
    if (current !== null) {
      return current;
    }
    const fromStorage = localStorage.getItem('br');
    return fromStorage ? Number(fromStorage) : 0;
  }
}
