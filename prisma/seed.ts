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

  // 3. Sample Inventory Items (Initial Real-World Data for Yemeni Restaurant)
  const initialItems = [
    {
      name: 'اللحم الجملي البلدي (طازج)',
      category: 'اللحوم والدواجن',
      unit: 'كجم',
      currentStock: 45.0,
      minStock: 20.0,
      targetStock: 70.0,
      avgUnitPrice: 340.0,
      lastSupplier: 'جزارة الواحة للأمانة - سوهاج',
      notes: 'مخصص لطواسي اللحم والمقلقل اليومي'
    },
    {
      name: 'اللحم البقري البلدي المشفي',
      category: 'اللحوم والدواجن',
      unit: 'كجم',
      currentStock: 14.0, // منخفض للتجربة والتنبيه
      minStock: 25.0,
      targetStock: 80.0,
      avgUnitPrice: 390.0,
      lastSupplier: 'مورد اللحوم البلدية',
      notes: 'يستخدم للفحسة والشوربة والمندي'
    },
    {
      name: 'لحم ضأن / تيس بلدي للمندي',
      category: 'اللحوم والدواجن',
      unit: 'كجم',
      currentStock: 32.0,
      minStock: 15.0,
      targetStock: 60.0,
      avgUnitPrice: 430.0,
      lastSupplier: 'مزارع الصعيد لتسمين الخراف',
      notes: 'مخصص للمندي والحنيذ في براميل الحطب'
    },
    {
      name: 'دجاج مبرد طازج (وزن 1100 جم)',
      category: 'اللحوم والدواجن',
      unit: 'قطعة',
      currentStock: 50.0,
      minStock: 20.0,
      targetStock: 100.0,
      avgUnitPrice: 95.0,
      lastSupplier: 'شركة الدواجن الوطنية',
      notes: 'لمندي ومظبي الدجاج'
    },
    {
      name: 'أرز بسمتي هندي سيلا درجة أولى (طويل الحبة)',
      category: 'الأرز والحبوب',
      unit: 'كجم',
      currentStock: 120.0,
      minStock: 40.0,
      targetStock: 200.0,
      avgUnitPrice: 85.0,
      lastSupplier: 'شركة الأهرام للتجارة والاستيراد',
      notes: 'أرز المندي والكبسة والزربيان الأساسي'
    },
    {
      name: 'أرز مصري عريض الحبة فاخر',
      category: 'الأرز والحبوب',
      unit: 'كجم',
      currentStock: 8.0, // أوشك على النفاد للتنبيه
      minStock: 15.0,
      targetStock: 50.0,
      avgUnitPrice: 32.0,
      lastSupplier: 'مضرب الأرز الحديث',
      notes: 'للوجبات الجانبية والشعبية'
    },
    {
      name: 'بطاطس طهي جيدة (للزربيان والإدامات)',
      category: 'الخضروات والطازج',
      unit: 'كجم',
      currentStock: 40.0,
      minStock: 15.0,
      targetStock: 60.0,
      avgUnitPrice: 18.0,
      lastSupplier: 'سوق الخضار المركزي - سوهاج',
      notes: 'استهلاك يومي سريع'
    },
    {
      name: 'بصل أحمر بلدي خزين',
      category: 'الخضروات والطازج',
      unit: 'كجم',
      currentStock: 55.0,
      minStock: 20.0,
      targetStock: 80.0,
      avgUnitPrice: 16.0,
      lastSupplier: 'سوق الخضار المركزي - سوهاج',
      notes: 'لتقلية الزربيان وتتبيلات اللحوم'
    },
    {
      name: 'طماطم طازجة حمراء (للسحاوق والإدامات)',
      category: 'الخضروات والطازج',
      unit: 'كجم',
      currentStock: 0.0, // نافد للتجربة والتنبيه
      minStock: 15.0,
      targetStock: 45.0,
      avgUnitPrice: 15.0,
      lastSupplier: 'سوق الخضار المركزي - سوهاج',
      notes: 'مطلوب شراء فوري اليوم'
    },
    {
      name: 'زيت طهي نباتي نقي (صفوة)',
      category: 'الزيوت والتوابل',
      unit: 'لتر',
      currentStock: 35.0,
      minStock: 15.0,
      targetStock: 60.0,
      avgUnitPrice: 65.0,
      lastSupplier: 'توزيع الجملة سوهاج',
      notes: 'للقلي والطبخ اليومي'
    },
    {
      name: 'سمن بقري يماني أصيل',
      category: 'الزيوت والتوابل',
      unit: 'كجم',
      currentStock: 18.0,
      minStock: 8.0,
      targetStock: 30.0,
      avgUnitPrice: 260.0,
      lastSupplier: 'عطارة الخير اليمنية',
      notes: 'للسلتة والفحسة والعريكة والمعصوب'
    },
    {
      name: 'حلبة يمانية مطحونة فاخرة (للسلتة)',
      category: 'الزيوت والتوابل',
      unit: 'كجم',
      currentStock: 12.0,
      minStock: 5.0,
      targetStock: 25.0,
      avgUnitPrice: 110.0,
      lastSupplier: 'عطارة الخير اليمنية',
      notes: 'المكون الرئيسي لرغوة السلتة والفحسة'
    },
    {
      name: 'بهارات مندي وحنيذ يمنية مجهزة يدوياً',
      category: 'الزيوت والتوابل',
      unit: 'كجم',
      currentStock: 7.0,
      minStock: 5.0,
      targetStock: 20.0,
      avgUnitPrice: 280.0,
      lastSupplier: 'بهارات حضرموت التراثية',
      notes: 'خلطة سرية خاصة بالمطعم'
    },
    {
      name: 'شاي كبوس يمني أسود فاخر (كرتون)',
      category: 'المشروبات ومستلزمات الشاي',
      unit: 'عبوة',
      currentStock: 15.0,
      minStock: 6.0,
      targetStock: 30.0,
      avgUnitPrice: 140.0,
      lastSupplier: 'وكيل شاي الكبوس',
      notes: 'لتحضير الشاي العدني وشاي الكرم'
    },
    {
      name: 'حليب مبخر ممتاز للشاي العدني',
      category: 'المشروبات ومستلزمات الشاي',
      unit: 'عبوة',
      currentStock: 48.0,
      minStock: 24.0,
      targetStock: 96.0,
      avgUnitPrice: 32.0,
      lastSupplier: 'شركة الألبان المتحدة',
      notes: 'شاي عدني بالحليب والهيل'
    },
    {
      name: 'فحم طبيعي وحطب سمر لبراميل المندي',
      category: 'مستلزمات التعبئة والتشغيل',
      unit: 'كجم',
      currentStock: 180.0,
      minStock: 60.0,
      targetStock: 300.0,
      avgUnitPrice: 25.0,
      lastSupplier: 'مستودع أخشاب وفحم الصعيد',
      notes: 'لبراميل المندي وتسوية الحنيذ'
    },
    {
      name: 'أطباق وعلب سفري قصدير دائرية بالغطاء',
      category: 'مستلزمات التعبئة والتشغيل',
      unit: 'كرتونة',
      currentStock: 5.0,
      minStock: 3.0,
      targetStock: 15.0,
      avgUnitPrice: 420.0,
      lastSupplier: 'مصنع الأهرام للتغليف',
      notes: 'لتغليف وجبات التوصيل والسفري'
    }
  ];

  const now = new Date();

  for (const item of initialItems) {
    const categoryId = categoryMap.get(item.category)!;
    const createdItem = await prisma.inventoryItem.upsert({
      where: { name: item.name },
      update: {
        categoryId,
        unit: item.unit,
        currentStock: item.currentStock,
        minStock: item.minStock,
        targetStock: item.targetStock,
        avgUnitPrice: item.avgUnitPrice,
        lastSupplier: item.lastSupplier,
        notes: item.notes,
        lastPurchaseDate: now
      },
      create: {
        name: item.name,
        categoryId,
        unit: item.unit,
        currentStock: item.currentStock,
        minStock: item.minStock,
        targetStock: item.targetStock,
        avgUnitPrice: item.avgUnitPrice,
        lastSupplier: item.lastSupplier,
        notes: item.notes,
        lastPurchaseDate: now
      }
    });

    // Seed one purchase history record for each
    await prisma.purchaseRecord.create({
      data: {
        itemId: createdItem.id,
        quantity: item.currentStock > 0 ? item.currentStock : 20,
        unitPrice: item.avgUnitPrice,
        totalPrice: (item.currentStock > 0 ? item.currentStock : 20) * item.avgUnitPrice,
        supplier: item.lastSupplier,
        purchaseDate: new Date(Date.now() - Math.floor(Math.random() * 5 + 1) * 86400000),
        notes: 'دفعة توريد افتتاحية معتمدة'
      }
    });
  }

  // Seed sample transactions (usage & waste)
  const items = await prisma.inventoryItem.findMany({ take: 4 });
  if (items.length > 0) {
    await prisma.stockTransaction.create({
      data: {
        itemId: items[0].id,
        quantity: 5.0,
        type: 'USAGE',
        reason: 'استخدام مطبخ - وجبات مندي ومقلقل الغداء',
        date: new Date(),
        notes: 'صُرف لشيف المندي',
        recordedBy: 'المدير'
      }
    });
    if (items.length > 1) {
      await prisma.stockTransaction.create({
        data: {
          itemId: items[1].id,
          quantity: 1.5,
          type: 'WASTE',
          reason: 'تالف - هدر تنظيف وعروق غير صالحة',
          date: new Date(),
          notes: 'معتمد من الشيف الرئيسي',
          recordedBy: 'المدير'
        }
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
