import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Channel } from '../../models/channel';
import { CHANNELS } from '../../mock-data/mock_channels';
import graphQLService from '../graphQL/GraphQLService';

@Injectable({
  providedIn: 'root'
})
export class ChannelDataService {

	channels = CHANNELS;

	constructor() { }

	async getChannel(channelid: string): Promise<Channel> {
		const response = await graphQLService.query(
			`
				query getChannel($channelid: String!){
					channel(id: $channelid) {
						id
						name
						createdAt
						owner {
							id
							firstname
						}
						users {
							id
						}
					}
				}
			`,
			{ channelid },
			{ fetchPolicy: 'network-only' },
		);
		if (typeof response === 'undefined') {
			return Promise.reject(new Error('Channel not found'));
		}
		return response.channel;
	}

	//update - BE call instead; user is member from the channel
	// getChannelsOf(id: number): Observable<string[]> {
	// 	const channelsOfUser: string[] = [];
	// 	for (let i = 0; i < this.channels.length; i++) {
	// 		const tmpChannel = this.channels[i].users.find(elem => elem === id);
	// 		if (tmpChannel)
	// 			channelsOfUser.push(this.channels[i].name);
	// 	}
	// 	return of(channelsOfUser);
	// }

	//update - BE call instead; user can see the channel
	async getOtherVisibleChannels(id: number): Promise<Channel[]> {		
		const response = await graphQLService.query(
			`
				query getOtherVisibleChannels($id: Int!) {
					visibleChannelsWithoutUser(id: $id) {
						id
						name
						createdAt
						users {
							id
							intra
						}
					}
				}
			`,
			{ id },
			{ fetchPolicy: 'network-only' },
		);
		if (typeof response === 'undefined') {
			return Promise.reject(new Error('Channel not found'));
		}
		console.log('getOtherVisibleChannels:', response.visibleChannelsWithoutUser);
		return response.visibleChannelsWithoutUser;
	}

	//Test Backend query
	async getChannels(): Promise<Channel[]> {
		const response = await graphQLService.query(
			`
				query {
					channels {
						id
						name
						createdAt
						owner {
							id
							firstname
						}
						users {
							id
						}
					}
				}
			`,
			undefined,
			{ fetchPolicy: 'network-only' },
		);
		if (typeof response === 'undefined') {
			return Promise.reject(new Error('Empty channel data'));
		}
		const channels = response.channels;
		console.log(channels);
		return channels;
	}
}
