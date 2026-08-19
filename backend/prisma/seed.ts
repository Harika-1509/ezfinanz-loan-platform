import {
  PrismaClient,
  Role,
  ApplicationStage,
  IdType,
  EligibilityResult,
  AdminReviewStatus,
  Prisma,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for EZFinanz Loan Platform...');

  // 1. Clean existing records in reverse dependency order
  console.log('🧹 Cleaning existing records...');
  await prisma.selfie.deleteMany();
  await prisma.declaration.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.loanTerms.deleteMany();
  await prisma.eligibilityCheck.deleteMany();
  await prisma.kycDetails.deleteMany();
  await prisma.application.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Password hashes
  const adminPasswordHash = await bcrypt.hash('AdminPassword@123', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@123', 10);

  // 2. Create Admin User
  console.log('👤 Creating Admin User...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ezfinanz.com',
      phone: '+919876543210',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  // 3. Customer 1: Aarav Sharma — DISBURSED (Full lifecycle complete)
  console.log('👤 Creating Customer 1 (Aarav Sharma - DISBURSED)...');
  const customer1 = await prisma.user.create({
    data: {
      email: 'aarav.sharma@example.com',
      phone: '+919876543211',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const app1 = await prisma.application.create({
    data: {
      userId: customer1.id,
      stage: ApplicationStage.DISBURSED,
      kycDetails: {
        create: {
          fullName: 'Aarav Sharma',
          dob: new Date('1990-05-15'),
          gender: 'Male',
          address:
            'Flat 402, Lotus Heights, 24th Main, HSR Layout Sector 2, Bengaluru, Karnataka - 560102',
          idType: IdType.PAN,
          idNumber: 'ABCPS1234A',
          idPhotoUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d',
        },
      },
      eligibilityCheck: {
        create: {
          income: new Prisma.Decimal(125000.0),
          requestedAmount: new Prisma.Decimal(500000.0),
          creditScore: 785,
          existingDebts: new Prisma.Decimal(15000.0),
          employerName: 'Infosys Technologies Ltd',
          designation: 'Lead Software Architect',
          dtiRatio: new Prisma.Decimal(28.5),
          result: EligibilityResult.ELIGIBLE,
          maxApprovedAmount: new Prisma.Decimal(750000.0),
        },
      },
      loanTerms: {
        create: {
          amount: new Prisma.Decimal(500000.0),
          tenureMonths: 24,
          interestRate: new Prisma.Decimal(13.5),
          processingFee: new Prisma.Decimal(10000.0),
          gst: new Prisma.Decimal(1800.0),
          otherCharges: new Prisma.Decimal(500.0),
          emi: new Prisma.Decimal(23891.0),
          totalInterest: new Prisma.Decimal(73384.0),
          totalRepayment: new Prisma.Decimal(573384.0),
          totalCharges: new Prisma.Decimal(12300.0),
          netDisbursement: new Prisma.Decimal(487700.0),
          irr: new Prisma.Decimal(14.85),
        },
      },
      bankAccount: {
        create: {
          holderName: 'Aarav Sharma',
          accountNumber: '50100234567891',
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        },
      },
      declaration: {
        create: {
          acceptedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          termsVersion: 'v1.0',
          ipAddress: '103.21.125.4',
        },
      },
      selfie: {
        create: {
          photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
          submittedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
          adminStatus: AdminReviewStatus.APPROVED,
          reviewedBy: adminUser.id,
          reviewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // 4. Customer 2: Priya Patel — REJECTED (Rejected at Selfie verification)
  console.log('👤 Creating Customer 2 (Priya Patel - REJECTED at Selfie)...');
  const customer2 = await prisma.user.create({
    data: {
      email: 'priya.patel@example.com',
      phone: '+919876543212',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const app2 = await prisma.application.create({
    data: {
      userId: customer2.id,
      stage: ApplicationStage.REJECTED,
      kycDetails: {
        create: {
          fullName: 'Priya Patel',
          dob: new Date('1994-08-22'),
          gender: 'Female',
          address:
            'B-12, Shanti Niketan Apartments, Near Vastrapur Lake, Ahmedabad, Gujarat - 380015',
          idType: IdType.PAN,
          idNumber: 'BKIPP5678B',
          idPhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        },
      },
      eligibilityCheck: {
        create: {
          income: new Prisma.Decimal(85000.0),
          requestedAmount: new Prisma.Decimal(300000.0),
          creditScore: 740,
          existingDebts: new Prisma.Decimal(12000.0),
          employerName: 'Tata Consultancy Services',
          designation: 'Senior Business Analyst',
          dtiRatio: new Prisma.Decimal(32.4),
          result: EligibilityResult.ELIGIBLE,
          maxApprovedAmount: new Prisma.Decimal(450000.0),
        },
      },
      loanTerms: {
        create: {
          amount: new Prisma.Decimal(300000.0),
          tenureMonths: 18,
          interestRate: new Prisma.Decimal(14.0),
          processingFee: new Prisma.Decimal(6000.0),
          gst: new Prisma.Decimal(1080.0),
          otherCharges: new Prisma.Decimal(300.0),
          emi: new Prisma.Decimal(18579.0),
          totalInterest: new Prisma.Decimal(34422.0),
          totalRepayment: new Prisma.Decimal(334422.0),
          totalCharges: new Prisma.Decimal(7380.0),
          netDisbursement: new Prisma.Decimal(292620.0),
          irr: new Prisma.Decimal(15.2),
        },
      },
      bankAccount: {
        create: {
          holderName: 'Priya Patel',
          accountNumber: '000401567890',
          ifsc: 'ICIC0000004',
          bankName: 'ICICI Bank',
        },
      },
      declaration: {
        create: {
          acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          termsVersion: 'v1.0',
          ipAddress: '117.200.12.88',
        },
      },
      selfie: {
        create: {
          photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9',
          submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          adminStatus: AdminReviewStatus.REJECTED,
          rejectReason:
            'Live selfie does not match the uploaded PAN photo identity. Verification failed.',
          reviewedBy: adminUser.id,
          reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // 5. Customer 3: Rajesh Iyer — WAITING_ADMIN_REVIEW (Submitted selfie awaiting admin action)
  console.log('👤 Creating Customer 3 (Rajesh Iyer - WAITING_ADMIN_REVIEW)...');
  const customer3 = await prisma.user.create({
    data: {
      email: 'rajesh.iyer@example.com',
      phone: '+919876543213',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const app3 = await prisma.application.create({
    data: {
      userId: customer3.id,
      stage: ApplicationStage.WAITING_ADMIN_REVIEW,
      kycDetails: {
        create: {
          fullName: 'Rajesh Iyer',
          dob: new Date('1988-11-04'),
          gender: 'Male',
          address: 'Plot 88, 2nd Avenue, Anna Nagar West, Chennai, Tamil Nadu - 600040',
          idType: IdType.AADHAAR,
          idNumber: '654321098765',
          idPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        },
      },
      eligibilityCheck: {
        create: {
          income: new Prisma.Decimal(160000.0),
          requestedAmount: new Prisma.Decimal(800000.0),
          creditScore: 810,
          existingDebts: new Prisma.Decimal(22000.0),
          employerName: 'Cognizant Technology Solutions',
          designation: 'Director of Product Engineering',
          dtiRatio: new Prisma.Decimal(25.1),
          result: EligibilityResult.ELIGIBLE,
          maxApprovedAmount: new Prisma.Decimal(1200000.0),
        },
      },
      loanTerms: {
        create: {
          amount: new Prisma.Decimal(800000.0),
          tenureMonths: 36,
          interestRate: new Prisma.Decimal(12.75),
          processingFee: new Prisma.Decimal(16000.0),
          gst: new Prisma.Decimal(2880.0),
          otherCharges: new Prisma.Decimal(500.0),
          emi: new Prisma.Decimal(26863.0),
          totalInterest: new Prisma.Decimal(167068.0),
          totalRepayment: new Prisma.Decimal(967068.0),
          totalCharges: new Prisma.Decimal(19380.0),
          netDisbursement: new Prisma.Decimal(780620.0),
          irr: new Prisma.Decimal(13.9),
        },
      },
      bankAccount: {
        create: {
          holderName: 'Rajesh Iyer',
          accountNumber: '201098765432',
          ifsc: 'SBIN0001890',
          bankName: 'State Bank of India',
        },
      },
      declaration: {
        create: {
          acceptedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          termsVersion: 'v1.0',
          ipAddress: '122.164.55.10',
        },
      },
      selfie: {
        create: {
          photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          adminStatus: AdminReviewStatus.PENDING,
        },
      },
    },
  });

  // 6. Customer 4: Ananya Verma — ELIGIBILITY_CHECKED (Ready for EMI Selection)
  console.log('👤 Creating Customer 4 (Ananya Verma - ELIGIBILITY_CHECKED)...');
  const customer4 = await prisma.user.create({
    data: {
      email: 'ananya.verma@example.com',
      phone: '+919876543214',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const app4 = await prisma.application.create({
    data: {
      userId: customer4.id,
      stage: ApplicationStage.ELIGIBILITY_CHECKED,
      kycDetails: {
        create: {
          fullName: 'Ananya Verma',
          dob: new Date('1996-03-18'),
          gender: 'Female',
          address: 'Flat 101, Cyber Heights, Gachibowli, Hyderabad, Telangana - 500032',
          idType: IdType.PAN,
          idNumber: 'CPYPV9876C',
          idPhotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
        },
      },
      eligibilityCheck: {
        create: {
          income: new Prisma.Decimal(65000.0),
          requestedAmount: new Prisma.Decimal(250000.0),
          creditScore: 715,
          existingDebts: new Prisma.Decimal(8000.0),
          employerName: 'Wipro Enterprises',
          designation: 'Marketing Specialist',
          dtiRatio: new Prisma.Decimal(34.2),
          result: EligibilityResult.PARTIALLY_ELIGIBLE,
          maxApprovedAmount: new Prisma.Decimal(200000.0),
        },
      },
    },
  });

  // 7. Customer 5: Vikram Malhotra — KYC_PENDING (New user completing initial KYC)
  console.log('👤 Creating Customer 5 (Vikram Malhotra - KYC_PENDING)...');
  const customer5 = await prisma.user.create({
    data: {
      email: 'vikram.malhotra@example.com',
      phone: '+919876543215',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: false,
    },
  });

  const app5 = await prisma.application.create({
    data: {
      userId: customer5.id,
      stage: ApplicationStage.KYC_PENDING,
    },
  });

  console.log(`
  ======================================================
  ✅ Database Seeding Completed Successfully!
  ======================================================
  👑 Admin Users:
     - admin@ezfinanz.com (Password: AdminPassword@123)

  👥 Customer Users:
     1. aarav.sharma@example.com  - DISBURSED (App ID: ${app1.id})
     2. priya.patel@example.com   - REJECTED (App ID: ${app2.id})
     3. rajesh.iyer@example.com   - WAITING_ADMIN_REVIEW (App ID: ${app3.id})
     4. ananya.verma@example.com  - ELIGIBILITY_CHECKED (App ID: ${app4.id})
     5. vikram.malhotra@example.com - KYC_PENDING (App ID: ${app5.id})
  ======================================================
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
