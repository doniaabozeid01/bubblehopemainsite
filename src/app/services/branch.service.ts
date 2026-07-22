import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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


  openModal() { this.showModalSource.next(true); }
  closeModal() { this.showModalSource.next(false); }



  setBranch(branchId: number) {
    this.selectedBranchId.next(branchId);
    localStorage.setItem('br', branchId.toString());
    this.closeModal();
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
