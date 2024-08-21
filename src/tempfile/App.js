import logo from "./logo.svg";
import "./App.css";
import { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import Video from "./components/Video";
import Videos from "./components/Videos";

function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [status, setStatus] = useState("Please wait...");
  const [remoteStreams, setRemoteStreams] = useState([]);
  // const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  const [peerConnections, setPeerConnections] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  let iceCandidateQueue = {};
  // sdpConstrains
  const sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  };
  // const socket = io('http://localhost:8080/', {
  //   path:'/',
  //   query:{
  //   }
  // });

  // const socket = io(' http://192.168.1.6:8080');
  // const socket = io('https://bitter-numbers-teach.loca.lt');
  const constrains = { video: true };
  // const localVideoStream= useRef(null);
  const textRef = useRef(null); // Correctly use useRef for the textarea
  const pc_config = {
    iceServers: [
      // {
      //   urls: 'stun:[STUN_IP]:[PORT]',
      //   'credentials':'[YOR CREDENTIALS]',
      //   'username': '[USERNAME]'
      // }

      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };

  // initializaing Socket.io connection ones
  useEffect(() => {
    const socketInstance = io("http://localhost:8080/");
    socketRef.current = socketInstance;
    // console.log(socketInstance);
    console.log(socketRef.current);
    // socketInstance.on("connect", () => {
    //   console.log(socket.id);
    //   // x8WIv7-mJelg7on_ALbx
    // });

    socketInstance.on("connection-success", (data) => {
      console.log("connection-success", data.success);
      console.log("getting media ");
      setIsConnected(true);
      getLocalMedia();
      setStatus(
        data.peerCount > 1
          ? `Total Connected Users ${data.peerCount}`
          : `Waiting for other users`
      );
    });

    socketInstance.on("online-peer", (socketID) => {
      // Already user exist this is notification about new user but socektID mine
      console.log(" hey i just join here ....I am  ", socketID);

      // console.log("Received online-peer:", socketID);
    
      console.log(`Hi ${socketID} you are most welcome. i am `, socketInstance.id);
      console.log("creating peer connection for :");
      // Here you would typically initiate an offer to the peer with the given socketID
      // create a new PC
      if(socketID !== socketInstance.id){
        console.log("creating peer connection for remote:",socketID);
        const pc = createPeerConnection(socketID);
        console.log(`Peer connecttion of ${socketInstance.id} stablist  with remote ${socketID}`);
        pc.createOffer(sdpConstraints)
          .then((sdp) => {
            // console.log("offer created", socketID);
            console.log("offer details", sdp);
  
            return pc.setLocalDescription(sdp);
          })
          .then(() => {
            // const offerPayload = {
            //   type: pc.localDescription.type,
            //   sdp: pc.localDescription.sdp,
            // };

            console.log(`hey ${socketID}, please accept my offer my name is ${socketInstance.id}`);
            
            sendToPeer("offer", pc.localDescription, {
              local: socketInstance.id,
              remote: socketID,
            });
          })
          .catch((error) => console.error("Error creating offer:", error));
        // setPeerConnections((prev) => ({ ...prev, [socketID]: pc }));
      }
    });
    socketInstance.on("offer", (data) => {
      console.log("Offer recived ", JSON.stringify(data));
      const { localID, remoteID, payload } = data;
      console.log("Payload: ", JSON.stringify(payload));

      if (!payload || !payload.type || !payload.sdp) {
        console.error("Invalid offer payload received:", payload);
        return;
      }
  // Don't create an answer if the offer is from ourselves
  if (remoteID === socketInstance.id) {
    console.log(" remote person available creating pc");
    const pc = createPeerConnection(remoteID);
   
    pc.setRemoteDescription(new RTCSessionDescription(payload))
    .then(() => pc.createAnswer())
    .then((sdp) => {
      // pc.setLocalDescription(sdp);
      // console.log("answer created :", sdp);

      // sendToPeer("answer", sdp, {
      //   local: socketInstance.id,
      //   remote: remoteID,
      // });

      return pc.setLocalDescription(sdp);
    })
    .then(() => {
      // const answerPayload = {
      //   type: pc.localDescription.type,
      //   sdp: pc.localDescription.sdp,
      // };
      console.log("Sending answer to:", remoteID);
      
      sendToPeer("answer", pc.localDescription, {
        local: socketInstance.id,
        remote: localID,
    });
    checkIceCandidateQueue(localID);
    })
    .catch((error) => console.error("Error handling offer:", error));

} // setPeerConnections((prev) => ({ ...prev, [remoteID]: pc }));
    });
    socketInstance.on("answer", (data) => {
      console.log("Answer received:", JSON.stringify(data));
  const { localID, remoteID, payload } = data;
      const pc = peerConnections[remoteID];
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(payload))
        .catch(error => console.error("Error setting remote description:", error));
      }else {
        console.log("No peer connection found");
        
      }
    });
    socketInstance.on("peer-disconnected", (data) => {
      console.log("peer-disconnected", data);

      // Filter out the disconnected peer's stream
      console.log("updatedRemoteStreams");

      const updatedRemoteStreams = remoteStreams.filter(
        (stream) => stream.id !== data
      );
      console.log("Update stream", updatedRemoteStreams);
      // Update the state
      setRemoteStreams(updatedRemoteStreams);
      setIsConnected(false);
    });
    socketInstance.on("candidate", (data) => {
      const { remoteID, payload } = data;
      const pc = peerConnections[remoteID];
      
      if (pc) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          pc.addIceCandidate(new RTCIceCandidate(payload))
            .catch(error => console.error("Error adding ICE candidate:", error));
        } else {
          if (!iceCandidateQueue[remoteID]) {
            iceCandidateQueue[remoteID] = [];
          }
          iceCandidateQueue[remoteID].push(payload);
        }
      }
    });
    return () => {
      socketInstance.disconnect();
    };
  }, []);


  function checkIceCandidateQueue(remoteID) {
    if (iceCandidateQueue[remoteID]) {
      iceCandidateQueue[remoteID].forEach(candidate => {
        peerConnections[remoteID].addIceCandidate(new RTCIceCandidate(candidate))
          .catch(error => console.error("Error adding queued ICE candidate:", error));
      });
      delete iceCandidateQueue[remoteID];
    }
  }
  const statusText = (
    <div style={{ color: "yellow", padding: 5 }}>{status}</div>
  );

  // const user = "HEmant ";
  // socket.emit('joined-room', user);

  const success = (stream) => {
    console.log("Success stream", stream);
    setLocalStream(stream);
  };
  useEffect(() => {
    if (localStream) {
      console.log("localStream updated:", localStream);
      whoIsOnline();
    }
  }, [localStream]);
  const failure = (e) => {
    console.log("Fail getting stream", e);
  };
  async function getLocalMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constrains);
      success(stream);
    } catch (e) {
      failure(e);
    }
  }

  // Create a function to add tracks to a peer connection:
  function addTracksToPC(pc, stream) {
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }
  function whoIsOnline() {
    console.log("I am curret user : ", socketRef.current);
    const socket = socketRef.current;

    if (socket && localStream) {
      console.log("Hey I am :", socket.id , " Checking for others ");
      sendToPeer("onlinePeers", null, { local: socket.id });
    } else {
      console.log(
        "Can't check online peers: socket or localStream not available"
      );
    }
  }

  // sentTopeer(message ,)
  function sendToPeer(messageType, payload, { local, remote }) {
    // console.log(  "sendToPeer sending this masgs ", ` ${socketID}sendToPeer: ${messageType}`, socket.id );

    console.log("Befor sending make sure it me :", socketRef.current);
    const socket = socketRef.current;
  
    console.log("Offer sending ....");

    if (socket) {
      console.log(
        `Sending ${messageType}:`,
        JSON.stringify({ payload, local, remote })
      );
      socket.emit(messageType, { payload, localID: local, remoteID: remote });
    } else {
      console.error("Socket is not initialized.");
    }
  }
  // create PeerConnection
  function createPeerConnection(remoteID) {
    try {
      if (peerConnections[remoteID]) {
        console.log(`Peer connection to ${remoteID} already exists`);
        return peerConnections[remoteID];
    }
      const pc = new RTCPeerConnection(pc_config);

      console.log( socketRef.current.id, ` createPeerconnection  with ${ remoteID }: and seting peers`,pc);
      setPeerConnections( prev => ({ ...prev, remoteID: pc }));

      console.log("Check all  available peers connection :", peerConnections);
      // pc.onicecandidate = (e) => {

      //   if (e.candidate) {
      //     console.log("creating ICECandidate");
          
      //     sendToPeer("candidate", e.candidate, {
      //       local: socketRef.current.id, //socketInstance.id Use the local socket ID
      //       remote: remoteID,  // Use the remote socket ID
      //     });
      //   }
      // };
      pc.ontrack = (e) => {
        const remoteVideo = {
          id: remoteID,
          name: remoteID,
          stream: e.streams[0],
        };
        // setRemoteStreams(prevStreams => [...prevStreams, remoteVideo]);
        setRemoteStreams((prevStreams) => {
          if (!prevStreams.some((stream) => stream.id === remoteID)) {
            return [...prevStreams, remoteVideo];
          }
          return prevStreams;
        });
      };

      if (localStream) {
        addTracksToPC(pc, localStream);
      }
     
      return pc;
    } catch (e) {
      console.log("Something wwrong pc not created", e);
      return null;
    }
  }
  const switchVideo = (_video) => {
    console.log("Swithing video", _video);
    setSelectedVideo(_video);
  };
  // floting video
  const Video = ({ videoStream, videoStyles, autoPlay, muted }) => {
    const videoRef = useRef(null);

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
      }
    }, [videoStream]);

    return (
      <video
        ref={videoRef}
        style={videoStyles}
        autoPlay={autoPlay}
        muted={muted}
      />
    );
  };

  return (
    <div>
      <Video
        videoStyles={{
          zIndex: 2,
          position: "absolute",
          right: 0,
          width: 200,
          height: 200,
          margin: 5,
          backgroundColor: "black",
        }}
        // ref={this.localVideoref}
        videoStream={localStream}
        autoPlay
        muted
      ></Video>
      <Video
        videoStyles={{
          zIndex: 1,
          position: "fixed",
          bottom: 0,
          minWidth: "100%",
          minHeight: "100%",
          backgroundColor: "black",
        }}
        // ref={ this.remoteVideoref }
        videoStream={selectedVideo && selectedVideo.stream}
        autoPlay
      ></Video>{" "}
      <br />
      <div
        style={{
          zIndex: 3,
          position: "absolute",
          margin: 10,
          backgroundColor: "#cdc4ff4f",
          padding: 10,
          borderRadius: 5,
        }}
      >
        <div style={{ color: "yellow", padding: 5 }}>{status}</div>
      </div>
      <div>
        <Videos
          switchVideo={switchVideo}
          remoteStreams={remoteStreams}
        ></Videos>
      </div>
      <br />
    </div>
  );
}

export default App;
