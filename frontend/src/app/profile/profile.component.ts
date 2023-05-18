import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';

import { User } from '../user';
import { UserDataService } from '../user-data.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  
  selectedUser?: User;
  activeUser?: User;
  
  constructor(
    private userService: UserDataService,
    private route: ActivatedRoute,
    private location: Location,
    private cookie: CookieService
    ) {}

  ngOnInit(): void {
    this.userService.getUserByID(parseInt(this.cookie.get("userid"))).subscribe(user => this.activeUser = user);
    const username = String(this.route.snapshot.paramMap.get('username'));
    this.userService.getUserByUsername(username).subscribe(user => this.selectedUser = user);
  }

  isProfileOfActiveUser() {
    if (this.activeUser?.id === this.selectedUser?.id)
      return true;
    return false;
  }
}
