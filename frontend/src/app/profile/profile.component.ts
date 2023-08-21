import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';

import { User } from '../models/user';
import { UserDataService } from '../services/user-data/user-data.service';
import { Game, GameHistory } from '../models/game';
import { GameDataService } from '../services/game-data/game-data.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {

  selectedUser?: User;
	hasSelectedUser: boolean = true;
  activeUser?: User;
  gameHistory?: Array<GameHistory>;

  constructor(
    private userService: UserDataService,
    private route: ActivatedRoute,
    private gameservice: GameDataService
    ) {}

  async ngOnInit(): Promise<void> {
    const username = String(this.route.snapshot.paramMap.get('username'));
    await this.userService.findUserByUsername(username).then(user => this.selectedUser = user).catch((e) => this.hasSelectedUser = false);
		console.log(this.selectedUser);
		await this.userService.findSelf().then(user => this.activeUser = user)
    this.gameHistory = this.gameservice.getMatchesOfUser(this.selectedUser?.id);
  }

  isProfileOfActiveUser() {
    if (this.activeUser?.id === this.selectedUser?.id)
      return true;
    return false;
  }
}
