import { GenerationStatus } from "@/lib/config/enum";
import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  json,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

// 状态枚举值数组，用于数据库字段定义
const statusEnumValues = Object.values(GenerationStatus) as [
  string,
  ...string[]
];

// 定义任务状态枚举
export const generationStatusEnum = pgEnum(
  "generation_status",
  statusEnumValues
);

// 定义记录状态枚举
export const recordStatusEnum = pgEnum("record_status", [
  "waiting",
  "fail",
  "success",
]);

// 上传来源枚举
export const uploadSourceEnum = pgEnum("upload_source", ["admin", "user"]);

// records表：用户每次点击生成按钮的请求记录
export const records = pgTable("records", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()), // 主键 唯一 不为空
  sid: text("sid").notNull(), // 对应user表的sid
  type: text("type").notNull(), // 生成的类型
  tool: text("tool").notNull(), // 使用的工具
  parameters: json("parameters").notNull(), // 生成的参数
  status: recordStatusEnum("status").default("waiting").notNull(), // task的请求状态
  expectedCount: integer("expected_count").notNull(), // 期望的数量
  isPublic: boolean("is_public").default(false).notNull(), // 是否公开
  isDelete: boolean("is_delete").default(false).notNull(), // 是否删除
  pointsCount: integer("points_count").notNull(), // 积分消耗数量
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // 更新时间
});

// tasks表：调用第三方API产生的具体任务
export const tasks = pgTable("tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()), // 主键 唯一 不为空
  recordId: text("record_id")
    .notNull()
    .references(() => records.id), // 对应records表的id 不能为空，添加外键约束
  taskId: text("task_id").notNull(), // 第三方API返回的任务id 不能为空
  status: generationStatusEnum("status").notNull(), // 任务状态
  result: json("result"), // 任务结果
  submitAt: timestamp("submit_at").notNull(), // 提交时间
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // 更新时间
});

// 媒体类型枚举
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

// medias表：生成的媒体文件（图片和视频）
export const medias = pgTable("medias", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()), // 主键 唯一 不为空
  sid: text("sid"), // 对应用户ID，便于直接查询用户媒体，可为空
  recordId: text("record_id").references(() => records.id), // 对应records表的id，可为空，添加外键约束
  taskId: text("task_id").references(() => tasks.id), // 对应tasks表的id，可为空，添加外键约束
  url: text("url").notNull(), // 媒体文件url
  type: text("type"), // 媒体文件MIME类型
  mediaType: mediaTypeEnum("media_type").notNull(), // 媒体类型：image或video
  aspectRatio: text("aspect_ratio"), // 媒体文件宽高比
  uploadSource: uploadSourceEnum("upload_source").default("user"), // 上传来源：admin或user
  category: text("category").array().default([]), // 标签分类，字符串数组
  meta: json("meta"), // 媒体文件元数据，如尺寸、时长等
  isDelete: boolean("is_delete").default(false).notNull(), // 是否删除
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // 更新时间
});

// 定义表关系
export const recordsRelations = relations(records, ({ one, many }) => ({
  task: one(tasks, {
    fields: [records.id],
    references: [tasks.recordId],
  }),
  medias: many(medias),
}));

// task 和 media 是一对多关系
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  record: one(records, {
    fields: [tasks.recordId],
    references: [records.id],
  }),
  medias: many(medias),
}));

// medias表关系定义
export const mediasRelations = relations(medias, ({ one }) => ({
  record: one(records, {
    fields: [medias.recordId],
    references: [records.id],
  }),
  task: one(tasks, {
    fields: [medias.taskId],
    references: [tasks.id],
  }),
}));

// 导出类型
export type Record = typeof records.$inferSelect;
export type NewRecord = typeof records.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Media = typeof medias.$inferSelect;
export type NewMedia = typeof medias.$inferInsert;
