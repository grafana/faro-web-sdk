import { v4 as uuidv4 } from 'uuid';

import type { User, UserInput, UserPublic } from '../../common';

export let users: User[] = [];

export function getUserPublicFromUser(user: User): UserPublic {
  const { password: _password, ...publicUser } = user;

  return publicUser;
}

export function addUser(userInput: UserInput): User {
  const id = uuidv4();

  users.push({
    id,
    ...userInput,
  });

  return getUserById(id)!;
}

export function getUserById(userId: User['id']): User | undefined {
  return users.find((user) => user.id === userId);
}

export function getUserByEmail(userEmail: User['email']): User | undefined {
  return users.find((user) => user.email === userEmail);
}
