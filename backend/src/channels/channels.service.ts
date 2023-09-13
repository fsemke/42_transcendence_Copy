import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { Repository } from 'typeorm';
import { ChannelMuteService } from './channel-mute/channel-mute.service';
import { Channel } from './entities/channel.entity';
import { ChannelMute } from './entities/channelMute.entity';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly userService: UsersService,
    // private readonly channelMuteService: ChannelMuteService,
  ) {}

  async findAll(): Promise<Channel[]> {
    console.log('This action returns all channels');
    const channels = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.messages', 'messages')
      .leftJoinAndSelect('channel.owner', 'owner')
      .leftJoinAndSelect('channel.users', 'users')
      .leftJoinAndSelect('channel.admins', 'admins')
      .leftJoinAndSelect('channel.mutedUsers', 'mutedUsers')
      .leftJoinAndSelect('mutedUsers.user', 'mutedUsersUser')
      .leftJoinAndSelect('channel.invitedUsers', 'invitedUsers')
      .leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
      .getMany();
    return channels;
  }

  async getChannelById(id: string): Promise<Channel | undefined> {
    try {
      const channel = await this.channelRepository
        .createQueryBuilder('channel')
        .where('channel.id = :id', { id: id })
        .leftJoinAndSelect('channel.messages', 'messages')
        .leftJoinAndSelect('channel.owner', 'owner')
        .leftJoinAndSelect('channel.users', 'users')
        .leftJoinAndSelect('channel.admins', 'admins')
        .leftJoinAndSelect('channel.mutedUsers', 'mutedUsers')
        .leftJoinAndSelect('mutedUsers.user', 'mutedUsersUser')
        .leftJoinAndSelect('channel.invitedUsers', 'invitedUsers')
        .leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
        .getOne();
      if (channel === null) {
        throw new NotFoundException('Channel not found');
      } else {
        return channel;
      }
    } catch (error) {
      console.log(error);
    }
  }

  async getChannelByName(name: string): Promise<Channel | undefined> {
    try {
      const channel = await this.channelRepository
        .createQueryBuilder('channel')
        .where('channel.name = :name', { name: name })
        .leftJoinAndSelect('channel.messages', 'messages')
        .leftJoinAndSelect('channel.owner', 'owner')
        .leftJoinAndSelect('channel.users', 'users')
        .leftJoinAndSelect('channel.admins', 'admins')
        .leftJoinAndSelect('channel.mutedUsers', 'mutedUsers')
        .leftJoinAndSelect('mutedUsers.user', 'mutedUsersUser')
        .leftJoinAndSelect('channel.invitedUsers', 'invitedUsers')
        .leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
        .getOne();
      if (channel === null) {
        throw new NotFoundException('Channel not found');
      } else {
        return channel;
      }
    } catch (error) {
      console.log(error);
    }
  }

  async findVisibleChannelsWithoutUser(
    id: number,
  ): Promise<Channel[] | undefined> {
    try {
      const subQuery = this.channelRepository
        .createQueryBuilder('channel')
        .leftJoin('channel.users', 'user')
        .where('user.id = :id', { id })
        .select('channel.id');

      return await this.channelRepository
        .createQueryBuilder('channel')
        .leftJoinAndSelect('channel.users', 'users')
        .where(`channel.id NOT IN (${subQuery.getQuery()})`)
        .andWhere('channel.type IN (:...types)', {
          types: ['public', 'protected'],
        })
        .setParameters(subQuery.getParameters())
        .getMany();
    } catch (error) {
      console.log(error);
    }
  }

  async createChannel(
    client: Socket,
    channelname: string,
    owner: number,
    type: string,
    password?: string,
  ) {
    console.log('got channel', channelname);
    const user = await this.userService.findOne(owner);
    if (!user) {
      console.log('cant find user', owner);
      return;
    }
    const channelTest = await this.getChannelByName(channelname);
    if (channelTest) {
      console.log('channel already exists');
      return;
    }

    const chanEntity = this.channelRepository.create({
      name: channelname,
      owner: user,
      type: type,
      password: password,
      users: [user],
      admins: [user],
      mutedUsers: [],
      invitedUsers: [],
      bannedUsers: [],
    });

    user.ownedChannels = user.ownedChannels
      ? [...user.ownedChannels, chanEntity]
      : [chanEntity];
    user.channelList = user.channelList
      ? [...user.channelList, chanEntity]
      : [chanEntity];
    user.adminInChannel = user.adminInChannel
      ? [...user.adminInChannel, chanEntity]
      : [chanEntity];

    await this.channelRepository.save(chanEntity);
    client.join(chanEntity.id); //Is the id set here?
  }

  async joinChannelRoom(client: Socket, channelid: string, userid: number) {
    const channel = await this.channelRepository
      .createQueryBuilder('channel')
      .where('channel.id = :id', { id: channelid })
      .leftJoinAndSelect('channel.users', 'users')
      .getOne();
    if (!channel) {
      console.log('channel does not exist');
    }
    channel?.users.forEach((user) => {
      if (user.id === userid) {
        client.join(channelid);
        return;
      }
    });
  }

  async addUserToChannel(
    client: Socket,
    channelId: string,
    userid: number,
    password?: string,
  ) {
    try {
      const channel = await this.channelRepository.findOneByOrFail({
        id: channelId,
      });
      const user = await this.userService.findOne(userid);
      if (!channel || !user) {
        throw new NotFoundException('Channel or User not found');
      }

      if (channel.bannedUsers.find((u) => u.id === user.id) != undefined) {
        throw new Error('User is banned');
      }
      if (channel.type === 'private') {
        const foundUser = channel.invitedUsers.find((u) => u.id === userid);
        if (foundUser) {
          channel.invitedUsers = channel.invitedUsers.filter(
            (user) => user.id !== userid,
          );
        } else {
          throw new Error('User not invited');
        }
      } else if (channel.type === 'protected') {
        if (!password) {
          throw new Error('Channel is protected, but no password was provided');
        }
        if ((await channel.comparePassword(password)) == false) {
          throw new Error('Wrong password');
        }
      }
      channel.users.push(user);
      await this.channelRepository.save(channel);
      client.join(channelId);
      return;
    } catch (error) {
      console.log(error);
    }
  }

  async removeUserFromChannel(
    server: Server,
    channelId: string,
    userid: number,
  ) {
    try {
      const channel = await this.getChannelById(channelId);
      const user = await this.userService.findOne(userid);
      if (!channel || !user) {
        throw new NotFoundException('Channel or User not found');
      }

      if (channel.owner.id === user.id) {
        //Delete channel
        await this.channelRepository.delete(channel.id);
        server.emit('updateChannelList', {});
      } else {
        //Remove user from channel
        channel.admins = channel.admins.filter((user) => user.id !== userid);
        channel.users = channel.users.filter((user) => user.id !== userid);
        await this.channelRepository.save(channel);
        server.to(channelId).emit('updateChannel', {});
        server.to(user.socketid).socketsLeave(channelId);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async inviteUserToChannel(
    client: Socket,
    inviteThisUserId: number,
    activeUser: number,
    channelid: string,
  ): Promise<User | undefined> {
    console.log('user invited to channel', inviteThisUserId);
    try {
      const channel = await this.getChannelById(channelid);
      const invitedUser = await this.userService.findOne(inviteThisUserId);
      if (!channel || !invitedUser) {
        throw new NotFoundException('Channel or User not found');
      }

      if (channel.bannedUsers.find(user => user.id === invitedUser.id)) {
        throw new Error('User is banned');
      }
      channel.invitedUsers.push(invitedUser);
      await this.channelRepository.save(channel);
      return invitedUser;
    } catch (error) {
      console.log(error);
    }
  }

  async setUserAsAdmin(activeUserId: number, selectedUserId: number, channelId: string) {
    try {
      const channel = await this.getChannelById(channelId);
      const selectedUser = await this.userService.findOne(selectedUserId);
      const activeUser = await this.userService.findOne(activeUserId);
      if (!channel || !selectedUser || !activeUser) {
        throw new NotFoundException('Channel or Users not found');
      }

      if (channel.admins.includes(activeUser) == false && channel.owner.id !== activeUser.id) {
        throw new Error('User is not admin');
      }
      channel.admins.push(selectedUser);
      await this.channelRepository.save(channel);
    } catch (error) {
      console.log(error);
    }
  }

  async removeUserAsAdmin(activeUserId: number, selectedUserId: number, channelId: string) {
    try {
      const channel = await this.getChannelById(channelId);
      const selectedUser = await this.userService.findOne(selectedUserId);
      const activeUser = await this.userService.findOne(activeUserId);
      if (!channel || !selectedUser || !activeUser) {
        throw new NotFoundException('Channel or Users not found');
      }

      if (channel.owner.id !== activeUser.id) {
        throw new Error('User is not owner');
      }
      channel.admins = channel.admins.filter((user) => user.id !== selectedUser.id);
      await this.channelRepository.save(channel);
    } catch (error) {
      console.log(error);
    }
  }

  async banUser(server: Server, activeUserId: number, selectedUserId: number, channelId: string) {
    try {
      const channel = await this.getChannelById(channelId);
      const selectedUser = await this.userService.findOne(selectedUserId);
      const activeUser = await this.userService.findOne(activeUserId);
      if (!channel || !selectedUser || !activeUser) {
        throw new NotFoundException('Channel or Users not found');
      }
      if (channel.owner.id === selectedUser.id) {
        throw new Error("You can't ban the owner");
      }
      if (channel.admins.find(user => user.id === activeUser.id) == undefined && channel.owner.id !== activeUser.id) {
        throw new Error('You are not a admin');
      }
      if (channel.admins.find(user => user.id === selectedUser.id) != undefined && channel.owner.id !== activeUser.id) {
        throw new Error("You can't ban an admin");
      }
      channel.admins = channel.admins.filter((user) => user.id !== selectedUser.id);
      channel.users = channel.users.filter((user) => user.id !== selectedUser.id);
      channel.bannedUsers.push(selectedUser);
      await this.channelRepository.save(channel);
      server.to(channelId).emit('updateChannel', {});
      server.to(selectedUser.socketid).socketsLeave(channelId);
      server.to(selectedUser.socketid).emit('updateChannelList', {});
    } catch (error) {
      console.log(error);
    }
  }

  async unbanUser(activeUserId: number, selectedUserId: number, channelId: string) {
    try {
      const channel = await this.getChannelById(channelId);
      const selectedUser = await this.userService.findOne(selectedUserId);
      const activeUser = await this.userService.findOne(activeUserId);
      if (!channel || !selectedUser || !activeUser) {
        throw new NotFoundException('Channel or Users not found');
      }

      if (channel.admins.find(user => user.id === activeUser.id) == undefined && channel.owner.id !== activeUser.id) {
        throw new Error('User is not admin');
      }
      channel.bannedUsers = channel.bannedUsers.filter((user) => user.id !== selectedUser.id);
      await this.channelRepository.save(channel);
    } catch (error) {
      console.log(error);
    }
  }

  async kickUser(server: Server, activeUserId: number, selectedUserId: number, channelId: string) {
    try {
      const channel = await this.getChannelById(channelId);
      const selectedUser = await this.userService.findOne(selectedUserId);
      const activeUser = await this.userService.findOne(activeUserId);
      if (!channel || !selectedUser || !activeUser) {
        throw new NotFoundException('Channel or Users not found');
      }

      if (channel.admins.find(user => user.id === activeUser.id) == undefined && channel.owner.id !== activeUser.id) {
        throw new Error('User is not admin');
      }
      if (channel.admins.find(user => user.id === selectedUser.id) != undefined && channel.owner.id !== activeUser.id) {
        throw new Error('Selected User is admin');
      }
      channel.admins = channel.admins.filter((user) => user.id !== selectedUser.id);
      channel.users = channel.users.filter((user) => user.id !== selectedUser.id);
      await this.channelRepository.save(channel);
      server.to(channelId).emit('updateChannel', {});
      server.to(selectedUser.socketid).socketsLeave(channelId);
      server.to(selectedUser.socketid).emit('updateChannelList', {});
    } catch (error) {
      console.log(error);
    }
  }
}
