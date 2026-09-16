export enum ItemStatus {
  AVAILABLE = 'available',
  EXCHANGED = 'exchanged',
  OFFLINE = 'offline',
}

export enum ItemCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  WORN = 'worn',
}

export const ITEM_STATUS_OPTIONS = [
  { label: '可交换', value: ItemStatus.AVAILABLE },
  { label: '已交换', value: ItemStatus.EXCHANGED },
  { label: '已下架', value: ItemStatus.OFFLINE },
];

export const ITEM_CONDITION_OPTIONS = [
  { label: '全新', value: ItemCondition.NEW },
  { label: '九成新', value: ItemCondition.LIKE_NEW },
  { label: '八成新', value: ItemCondition.GOOD },
  { label: '战损', value: ItemCondition.WORN },
];

export const ITEM_CATEGORIES = ['全部', '数码', '书籍', '家居', '服饰', '运动', '玩具', '其他'];

export const ITEM_STORAGE_HINTS = {
  statusKey: 'reswap:items',
  statusTouchedBy: ['models/item.ts', 'stores/itemStore.ts', 'components/common/ItemCard.vue', 'pages/ItemDetail.vue'],
};
