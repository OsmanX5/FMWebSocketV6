(function () {
  // Create canvas dynamically
  const canvas = document.createElement('canvas');
  canvas.id = 'DisplayVP8Frame';
  canvas.style.width = '100%';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const decoder = new VideoDecoder({
    output: frame => handleDecodedFrame(frame),
    error: e => console.error("Decode error:", e),
  });

  decoder.configure({ codec: 'vp8' });

  function handleDecodedFrame(frame) {
    try {
      createImageBitmap(frame).then((bitmap) => {
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
      });
    } catch (e) {
      console.error("Failed to draw frame:", e);
    }
    frame.close();
  }

  function VP8FrameInfo(frame) {
    let width = 0, height = 0;
    if (!frame || frame.length < 10) return { isKeyframe: false, width: 0, height: 0 };
    const isKeyframe = (frame[0] & 0x1) === 0;
    if (!isKeyframe) return { isKeyframe: false, width: 0, height: 0 };
    if (frame[3] !== 0x9D || frame[4] !== 0x01 || frame[5] !== 0x2A) return { isKeyframe: false, width: 0, height: 0 };
    width = frame[6] | ((frame[7] & 0x3F) << 8);
    height = frame[8] | ((frame[9] & 0x3F) << 8);
    return { isKeyframe: true, width, height };
  }

  let foundKeyFrame = false;

  function FMVP8Decode(vp8FrameBuffer) {
    const info = VP8FrameInfo(vp8FrameBuffer);
    if (info.isKeyframe) {
      foundKeyFrame = true;

      const aspectRatio = info.width / info.height;
      const targetWidth = canvas.offsetWidth || 640;
      const targetHeight = Math.round(targetWidth / aspectRatio);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      if (typeof FMHTML_SetElementById === "function") {
        FMHTML_SetElementById("StatusTextVideoInfo", `info(VP8): ${info.width}x${info.height}`);
      }
    }

    if (foundKeyFrame) {
      const timestamp = Math.round(performance.now() * 1000); // microseconds
      const chunk = new EncodedVideoChunk({
        type: info.isKeyframe ? 'key' : 'delta',
        timestamp,
        data: vp8FrameBuffer,
      });
      decoder.decode(chunk);
    }
  }

  // Expose globally
  window.FMVP8Player = {
    canvas,
    context: ctx,
    decoder,
    foundKeyFrame,
    FMVP8Decode,
    VP8FrameInfo,
    handleDecodedFrame
  };
})();
