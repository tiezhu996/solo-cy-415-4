import { ItemCondition, ItemStatus } from '@/constants/item';
import type { Item, ItemDraft } from '@/models/item';

import { storage, STORAGE_KEYS } from '@/utils/storage';

const seedItems: Item[] = [
  {
    id: 'item_camera',
    user_id: 'user_lin',
    title: '富士拍立得 Mini 旧机',
    description: '成色干净，附一包相纸，想换小型蓝牙音箱或桌面灯。',
    category: '数码',
    condition: ItemCondition.GOOD,
    images: [],
    status: ItemStatus.AVAILABLE,
    location: '杭州 · 西湖',
    created_at: new Date().toISOString(),
  },
  {
    id: 'item_books',
    user_id: 'user_chen',
    title: '设计与产品书 6 本',
    description: '搬家清书柜，适合产品/视觉入门，接受换绿植、咖啡器具。',
    category: '书籍',
    condition: ItemCondition.LIKE_NEW,
    images: [],
    status: ItemStatus.AVAILABLE,
    location: '苏州 · 工业园',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: 'item_chair',
    user_id: 'user_me',
    title: '可折叠露营椅',
    description: '去年买的，露营两次，有轻微使用痕迹，想换收纳盒。',
    category: '运动',
    condition: ItemCondition.GOOD,
    images: [],
    status: ItemStatus.AVAILABLE,
    location: '上海 · 徐汇',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'item_lamp',
    user_id: 'user_lin',
    title: '木质小夜灯',
    description: '暖光，适合床头。已完成交换，保留记录用于状态展示。',
    category: '家居',
    condition: ItemCondition.LIKE_NEW,
    images: [],
    status: ItemStatus.EXCHANGED,
    location: '杭州 · 西湖',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 90).toISOString(),
  },
];

export const itemApi = {
  async list(): Promise<Item[]> {
    const items = await storage.get<Item[]>(STORAGE_KEYS.items, []);
    if (items.length) return items;
    await storage.set(STORAGE_KEYS.items, seedItems);
    return seedItems;
  },

  async detail(id: string): Promise<Item | undefined> {
    const items = await this.list();
    return items.find((item) => item.id === id);
  },

  async create(draft: ItemDraft): Promise<Item> {
    const items = await this.list();
    const nextItem: Item = {
      ...draft,
      id: storage.createId('item'),
      status: draft.status ?? ItemStatus.AVAILABLE,
      created_at: new Date().toISOString(),
    };
    await storage.set(STORAGE_KEYS.items, [nextItem, ...items]);
    return nextItem;
  },

  async update(id: string, patch: Partial<Item>): Promise<Item> {
    const items = await this.list();
    const current = items.find((item) => item.id === id);
    if (!current) throw new Error('物品不存在');
    const nextItem = { ...current, ...patch };
    await storage.set(
      STORAGE_KEYS.items,
      items.map((item) => (item.id === id ? nextItem : item)),
    );
    return nextItem;
  },

  async setStatus(id: string, status: ItemStatus): Promise<Item> {
    return this.update(id, { status });
  },
};
