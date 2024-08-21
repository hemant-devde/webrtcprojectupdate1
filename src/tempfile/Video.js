import React, { useRef, useEffect } from 'react';

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

export default Video;
