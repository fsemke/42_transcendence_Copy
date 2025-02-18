import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { User } from 'src/users/entities/user.entity';

@InputType()
export class CreateChannelInput {
  @Field(() => String)
  id: string;

  @Field(() => User)
  @IsNotEmpty()
  owner: User;

  @Field(() => String)
  name: string;

  @Field(() => String)
  @IsNotEmpty()
  type: string;

  @Field(() => String)
  password?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => User)
  users: User[];

  @Field(() => User)
  admins: User[];

  @Field(() => User)
  mutedUsers: User[];

  @Field(() => User)
  invitedUsers: User[];

  @Field(() => User)
  bannedUsers: User[];
}
