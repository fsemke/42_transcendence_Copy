import { Component, ViewChild, HostListener, ElementRef, AfterViewInit } from '@angular/core';

import { GameDisplayService } from 'src/app/services/game-data/game-display/game-display.service';

@Component({
  selector: 'app-game-display',
  templateUrl: './game-display.component.html',
  styleUrls: ['./game-display.component.css']
})

export class GameDisplayComponent implements AfterViewInit {
	
	moveUp: boolean;
	moveDown: boolean;
	ready: boolean;

	@ViewChild('canvasEle')
	private canvasEle: ElementRef<HTMLCanvasElement> = {} as ElementRef<HTMLCanvasElement>;
	private context: any;

	intervalID : any;

	constructor(private gameDisplayService: GameDisplayService) {
		this.moveUp = false;
		this.moveDown = false;
		this.ready = true;
		this.gameDisplayService.loadImages();
	}

	ngAfterViewInit() {
		this.context = this.canvasEle.nativeElement.getContext('2d');
		this.context.canvas.width = 1024;
		this.context.canvas.height = this.context.canvas.width / 1.333;
	}

	startGame() {
		this.intervalID = setInterval(() => {this.runGame()}, 1000 / 25);	
	}

	runGame() {
		this.racketMovement();
		this.gameDisplayService.gameControl();
		this.gameDisplayService.ballMovement();
		this.draw();
	}

	racketMovement() {
		if (this.moveUp == true && this.gameDisplayService.positions.racketLeftY > 8) {
			this.gameDisplayService.positions.racketLeftY -= 10;
		}
		if (this.moveDown == true && this.gameDisplayService.positions.racketLeftY < 600) {
				this.gameDisplayService.positions.racketLeftY += 10;
		}
	}

	draw() {
		this.context.drawImage(this.gameDisplayService.background.img, 0, 0, this.context.canvas.width, this.context.canvas.height);
		this.context.drawImage(this.gameDisplayService.racketLeft.img, this.gameDisplayService.positions.racketLeftX, this.gameDisplayService.positions.racketLeftY, this.gameDisplayService.racketLeft.width, this.gameDisplayService.racketLeft.height);
		this.context.drawImage(this.gameDisplayService.racketRight.img, this.gameDisplayService.positions.racketRightX, this.gameDisplayService.positions.racketRightY, this.gameDisplayService.racketRight.width, this.gameDisplayService.racketRight.height);

		this.context.drawImage(this.gameDisplayService.goalsLeft.img, this.gameDisplayService.goalsLeft.x, this.gameDisplayService.goalsLeft.y, this.gameDisplayService.goalsLeft.width, this.gameDisplayService.goalsLeft.height);
		this.context.drawImage(this.gameDisplayService.goalsRight.img, this.gameDisplayService.goalsRight.x, this.gameDisplayService.goalsRight.y, this.gameDisplayService.goalsRight.width, this.gameDisplayService.goalsRight.height);
	
		this.context.drawImage(this.gameDisplayService.ball.img, this.gameDisplayService.positions.ballX, this.gameDisplayService.positions.ballY, this.gameDisplayService.ball.width, this.gameDisplayService.ball.height);

		if (this.gameDisplayService.goalTrigger == true) {
			this.context.drawImage(this.gameDisplayService.goal.img, this.gameDisplayService.goal.x, this.gameDisplayService.goal.y, this.gameDisplayService.goal.width, this.gameDisplayService.goal.height);
			this.context.drawImage(this.gameDisplayService.explosion.img, this.gameDisplayService.explosion.x, this.gameDisplayService.explosion.y, this.gameDisplayService.explosion.width, this.gameDisplayService.explosion.height);
		}								
		if (this.gameDisplayService.gameEnds == true)
			this.context.drawImage(this.gameDisplayService.result.img, this.gameDisplayService.result.x, this.gameDisplayService.result.y, this.gameDisplayService.result.width, this.gameDisplayService.result.height);
	}

}
