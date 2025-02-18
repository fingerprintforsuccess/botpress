import React, { Component } from 'react'

import { Renderer } from '../../../typings'
import * as Keyboard from '../../Keyboard'

import { Button } from './Button'

/**
 * Displays an array of button, and handle when they are clicked
 *
 * @param {object} buttons The list of buttons to display (object with a label and a payload)
 * @param {function} onSendData Called with the required payload to answer the quick reply
 * @param {function} onFileUpload This is called when a file is uploaded
 *
 * @return onSendData is called with the reply
 */
export class QuickReplies extends Component<Renderer.QuickReply> {
  handleButtonClicked = (title, payload) => {
    if (payload.startsWith('LINK:')) {
      window.parent.location.href = payload.substring('LINK:'.length).toLowerCase()
      const link = payload.substring('LINK:'.length).split('|');
      if (link[1] === 'NEW') {
        window.open(link[0].toLowerCase(), '_blank')
      } else {
        window.parent.location.href = link[0].toLowerCase();
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.props.onSendData?.({
        type: 'quick_reply',
        text: title,
        payload
      })
      this.props.store.composer.setLocked(false)
    }
  }

  renderKeyboard(buttons: Renderer.QuickReplyButton[]) {
    return buttons.map((btn, idx) => {
      if (Array.isArray(btn)) {
        return <div>{this.renderKeyboard(btn)}</div>
      } else {
        return (
          <Button
            key={idx}
            label={btn.label || btn.title}
            payload={btn.payload}
            preventDoubleClick={!btn.allowMultipleClick}
            onButtonClick={this.handleButtonClicked}
            onFileUpload={this.props.onFileUpload}
          />
        )
      }
    })
  }

  render() {
    const buttons = this.props.buttons || this.props.quick_replies
    const kbd = <div className={'bpw-keyboard-quick_reply'}>{buttons && this.renderKeyboard(buttons)}</div>

    return (
      <Keyboard.Prepend keyboard={kbd} visible={this.props.isLastGroup && this.props.isLastOfGroup}>
        {this.props.children}
      </Keyboard.Prepend>
    )
  }
}
