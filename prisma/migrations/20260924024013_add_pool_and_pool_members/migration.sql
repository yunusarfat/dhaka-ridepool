-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Pool" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "status" "PoolStatus" NOT NULL DEFAULT 'MATCHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolMember" (
    "id" SERIAL NOT NULL,
    "pool_id" INTEGER NOT NULL,
    "ride_request_id" INTEGER NOT NULL,
    "fare" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoolMember_ride_request_id_key" ON "PoolMember"("ride_request_id");

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolMember" ADD CONSTRAINT "PoolMember_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolMember" ADD CONSTRAINT "PoolMember_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "RideRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
