export interface User {
  _id?: string;
  walletAddress: string;
  username: string;
  displayName: string;
  email: string;
  country: string;
  avatar?: string;
  bio?: string;
  clan?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserSignupData {
  walletAddress: string;
  username: string;
  displayName: string;
  email: string;
  country: string;
}

export interface UserUpdateData {
  displayName?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  clan?: string;
}