import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageObj } from 'src/objects/message';
import { UsersService } from 'src/users/users.service';
import { MessagesService } from 'src/messages/messages.service';
import { GameService } from 'src/game/game.service';
import { ChannelsService } from 'src/channels/channels.service';
import { ChannelMuteService } from 'src/channels/channel-mute/channel-mute.service';
import { NotFoundException } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';

@WebSocketGateway({
  cors: [
    `http://${process.env.DOMAIN}:80`,
    `http://${process.env.DOMAIN}:3000`,
  ],
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  intervalSearchOpp: any;
  openPopupSender: Map<number, number>;
  openPopupReceiver: Map<number, number>;

  constructor(
    private readonly usersService: UsersService,
    private gameService: GameService,
    private readonly messagesService: MessagesService,
    private readonly channelsService: ChannelsService,
    private readonly channelMuteService: ChannelMuteService,
  ) {
    this.openPopupSender = new Map();
    this.openPopupReceiver = new Map();
  }

  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('SocketGateway initialized');
  }

  async handleConnection(socket: Socket) {
    console.log('SocketClient connected:', socket.id);
  }

  async handleAlreadyConnected(socketId: string) {
    this.server.to(socketId).emit('alreadyConnected', {});
    this.server.to(socketId).disconnectSockets();
  }

  async handleDisconnect(client: Socket) {
    console.log('SocketClient disconnected:', client.id);
    try {
      const user = await this.usersService.findOnebySocketId(client.id);
	  if (this.gameService.playerWaitingID === user.id) {
		this.stopSearching(client, user.id);
	  }
      this.gameService.exitRoomsAfterSocketDiscon(user);
      this.closePopups(user);
      this.updateStatusAndEmit(user.id, 'offline');
      this.usersService.updateSocketid(user.id, ''); // Delete SocketId in database
    } catch (error) {
      console.log(
        'Error Socket: ' +
          client.id +
          ' socket disconnected without being logged in',
      );
    }
  }

  // user: User who closed the popup
  async closePopups(user: User) {
    const receiverID = this.openPopupSender.get(user.id);
    if (receiverID) {
      const receiverUser = await this.usersService.findOne(receiverID);
      this.server
        .to(receiverUser.socketid)
        .emit('withdrawnGameRequest', user.id);
      this.updateStatusAndEmit(receiverID, 'online');
      this.openPopupSender.delete(user.id);
    }
    const senderID = this.openPopupReceiver.get(user.id);
    if (senderID) {
      const sender = await this.usersService.findOne(senderID);
      this.server.to(sender.socketid).emit('gameRequestDecliend', user.id);
      this.updateStatusAndEmit(senderID, 'online');
      this.openPopupReceiver.delete(user.id);
    }
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, message: MessageObj) {
    console.log('Message received');
    this.messagesService.receiveMessage(client, message);

    if (message.receiverUser !== undefined) {
      //DM
      this.usersService.findOne(message.receiverUser.id).then((user) => {
        if (user && user.socketid !== '') {
          this.server.to(user.socketid).emit('message', message);
        }
      });
    } else if (message.receiverChannel !== undefined) {
      //Channel message
      if (
        await this.channelMuteService.isMuted(
          message.receiverChannel.id,
          message.sender.id,
        )
      ) {
        console.log('User is muted in this channel');
        return;
      }
      this.server.to(message.receiverChannel.id).emit('message', message);
    } else {
      console.log('Error: Receiver is neither a user nor a channel');
    }
  }

  @SubscribeMessage('createChannel')
  async createChannel(client: Socket, obj: any) {
    await this.channelsService.createChannel(
      client,
      obj.channelname,
      obj.ownerid,
      obj.type,
      obj.password,
    );
    this.server.emit('updateChannelList', {});
  }

  @SubscribeMessage('joinChannelRoom')
  joinChannelRoom(client: Socket, obj: any): void {
    this.channelsService.joinChannelRoom(client, obj.channelid, obj.userid);
  }

  @SubscribeMessage('joinChannel')
  async joinChannel(client: Socket, obj: any) {
    await this.channelsService.addUserToChannel(
      this.server,
      client,
      obj.channelid,
      obj.userid,
      obj.password,
    );
    this.server.to(obj.channelid).emit('updateChannel', {});
  }

  @SubscribeMessage('leaveChannel')
  async leaveChannel(client: Socket, obj: any) {
    await this.channelsService.removeUserFromChannel(
      this.server,
      obj.channelid,
      obj.userid,
    );
  }

  @SubscribeMessage('inviteUser')
  async inviteUser(client: Socket, obj: any) {
    try {
      const invitedUser = await this.channelsService.inviteUserToChannel(
        this.server,
        obj.inviteThisUserId,
        obj.channelid,
      );
      if (!invitedUser) {
        console.log('Error: Invited user not found');
        return;
      }

      await this.server.fetchSockets().then((sockets) => {
        for (const i of sockets) {
          if (i.id == invitedUser.socketid) {
            i.emit('updateChannelList', {});
            return;
          }
        }
      });
    } catch (error) {
      console.log('Error: ', error);
    }
    return;
  }

  @SubscribeMessage('declineChannelInvite')
  async declineChannelInvite(client: Socket, obj: any) {
    await this.channelsService.declineChannelInvite(
      this.server,
      obj.channelid,
      obj.userid,
    );
  }

  async updateStatusAndEmit(userid: number, status: string) {
    await this.usersService.updateStatus(userid, status);
    this.server.emit('updateUser', {
      id: userid,
      status: status,
    });
  }

  @SubscribeMessage('sendFriendRequest')
  async sendFriendRequest(client: Socket, obj: any) {
    await this.usersService.sendFriendRequest(
      this.server,
      obj.ownid,
      obj.otherid,
    );
  }

  @SubscribeMessage('acceptFriendRequest')
  async acceptFriendRequest(client: Socket, obj: any) {
    await this.usersService.acceptFriendRequest(
      this.server,
      obj.ownid,
      obj.otherid,
    );
  }

  @SubscribeMessage('declineFriendRequest')
  async declineFriendRequest(client: Socket, obj: any) {
    await this.usersService.declineFriendRequest(
      this.server,
      obj.ownid,
      obj.otherid,
    );
  }

  @SubscribeMessage('withdrawFriendRequest')
  async withdrawFriendRequest(client: Socket, obj: any) {
    await this.usersService.withdrawFriendRequest(
      this.server,
      obj.ownid,
      obj.otherid,
    );
  }

  @SubscribeMessage('removeFriend')
  async removeFriend(client: Socket, obj: any) {
    await this.usersService.removeFriend(this.server, obj.ownid, obj.otherid);
  }

  @SubscribeMessage('blockUser')
  async blockUser(client: Socket, obj: any) {
    await this.usersService.blockUser(this.server, obj.ownid, obj.otherid);
  }

  @SubscribeMessage('unblockUser')
  async unblockUser(client: Socket, obj: any) {
    await this.usersService.unblockUser(this.server, obj.ownid, obj.otherid);
  }

  @SubscribeMessage('channel:ChangeType')
  async changeType(client: Socket, obj: any) {
    await this.channelsService.changeType(
      obj.activeUser,
      obj.channelid,
      obj.newType,
      obj.password,
    );

    this.server.to(obj.channelid).emit('updateChannel', {});
    this.server.emit('updateChannelList', {});
  }

  @SubscribeMessage('channel:SetUserAsAdmin')
  async setAsAdmin(client: Socket, obj: any) {
    await this.channelsService.setUserAsAdmin(
      obj.activeUser,
      obj.selectedUser,
      obj.channelId,
    );
    this.server.to(obj.channelId).emit('updateChannel', {});
  }

  @SubscribeMessage('channel:RemoveUserAsAdmin')
  async RemoveUserAsAdmin(client: Socket, obj: any) {
    await this.channelsService.removeUserAsAdmin(
      obj.activeUser,
      obj.selectedUser,
      obj.channelId,
    );
    this.server.to(obj.channelId).emit('updateChannel', {});
  }

  @SubscribeMessage('channel:BanUser')
  async banUser(client: Socket, obj: any) {
    await this.channelsService.banUser(
      this.server,
      obj.activeUser,
      obj.selectedUser,
      obj.channelId,
    );
  }

  @SubscribeMessage('channel:UnbanUser')
  async unbanUser(client: Socket, obj: any) {
    await this.channelsService.unbanUser(
      obj.activeUser,
      obj.selectedUser,
      obj.channelId,
    );
    this.server.to(obj.channelId).emit('updateChannel', {});
  }

  @SubscribeMessage('channel:KickUser')
  async kickUser(client: Socket, obj: any) {
    await this.channelsService.kickUser(
      this.server,
      obj.activeUser,
      obj.selectedUser,
      obj.channelId,
    );
  }

  @SubscribeMessage('channel:MuteUser')
  async muteUser(client: Socket, obj: any) {
    await this.channelMuteService.muteUser(
      obj.activeUser,
      obj.selectedUser,
      obj.channelId,
      obj.time,
    );
  }

  @SubscribeMessage('channel:UnmuteUser')
  async unmuteUser(client: Socket, obj: any) {
    try {
      const channel = await this.channelsService.getChannelById(obj.channelId);
      const selectedUser = await this.usersService.findOne(obj.selectedUser);
      const activeUser = await this.usersService.findOne(obj.activeUser);
      if (!channel || !selectedUser || !activeUser)
        throw new NotFoundException('Channel or Users not found');
      if (
        channel.admins.find((user) => user.id == activeUser.id) == undefined &&
        channel.owner.id != activeUser.id
      )
        throw new Error('User is not admin');
      if (
        channel.admins.find((user) => user.id == selectedUser.id) !=
          undefined &&
        channel.owner.id != activeUser.id
      )
        throw new Error('Selected User is admin');
      await this.channelMuteService.unmuteUser(selectedUser, channel);
    } catch (error) {
      console.log(error);
    }
  }

  @SubscribeMessage('startGameWithRequest')
  async startGameRequest(client: Socket, data: number[]) {
	try {
		const gameRequestSenderID: number = data[1];
		const gameRequestRecipientID: number = data[0];
		this.openPopupSender.delete(gameRequestSenderID);
		this.openPopupReceiver.delete(gameRequestRecipientID);
		const gameMode = data[2];
		this.updateStatusAndEmit(gameRequestRecipientID, 'gaming');
		console.log(
		'The GameRequest from User with ID:  ',
		gameRequestSenderID,
		'  was accepted by the User with ID:   ',
		gameRequestRecipientID,
		);
		const user = await this.usersService.findOne(gameRequestSenderID);
		this.server
		.to(user.socketid)
		.emit('gameRequestAccepted', gameRequestRecipientID);
		const roomNbr = this.gameService.startWithGameRequest(
		gameRequestSenderID,
		this.server.sockets.sockets.get(user.socketid)!,
		gameRequestRecipientID,
		client,
		);
		this.gameService.startCountdown(roomNbr, this.server, gameMode);
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('startGameSearching')
  startGame(client: Socket, userID: number) {
	try {
		if (userID === this.gameService.playerWaitingID) {
		return;
		}
		this.updateStatusAndEmit(userID, 'gaming');
		const roomNbr = this.gameService.checkForOpponent(userID, client);
		console.log(
		'User with ID:  ',
		userID,
		' is searching a game. The roomNbr is:  ',
		roomNbr,
		);
		if (roomNbr !== undefined) {
		this.gameService.room = 0;
		this.gameService.startCountdown(roomNbr, this.server, 0);
		}
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('stopSearching')
  stopSearching(client: Socket, userID: number) {
	try {
		if (this.gameService.playerWaitingID === userID)
		{
			this.updateStatusAndEmit(this.gameService.playerWaitingID!, 'online');
			console.log(
			'User with ID:  ',
			this.gameService.playerWaitingID,
			' stoped searching a game.',
			);
			this.gameService.playerWaitingID = undefined;
			this.gameService.gameDataBEMap.delete(this.gameService.room);
			this.gameService.gameDataMap.delete(this.gameService.room);
			this.gameService.room = 0;
		}
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('setStatusToGaming')
  async setStatusToGaming(client: Socket, data: number[]) {
	try {
		this.updateStatusAndEmit(data[0], 'gaming');
		this.openPopupSender.set(data[0], data[1]);
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('sendGameRequest')
  async sendGameRequest(client: Socket, data: number[]) {
	try {
		const gameRequestSenderID: number = data[0];
		const gameRequestRecipientID: number = data[1];
		const gameMode: number = data[2];
		this.updateStatusAndEmit(gameRequestRecipientID, 'gaming');
		this.openPopupReceiver.set(gameRequestRecipientID, gameRequestSenderID);
		console.log(
		'User with ID:  ',
		gameRequestSenderID,
		'  sent a game requested in mode:  ',
		gameMode,
		'  to User with ID:   ',
		gameRequestRecipientID,
		);
		const user = await this.usersService.findOne(gameRequestRecipientID);
		this.server.to(user.socketid).emit('gotGameRequest', {
		senderID: gameRequestSenderID,
		gameMode: gameMode,
		});
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('gameRequestWithdrawn')
  async gameRequestWithdrawn(client: Socket, data: number[]) {
	try {
		const gameRequestSenderID: number = data[0];
		const gameRequestRecipientID: number = data[1];
		this.updateStatusAndEmit(gameRequestSenderID, 'online');
		this.updateStatusAndEmit(gameRequestRecipientID, 'online');
		console.log(
		'User with ID:  ',
		gameRequestSenderID,
		'  withdrawn the game requested to User with ID:   ',
		gameRequestRecipientID,
		);

		const user = await this.usersService.findOne(gameRequestRecipientID);
		this.server
		.to(user.socketid)
		.emit('withdrawnGameRequest', gameRequestSenderID);
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('gameRequestDecliend')
  async gameRequestDecliend(client: Socket, data: number[]) {
	try {
		const gameRequestSenderID: number = data[1];
		const gameRequestRecipientID: number = data[0];
		this.updateStatusAndEmit(gameRequestSenderID, 'online');
		this.updateStatusAndEmit(gameRequestRecipientID, 'online');
		console.log(
		'The GameRequest from User with ID:  ',
		gameRequestSenderID,
		'  was decliend by the User with ID:   ',
		gameRequestRecipientID,
		);

		const user = await this.usersService.findOne(gameRequestSenderID);
		this.server
		.to(user.socketid)
		.emit('gameRequestDecliend', gameRequestRecipientID);
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('sendRacketPositionLeft')
  getRacketPositionLeft(client: Socket, data: number[]) {
	try {
		if (this.gameService.gameDataMap.get(data[1])!) {
		this.gameService.gameDataMap.get(data[1])!.racketLeftY = data[0];
		}
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('sendRacketPositionRight')
  getRacketPositionRight(client: Socket, data: number[]) {
	try {
		if (this.gameService.gameDataMap.get(data[1])!) {
		this.gameService.gameDataMap.get(data[1])!.racketRightY = data[0];
		}
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('requestOngoingGames')
  requestOngoingGames(client: Socket, data: number[]) {
	try {
   		this.gameService.sendOngoingGames(this.server);
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('userLeftGame')
  userLeftGame(client: Socket, data: number[]) {
	try {
		this.updateStatusAndEmit(data[0], 'online');
		this.gameService.userLeftGame(data[0], data[1]);
	} catch (error) {
		console.log('Error: ', error);
	}
  }

  @SubscribeMessage('watchGame')
  watchGame(client: Socket, data: number) {
	try {
   	 this.gameService.joinWatchGame(data, client);
	} catch (error) {
		console.log('Error: ', error);
	}
  }
  @SubscribeMessage('StopWatchGame')
  stopWatchGame(client: Socket, data: number) {
	try {
    	this.gameService.leaveWatchGame(data, client);
	} catch (error) {
		console.log('Error: ', error);
	}
  }
}
