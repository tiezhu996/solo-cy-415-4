import { showFailToast, showSuccessToast, showToast } from 'vant';

type MessageType = 'success' | 'error' | 'info';

export const message = (content: string, type: MessageType = 'info') => {
  if (type === 'success') {
    showSuccessToast(content);
    return;
  }
  if (type === 'error') {
    showFailToast(content);
    return;
  }
  showToast(content);
};

export const messageAsync = async <T>(task: () => Promise<T>, successText: string): Promise<T> => {
  try {
    const result = await task();
    message(successText, 'success');
    return result;
  } catch (error) {
    message(error instanceof Error ? error.message : '操作失败', 'error');
    throw error;
  }
};
