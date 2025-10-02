// import { HttpClient } from '@angular/common/http';
// import { Component } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { ApiService } from 'src/app/services/api.service';
// import { CartService } from 'src/app/services/cart.service';

// @Component({
//   selector: 'app-payment-callback',
//   templateUrl: './payment-callback.component.html',
//   styleUrls: ['./payment-callback.component.scss']
// })

// export class PaymentCallbackComponent {
//   orderId!: number;


//   constructor(private api: ApiService, private router: Router) { }

//   ngOnInit() {
//     this.orderId = Number(localStorage.getItem('last_order_id'));
//     this.api.GetOrderById(this.orderId).subscribe({
//       next: (response) => {
//         console.log(response);
//         if (response.paymentStatus == 1) {
//           localStorage.removeItem('cart_backup')
//           localStorage.removeItem('last_order_id')
//           this.router.navigate(['/allorders'])
//         }
//         else if (response.paymentStatus == 0) {
//           this.api.cancelOrder(this.orderId).subscribe({
//             next: (response) => {
//               console.log(response);
//               localStorage.removeItem('last_order_id')
//               this.router.navigate(['/cart/paymentFailed'])
//             },
//             error:(err)=>{
//               console.log(err);
//             }
//           })

//         }
//       },
//       error: (err) => {
//         console.log(err);

//       }
//     })
//   }




// }









// ----------------------------------------------------------------------------------------------------------------------




















import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { ActivatedRoute } from '@angular/router';

interface OrderDto { paymentStatus: 0 | 1; }

@Component({
  selector: 'app-payment-callback',
  template: `<div class="py-5 text-center">جارِ التحقق من الدفع...</div>`
})
export class PaymentCallbackComponent implements OnInit {
  private readonly ORDER_KEY = 'last_order_id';
  private readonly CART_BACKUP_KEY = 'cart_backup';

  constructor(private api: ApiService, private router: Router, private toastr: ToastrService, private route: ActivatedRoute) { }

  ngOnInit(): void {

    const idStr = localStorage.getItem(this.ORDER_KEY);
    const orderId = Number(idStr);



    this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('id'));
      const success = (params.get('success') ?? '').toLowerCase() === 'true';
      const pending = (params.get('pending') ?? '').toLowerCase() === 'true';

      console.log(id);
      console.log(success);
      console.log(pending);


      if(success){
        this.router.navigate(['/allorders']);
      }

      if (success == false) {
        // مفيش id محفوظ → رجّعيه على الكارت
        this.toastr.warning("please try to pay again");
        this.router.navigate(['/cart']);
        return;
      }

      // this.api.GetOrderById(orderId).subscribe({
      //   next: (res: OrderDto) => {
      //     if (res?.paymentStatus === 1) {
      //       // ✅ تم الدفع
      //       localStorage.removeItem(this.CART_BACKUP_KEY);
      //       localStorage.removeItem(this.ORDER_KEY);
      //       this.toastr.success("order created successfully");
      //       // this.router.navigate(['/allorders']);
      //     } else {
      //       // ❌ فشل الدفع → حاول إلغاء الطلب، وبغض النظر عن النتيجة روّحي لصفحة الفشل
      //       this.api.cancelOrder(orderId).subscribe({
      //         next: (response) => {
      //           console.log(response);

      //           this.onFailDone()
      //         },
      //         error: (err) => {
      //           console.log(err);

      //           this.onFailDone()
      //         }
      //       });
      //     }
      //   },
      //   error: (err) => {
      //     // لو حصل خطأ في getOrder → اعتبرها فشل
      //     // this.onFailDone();
      //     console.log(err);

      //   }
      // });


    });





  }

  // private onFailDone() {
  //   // سيبي استرجاع السلة لصفحة /cart/paymentFailed
  //   localStorage.removeItem(this.ORDER_KEY);
  //   // this.router.navigate(['/cart/paymentFailed']);
  // }
}
