// Centralizes shared imports for all components. Using htm bound to React's
// createElement lets us write JSX-like markup with no build step:
//
//   html`<div className=${'foo'}>${children}</div>`
//   html`<${MyComponent} prop=${value}>...<//>`
//
// Components are referenced with `<${Name}>...<//>` (the `<//>` is htm's
// universal closing tag).

import React from 'react';
import htm from 'htm';

export const html = htm.bind(React.createElement);
export { React };
export default html;
