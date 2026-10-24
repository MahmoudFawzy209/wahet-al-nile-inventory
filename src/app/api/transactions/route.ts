import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List usage and waste transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'USAGE' | 'WASTE' | 'all'
    const itemId = searchParams.get('itemId');

    const where: any = {};
    if (type && type !== 'all') {
      where.type = type;
    }
    if (itemId) {
      where.itemId = itemId;
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        item: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Failed to get transactions:', error);
    return NextResponse.json(
      { error: 'فشل في استرجاع سجل الاستهلاك والتالف' },
      { status: 500 }
    );
  }
}

// POST: Record usage or waste deduction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, quantity, type, reason, date, notes, recordedBy, allowNegative } = body;

    const parsedQty = Number(quantity);

    if (!itemId || parsedQty <= 0) {
      return NextResponse.json(
        { error: 'يرجى تحديد المادة وإدخال كمية خصم صحيحة' },
        { status: 400 }
      );
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 });
    }

    // Check if deduction exceeds current available stock
    if (parsedQty > item.currentStock && !allowNegative) {
      return NextResponse.json(
        {
          error: `الكمية المراد خصمها (${parsedQty} ${item.unit}) أكبر من الرصيد المتوفر في المخزن (${item.currentStock} ${item.unit}). يرجى مراجعة الرصيد الفعلي أولاً.`,
          requiresConfirmation: true,
          availableStock: item.currentStock,
        },
        { status: 400 }
      );
    }

    const dateToUse = date ? new Date(date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      const record = await tx.stockTransaction.create({
        data: {
          itemId,
          quantity: parsedQty,
          type: type || 'USAGE',
          reason: reason?.trim() || (type === 'WASTE' ? 'تالف / هدر' : 'استخدام مطبخ وطهي'),
          date: dateToUse,
          notes: notes?.trim() || null,
          recordedBy: recordedBy?.trim() || 'مدير المخزن',
        },
      });

      // 2. Decrement item current stock
      const newStock = Math.max(0, item.currentStock - parsedQty);
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: newStock,
        },
        include: { category: true },
      });

      return { record, updatedItem };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to record transaction:', error);
    return NextResponse.json(
      { error: 'فشل في تسجيل عملية الخصم' },
      { status: 500 }
    );
  }
}
