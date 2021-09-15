import { inject, observer } from 'mobx-react'
import React, { useEffect } from 'react'

import { RootStore, StoreDef } from '../store'
import { emojiRegex, getEmojiUrl } from '../utils'

const PreloadEmoji = ({ delayedMessages }: PreloadEmojiProps) => {
  delayedMessages
    ?.map(({ message }) => {
      if (message.message_type === 'text') {
        return message.message_text
      }
      if (message.message_type === 'custom') {
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
