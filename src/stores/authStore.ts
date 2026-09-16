import { defineStore } from 'pinia';

import { userApi } from '@/api/userApi';
import type { User, UserDraft } from '@/models/user';
import { PAGE_MESSAGES } from '@/constants/messages';
import { message } from '@/utils/message';
import { validateUserDraft } from '@/utils/validators';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null as User | null,
    users: [] as User[],
    loading: false,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.currentUser),
  },
  actions: {
    async hydrate() {
      this.loading = true;
      try {
        this.users = await userApi.list();
        this.currentUser = await userApi.current();
      } finally {
        this.loading = false;
      }
    },
    async login(userId: string) {
      this.currentUser = await userApi.login(userId);
      message(`已切换为 ${this.currentUser.nickname}`, 'success');
    },
    async updateProfile(draft: Partial<UserDraft>) {
      const error = validateUserDraft({ ...this.currentUser, ...draft });
      if (error) {
        message(error, 'error');
        return;
      }
      this.currentUser = await userApi.updateCurrent(draft);
      this.users = await userApi.list();
      message(PAGE_MESSAGES.profileUpdated, 'success');
    },
  },
});
