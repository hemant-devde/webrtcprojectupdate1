import React, { useState, useEffect } from 'react';
import Video from './Video';

const Videos = ({ remoteStreams, switchVideo }) => {
  const [rVideos, setRVideos] = useState([]);

  useEffect(() => {
    if (remoteStreams) {
      const updatedRVideos = remoteStreams.map((rVideo, index) => {
        return (
          <div
            id={rVideo.name}
            onClick={() => switchVideo(rVideo)}
            style={{ display: 'inline-block' }}
            key={index}
          >
            <Video
              videoStream={rVideo.stream}
              videoStyles={{
                cursor: 'pointer',
                objectFit: 'cover',
                borderRadius: 3,
                width: '100%',
              }}
            />
          </div>
        );
      });

      setRVideos(updatedRVideos);
    }
  }, [remoteStreams, switchVideo]);

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
