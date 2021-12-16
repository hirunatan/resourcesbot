import * as Datastore from 'nedb';
import { Message } from 'telegram-typings';

const contexts = new Datastore();

export function startDialog(msg: Message, initialState: string, cb) {
  if (cb) {
    contexts.update(
      { id: msg.chat.id },
      {
        id: msg.chat.id,
        state: initialState
      },
      { upsert: true, },
      cb
    );
  } else {
    contexts.update(
      { id: msg.chat.id },
      {
        id: msg.chat.id,
        state: initialState
      },
      { upsert: true, }
    );
  }
}

export function endDialog(msg: Message, cb) {
  contexts.remove(
    { id: msg.chat.id },
    {},
    cb
  );
}

export function setState(msg: Message, state: string) {
  contexts.update(
    { id: msg.chat.id },
    { $set: { state: state } },
    { returnUpdatedDocs: true }
  );
}

export function setValue(msg: Message, key: string, value: string, cb) {
  contexts.update(
    { id: msg.chat.id },
    { $set: { [key]: value } },
    { returnUpdatedDocs: true },
    cb
  );
}

export function getContext(msg: Message, cb) {
  contexts.findOne({ id: msg.chat.id }, (err, context) => {
    if (!err) {
      cb(context);
    } else {
      console.error('Error: ', err);
    }
  });
}

