import { Component, OnInit } from '@angular/core';

import { User } from '../models/user';
import { SocketService } from '../services/socket/socket.service';
import { AuthService } from '../services/auth.service';
import { UserDataService } from '../services/user-data/user-data.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
	
	activeUser?: User;
	isAuthenticated: boolean = false;
	
	constructor(
		private authService: AuthService,
		private userDataService: UserDataService
		) {}

	async ngOnInit() {
		this.checkForActiveUser();
	}

	checkForActiveUser() {
		setInterval(() => {
			this.authService.isAuthenticated().then(isAuthenticated => this.isAuthenticated = isAuthenticated);
			if (this.isAuthenticated)
				this.userDataService.findSelf().then(user => this.activeUser = user);
		}, 500);
	}
}
