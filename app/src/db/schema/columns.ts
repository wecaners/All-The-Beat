import { timestamp } from "drizzle-orm/pg-core";

// 시간은 전부 timestamptz (UTC 저장, 화면은 KST)
export const timestamptz = () => timestamp({ withTimezone: true });

export const createdAt = () => timestamptz().notNull().defaultNow();

export const updatedAt = () =>
  timestamptz()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
