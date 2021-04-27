import { inject, observer } from 'mobx-react'
import React, { useEffect } from 'react'

import { RootStore, StoreDef } from '../store'
import { emojiRegex, getEmojiUrl } from '../utils'

const PreloadEmoji = ({ delayedMessages }: PreloadEmojiProps) => {
  useEffect(() => {
    delayedMessages
      .map(message => message.message.message_text)
      .join('')
      .match(emojiRegex)
      .map(getEmojiUrl)
      .forEach(url => {
        new Image().src = url
      })
  }, [delayedMessages])

  return null
}

export default inject(({ store }: { store: RootStore }) => ({
  delayedMessages: store.delayedMessages,
}))(observer(PreloadEmoji))

type PreloadEmojiProps = Pick<StoreDef, 'delayedMessages'>
