
import { Component, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserDataService } from '../services/user-data/user-data.service';
import { AuthService } from '../services/auth.service';
// import { loginPageGuard } from '../guard/login-page.guard';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

@Injectable()
export class LoginComponent {
  constructor(
    private readonly authService: AuthService,
    private readonly activatedRoute: ActivatedRoute,
    public userDataService: UserDataService,
    private readonly router: Router) {}

  activeUser?: boolean;
  twoFAEnabled?: boolean;
  twoFACode?: string;

  async ngOnInit() {
    console.log(`http://${environment.DOMAIN}/auth/login`);

    this.activeUser = await this.authService.isAuthenticated();
    this.twoFAEnabled = await this.authService.twoFAEnabled();
    this.activatedRoute.queryParamMap.subscribe((params) => {
      const code = params.get('code');
      const bypassId = params.get('id') as string | undefined;
      if (code) {
        this.router.navigate([], {
          queryParams: {
            'code': null,
          },
          queryParamsHandling: 'merge'
        });
				this.userDataService.login(code, bypassId).then(() => {
					//popup öffnen
					const popup = document.getElementById("popup-2FA-login");
					popup?.classList.toggle('show-popup');
					//auf verify Zeile 40-42 user-data-service.ts wiederholen
				});

      } else {
        //error????
				return;
      }
    });
  }

  onLogin() {

    window.location.href = `http://${environment.DOMAIN}:3000/auth/login`;
  };

	async popUpConfirm() {
		await this.userDataService.verify2FA(this.twoFACode!)
		.then(() => {
			const popup = document.getElementById("popup-2FA-login");
			popup?.classList.toggle('show-popup');
			this.userDataService.updateStatus('online');
      this.router.navigate(['/home']);
		})
		.catch(() => {
				console.log('error on veirfy 2fa');
		})
	}
}
