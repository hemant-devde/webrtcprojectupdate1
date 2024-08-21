import React, { useState, useEffect } from 'react';
import video from './video';

const Video = (props) => {
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [rVideos, setRVideos] = useState([]);

  useEffect(() => {
    if (props.remoteStreams && props.remoteStreams !== remoteStreams) {
      const updatedRVideos = props.remoteStreams.map((rVideo, index) => {
        const video = (
          <Video
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

        console.log( "GOt the mediea for remote stream ", props.remoteStreams);
        

        return (
          <div
            id={rVideo.name}
            onClick={() => props.switchVideo(rVideo)}
            style={{ display: 'inline-block' }}
            key={index}
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

export default Video;
