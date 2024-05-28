import './cta.css';
import { createResponsiveMedia } from '../../scripts/utils/media.js';

const variantsGlob = import.meta.glob('./variants/*.module.css', {
  eager: true,
  import: 'default',
});

const variants = Object.fromEntries(Object.entries(variantsGlob)
  .map(([path, style]) => [path.replace('./variants/', '')
    .replace('.module.css', ''), style]));

export default async function decorate(block) {
  const variantName = block.classList[1];
  const variant = variants[variantName] || {};
  const elements = [...block.children].map((row) => row.firstElementChild);
  const types = ['content', 'cta', 'media'];
  // eslint-disable-next-line no-restricted-syntax
  for (const [index, type] of types.entries()) {
    if (variant[type] && elements[index]) {
      elements[index].classList.add(variant[type]);
    }
  }

  if (variant.block) {
    block.classList.add(variant.block);
  }

  const [content, cta, media] = elements;
  content.append(cta);

  const mediaElem = createResponsiveMedia(media);
  if (mediaElem) {
    media.replaceChildren(mediaElem);
    block.replaceChildren(content, media);
  } else {
    block.replaceChildren(content);
  }
}
