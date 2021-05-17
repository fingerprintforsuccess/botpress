import { isUndefined } from "lodash";

const anonymizeMessage = (user, message) => {
  const usernames = ['userName', 'username', 'nick_name', 'nickname', 'fullName']
  usernames.forEach((username) =>  {
    if (!user.attributes[username]) return;
    if (message.text) {
      message.text = message.text.split(user.attributes[username]).join('Zoe')
    }
    if (!message.raw_message.text) {
      try {
        let raw = JSON.parse(message.raw_message)
        if (raw.text) {
          raw.text = raw.text.split(user.attributes[username]).join('Zoe')
        }
        message.raw_message = JSON.stringify(raw)
      } catch (e) {
        console.log('Error processing raw text for', message)
      }
    } else {
      message.raw_message.text = message.raw_message.text.split(user.attributes[username]).join('Zoe')
    }
  })
  return message
}

  export default anonymizeMessage
