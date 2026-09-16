export interface User {
  id: string;
  nickname: string;
  avatar: string;
  phone: string;
  location: string;
  credit_score: number;
  created_at: string;
}

export type UserDraft = Omit<User, 'id' | 'credit_score' | 'created_at'> & {
  credit_score?: number;
};
