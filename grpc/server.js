const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PORT = 8082;
const PROTO_FILE = './proto/Chat.proto';

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = grpc.loadPackageDefinition(packageDef);
const randomPackage = grpcObj.chatPackage;

function main() {
  const server = getServer();

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Your server has started on port ${port}`);
    server.start();
  });
}

const callObjByUsername = new Map();
const groupMembers = new Map();

function getServer() {
  const server = new grpc.Server();
  server.addService(randomPackage.ChatService.service, {
    Chat: (call) => {
      handleRegister(call);

      call.on("data", (req) => {
        const username = call.metadata.get('username')[0];
        const msg = req.message;

        console.log(`${username} ==> ${msg}`);

        if (msg.startsWith('@')) {
          const recipient = msg.split(' ')[0].slice(1, -1);
          const privateMessage = msg.substring(recipient.length + 2);
          const recipientCall = callObjByUsername.get(recipient);

          if (recipientCall) {
            recipientCall.write({
              username: username,
              message: `@${recipient}: ${privateMessage}`
            });
          } else {
            console.log(`User ${recipient} is not online.`);
          }
        } else if (msg.startsWith('#creategroup:')) {
          const groupName = msg.split(':')[1].trim();
          const groupInfo = { group_name: groupName };
          groupMembers.set(groupName, new Set([username]));

          for (let [user, usersCall] of callObjByUsername) {
            usersCall.write({
              username: 'Server',
              message: `Group "${groupName}" has been created.`
            });
          }
        } else if (msg.startsWith('#join:')) {
          const groupName = msg.split(':')[1].trim();

          if (!groupMembers.has(groupName)) {
            call.write({
              username: 'Server',
              message: `Group "${groupName}" does not exist.`,
            });
          } else {
            for (let [user, usersCall] of callObjByUsername) {
              if (user !== username && groupMembers.get(groupName)?.has(user)) {
                usersCall.write({
                  username: 'Server',
                  message: `${username} has joined the group "${groupName}".`,
                });
              }
            }
            groupMembers.get(groupName)?.add(username);
          }
        } else if (msg.startsWith('*')) {
          const groupName = msg.split(' ')[0].slice(1, -1);
          const groupMessage = msg.substring(groupName.length + 2);

          for (let [user, usersCall] of callObjByUsername) {
            if (username !== user && groupMembers.get(groupName)?.has(user)) {
              usersCall.write({
                username: username,
                message: `#${groupName}: ${groupMessage}`
              });
            }
          }
        } else {
          for (let [user, usersCall] of callObjByUsername) {
            if (username !== user) {
              usersCall.write({
                username: username,
                message: msg
              });
            }
          }
        }
      });

      call.on("end", () => {
        const username = call.metadata.get('username')[0];
        callObjByUsername.delete(username);
        for (let [user, usersCall] of callObjByUsername) {
          usersCall.write({
            username: username,
            message: "Has Left the Chat!"
          });
        }
        console.log(`${username} is ending their chat session`);

        call.write({
          username: "Server",
          message: `See you later ${username}`
        });

        call.end();
      });
    }
  });

  return server;
}

function handleRegister(call) {
  const username = call.metadata.get('username')[0];

  if (!callObjByUsername.has(username)) {
    callObjByUsername.set(username, call);
    console.log(`${username} has connected`);
  }
}

main();
