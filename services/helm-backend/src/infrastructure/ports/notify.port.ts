export type NotifyMessage = {
  channel: 'email' | 'sms' | 'push' | 'console';
  templateKey: string;
  to: string;
  payload: Record<string, unknown>;
};

/** Port for transactional notifications. */
export interface NotifyPort {
  send(message: NotifyMessage): Promise<void>;
}

export const NOTIFY_PORT = Symbol('NOTIFY_PORT');
