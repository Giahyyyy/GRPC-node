import path from 'path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import {ProtoGrpcType} from './proto/random'
import { RandomHandlers } from './proto/randomPackage/Random'

import { ChatRequest } from './proto/randomPackage/ChatRequest'
import { ChatResponse } from './proto/randomPackage/ChatResponse'

const PORT = 8082
const PROTO_FILE = './proto/random.proto'

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType
const randomPackage = grpcObj.randomPackage

function main() {
  const server = getServer()

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(err)
      return
    }
    console.log(`Your server as started on port ${port}`)
    server.start()
  })
}


const callObjByUsername = new Map<string, grpc.ServerDuplexStream<ChatRequest, ChatResponse>>()

function getServer() {
  const server = new grpc.Server()
  server.addService(randomPackage.Random.service, {
    
    Chat: (call) => {
      handleRegister(call);

      call.on("data", (req) => {
        const username = call.metadata.get('username')[0] as string;
        const msg = req.message;
        
        console.log(`${username} ==> ${msg}`);
      
        if (msg.startsWith('@')) {
          // Tin nhắn riêng
          const recipient = msg.split(' ')[0].slice(1, -1);
          const privateMessage = msg.substring(recipient.length + 2);
          //console.log("Recipient:", recipient);
          //console.log("Current state of callObjByUsername:", callObjByUsername);
          const recipientCall = callObjByUsername.get(recipient);

          
          if (recipientCall) {
            recipientCall.write({
              username: username,
              message: `@${recipient}: ${privateMessage}`
            });
          } else {
            console.log(`User ${recipient} is not online.`);
          }
        } else {
          // Tin nhắn broadcast
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
        const username = call.metadata.get('username')[0] as string
        callObjByUsername.delete(username)
        for(let [user, usersCall] of callObjByUsername) {
            usersCall.write({
              username: username,
              message: "Has Left the Chat!"
            })
        }
        console.log(`${username} is ending their chat session`)

        call.write({
          username: "Server",
          message: `See you later ${username}`
        })

        call.end()
      })

    }
  } as RandomHandlers)

  return server
}

function handleRegister(call: grpc.ServerDuplexStream<ChatRequest, ChatResponse>) {
  const username = call.metadata.get('username')[0] as string;

  if (!callObjByUsername.has(username)) {
    // Chỉ thêm người dùng mới vào một lần
    callObjByUsername.set(username, call);
    console.log(`${username} has connected`);
  }

  
}


main()