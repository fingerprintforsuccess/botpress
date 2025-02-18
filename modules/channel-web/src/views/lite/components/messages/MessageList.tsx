import { ResizeObserver } from '@juggle/resize-observer'
import { isThisSecond } from 'date-fns'
import differenceInMinutes from 'date-fns/difference_in_minutes'
import debounce from 'lodash/debounce'
import { observe } from 'mobx'
import { inject, observer } from 'mobx-react'
import React from 'react'
import { InjectedIntlProps, injectIntl } from 'react-intl'

import constants from '../../core/constants'
import { RootStore, StoreDef } from '../../store'
import { Message } from '../../typings'
import Avatar from '../common/Avatar'

import MessageGroup from './MessageGroup'

interface State {
  autoscroll: number
  manualScroll: boolean
  showNewMessageIndicator: boolean
}

class MessageList extends React.Component<MessageListProps, State> {
  private messagesDiv: HTMLElement
  private divSizeObserver: ResizeObserver
  state: State = { autoscroll: null, showNewMessageIndicator: false, manualScroll: false }

  componentDidMount() {
    this.tryScrollToBottom(true)

    // old botpress code if scrollsnap not supported
    if(!CSS.supports('scroll-snap-type: y mandatory')){
      this.setState({
      autoscroll: window.setInterval(() => {
        if (!this.state.manualScroll && !this.props.isBotTyping.get()) {
          this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight + 500
        }
      }, 100)
      })

      observe(this.props.focusedArea, focus => {
        focus.newValue === 'convo' && this.messagesDiv.focus()
      }) 
    }    

    if (this.props.currentMessages) {
      observe(this.props.currentMessages, messages => {
        if (this.state.manualScroll) {
          if (!this.state.showNewMessageIndicator) {
            this.setState({ showNewMessageIndicator: true })
          }
          return
        }
        // old botpress code if scrollsnap not supported
        if(!CSS.supports('scroll-snap-type: y mandatory')){
          this.tryScrollToBottom()
        }

      })
    }

    // old botpress code if scrollsnap not supported
    if(!CSS.supports('scroll-snap-type: y mandatory')){
      //this should account for keyboard rendering as it triggers a resize of the messagesDiv
      this.divSizeObserver = new ResizeObserver(
        debounce(
          ([_divResizeEntry]) => {
            this.tryScrollToBottom()
          },
          200,
          { trailing: true }
        )
      )
      this.divSizeObserver.observe(this.messagesDiv)
    }
    
  }

  componentWillUnmount() {
    // old botpress code if scrollsnap not supported
    if(!CSS.supports('scroll-snap-type: y mandatory')){
      this.divSizeObserver.disconnect()
      if (this.state.autoscroll) { window.clearInterval(this.state.autoscroll) }
    }
  }

  componentDidUpdate() {
    // old botpress code if scrollsnap not supported
    if(!CSS.supports('scroll-snap-type: y mandatory')){
      if (this.state.manualScroll) {
        console.log("update manual  -> dont scroll")
        return
      }
      console.log("would scroll to bottom")
      this.tryScrollToBottom()
    }
  }

  tryScrollToBottom(delayed?: boolean) {
    setTimeout(
      () => {
        try {
          console.log('try scroll,', delayed)
          // old botpress code if scrollsnap not supported
          if(!CSS.supports('scroll-snap-type: y mandatory')){
            console.log("no snap support")
            //previous code
            this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight
          } else {
            //SCROLL SNAP CODE FIX
            this.messagesDiv.style.scrollSnapType = 'y mandatory'
          }
        } catch (err) {
          console.log("this is a try scroll error", err)
          // Discard the error
        }
      },
      delayed ? 250 : 0
    )
  }

  handleKeyDown = e => {
    //DOESNT WORK FOR SCROLL SNAP ATM 
    if (!this.props.enableArrowNavigation) {
      return
    }

    const maxScroll = this.messagesDiv.scrollHeight - this.messagesDiv.clientHeight
    const shouldFocusNext =
      e.key === 'ArrowRight' || (e.key === 'ArrowDown' && this.messagesDiv.scrollTop === maxScroll)
    const shouldFocusPrevious = e.key === 'ArrowLeft' || (e.key === 'ArrowUp' && this.messagesDiv.scrollTop === 0)

    if (shouldFocusNext) {
      this.messagesDiv.blur()
      this.props.focusNext()
    }

    if (shouldFocusPrevious) {
      this.messagesDiv.blur()
      this.props.focusPrevious()
    }
  }

  renderDate(date) {
    return (
      <div className={'bpw-date-container'}>
        {new Intl.DateTimeFormat(this.props.intl.locale || 'en', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        }).format(new Date(date))}
        <div className={'bpw-small-line'} />
      </div>
    )
  }

  renderAvatar(name, url) {
    const avatarSize = this.props.isEmulator ? 20 : 40 // quick fix
    return <Avatar name={name} avatarUrl={url} height={avatarSize} width={avatarSize} />
  }

  renderMessageGroups() {
    const messages = (this.props.currentMessages || []).filter(m => this.shouldDisplayMessage(m))
    const groups: Message[][] = []

    let lastSpeaker = undefined
    let lastDate = undefined
    let currentGroup = undefined

    messages.forEach(m => {
      const speaker = m.payload.channel?.web?.userName || m.authorId
      const date = m.sentOn

      // Create a new group if messages are separated by more than X minutes or if different speaker
      if (
        speaker !== lastSpeaker ||
        !currentGroup ||
        differenceInMinutes(new Date(date), new Date(lastDate)) >= constants.TIME_BETWEEN_DATES
      ) {
        currentGroup = []
        groups.push(currentGroup)
      }

      if (currentGroup.find(x => x.id === m.id)) {
        return
      }
      currentGroup.push(m)

      lastSpeaker = speaker
      lastDate = date
    })

    if (this.props.isBotTyping.get()) {
      if (lastSpeaker !== 'bot') {
        currentGroup = []
        groups.push(currentGroup)
      }

      currentGroup.push({
        sentOn: new Date(),
        userId: undefined,
        payload: { type: 'typing' }
      })
    }
    return (
      //Fragment to remove extra div currently found in botpress
      <>
        {groups.map((group, i) => {
          const lastGroup = groups[i - 1]
          const lastDate = lastGroup?.[lastGroup.length - 1]?.sentOn
          const groupDate = group?.[0].sentOn

          const isDateNeeded =
            !groups[i - 1] ||
            differenceInMinutes(new Date(groupDate), new Date(lastDate)) > constants.TIME_BETWEEN_DATES

          const [{ authorId, payload }] = group

          const avatar = authorId
            ? this.props.showUserAvatar &&
              this.renderAvatar(payload.channel?.web?.userName, payload.channel?.web?.avatarUrl)
            : this.renderAvatar(this.props.botName, payload.channel?.web?.avatarUrl || this.props.botAvatarUrl)

          return (
            <div key={i}>
              {isDateNeeded && this.renderDate(group[0].sentOn)}
              <MessageGroup
                isBot={!authorId}
                avatar={avatar}
                userName={payload.channel?.web?.userName}
                key={`msg-group-${i}`}
                isLastGroup={i >= groups.length - 1}
                messages={group}
              />
            </div>
          )
        })}
      </>
    )
  }

  shouldDisplayMessage = (m: Message): boolean => {
    return m.payload.type !== 'postback'
  }

  handleScroll = e => {
    // old botpress code if scrollsnap not supported
    if(!CSS.supports('scroll-snap-type: y mandatory')){
      console.log("handle scroll, revert to old")
      const scroll = (this.messagesDiv.scrollHeight) - this.messagesDiv.scrollTop - this.messagesDiv.clientHeight
      const manualScroll = scroll > 0
      const showNewMessageIndicator = this.state.showNewMessageIndicator && manualScroll
      this.setState({ manualScroll, showNewMessageIndicator })
    } else {
      //CSS Snap Solution
      const height = (this.messagesDiv.scrollHeight) - this.messagesDiv.scrollTop - this.messagesDiv.clientHeight
      const leftOver = (height - 20) > 0
      if(!leftOver) {
        this.tryScrollToBottom()
        this.setState({manualScroll: false})
      }
      else {
        this.messagesDiv.style.scrollSnapType = 'unset'
        this.setState({manualScroll: true})
      }
    }
  }

  render() {
    return (
      <div
        tabIndex={0}
        onKeyDown={this.handleKeyDown}
        className={'bpw-msg-list'}
        ref={m => {
          this.messagesDiv = m
        }}
        onScroll={this.handleScroll}
      >
        {this.state.showNewMessageIndicator && (
          <div className="bpw-new-messages-indicator" onClick={e => this.tryScrollToBottom()}>
            <span>
              {this.props.intl.formatMessage({
                id: `messages.newMessage${this.props.currentMessages.length === 1 ? '' : 's'}`
              })}
            </span>
          </div>
        )}
        {this.renderMessageGroups()}
      </div>
    )
  }
}

export default inject(({ store }: { store: RootStore }) => ({
  intl: store.intl,
  isEmulator: store.isEmulator,
  botName: store.botName,
  isBotTyping: store.isBotTyping,
  botAvatarUrl: store.botAvatarUrl,
  currentMessages: store.currentMessages,
  focusPrevious: store.view.focusPrevious,
  focusNext: store.view.focusNext,
  focusedArea: store.view.focusedArea,
  showUserAvatar: store.config.showUserAvatar,
  enableArrowNavigation: store.config.enableArrowNavigation,
  preferredLanguage: store.preferredLanguage
}))(injectIntl(observer(MessageList)))

type MessageListProps = InjectedIntlProps &
  Pick<
    StoreDef,
    | 'intl'
    | 'isBotTyping'
    | 'focusedArea'
    | 'focusPrevious'
    | 'focusNext'
    | 'botAvatarUrl'
    | 'isEmulator'
    | 'botName'
    | 'enableArrowNavigation'
    | 'showUserAvatar'
    | 'currentMessages'
    | 'preferredLanguage'
  >
