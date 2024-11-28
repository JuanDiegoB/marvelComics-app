import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environments';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { AuthStatus, CheckTokenResponse, LoginResponse, User } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl: string = environment.baseUrl;
  private http = inject( HttpClient );

  private _currentUser = signal<User|null>( null );
  private _authStatus = signal<AuthStatus>( AuthStatus.checking );

  public currentUser = computed( () => this._currentUser() );
  public authStatus = computed( () => this._authStatus() );

  constructor() {
    this.checkAuthStatus().subscribe();
  }

  private setAuthentication( user: User, token:string ): boolean {

    this._currentUser.set( user );
    this._authStatus.set( AuthStatus.authenticated );
    localStorage.setItem( 'token', token );
    localStorage.setItem( 'refreshToken', user.refreshToken );

    return true;
  }

  login( email: string, password: string ): Observable<boolean> {
    const url  = `${ this.baseUrl }/api/Auth/login`;
    const body = { email, password };

    return this.http.post<LoginResponse>( url, body )
      .pipe(
        map( ({ user, token }) => this.setAuthentication( user, token )),
        catchError( err => throwError( () => err.error.error ))
      );
  }

  checkAuthStatus():Observable<boolean> {

    const url   = `${ this.baseUrl }/api/auth/refresh`;
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');;

    if ( !refreshToken ) {
      this.logout();
      return of(false);
    }

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`);

    const params = new HttpParams()
      .set('refreshToken', refreshToken);

    return this.http.post<CheckTokenResponse>(url, null, { headers, params })
      .pipe(
        map( ({ user, token }) => this.setAuthentication( user, token )),
        catchError(() => {
          this._authStatus.set( AuthStatus.notAuthenticated );
          return of(false);
        })
      );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this._currentUser.set(null);
    this._authStatus.set( AuthStatus.notAuthenticated );
  }
}
