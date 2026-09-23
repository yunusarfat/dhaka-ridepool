-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'OFFLINE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideRequest" (
    "id" SERIAL NOT NULL,
    "passenger_id" INTEGER NOT NULL,
    "pickup" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "seats_requested" INTEGER NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "estimated_fare" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_driver_id_key" ON "Vehicle"("driver_id");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
