const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const readline = require('readline');

const PORT = 8082;
const PROTO_FILE = './proto/Chat.proto';

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = grpc.loadPackageDefinition(packageDef);

const client = new grpcObj.chatPackage.ChatService(
  `0.0.0.0:${PORT}`, grpc.credentials.createInsecure()
);

const deadline = new Date();
deadline.setSeconds(deadline.getSeconds() + 5);
client.waitForReady(deadline, (err) => {
  if (err) {
    console.error(err);
    return;
  }
  onClientReady();
});

function onClientReady() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const username = process.argv[2];
  if (!username) {
    console.error("No username, can't join chat");
    process.exit();
  }

  const metadata = new grpc.Metadata();
  metadata.set("username", username);

  const call = client.Chat(metadata);

  rl.on("line", (line) => {
    if (line === "quit") {
      call.end();
    } else {
      const privateMessageRegex = /^@(\w+): (.+)$/;
      const groupMessageRegex = /^#(\w+): (.+)$/;
      const joinGroupRegex = /^#join:(\w+)$/;

      const privateMatch = line.match(privateMessageRegex);
      const groupMatch = line.match(groupMessageRegex);
      const joinMatch = line.match(joinGroupRegex);

      if (privateMatch) {
        const recipient = privateMatch[1];
        const message = privateMatch[2];
        console.log(`Sending private to ${recipient}: ${message}`);
        call.write({
          message: `@${recipient}: ${message}`
        });
      } else if (groupMatch) {
        const groupName = groupMatch[1];
        const groupMessage = groupMatch[2];
        console.log(`Sending group message to ${groupName}: ${groupMessage}`);
        call.write({
          message: `#${groupName}: ${groupMessage}`
        });
      } else if (joinMatch) {
        const groupName = joinMatch[1];
        console.log(`Joining group: ${groupName}`);
        call.write({
          message: `#join:${groupName}`,
        });
      } else {
        console.log(`Sending broadcast message: ${line}`);
        call.write({
          message: line
        });
      }
    }
  });

  call.on("data", (chunk) => {
    const isPrivateMessage = chunk.message.includes("@");
    const isGroupMessage = chunk.message.includes('#');

    if (isPrivateMessage) {
      console.log(`Private from ${chunk.username}: ${chunk.message}`);
    } else if (isGroupMessage) {
      console.log(`Group message from ${chunk.username}: ${chunk.message}`);
    } else {
      console.log(`Broadcast from ${chunk.username}: ${chunk.message}`);
    }
  });
}
