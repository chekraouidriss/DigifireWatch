import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth    = inject(AuthService);
  const router  = inject(Router);
  const allowed = route.data['roles'] as UserRole[] | undefined;

  if (!allowed || allowed.length === 0) return true;

  if (auth.hasRole(allowed)) return true;

  router.navigate(['/unauthorized']);
  return false;
};
