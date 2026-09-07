-- Conversations between buyers and sellers
create table if not exists conversations (
  id bigserial primary key,
  buyer_id bigint not null references marketplace_users(id) on delete cascade,
  seller_id bigint not null references marketplace_users(id) on delete cascade,
  store_id bigint references stores(id) on delete set null,
  subject text not null default '',
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  buyer_unread int not null default 0,
  seller_unread int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_buyer on conversations(buyer_id);
create index if not exists idx_conversations_seller on conversations(seller_id);
create unique index if not exists idx_conversations_unique_pair on conversations(buyer_id, seller_id, store_id);

-- Messages within conversations
create table if not exists messages (
  id bigserial primary key,
  conversation_id bigint not null references conversations(id) on delete cascade,
  sender_id bigint not null references marketplace_users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on messages(conversation_id, created_at asc);

-- Notifications for users
create table if not exists notifications (
  id bigserial primary key,
  user_id bigint not null references marketplace_users(id) on delete cascade,
  type text not null default 'info',
  title text not null default '',
  body text not null default '',
  link text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on notifications(user_id) where read_at is null;
