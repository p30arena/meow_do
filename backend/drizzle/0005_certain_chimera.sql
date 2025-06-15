ALTER TABLE "task_tracking_records" ALTER COLUMN "start_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_tracking_records" ALTER COLUMN "start_time" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "task_tracking_records" ALTER COLUMN "end_time" SET DATA TYPE timestamp with time zone;