import React from 'react';
import Video from './Video.js';

const RemoteVideos = ({ remoteStreams, switchVideo }) => {
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
      {remoteStreams.map((rVideo) => (
        <div
          id={rVideo.name}
          onClick={() => switchVideo(rVideo)}
          style={{ display: 'inline-block' }}
          key={rVideo.name} // Use unique identifier from rVideo
        >
          <Video
            videoStream={rVideo.stream}
            videoStyles={{
              cursor: 'pointer',
              objectFit: 'cover',
              borderRadius: 3,
              width: 120,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default RemoteVideos;
