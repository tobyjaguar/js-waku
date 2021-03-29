import Waku from '../build/main/lib/waku';
import { TOPIC } from '../build/main/lib/waku_relay';
import { Message } from '../build/main/lib/waku_message';

import readline from 'readline';
import { delay } from '../build/main/test_utils/delay';

;(async function() {
  const opts = processArguments();

  const waku = await Waku.create({ listenAddresses: [opts.listenAddr] });

  // TODO: Bubble event to waku, infere topic, decode msg
  waku.libp2p.pubsub.on(TOPIC, event => {
    const msg = Message.fromBinary(event.data);
    console.log(msg.utf8Payload());
  });

  console.log('Waku started');

  if (opts.staticNode) {
    console.log(`dialing ${opts.staticNode}`);
    await waku.dial(opts.staticNode);
  }

  await new Promise((resolve) =>
    waku.libp2p.pubsub.once('gossipsub:heartbeat', resolve)
  );

  // TODO: identify if it is possible to listen to an event to confirm dial
  // finished instead of an arbitrary delay.
  await delay(2000);
  // TODO: Automatically subscribe
  await waku.relay.subscribe();
  console.log('Subscribed to waku relay');

  await new Promise((resolve) =>
    waku.libp2p.pubsub.once('gossipsub:heartbeat', resolve)
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('Ready to chat!');
  rl.prompt();
  rl.on('line', async (line) => {
    rl.prompt();
    const msg = Message.fromUtf8String('(js-chat) ' + line);
    await waku.relay.publish(msg);
  });

})();

interface Options {
  staticNode?: string;
  listenAddr: string;
}

function processArguments(): Options {
  let passedArgs = process.argv.slice(2);

  let opts: Options = {listenAddr: '/ip4/0.0.0.0/tcp/0'};

  while (passedArgs.length) {
    const arg = passedArgs.shift();
    switch (arg) {
      case '--staticNode':
        opts = Object.assign(opts, { staticNode: passedArgs.shift() });
        break;
      case '--listenAddr':
        opts = Object.assign(opts, { listenAddr: passedArgs.shift() });
        break;
      default:
        console.log(`Unsupported argument: ${arg}`);
        process.exit(1)
    }
  }

  return opts;
}
