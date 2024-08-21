import React from 'react';

const Video = ({ videoStream, videoStyles, autoPlay, muted }) => {
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (ref.current && videoStream) {
      ref.current.srcObject = videoStream;
    }
  }, [videoStream]);

  return (
    <video
      ref={ref}
      style={videoStyles}
      autoPlay={autoPlay}
      muted={muted}
    />
  );
};

export default Video;
