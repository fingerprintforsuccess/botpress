import Knex from 'knex'

import { Table } from '../interfaces'

import {
  DialogSessionTable,
  EventsTable,
  GhostFilesTable,
  GhostRevisionsTable,
  KeyValueStoreTable,
  LogsTable,
  NotificationsTable
} from './bot-specific'
import {
  AnalyticsTable,
  ChannelUsersTable,
  DataRetentionTable,
  ServerMetadataTable,
  WorkspaceInviteCodesTable,
  WorkspaceUsersTable
} from './server-wide'

const tables: typeof Table[] = [
  ServerMetadataTable,
  ChannelUsersTable,
  WorkspaceUsersTable,
  WorkspaceInviteCodesTable,

  LogsTable,
  AnalyticsTable,
  ChannelUsersTable,
  DialogSessionTable,
  GhostFilesTable,
  GhostRevisionsTable,
  NotificationsTable,
  KeyValueStoreTable,
  DataRetentionTable,
  EventsTable
]

export default <(new (knex: Knex) => Table)[]>tables
