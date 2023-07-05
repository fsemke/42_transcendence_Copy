// import { Module } from '@nestjs/common';
// import { DataSource } from 'typeorm';
// import { ConfigModule } from '@nestjs/config';
// import { HttpModule } from '@nestjs/axios';
// import { TypeOrmModule } from '@nestjs/typeorm';


import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql';
import { JwtPayload } from '../auth/strategy/jwt.strategy';
import { CurrentJwtPayload } from './../users/decorator/current-jwt-payload.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import { UseGuards } from '@nestjs/common';
import { Match } from './match.entity';
import { createMatch } from './create-match.input';
import { GameService } from './game.service';


@Resolver()
export class GameResolver {

	constructor(private readonly gameService: GameService) {}

	@Query(() => [Match], { name: 'matches' })
	findAllMatches() {
	  return this.gameService.findAllMatches();
	}
  
	@Query(() => Match, { name: 'match' })
	findMatchById(
	  @Args('id', { type: () => Int, nullable: true }) id: number | undefined,
	  @CurrentJwtPayload() jwtPayload: JwtPayload,
	) {
	  if (typeof id === 'undefined')
		return this.gameService.findMatchById(jwtPayload.id);
	  return this.gameService.findMatchById(id);
	}
  
	
	// @Mutation(() => Match)
	// async createMatchDB(@Args() createMatchDB: createMatch) {
	// 	await this.gameService.createMatchDB(createMatchDB);
	// }

	// @Mutation(() => Match)
	// async createMatchDB(
	//   @CurrentJwtPayload() jwtPayload: JwtPayload,
	//   @Args() createMatchDB: createMatch,
	// ) {
	//   await this.usersService.updateUsername(
	// 	jwtPayload.id,
	// 	updateUserUsernameInput.username,
	//   );
	//   return this.usersService.findOne(jwtPayload.id);
	// }
}
