import React, { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import Video from './components/Video';
// import Videos from './components/Videos';
import RemoteVideos from './components/RemoteVideos'

const App = () => {
  const [state, setState] = useState({
    localStream: null,
    remoteStream: null,
    remoteStreams: [],
    peerConnections: {},
    selectedVideo: null,
    status: 'Please wait...'
  });

  const socketRef = useRef();
  const peerConnectionsRef = useRef({});

  const pc_config = {
    "iceServers": [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  };

  const sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true
    }
  };

//   const serviceIP = 'https://cc82bd38.ngrok.io/webrtcPeer';
  const serviceIP = 'https://localhost:8080/webrtcPeer';

  const getLocalStream = useCallback(() => {
    const success = (stream) => {
        console.log("Media stream susses ");
      window.localStream = stream;
      setState(prevState => ({ ...prevState, localStream: stream }));
      whoisOnline();
    };

    const failure = (e) => {
      console.log('getUserMedia Error: ', e);
    };

    const constraints = {
      video: true,
      options: {
        mirror: true,
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure);
  }, []);

  const whoisOnline = () => {

    console.log("check ", socketRef.current);
    sendToPeer('onlinePeers', null, { local: socketRef.current.id });
  };

  const sendToPeer = (messageType, payload, socketID) => {
    socketRef.current.emit(messageType, {
      socketID,
      payload
    });
  };

  const createPeerConnection = useCallback((socketID, callback) => {
    try {
      let pc = new RTCPeerConnection(pc_config);

      peerConnectionsRef.current = { ...peerConnectionsRef.current, [socketID]: pc };
      setState(prevState => ({
        ...prevState,
        peerConnections: peerConnectionsRef.current
      }));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendToPeer('candidate', e.candidate, {
            local: socketRef.current.id,
            remote: socketID
          });
        }
      };

      pc.oniceconnectionstatechange = (e) => {
        // Handle ice connection state change
        console.log("Connection stablished");
      };

      pc.ontrack = (e) => {
        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.streams[0]
        };

        setState(prevState => {
          const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: e.streams[0] };
          let selectedVideo = prevState.remoteStreams.filter(stream => stream.id === prevState.selectedVideo?.id);
          selectedVideo = selectedVideo.length ? {} : { selectedVideo: remoteVideo };

          return {
            ...prevState,
            ...selectedVideo,
            ...remoteStream,
            remoteStreams: [...prevState.remoteStreams, remoteVideo]
          };
        });
      };

      pc.close = () => {
        // Handle pc close
      };

    //   if (state.localStream)
    //     pc.addStream(state.localStream);

      callback(pc);
    } catch (e) {
      console.log('Something went wrong! pc not created!!', e);
      callback(null);
    }
  }, [ pc_config]); //state.localStream,

  useEffect(() => {

    console.log('Effect triggered');
    socketRef.current = io('http://localhost:8080/');
    // socketRef.current = io.connect(
    //   serviceIP,
    //   {
    //     path: 'https://localhost:8080/',
    //     // path: '/io/webrtc',
    //     query: {}
    //   }
    // );

    socketRef.current.on('connection-success', data => {
      getLocalStream();
      console.log( "data cusses : ",data.success);
      const status = data.peerCount > 1 ? `Total Connected Peers: ${data.peerCount}` : 'Waiting for other peers to connect';
      setState(prevState => ({ ...prevState, status }));
    });

    socketRef.current.on('peer-disconnected', data => {
      console.log('peer-disconnected', data);

      const remoteStreams = state.remoteStreams.filter(stream => stream.id !== data.socketID);

      setState(prevState => {
        const selectedVideo = prevState.selectedVideo?.id === data.socketID && remoteStreams.length 
          ? { selectedVideo: remoteStreams[0] } 
          : null;

        return {
          ...prevState,
          remoteStreams,
          ...selectedVideo,
        };
      });
    });

    socketRef.current.on('online-peer', socketID => {
      console.log('connected peers ... yahoo', socketID);
console.log("creating new pc ");
      createPeerConnection(socketID, pc => {
        console.log("creating offer");
        if (pc)
          pc.createOffer(sdpConstraints)
            .then(sdp => {
              pc.setLocalDescription(sdp);
console.log("creating offer : for ", socketID);
              sendToPeer('offer', sdp, {
                local: socketRef.current.id,
                remote: socketID
              });
            });
      });
    });

    socketRef.current.on('offer', data => {
console.log(" offer recived from other party");
console.log("creating --- peer connection" );
      createPeerConnection(data.socketID, pc => {
        console.log("chreated pc  : ", pc);
        // pc.addStream(state.localStream);
        // Add each track from the local stream to the peer connection
      state.localStream.getTracks().forEach(track => {
        pc.addTrack(track, state.localStream);
      });
      console.log("addtrack worked");

        pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
          pc.createAnswer(sdpConstraints)
            .then(sdp => {
              pc.setLocalDescription(sdp);

              sendToPeer('answer', sdp, {
                local: socketRef.current.id,
                remote: data.socketID
              });
            });
        });
      });
    });

    socketRef.current.on('answer', data => {
      const pc = peerConnectionsRef.current[data.socketID];
      console.log(data.sdp);
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {});
    });

    socketRef.current.on('candidate', (data) => {
      const pc = peerConnectionsRef.current[data.socketID];
      if (pc)
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    console.log( "current socekt :",socketRef.current);
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // Clean up peerConnections
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    };
  }, [createPeerConnection, sdpConstraints]);
//    [createPeerConnection, getLocalStream, state.localStream, sdpConstraints]

  const switchVideo = (_video) => {
    console.log( "Switch video : ",_video);
    setState(prevState => ({ ...prevState, selectedVideo: _video }));
  };

  console.log(state.localStream);
  const statusText = <div style={{ color: 'yellow', padding: 5 }}>{state.status}</div>;

  return (
    <div>
      <Video
        videoStyles={{
          zIndex:2,
          position: 'absolute',
          right:0,
          width: 200,
          height: 200,
          margin: 5,
          backgroundColor: 'black'
        }}
        videoStream={state.localStream}
        autoPlay muted>
      </Video>
      <Video
        videoStyles={{
          zIndex: 1,
          position: 'fixed',
          bottom: 0,
          minWidth: '100%',
          minHeight: '100%',
          backgroundColor: 'black'
        }}
        videoStream={state.selectedVideo && state.selectedVideo.stream}
        autoPlay>
      </Video>
      <br />
      <div style={{
        zIndex: 3,
        position: 'absolute',
        margin: 10,
        backgroundColor: '#cdc4ff4f',
        padding: 10,
        borderRadius: 5,
      }}>
        { statusText }
      </div>
      <div>
        <RemoteVideos
          switchVideo={switchVideo}
          remoteStreams={state.remoteStreams}
        ></RemoteVideos>
      </div>
      <br />
    </div>
  );
};

export default App;