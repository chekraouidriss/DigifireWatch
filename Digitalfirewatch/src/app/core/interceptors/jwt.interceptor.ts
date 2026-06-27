// src/app/core/interceptors/jwt.interceptor.ts
// Attaches Bearer token to every request going to our API.
// On 401 → auto logout (token expired or invalid).

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();

  // Only attach token to our own API — not to CDNs or third-party calls
  const isApiCall = req.url.startsWith(environment.apiUrl);

  const cloned = (token && isApiCall)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isApiCall) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
