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

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Signaling server active");
});

let connectedPeers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  connectedPeers.set(socket.id, socket);

  socket.emit("connection-success", {
    success: socket.id,
    peerCount: connectedPeers.size,
  });

  const broadcastPeerCount = () => {
    io.emit("peer-count-update", {
      peerCount: connectedPeers.size,
    });
  };

  broadcastPeerCount();

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    connectedPeers.delete(socket.id);
    broadcastPeerCount();
    io.emit("peer-disconnected", {
      socketID: socket.id,
    });
  });

  socket.on("onlinePeers", (data) => {
    // console.log("Data :" , data);
    // const { socketID , local } = data;
    // console.log( "socektId local :", data.socketID.local);
    console.log(`Received onlinePeers request from ${data.socketID.local}`);
    
    for (const [socketID, _socket] of connectedPeers.entries()) {
      if (socketID !== data.socketID.local) {
        console.log(`Notifying ${socketID} about new peer ${data.socketID.local}`);
        _socket.emit("online-peer", socketID);
      }
    }
  });

  socket.on("offer", (data) => {
    console.log( "offer recived from  : remote ", data.socketID.remote);
    // const { local, remote, payload } = data;
    // console.log(`Received offer from ${local} to ${remote}`);
   
    // const targetSocket = connectedPeers.get(remote);
    // if (targetSocket) {
    //   console.log(`Forwarding offer to ${remote}`);
    //   targetSocket.emit("offer", { socketID: local, sdp: payload });
    // } else {
    //   console.error(`Target peer ${remote} not found for offer`);
    // }


    for (const [socketID, socket] of connectedPeers.entries()) {
        // don't send to self
        console.log("sending offer to everyone ");
        if (socketID === data.socketID.remote) {
          // console.log('Offer', socketID, data.socketID, data.payload.type)
        //   here i change it spd to payload
          socket.emit('offer', {
              sdp: data.payload,
              socketID: data.socketID.local
            }
          )
        }
      }



  });

  socket.on("answer", (data) => {
    const { local, remote, payload } = data;
    console.log(`Received answer from ${local} to ${remote}`);

    const targetSocket = connectedPeers.get(remote);
    if (targetSocket) {
      console.log(`Forwarding answer to ${remote}`);
      targetSocket.emit("answer", { socketID: local, sdp: payload });
    } else {
      console.error(`Target peer ${remote} not found for answer`);
    }
  });

  socket.on("candidate", (data) => {
    const { local, remote, payload } = data;
    console.log(`Received ICE candidate from ${local} for ${remote}`);

    const targetSocket = connectedPeers.get(remote);
    if (targetSocket) {
      console.log(`Forwarding ICE candidate to ${remote}`);
      targetSocket.emit("candidate", { socketID: local, candidate: payload });
    } else {
      console.error(`Target peer ${remote} not found for ICE candidate`);
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend running on: http://localhost:${port}`);
});