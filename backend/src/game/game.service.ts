import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityNotFoundError, Like, QueryFailedError, Repository, UpdateResult } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Match } from './match.entity';
import { createMatch } from './create-match.input';


@Injectable()
export class GameService {

	constructor(
		@InjectRepository(Match) private readonly matchRepository: Repository<Match>,
		private readonly configService: ConfigService,
		private readonly httpService: HttpService,
	) {}

	// async createMatchDB(newMatch: createMatch): Promise<void> {
	// 	try {
	// 		await this.matchRepository.insert(newMatch = {
	// 			gameID: 1,
	// 			firstPlayer: "left",
	// 			secondPlayer: "right",
	// 			goalsFirstPlayer: 5,
	// 			goalsSecondPlayer: 0
	// 		});
	// 	} catch (error) {
	// 		if (!(error instanceof QueryFailedError)) 
	// 			return Promise.reject(error);
	// 		// const existingMatch: gameEnt[] = await this.gameRepository.find({where: { gfdsgfds }})
	// 	}
	// 	return Promise.resolve();
	// }

	async findAllMatches(): Promise<Match[]> {
		return this.matchRepository.find();
	}

	findMatchById(identifier: number): Promise<Match> {
		return this.matchRepository.findOneByOrFail({ gameID: identifier });
	}





}
