export type User = {
  email: string;
  id: string;
  name: string;
  password: string;
};

export type UserPublic = {
  email: string;
  id: string;
  name: string;
};

export type UserInput = {
  email: string;
  name: string;
  password: string;
};
