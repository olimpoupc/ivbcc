-- "chatbot_items" was never an AI chatbot, just an admin-managed FAQ list, and
-- the widget rendered every active item in one flat list regardless of its
-- category (the category was a decorative badge, not real navigation). This
-- renames the module to "help center" end to end and widens the category set
-- so the public widget can group items into an actual category -> item ->
-- detail flow. Existing category values (schedules, events, formation, live,
-- location, contact, prayer, whatsapp) are kept as-is — only 'ministries' and
-- 'donate' are added — so no existing row is invalidated by the new check.

alter table public.chatbot_items rename to help_center_items;

alter index chatbot_items_active_order_idx rename to help_center_items_active_order_idx;
alter index chatbot_items_category_idx rename to help_center_items_category_idx;
alter index chatbot_items_is_active_idx rename to help_center_items_is_active_idx;
alter index chatbot_items_order_index_idx rename to help_center_items_order_index_idx;

alter table public.help_center_items
  rename constraint chatbot_items_pkey to help_center_items_pkey;

alter table public.help_center_items
  drop constraint chatbot_items_category_check;

alter table public.help_center_items
  add constraint help_center_items_category_check
  check (category = any (array[
    'general', 'schedules', 'events', 'formation', 'live',
    'location', 'contact', 'prayer', 'whatsapp',
    'ministries', 'donate'
  ]::text[]));

alter trigger set_chatbot_items_updated_at on public.help_center_items
  rename to set_help_center_items_updated_at;

alter policy "Admins can create chatbot items" on public.help_center_items
  rename to "Admins can create help center items";
alter policy "Admins can delete chatbot items" on public.help_center_items
  rename to "Admins can delete help center items";
alter policy "Admins can read chatbot items" on public.help_center_items
  rename to "Admins can read help center items";
alter policy "Admins can update chatbot items" on public.help_center_items
  rename to "Admins can update help center items";
alter policy "Public can read active chatbot items" on public.help_center_items
  rename to "Public can read active help center items";
