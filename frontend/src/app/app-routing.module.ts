import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';
import { SettingsComponent } from './settings/settings.component';
import { LoginComponent } from './login/login.component';
import { LoginGuard } from './guard/login.guard';
import { ChatComponent } from './chat/chat.component';
import { loginPageGuard } from './guard/login-page.guard';
import { GameComponent } from './game/game.component';
import { GameSearchComponent } from './game/game-search/game-search.component';
import { GameWatchComponent } from './game/game-watch/game-watch.component';
import { AlreadyConnectedComponent } from './already-connected/already-connected.component';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginPageGuard] },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, canActivate: [LoginGuard] },
  { path: 'profile/:username', component: ProfileComponent, canActivate: [LoginGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [LoginGuard] },
  { path: 'chat', component: ChatComponent, canActivate: [LoginGuard] },
	{ path: 'game', component: GameComponent, canActivate: [LoginGuard] }, //TO-DO: instead, route to matchmaking and then automaticall to game
	{ path: 'gameSearch', component: GameSearchComponent, canActivate: [LoginGuard] },
	{ path: 'gameWatch', component: GameWatchComponent, canActivate: [LoginGuard] },
	{ path: 'leaderboard', component: LeaderboardComponent, canActivate: [LoginGuard] },
  { path: 'alreadyConnected', component: AlreadyConnectedComponent},
  { path: '**', redirectTo: '/home', pathMatch: 'full'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
