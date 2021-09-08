import { inject, observer } from 'mobx-react'
import React, { useEffect } from 'react'

import { RootStore, StoreDef } from '../store'
import { emojiRegex, getEmojiUrl } from '../utils'

const PreloadEmoji = ({ delayedMessages }: PreloadEmojiProps) => {
  delayedMessages
    ?.map(({ message }) => {
      if (message.payload.text) {
        return message.payload.text
      }
      if (message.payload?.wrapped?.text) {
        return message.payload?.wrapped?.text
      }
    })
    .join('')
    .match(emojiRegex)
    ?.map(getEmojiUrl)
    .forEach(url => {
      new Image().src = url
    })

  return null
}

export default inject(({ store }: { store: RootStore }) => ({
  delayedMessages: store.delayedMessages
}))(observer(PreloadEmoji))

type PreloadEmojiProps = Pick<StoreDef, 'delayedMessages'>
