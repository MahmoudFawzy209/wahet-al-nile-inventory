import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all inventory items with search, filter, and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const categoryId = searchParams.get('categoryId') || '';
    const status = searchParams.get('status') || ''; // 'all' | 'low' | 'out' | 'available'

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { notes: { contains: search } },
        { lastSupplier: { contains: search } },
      ];
    }

    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }

    const allItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ category: { displayOrder: 'asc' } }, { name: 'asc' }],
    });

    // Filter by stock status if requested
    const filteredItems = allItems.filter((item) => {
      if (status === 'out') return item.currentStock <= 0;
      if (status === 'low') return item.currentStock > 0 && item.currentStock <= item.minStock;
      if (status === 'available') return item.currentStock > item.minStock;
      return true;
    });

    // Compute overview metrics across all items
    const totalItems = allItems.length;
    const lowStockCount = allItems.filter(
      (i) => i.currentStock > 0 && i.currentStock <= i.minStock
    ).length;
    const outOfStockCount = allItems.filter((i) => i.currentStock <= 0).length;
    const totalStockValue = allItems.reduce(
      (sum, i) => sum + i.currentStock * (i.avgUnitPrice || 0),
      0
    );

    // Categories list for filters and dropdowns
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      items: filteredItems,
      categories,
      stats: {
        totalItems,
        lowStockCount,
        outOfStockCount,
        totalStockValue,
      },
    });
  } catch (error) {
    console.error('Failed to get inventory:', error);
    return NextResponse.json(
      { error: 'فشل في استرجاع بيانات المخزون' },
      { status: 500 }
    );
  }
}

// POST: Add new inventory item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      categoryId,
      unit,
      currentStock,
      minStock,
      targetStock,
      avgUnitPrice,
      lastSupplier,
      notes,
    } = body;

    if (!name || !categoryId || !unit) {
      return NextResponse.json(
        { error: 'يرجى إدخال اسم المادة والتصنيف ووحدة القياس' },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await prisma.inventoryItem.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'توجد مادة أخرى بنفس هذا الاسم في المخزن' },
        { status: 400 }
      );
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        name: name.trim(),
        categoryId,
        unit: unit.trim(),
        currentStock: Number(currentStock) || 0,
        minStock: Number(minStock) || 0,
        targetStock: Number(targetStock) || (Number(minStock) || 0) * 2,
        avgUnitPrice: Number(avgUnitPrice) || 0,
        lastSupplier: lastSupplier?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        category: true,
      },
    });

    // If starting with stock and price, optionally create an opening purchase record
    if (Number(currentStock) > 0) {
      await prisma.purchaseRecord.create({
        data: {
          itemId: newItem.id,
          quantity: Number(currentStock),
          unitPrice: Number(avgUnitPrice) || 0,
          totalPrice: (Number(currentStock) || 0) * (Number(avgUnitPrice) || 0),
          supplier: lastSupplier?.trim() || 'رصيد افتتاحي أولي',
          notes: 'تسجيل رصيد افتتاحي عند إضافة المادة',
        },
      });
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Failed to create inventory item:', error);
    return NextResponse.json(
      { error: 'فشل في حفظ المادة الجديدة' },
      { status: 500 }
    );
  }
}

// PUT: Update existing inventory item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      categoryId,
      unit,
      currentStock,
      minStock,
      targetStock,
      avgUnitPrice,
      lastSupplier,
      notes,
    } = body;

    if (!id || !name || !categoryId || !unit) {
      return NextResponse.json(
        { error: 'بيانات التحديث غير مكتملة' },
        { status: 400 }
      );
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: name.trim(),
        categoryId,
        unit: unit.trim(),
        currentStock: Number(currentStock),
        minStock: Number(minStock),
        targetStock: Number(targetStock),
        avgUnitPrice: Number(avgUnitPrice),
        lastSupplier: lastSupplier?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update inventory item:', error);
    return NextResponse.json(
      { error: 'فشل في تحديث بيانات المادة' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an inventory item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المادة مطلوب' }, { status: 400 });
    }

    await prisma.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete inventory item:', error);
    return NextResponse.json(
      { error: 'فشل في حذف المادة من المخزن' },
      { status: 500 }
    );
  }
}
