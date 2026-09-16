import { defineComponent, h, onErrorCaptured, ref } from 'vue';

import { message } from '@/utils/message';

export default defineComponent({
  name: 'GlobalErrorBoundary',
  setup(_, { slots }) {
    const errorText = ref('');

    onErrorCaptured((error) => {
      errorText.value = error instanceof Error ? error.message : '页面发生未知错误';
      message(errorText.value, 'error');
      return false;
    });

    return () =>
      errorText.value
        ? h('section', { class: 'global-error' }, [
            h('strong', '页面暂时不可用'),
            h('p', errorText.value),
            h(
              'button',
              {
                type: 'button',
                onClick: () => {
                  errorText.value = '';
                },
              },
              '重试',
            ),
          ])
        : slots.default?.();
  },
});
