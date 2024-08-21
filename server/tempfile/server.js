import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  },
});

app.use(cors());
const port = process.env.PORT || 8080;
// const peers = Server.of('/webrtcpeer');

// const io =peers;
// import os from 'os';

// const interfaces = os.networkInterfaces();
// const addresses = [];

// for (let dev in interfaces) {
//   interfaces[dev].forEach(details => {
//     if (details.family === 'IPv4' && !details.internal) {
//       addresses.push(details.address);
//     }
//   });
// }

// const ipAddress = addresses.length > 0 ? addresses[0] : 'localhost'; // Use the first IP address or fallback to 'localhost'

// server.listen(port, '0.0.0.0', () => {
//   console.log(`Backend running on: http://${ipAddress}:${port}`);
// });

// Serve static files from 'public' directory (if you have one)
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Signaling server active");
});


// keep a reference of all socket connections
let connectedPeers = new Map();
// default massage  or namespace
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  connectedPeers.set(socket.id, socket);
// console.log(socket.id , "  socekt : ", socket);

  socket.emit("connection-success", {
    success: socket.id,
    peerCount: connectedPeers.size,
  });

  const broadCast = () => {
    socket.broadcast.emit("joined-peers", {
      peerCount: connectedPeers.size,
    });
  };
  broadCast();

  console.log("connectedPeers after adding : size ", connectedPeers.size);
  const disconnectedPeer = (socketID) =>
    socket.broadcast.emit("peer-disconnected", {
      peerCount: connectedPeers.size,
      socketID: socketID,
    });

  socket.on("onlinePeers", (data) => {
    const { localID, remoteID, payload } = data;
    console.log("onlinePeers  Hi ");
    console.log(`onlinePeers Hi i am ${localID} `);
    
    for (const [socketID, _socket] of connectedPeers.entries()) {
      // dont send to self
      if (socketID !== localID) {
        console.log("onlinePeers", localID, " ,<-----localId--- remoteId ---->", socketID);
        // sending information of all the members
        console.log("Notifly other about peer" ,localID); 
        _socket.emit("online-peer", localID); //notify new peer about existing one 
        console.log(`Notified ${socketID} about new peer ${localID}`);
      }
    }
    console.log("Informed evryone ");
    
  });
  // handle peer disconnection 
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    connectedPeers.delete(socket.id);
    disconnectedPeer(socket.id);
    console.log("connectedPeers after adding : size ", connectedPeers.size);
  });

  // Handeling incoming offers 
  socket.on("offer", (data) => {
    const { localID, remoteID, payload } = data;
    console.log(`Received offer from ${localID} to ${remoteID}: <---this is me ?? ${socket.id} payload`);
    // for (const [socketID, socket] of connectedPeers.entries()) {
    //   //don't send to self
    //   if (socketID !== localID) {
    //     // console.log("checking candidate");

    //     // console.log(socketId ,data.payload.type);
    //     // console.log("Sending this offer to other client ");
    //   //   socket.emit("offer", {
    //   //     sdp: payload,
    //   //     socketId: localID,
    //   //   });
    //   // }
    //     socket.emit("offer", { localID, remoteID, payload });
    // }
    // }
    const targetSocket = connectedPeers.get(remoteID);
    // console.log( "targetSocket :",targetSocket);
    
    if (targetSocket) {
        console.log(`Forwarding offer to ${remoteID}`);
        targetSocket.emit("offer", { localID, remoteID, payload });
    } else {
        console.error(`Target peer ${remoteID} not found for offer`);
    }
  }
  
  )

  socket.on("answer", (data) => {

    const { localID, remoteID, payload } = data;
    console.log(`Received answer from ${localID} to ${remoteID}:payload type anser`);

const targetSocket = connectedPeers.get(remoteID);
if (targetSocket) {
  console.log(`Forwarding answer to ${remoteID}`);
  targetSocket.emit("answer", { localID, remoteID, payload });
} else {
  console.error(`Target peer ${remoteID} not found`);
}

  });

  // socket.on('offerOrAnswer', (data) =>{
  //   //send to the other peer(s) if any
  // // console.log("GOt offer to client : ", data);
  // // console.log("GOt offer to client  : ", JSON.stringify(data));

  //   for (const [socketId , socket] of connectedPeers.entries()){
  //     //don't send to self
  //     if(socketId !==data.socketId){
  //       console.log("checking candidate");

  // console.log(socketId ,data.payload.type);
  // console.log("Sending this offer to other client ");
  // socket.emit('offerOrAnswer', data.payload)

  //     }
  //   }

  // })

  socket.on("candidate", (data) => {
    //send candidate to the other peer if any
    const { localID, remoteID, payload } = data;
    console.log(`Received ICE candidate from ${localID} for ${remoteID}`);
    // for (const [socketID, socket] of connectedPeers.entries()) {
    //   //don't send to self
    //   console.log( "Cheecking recied candidate data :",data.remoteID );
      
    //   if (socketID === data.remoteID) {
    //     console.log(socketID, data.payload.type);
    //     socket.emit("candidate", {
    //       candidate: data.payload,
    //       socketID: data.localID,
    //     });
    //   }
    // }
    const targetSocket = connectedPeers.get(remoteID);
    if (targetSocket) {
        console.log(`Forwarding ICE candidate to ${remoteID}`);
        targetSocket.emit("candidate", {
            localID,
            remoteID,
            payload
        });
    } else {
        console.error(`Target peer ${remoteID} not found for ICE candidate`);
    }

  });
});

app.get("/test", (req, res) => {
  // Use path.join to resolve the directory and file path
  res.sendFile(path.join(__dirname, "test"));
});

// server.listen(port, () => console.log(`Server running on http://localhost:${port}`));

// server.listen(port, '0.0.0.0', () => { console.log(`Backend running on: http://localhost:${port}`);
// });

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend running on: http://localhost:${port}`);
});
