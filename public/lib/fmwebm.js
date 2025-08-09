(function () {

  // Create <video> element dynamically and attach it to the DOM
  const video = document.createElement('video');
  video.id = 'DisplayWebMVideo';
  video.autoplay = true;
  video.muted = true;
  video.controls = true;

  video.style.maxWidth = '100%';
  video.style.Width = '100%';
  document.body.appendChild(video);
  // or append to a specific container

  // const video = document.getElementById('DisplayWebMVideo');
  const mediaSource = new MediaSource();
  let sourceBuffer;
  let WebMHeaderFound = false;

  video.src = URL.createObjectURL(mediaSource);

  mediaSource.addEventListener('sourceopen', () => {
    console.log('MediaSource opened');
    const mimeCodec = 'video/webm; codecs="vp8"';
    if (MediaSource.isTypeSupported(mimeCodec)) {
      sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    } else {
      console.error('Unsupported MIME type or codec:', mimeCodec);
    }
  });

  function isWebMHeaderStart(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 4) return -1;
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return 1;
    if (bytes[0] === 0x1F && bytes[1] === 0x43 && bytes[2] === 0xB6 && bytes[3] === 0x75) return 2;
    return -1;
  }

  
  function DecodeWebM(buffer, headerType) {
    if (headerType === 1 && sourceBuffer) {
      WebMCheckReset(buffer, headerType);
      return;
    }
    WebMAppendBuffer(buffer); // push buffer to mediaSource
  }

  function WebMCheckReset(buffer, headerType) {
    if (headerType === 1) WebMHeaderFound = true;
    if (headerType === 1 && sourceBuffer) {
      video.pause();
      try { video.currentTime = 0; } catch (e) { console.warn("Could not reset currentTime:", e); }

      const appendAfterReset = () => {
        sourceBuffer.removeEventListener('updateend', appendAfterReset);
        sourceBuffer.addEventListener('updateend', onAppended);
        try { WebMAppendBufferAndPlay(buffer); }
        catch (e) { console.error("Failed to append buffer after reset:", e); }
      };

      const onAppended = () => {
        sourceBuffer.removeEventListener('updateend', onAppended);
      };

      if (!sourceBuffer.updating) {
        try {
          sourceBuffer.abort(); // Optional
          const duration = video.duration || (video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 10);
          sourceBuffer.addEventListener('updateend', appendAfterReset);
          sourceBuffer.remove(0, duration);
        } catch (e) {
          console.warn("Error during stream reset:", e);
          WebMAppendBufferAndPlay(buffer);
        }
      } else {
        const waitThenReset = () => {
          sourceBuffer.removeEventListener('updateend', waitThenReset);
          WebMCheckReset(buffer, 1); // Retry reset
        };
        sourceBuffer.addEventListener('updateend', waitThenReset);
      }
    }
  }

  function WebMAppendBufferAndPlay(buffer) {
    if (sourceBuffer && WebMHeaderFound) {
      sourceBuffer.appendBuffer(buffer);
      video.play();
    }
  }

  function WebMAppendBuffer(buffer) {
    if (!sourceBuffer.updating) {
      WebMAppendBufferAndPlay(buffer);
    } else {
      const onUpdate = () => {
        sourceBuffer.removeEventListener('updateend', onUpdate);
        WebMAppendBufferAndPlay(buffer);
      };
      sourceBuffer.addEventListener('updateend', onUpdate);
    }
  }

  // Expose to global scope via namespace
  window.FMWebMPlayer = {
    isWebMHeaderStart,
    DecodeWebM,
    WebMCheckReset,
    WebMAppendBufferAndPlay,
    WebMAppendBuffer,
    get video() { return video; },
    get mediaSource() { return mediaSource; },
    get sourceBuffer() { return sourceBuffer; },
    get WebMHeaderFound() { return WebMHeaderFound; },
    set WebMHeaderFound(v) { WebMHeaderFound = v; }
  };
})();
