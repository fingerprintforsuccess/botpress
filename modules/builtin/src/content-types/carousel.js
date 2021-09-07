const base = require('./_base')
const Card = require('./card')
const utils = require('./_utils')

function renderElement(data, channel) {
  const payload = utils.extractPayload('carousel', data);
  if (payload.url) payload.url = payload.url.replace('BOT_URL', data.BOT_URL);
  return payload;
}

module.exports = {
  id: 'builtin_carousel',
  group: 'Built-in Messages',
  title: 'module.builtin.types.carousel.title',

  jsonSchema: {
    description: 'module.builtin.types.carousel.description',
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        title: 'module.builtin.types.carousel.cards',
        items: Card.jsonSchema
      },
      ...base.typingIndicators
    }
  },
  computePreviewText: formData => formData.items && `Carousel: (${formData.items.length}) ${formData.items[0].title}`,
  renderElement: renderElement
}
