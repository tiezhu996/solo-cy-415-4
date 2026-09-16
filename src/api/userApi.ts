import type { User, UserDraft } from '@/models/user';

import { DEFAULT_CREDIT_SCORE } from '@/constants/review';
import { storage, STORAGE_KEYS } from '@/utils/storage';

const seedUsers: User[] = [
  {
    id: 'user_me',
    nickname: '青禾',
    avatar: '',
    phone: '13800000001',
    location: '上海 · 徐汇',
    // 初始为中性默认分，首次演示评价初始化后按已生效评分平均分推导
    credit_score: DEFAULT_CREDIT_SCORE,
    created_at: new Date().toISOString(),
  },
  {
    id: 'user_lin',
    nickname: '林小雨',
    avatar: '',
    phone: '13800000002',
    location: '杭州 · 西湖',
    credit_score: DEFAULT_CREDIT_SCORE,
    created_at: new Date().toISOString(),
  },
  {
    id: 'user_chen',
    nickname: '陈木木',
    avatar: '',
    phone: '13800000003',
    location: '苏州 · 工业园',
    credit_score: DEFAULT_CREDIT_SCORE,
    created_at: new Date().toISOString(),
  },
];

export const userApi = {
  async list(): Promise<User[]> {
    const users = await storage.get<User[]>(STORAGE_KEYS.users, []);
    if (users.length) return users;
    await storage.set(STORAGE_KEYS.users, seedUsers);
    await storage.set(STORAGE_KEYS.currentUserId, seedUsers[0].id);
    return seedUsers;
  },

  async current(): Promise<User> {
    const users = await this.list();
    const currentUserId = await storage.get<string>(STORAGE_KEYS.currentUserId, seedUsers[0].id);
    return users.find((user) => user.id === currentUserId) ?? users[0];
  },

  async login(userId: string): Promise<User> {
    const users = await this.list();
    const user = users.find((item) => item.id === userId);
    if (!user) throw new Error('用户不存在');
    await storage.set(STORAGE_KEYS.currentUserId, user.id);
    return user;
  },

  async updateCurrent(draft: Partial<UserDraft>): Promise<User> {
    const users = await this.list();
    const current = await this.current();
    const nextUser: User = { ...current, ...draft };
    const nextUsers = users.map((item) => (item.id === current.id ? nextUser : item));
    await storage.set(STORAGE_KEYS.users, nextUsers);
    return nextUser;
  },
};
