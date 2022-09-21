import type { UserInputModel, UserModel, UserPublicModel } from '../../../common';
import { User } from '../repositories';

export async function getUserPublicFromUser({
  password: _password,
  ...publicUser
}: UserModel): Promise<UserPublicModel> {
  return publicUser;
}

export async function getUsersPublicFromUsers(usersRaw: UserModel[]): Promise<UserPublicModel[]> {
  const users: UserPublicModel[] = [];

  for (let idx = 0; idx < usersRaw.length; idx++) {
    users.push(await getUserPublicFromUser(usersRaw[idx]!));
  }

  return users;
}

export async function addUser(userInput: UserInputModel): Promise<UserModel> {
  const model = await User.create(userInput);

  return model.toJSON();
}

export async function getUserById(userId: UserModel['id']): Promise<UserModel | undefined> {
  const model = await User.findByPk(userId);

  return model?.toJSON() ?? undefined;
}

export async function getUserByEmail(userEmail: UserModel['email']): Promise<UserModel | undefined> {
  const model = await User.findOne({
    where: {
      email: userEmail,
    },
  });

  return model?.toJSON() ?? undefined;
}
