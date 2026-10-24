import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all purchases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    const where: any = {};
    if (itemId) {
      where.itemId = itemId;
    }

    const purchases = await prisma.purchaseRecord.findMany({
      where,
      include: {
        item: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
      take: 100,
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error('Failed to get purchases:', error);
    return NextResponse.json(
      { error: 'فشل في استرجاع سجل المشتريات' },
      { status: 500 }
    );
  }
}

// POST: Record new purchase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, quantity, unitPrice, totalPrice, supplier, purchaseDate, notes } = body;

    const parsedQty = Number(quantity);
    const parsedUnitPrice = Number(unitPrice);
    const parsedTotal = Number(totalPrice) || parsedQty * parsedUnitPrice;

    if (!itemId || parsedQty <= 0 || parsedUnitPrice < 0) {
      return NextResponse.json(
        { error: 'يرجى تحديد المادة وإدخال كمية وسعر شراء صحيحين' },
        { status: 400 }
      );
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: 'المادة المحددة غير موجودة' }, { status: 404 });
    }

    const dateToUse = purchaseDate ? new Date(purchaseDate) : new Date();

    // Use transaction to safely record purchase and update stock and price
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create purchase record
      const record = await tx.purchaseRecord.create({
        data: {
          itemId,
          quantity: parsedQty,
          unitPrice: parsedUnitPrice,
          totalPrice: parsedTotal,
          supplier: supplier?.trim() || null,
          purchaseDate: dateToUse,
          notes: notes?.trim() || null,
        },
      });

      // 2. Calculate new weighted average price
      const currentStock = Math.max(0, item.currentStock);
      const newStock = currentStock + parsedQty;
      const currentVal = currentStock * (item.avgUnitPrice || parsedUnitPrice);
      const newAvgUnitPrice =
        newStock > 0 ? (currentVal + parsedTotal) / newStock : parsedUnitPrice;

      // 3. Update item
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: newStock,
          avgUnitPrice: Math.round(newAvgUnitPrice * 100) / 100,
          lastPurchaseDate: dateToUse,
          lastSupplier: supplier?.trim() || item.lastSupplier,
        },
        include: { category: true },
      });

      return { record, updatedItem };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to record purchase:', error);
    return NextResponse.json(
      { error: 'فشل في تسجيل عملية الشراء' },
      { status: 500 }
    );
  }
}
