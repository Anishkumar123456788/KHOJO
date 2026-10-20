-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'WORKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('HOURLY', 'FULL_DAY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_UPDATE', 'MESSAGE', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locality" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "hourlyRate" INTEGER NOT NULL,
    "dailyRate" INTEGER NOT NULL,
    "fullDayHours" INTEGER NOT NULL DEFAULT 8,
    "city" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "serviceRadiusKm" INTEGER NOT NULL DEFAULT 15,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "photoUrl" TEXT,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerSkill" (
    "workerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkerSkill_pkey" PRIMARY KEY ("workerId","skillId")
);

-- CreateTable
CREATE TABLE "WorkerPortfolio" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerPortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerAvailability" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkerAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "workersRequired" INTEGER NOT NULL DEFAULT 1,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 1,
    "address" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "description" TEXT,
    "labourEstimate" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "taxEstimate" INTEGER NOT NULL DEFAULT 0,
    "totalEstimate" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingWorker" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "hourlyRateSnapshot" INTEGER NOT NULL,
    "dailyRateSnapshot" INTEGER NOT NULL,
    "labourEstimate" INTEGER NOT NULL,
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "BookingWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusHistory" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteWorker" (
    "customerId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteWorker_pkey" PRIMARY KEY ("customerId","workerId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceArea" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "locality" TEXT NOT NULL,

    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platformFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumHourlyHours" INTEGER NOT NULL DEFAULT 1,
    "fullDayHours" INTEGER NOT NULL DEFAULT 8,
    "defaultSearchRadiusKm" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "OtpRateLimit" (
    "phone" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtpRateLimit_pkey" PRIMARY KEY ("phone")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerProfile_userId_key" ON "WorkerProfile"("userId");

-- CreateIndex
CREATE INDEX "WorkerProfile_city_availabilityStatus_verificationStatus_idx" ON "WorkerProfile"("city", "availabilityStatus", "verificationStatus");

-- CreateIndex
CREATE INDEX "WorkerProfile_lat_lng_idx" ON "WorkerProfile"("lat", "lng");

-- CreateIndex
CREATE INDEX "WorkerProfile_hourlyRate_avgRating_idx" ON "WorkerProfile"("hourlyRate", "avgRating");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_name_key" ON "SkillCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_slug_key" ON "SkillCategory"("slug");

-- CreateIndex
CREATE INDEX "WorkerSkill_skillId_idx" ON "WorkerSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerAvailability_workerId_weekday_startMinute_key" ON "WorkerAvailability"("workerId", "weekday", "startMinute");

-- CreateIndex
CREATE INDEX "Booking_customerId_status_startAt_idx" ON "Booking"("customerId", "status", "startAt");

-- CreateIndex
CREATE INDEX "Booking_status_startAt_idx" ON "Booking"("status", "startAt");

-- CreateIndex
CREATE INDEX "BookingWorker_workerId_status_idx" ON "BookingWorker"("workerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookingWorker_bookingId_workerId_key" ON "BookingWorker"("bookingId", "workerId");

-- CreateIndex
CREATE INDEX "BookingStatusHistory_bookingId_createdAt_idx" ON "BookingStatusHistory"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_workerId_createdAt_idx" ON "Review"("workerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_workerId_key" ON "Review"("bookingId", "workerId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceArea_city_locality_idx" ON "ServiceArea"("city", "locality");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_action_idx" ON "AuditLog"("createdAt", "action");

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerProfile" ADD CONSTRAINT "WorkerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerSkill" ADD CONSTRAINT "WorkerSkill_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerSkill" ADD CONSTRAINT "WorkerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerPortfolio" ADD CONSTRAINT "WorkerPortfolio_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerAvailability" ADD CONSTRAINT "WorkerAvailability_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingWorker" ADD CONSTRAINT "BookingWorker_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingWorker" ADD CONSTRAINT "BookingWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWorker" ADD CONSTRAINT "FavoriteWorker_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWorker" ADD CONSTRAINT "FavoriteWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "BookingWorker" ADD CONSTRAINT "BookingWorker_no_active_overlap" EXCLUDE USING GIST ("workerId" WITH =, tsrange("scheduledStartAt", "scheduledEndAt", '[)') WITH &&) WHERE ("status" IN ('ACCEPTED', 'IN_PROGRESS'));
