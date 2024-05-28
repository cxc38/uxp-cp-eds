export function createResponsivePicture(images) {
  if (images?.length) {
    const picture = images[0];
    if (images.length >= 2) {
      const sources = [...images[1].querySelectorAll('source')].map((source) => {
        const media = '(max-width: 767px)';
        source.media = source.media ? `${source.media} AND ${media}` : media;
        return source;
      });
      picture.prepend(...sources);
    }
    return picture;
  }
  return null;
}

export function createResponsiveMedia(media) {
  const images = [...media.querySelectorAll('picture')];
  if (images.length) {
    return createResponsivePicture(images);
  }
  const links = [...media.querySelectorAll('a')];
  if (links.length) {
    // eslint-disable-next-line no-use-before-define
    return createResponsiveVideo(links);
  }
  return null;
}

function createHTML5Video(links, props) {
  const video = document.createElement('video');
  const autoplay = props.has('autoplay');
  video.defaultMuted = props.has('muted') || autoplay;
  video.muted = props.has('muted') || autoplay;
  video.loop = props.has('loop');
  video.controls = props.has('controls');
  video.autoplay = autoplay;
  video.playsInline = props.has('playsinline') || autoplay;
  video.title = links[0].textContent;
  video.preload = 'none';

  // eslint-disable-next-line no-use-before-define
  setVideoSources(video, links);

  return video;
}

function createYoutubeVideo(link, props) {
  const iframe = document.createElement('iframe');
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = link.href.match(regExp);
  if (match?.[7]) {
    const videoId = match[7];
    const autoplay = props.has('autoplay');
    const params = new URLSearchParams({
      autoplay: autoplay ? 1 : 0,
      mute: props.has('muted') || autoplay ? 1 : 0,
      controls: props.has('controls') ? 1 : 0,
      loop: props.has('loop') ? 1 : 0,
      playsinline: props.has('playsinline') || autoplay ? 1 : 0,
      playlist: videoId,
    });

    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; encrypted-media; fullscreen';
    iframe.src = `https://www.youtube.com/embed/${videoId}?${params}`;
  }
  iframe.title = link.textContent;
  return iframe;
}

export function createResponsiveVideo(links) {
  if (links?.length) {
    const link = links[0];
    const props = new Set((link.title || '').split(/\s*,\s*/));
    return link.href.match(/youtu\.?be/) ? createYoutubeVideo(link, props) : createHTML5Video(links, props);
  }
  return null;
}

function updateOnMobileDesktopChange(callback) {
  const media = window.matchMedia('(min-width: 768px)');
  callback(media);
  media.onchange = callback;
}

const requests = [];

async function loadDynamicMediaMetatata(posterSrc) {
  return new Promise((resolve, reject) => {
    const requestId = requests.length;
    requests.push(resolve);
    const script = document.createElement('script');
    script.async = true;
    script.onerror = reject;
    script.src = `${posterSrc}?req=set,json,UTF-8&handler=s7jsonResponse&id=${requestId}`;
    document.body.appendChild(script);
  });
}

async function setVideoSources(video, links) {
  const desktopUrl = links[0].href;
  if (desktopUrl.includes('/is/content/')) {
    // Dynamic Media videos
    const posters = links.map(({ href }) => href.replace('/is/content/', '/is/image/'));
    const posterWidth = Math.ceil(window.innerWidth / 50) * 50;
    const postersOptimized = posters.map((src, index) => `${src}?fmt=webp,,lossy&qlt=80&wid=${Math.min(posterWidth, index ? 800 : 1250)}`);
    updateOnMobileDesktopChange((media) => {
      video.poster = postersOptimized[media.matches ? 0 : 1] || postersOptimized[0];
    });

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Load Adaptive Bitrate Streaming if supported
      const srcs = links.map(({ href }) => `${href}.m3u8`);
      updateOnMobileDesktopChange((media) => {
        video.src = srcs[media.matches ? 0 : 1] || srcs[0];
      });
    } else {
      // Some browsers don't support HLS, let's use Dynamic Media API to get MP4 src by screen width
      const basePath = desktopUrl.substring(0, desktopUrl.indexOf('/is/content/') + '/is/content/'.length);
      updateOnMobileDesktopChange(async (media) => {
        const meta = await loadDynamicMediaMetatata(posters[media.matches ? 0 : 1] || posters[0]);
        const metaItem = meta.set?.item || [];
        const items = (metaItem.type ? [metaItem] : metaItem)
          .map((item) => ({
            width: Number(item.v.dx),
            path: item.v.path,
          }))
          .sort((a, b) => Number(a.width) - Number(b.width));
        // eslint-disable-next-line no-shadow
        const item = items.find((item) => item.width >= window.innerWidth) || items.at(-1);
        video.src = `${basePath}${item.path}`;
      });
    }
  } else {
    const srcs = links.map(({ href }) => href);
    updateOnMobileDesktopChange((media) => {
      video.src = srcs[media.matches ? 0 : 1] || srcs[0];
    });
  }
}

window.s7jsonResponse = (data, requestId) => {
  requests[Number(requestId)](data);
};
