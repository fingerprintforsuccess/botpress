import LRUCache from 'lru-cache'
import uuid from 'uuid'
import { MessagingDownMigrator } from './down'

export class MessagingSqliteDownMigrator extends MessagingDownMigrator {
  private convoBatch = []
  private convoNewIdsBatch = []
  private messageBatch = []
  private cacheVisitorIds = new LRUCache<string, string>({ max: 10000 })
  private cacheBotIds = new LRUCache<string, string>({ max: 10000 })
  private convoIndex = 0

  protected async start() {
    if (this.bp.database.isLite) {
      this.trx = this.bp.database as any
    } else {
      this.trx = await this.bp.database.transaction()
    }
  }

  protected async commit() {
    if (!this.bp.database.isLite) {
      await this.trx.commit()
    }
  }

  protected async rollback() {
    if (!this.bp.database.isLite) {
      await this.trx.rollback()
    }
  }

  protected async migrate() {
    await super.migrate()

    const batchSize = this.bp.database.isLite ? 100 : 5000
    const convCount = <number>Object.values((await this.trx('msg_conversations').count('*'))[0])[0] || 0
    this.convoIndex = <number>Object.values((await this.trx('web_conversations').max('id'))[0])[0] || 1

    this.bp.logger.info(`Migration will migrate ${convCount} conversations`)

    for (let i = 0; i < convCount; i += batchSize) {
      const convos = await this.trx('msg_conversations')
        .select('*')
        .offset(i)
        .limit(batchSize)

      // We migrate batchSize conversations at a time
      await this.migrateConvos(convos)

      this.bp.logger.info(`Migrated conversations ${i} to ${Math.min(i + batchSize, convCount)}`)
    }
  }

  protected async cleanup() {
    await super.cleanup()

    if (this.bp.database.isLite) {
      await this.trx.raw('PRAGMA foreign_keys = OFF;')

      await this.trx.schema.dropTable('msg_messages')
      await this.trx.schema.dropTable('msg_conversations')
      await this.trx.schema.dropTable('msg_users')
      await this.trx.schema.dropTable('msg_clients')
      await this.trx.schema.dropTable('msg_providers')

      await this.trx.raw('PRAGMA foreign_keys = ON;')
    } else {
      await this.trx.raw('DROP TABLE msg_messages CASCADE')
      await this.trx.raw('DROP TABLE msg_conversations CASCADE')
      await this.trx.raw('DROP TABLE msg_users CASCADE')
      await this.trx.raw('DROP TABLE msg_clients CASCADE')
      await this.trx.raw('DROP TABLE msg_providers CASCADE')
    }
  }

  private async migrateConvos(convos: any[]) {
    const maxBatchSize = this.bp.database.isLite ? 50 : 2000

    for (const convo of convos) {
      const botId = await this.getBotId(convo.clientId)

      const newConvo = {
        id: ++this.convoIndex,
        userId: convo.userId ? await this.getVisitorId(convo.userId) : undefined,
        botId,
        created_on: convo.createdOn
      }

      this.convoBatch.push(newConvo)
      this.convoNewIdsBatch.push({ oldId: convo.id, newid: newConvo.id })

      const messages = await this.trx('msg_messages')
        .select('*')
        .where({ conversationId: convo.id })

      for (const message of messages) {
        this.messageBatch.push({
          id: uuid.v4(),
          conversationId: newConvo.id,
          // Necessary otherwise the messages aren't listed
          full_name: message.authorId ? 'User' : undefined,
          // Hack to make an old query work
          message_type: ' ',
          userId: message.authorId ? await this.getVisitorId(message.authorId) : undefined,
          sent_on: message.sentOn,
          payload: message.payload
        })

        if (this.messageBatch.length > maxBatchSize) {
          await this.emptyMessageBatch()
        }
      }

      if (this.convoBatch.length > maxBatchSize) {
        await this.emptyConvoBatch()
      }
    }

    await this.emptyConvoBatch()
    await this.emptyMessageBatch()
  }

  private async getVisitorId(userId: string) {
    const cached = this.cacheVisitorIds.get(userId)
    if (cached) {
      return cached
    }

    const rows = await this.trx('web_user_map').where({ userId })

    if (rows?.length) {
      const { visitorId } = rows[0]
      this.cacheVisitorIds.set(userId, visitorId)
      return visitorId
    }

    return undefined
  }

  private async getBotId(clientId: string) {
    const cached = this.cacheBotIds.get(clientId)
    if (cached) {
      return cached
    }

    const [client] = await this.trx('msg_clients').where({ id: clientId })
    const [provider] = await this.trx('msg_providers').where({ id: client.providerId })

    this.cacheBotIds.set(clientId, provider.name)

    return provider.name
  }

  private async emptyConvoBatch() {
    if (this.convoBatch.length > 0) {
      await this.trx('web_conversations').insert(this.convoBatch)
      this.convoBatch = []
    }

    if (this.convoNewIdsBatch.length > 0) {
      await this.trx('temp_new_convo_ids').insert(this.convoNewIdsBatch)
      this.convoNewIdsBatch = []
    }
  }

  private async emptyMessageBatch() {
    await this.emptyConvoBatch()

    if (this.messageBatch.length > 0) {
      await this.trx('web_messages').insert(this.messageBatch)
      this.messageBatch = []
    }
  }
}
