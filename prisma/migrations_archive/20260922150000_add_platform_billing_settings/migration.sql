-- CreateTable
CREATE TABLE "platform_billing_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "upiId" TEXT,
    "upiDisplayName" TEXT,
    "accountHolder" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "branchName" TEXT,
    "qrCodeUrl" TEXT,
    "qrStoragePath" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_billing_settings_pkey" PRIMARY KEY ("id")
);

-- Seed Initial Preserved Singleton Values
INSERT INTO "platform_billing_settings" (
    "id",
    "upiId",
    "upiDisplayName",
    "accountHolder",
    "bankName",
    "accountNumber",
    "ifscCode",
    "branchName",
    "createdAt",
    "updatedAt"
) VALUES (
    'default',
    'tripdesk.billing@icici',
    'TripDesk Billing',
    'TripDesk SaaS Technologies Pvt Ltd',
    'ICICI Bank',
    '002105009844',
    'ICIC0000021',
    'MG Road Branch',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
