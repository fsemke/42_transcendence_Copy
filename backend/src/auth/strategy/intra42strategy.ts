import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../service/auth.service';
import { ConfigService } from "@nestjs/config";

@Injectable()
export class Intra42Strategy extends PassportStrategy(Strategy) {
	constructor(private authService: AuthService) {
		//
		super();
	}
}