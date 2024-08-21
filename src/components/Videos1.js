import React, { useState, useEffect } from 'react';
import Video from './Video';

const Videos = (props) => {
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [rVideos, setRVideos] = useState([]);

  useEffect(() => {
    if ( props.remoteStreams && props.remoteStreams !== remoteStreams) {
      const updatedRVideos = props.remoteStreams.map((rVideo, index) => {

        console.log("Got the Stream for remote stream in Videos componenet");
        
        const video = (
          <Video
            key={index} // Adding key directly to Video component to avoid adding it in div
            videoStream={rVideo.stream}
            frameStyle={{ width: 120, float: 'left', padding: '0 3px' }}
            videoStyles={{
              cursor: 'pointer',
              objectFit: 'cover',
              borderRadius: 3,
              width: '100%',
            }}
          />
        );

        return (
          <div
            id={rVideo.name}
            onClick={() => props.switchVideo(rVideo)}
            style={{ display: 'inline-block' }}
            key={index} // Adding key to div
          >
            {video}
          </div>
        );
      });

      setRemoteStreams(props.remoteStreams);
      setRVideos(updatedRVideos);
    }
  }, [props.remoteStreams, remoteStreams, props.switchVideo]);

  return (
    <div
      style={{
        zIndex: 3,
        position: 'fixed',
        padding: '6px 3px',
        backgroundColor: 'rgba(0,0,0,0.3)',
        maxHeight: 120,
        top: 'auto',
        right: 10,
        left: 10,
        bottom: 10,
        overflowX: 'scroll',
        whiteSpace: 'nowrap',
      }}
    >
      {rVideos}
    </div>
  );
};

export default Videos;
