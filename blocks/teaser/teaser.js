function decorateButtons(...buttons) {
  return buttons
    .map((div) => {
      const a = div.querySelector('a');
      if (a) {
        a.classList.add('button');
        a.classList.add('primary');
        return a.outerHTML;
      }
      return '';
    })
    .join('');
}

export function generateTeaserDOM(props) {
  // Extract properties, always same order as in model, empty string if not set
  const [pictureContainer, title, longDescr, firstCta] = props;
  console.log(title.innerHtml);
  const picture = pictureContainer.querySelector('picture');

  // Build DOM
  const teaserDOM = document.createRange()
    .createContextualFragment(`
        <div class='background'>${picture ? picture.outerHTML : ''}</div>
        <div class='foreground'>
            <div class='text'>
                <div class='title'>${title.innerHTML}</div>
                <div class='long-description'>${longDescr.innerHTML}</div>
                <div class='cta'>${decorateButtons(firstCta)}</div>
            </div>
            <div class='spacer'>
            </div>
      </div>
    `);

  // add final teaser DOM and classes if used as child component
  return teaserDOM;
}

export default function decorate(block) {
  // get the first and only cell from each row
  const props = [...block.children].map((row) => row.firstElementChild);
  const teaserDOM = generateTeaserDOM(props, block.classList);
  block.textContent = '';
  block.append(teaserDOM);
}
