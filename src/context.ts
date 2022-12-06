import * as loki from 'lokijs';

import { Message } from 'telegram-typings';

export interface Context {
  id: string;
  state: string;
  values: any;
}

const db = new loki('Contexts', { verbose: true });

db.contexts = db.addCollection(
  'contexts', {
    indices: ['id'],
    ttl: 300000,             // Context expire at 5 minutes
    ttlInterval: 300000,     // and are automatically purged
  });

export function startDialog(msg: Message, initialState: string): Context {
  let context = db.contexts.findOne({ id: msg.chat.id });
  if (context) {
    context.state = initialState;
    db.contexts.update(context);
    return context;
  } else {
    return db.contexts.insert({
      id: msg.chat.id,
      state: initialState,
      values: {},
    });
  }
}

export function endDialog(msg: Message): void {
  const context = db.contexts.findOne({ id: msg.chat.id });
  db.contexts.remove(context);
}

export function setState(msg: Message, state: string): Context {
  const context = db.contexts.findOne({ id: msg.chat.id });
  context.state = state;
  db.contexts.update(context);
  return context;
}

export function setValue(msg: Message, key: string, value: string | null): Context {
  const context = db.contexts.findOne({ id: msg.chat.id });
  context.values[key] = value;
  db.contexts.update(context);
  return context;
}

export function getContext(msg: Message): Context {
  const context = db.contexts.findOne({ id: msg.chat.id });
  return context;
}

