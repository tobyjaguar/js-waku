import { Paper } from '@material-ui/core';
import { multiaddr } from 'multiaddr';
import PeerId from 'peer-id';
import React, { useEffect, useState } from 'react';
import './App.css';
import { ChatMessage } from 'waku-chat/chat_message';
import { WakuMessage } from 'waku/waku_message';
import { RelayDefaultTopic } from 'waku/waku_relay';
import Room from './Room';
import Waku from 'waku/waku';
import { WakuContext } from './WakuContext';

export const ChatContentTopic = 'dingpu';

interface State {
  messages: ChatMessage[],
  waku?: Waku
}

export default function App() {
  let [state, setState] = useState<State>({ messages: [] });


  useEffect(() => {
    async function initWaku() {
      try {
        const waku = await Waku.create({ config: { pubsub: { enabled: true, emitSelf: true } } });

        setState(({ messages }) => {
          return { waku, messages };
        });

        // FIXME: Connect to a go-waku instance by default, temporary hack until
        //  we have a go-waku instance in the fleet
        waku.libp2p.peerStore.addressBook.add(
          PeerId.createFromB58String('16Uiu2HAmVVi6Q4j7MAKVibquW8aA27UNrA4Q8Wkz9EetGViu8ZF1'),
          [multiaddr('/ip4/134.209.113.86/tcp/9001/ws')]);
      } catch (e) {
        console.log('Issue starting waku ', e);
      }

    }

    const handleNewMessages = (event: { data: Uint8Array }) => {
      const wakuMsg = WakuMessage.decode(event.data);
      if (wakuMsg.payload) {
        const chatMsg = ChatMessage.decode(wakuMsg.payload);
        const messages = state.messages.slice();
        messages.push(chatMsg);
        console.log('setState on ', messages);
        setState({ messages, waku: state.waku });
      }

    };

    if (!state.waku) {
      initWaku()
        .then(() => console.log('Waku init done'))
        .catch((e) => console.log('Waku init failed ', e));
    } else {
      state.waku.libp2p.pubsub.on(RelayDefaultTopic, handleNewMessages);

      // To clean up listener when component unmounts
      return () => {
        state.waku?.libp2p.pubsub.removeListener(RelayDefaultTopic, handleNewMessages);
      };
    }
  });

  const commandHandler = (cmd: string) => {
    let commandResponse = 'internal error';
    switch (cmd) {
      case '/help':
        commandResponse = '/help Display this help';
        break;
      default:
        commandResponse = 'Unknown Command'
    }

    setState(({waku, messages}) => {
      messages.push(new ChatMessage(new Date(), 'Command Response', commandResponse));
      return {waku, messages};
    })
  }

  return (
    <div className='App'>
      <div className='chat-room'>
        <WakuContext.Provider value={{ waku: state.waku }}>
          <Paper>
            <Room lines={state.messages} commandHandler={commandHandler}/>
          </Paper>
        </WakuContext.Provider>
      </div>
    </div>
  );
}
