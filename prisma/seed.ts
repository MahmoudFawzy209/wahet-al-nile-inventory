import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Yemeni Restaurant Inventory...');

  // 1. Initial Manager User
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash },
    create: {
      username: 'admin',
      name: 'مدير المخزن والمشتريات',
      passwordHash,
      role: 'MANAGER'
    }
  });

  // 2. Categories
  const categoriesData = [
    { name: 'اللحوم والدواجن', displayOrder: 1 },
    { name: 'الأرز والحبوب', displayOrder: 2 },
    { name: 'الخضروات والطازج', displayOrder: 3 },
    { name: 'الزيوت والتوابل', displayOrder: 4 },
    { name: 'المشروبات ومستلزمات الشاي', displayOrder: 5 },
    { name: 'مستلزمات التعبئة والتشغيل', displayOrder: 6 }
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: { displayOrder: cat.displayOrder },
      create: cat
    });
    categoryMap.set(cat.name, c.id);
  }

  // Clear existing items and recreate with clean concise names
  await prisma.purchaseRecord.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();

  // 3. Clean Items without parenthesized descriptions
  const initialItems = [
    {
      name: 'اللحم الجملي البلدي',
      category: 'اللحوم والدواجن',
      unit: 'كجم',
      currentStock: 45.0,
      minStock: 20.0,
      targetStock: 70.0,
      avgUnitPrice: 340.0,
      lastSupplier: 'جزارة الواحة للأمانة - سوهاج',
      notes: ''
    },
    {
      name: 'اللحم البقري البلدي المشفي',
      category: 'اللحوم والدواجن',
      unit: 'كجم',
      currentStock: 14.0,
      minStock: 25.0,
      targetStock: 80.0,
      avgUnitPrice: 390.0,
      lastSupplier: 'مورد اللحوم البلدية',
      notes: ''
    },
    {
      name: 'لحم ضأن / تيس بلدي',
      category: 'اللحوم والدواجن',
      unit: 'كجم',
      currentStock: 32.0,
      minStock: 15.0,
      targetStock: 60.0,
      avgUnitPrice: 430.0,
      lastSupplier: 'مزارع الصعيد لتسمين الخراف',
      notes: ''
    },
    {
      name: 'دجاج مبرد طازج',
      category: 'اللحوم والدواجن',
      unit: 'قطعة',
      currentStock: 50.0,
      minStock: 20.0,
      targetStock: 100.0,
      avgUnitPrice: 95.0,
      lastSupplier: 'شركة الدواجن الوطنية',
      notes: ''
    },
    {
      name: 'أرز بسمتي هندي سيلا',
      category: 'الأرز والحبوب',
      unit: 'كجم',
      currentStock: 120.0,
      minStock: 40.0,
      targetStock: 200.0,
      avgUnitPrice: 85.0,
      lastSupplier: 'شركة الأهرام للتجارة والاستيراد',
      notes: ''
    },
    {
      name: 'أرز مصري عريض الحبة',
      category: 'الأرز والحبوب',
      unit: 'كجم',
      currentStock: 8.0,
      minStock: 15.0,
      targetStock: 50.0,
      avgUnitPrice: 32.0,
      lastSupplier: 'مضرب الأرز الحديث',
      notes: ''
    },
    {
      name: 'بطاطس طهي',
      category: 'الخضروات والطازج',
      unit: 'كجم',
      currentStock: 40.0,
      minStock: 15.0,
      targetStock: 60.0,
      avgUnitPrice: 18.0,
      lastSupplier: 'سوق الخضار المركزي - سوهاج',
      notes: ''
    },
    {
      name: 'بصل أحمر بلدي',
      category: 'الخضروات والطازج',
      unit: 'كجم',
      currentStock: 55.0,
      minStock: 20.0,
      targetStock: 80.0,
      avgUnitPrice: 16.0,
      lastSupplier: 'سوق الخضار المركزي - سوهاج',
      notes: ''
    },
    {
      name: 'طماطم حمراء طازجة',
      category: 'الخضروات والطازج',
      unit: 'كجم',
      currentStock: 20.0,
      minStock: 15.0,
      targetStock: 45.0,
      avgUnitPrice: 15.0,
      lastSupplier: 'سوق الخضار المركزي - سوهاج',
      notes: ''
    },
    {
      name: 'زيت طهي نباتي',
      category: 'الزيوت والتوابل',
      unit: 'لتر',
      currentStock: 35.0,
      minStock: 15.0,
      targetStock: 60.0,
      avgUnitPrice: 65.0,
      lastSupplier: 'توزيع الجملة سوهاج',
      notes: ''
    },
    {
      name: 'سمن بقري يماني',
      category: 'الزيوت والتوابل',
      unit: 'كجم',
      currentStock: 18.0,
      minStock: 8.0,
      targetStock: 30.0,
      avgUnitPrice: 260.0,
      lastSupplier: 'عطارة الخير اليمنية',
      notes: ''
    },
    {
      name: 'حلبة يمانية مطحونة',
      category: 'الزيوت والتوابل',
      unit: 'كجم',
      currentStock: 12.0,
      minStock: 5.0,
      targetStock: 25.0,
      avgUnitPrice: 110.0,
      lastSupplier: 'عطارة الخير اليمنية',
      notes: ''
    },
    {
      name: 'بهارات مندي وحنيذ يمنية',
      category: 'الزيوت والتوابل',
      unit: 'كجم',
      currentStock: 7.0,
      minStock: 5.0,
      targetStock: 20.0,
      avgUnitPrice: 280.0,
      lastSupplier: 'بهارات حضرموت التراثية',
      notes: ''
    },
    {
      name: 'شاي كبوس أسود فاخر',
      category: 'المشروبات ومستلزمات الشاي',
      unit: 'عبوة',
      currentStock: 15.0,
      minStock: 6.0,
      targetStock: 30.0,
      avgUnitPrice: 140.0,
      lastSupplier: 'وكيل شاي الكبوس',
      notes: ''
    },
    {
      name: 'حليب مبخر للشاي العدني',
      category: 'المشروبات ومستلزمات الشاي',
      unit: 'عبوة',
      currentStock: 48.0,
      minStock: 24.0,
      targetStock: 96.0,
      avgUnitPrice: 32.0,
      lastSupplier: 'شركة الألبان المتحدة',
      notes: ''
    },
    {
      name: 'فحم طبيعي وحطب سمر',
      category: 'مستلزمات التعبئة والتشغيل',
      unit: 'كجم',
      currentStock: 180.0,
      minStock: 60.0,
      targetStock: 300.0,
      avgUnitPrice: 25.0,
      lastSupplier: 'مستودع أخشاب وفحم الصعيد',
      notes: ''
    },
    {
      name: 'أطباق وعلب سفري قصدير',
      category: 'مستلزمات التعبئة والتشغيل',
      unit: 'كرتونة',
      currentStock: 5.0,
      minStock: 3.0,
      targetStock: 15.0,
      avgUnitPrice: 420.0,
      lastSupplier: 'مصنع الأهرام للتغليف',
      notes: ''
    }
  ];

  const now = new Date();

  for (const item of initialItems) {
    const categoryId = categoryMap.get(item.category)!;
    const createdItem = await prisma.inventoryItem.create({
      data: {
        name: item.name,
        categoryId,
        unit: item.unit,
        currentStock: item.currentStock,
        minStock: item.minStock,
        targetStock: item.targetStock,
        avgUnitPrice: item.avgUnitPrice,
        lastSupplier: item.lastSupplier,
        notes: '',
        lastPurchaseDate: now
      }
    });

    // Seed one purchase history record with empty notes
    await prisma.purchaseRecord.create({
      data: {
        itemId: createdItem.id,
        quantity: item.currentStock,
        unitPrice: item.avgUnitPrice,
        totalPrice: item.currentStock * item.avgUnitPrice,
        supplier: item.lastSupplier,
        purchaseDate: new Date(Date.now() - Math.floor(Math.random() * 4 + 1) * 86400000),
        notes: ''
      }
    });
  }

  // Seed sample usage & waste
  const allItems = await prisma.inventoryItem.findMany();
  const meatItem = allItems.find((i) => i.name.includes('اللحم البقري'));
  const riceItem = allItems.find((i) => i.name.includes('أرز مصري'));

  if (meatItem) {
    await prisma.stockTransaction.create({
      data: {
        itemId: meatItem.id,
        quantity: 2.0,
        type: 'USAGE',
        reason: 'استخدام مطبخ',
        date: new Date(),
        notes: '',
        recordedBy: 'المدير'
      }
    });
    await prisma.stockTransaction.create({
      data: {
        itemId: meatItem.id,
        quantity: 1.0,
        type: 'WASTE',
        reason: 'تالف - هدر تنظيف وعروق غير صالحة',
        date: new Date(),
        notes: '',
        recordedBy: 'المدير'
      }
    });
  }

  console.log('Seeding completed with clean names and notes!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
