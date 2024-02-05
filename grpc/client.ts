import path from 'path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import {ProtoGrpcType} from './proto/random'
import readline from 'readline'

const PORT = 8082
const PROTO_FILE = './proto/random.proto'

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType


const client = new grpcObj.randomPackage.Random(
  `0.0.0.0:${PORT}`, grpc.credentials.createInsecure()
)

const deadline = new Date()
deadline.setSeconds(deadline.getSeconds() + 5)
client.waitForReady(deadline, (err) => {
  if (err) {
    console.error(err)
    return
  }
  onClientReady()
})


function onClientReady() {


  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const username = process.argv[2]
  if (!username) console.error("No username, can't join chat"), process.exit()


  const metadata = new grpc.Metadata()
  metadata.set("username", username)

  const call = client.Chat(metadata)
  
  // call.write({
  //   message: "register"
  // })

  

  rl.on("line", (line) => {
    if (line === "quit") {
      call.end();
    } else {
      const privateMessageRegex = /^@(\w+): (.+)$/;
      const groupMessageRegex = /^#(\w+): (.+)$/;
       const joinGroupRegex = /^#join:(\w+)$/;
      //const match = line.match(privateMessageRegex);
      
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
      }else if (groupMatch) {
        const groupName = groupMatch[1];
        const groupMessage = groupMatch[2];
        console.log(`Sending group message to ${groupName}: ${groupMessage}`);
        call.write({
          message: `#${groupName}: ${groupMessage}`
        });
      }else if (joinMatch) {
        const groupName = joinMatch[1];
        console.log(`Joining group: ${groupName}`);
        call.write({
          message: `#join:${groupName}`,
        });
      }
       else {
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
    //console.log("Message:", chunk.message);
    if (isPrivateMessage) {
      // Xử lý tin nhắn riêng
      console.log(`Private from ${chunk.username}: ${chunk.message}`);
    }else if (isGroupMessage) {
      // Xử lý tin nhắn nhóm
      console.log(`Group message from ${chunk.username}: ${chunk.message}`);
    }
     else {
      // Xử lý tin nhắn broadcast
      console.log(`Broadcast from ${chunk.username}: ${chunk.message}`);
    }
  });
}

