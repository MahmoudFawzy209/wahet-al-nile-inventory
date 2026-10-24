import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'all' (multi-sheet) | 'inventory' | 'purchases' | 'usage'

    // Fetch items with categories
    const items = await prisma.inventoryItem.findMany({
      include: { category: true },
      orderBy: [{ category: { displayOrder: 'asc' } }, { name: 'asc' }],
    });

    const purchases = await prisma.purchaseRecord.findMany({
      include: { item: true },
      orderBy: { purchaseDate: 'desc' },
      take: 200,
    });

    const transactions = await prisma.stockTransaction.findMany({
      include: { item: true },
      orderBy: { date: 'desc' },
      take: 200,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'نظام إدارة مخزون مطعم المندي والمأكولات اليمنية';
    workbook.created = new Date();

    const nowFormatted = new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date());

    const currentDateStr = new Date().toISOString().split('T')[0];

    // ==========================================
    // 1. ورقة المخزون الحالي (Current Inventory)
    // ==========================================
    if (type === 'all' || type === 'inventory') {
      const sheet = workbook.addWorksheet('المخزون الحالي', {
        views: [{ state: 'frozen', ySplit: 5, rightToLeft: true } as any],
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: {
            left: 0.5,
            right: 0.5,
            top: 0.75,
            bottom: 0.75,
            header: 0.3,
            footer: 0.3,
          },
          printTitlesRow: '5:5',
        },
      });

      // Header Banner
      sheet.mergeCells('A1:M1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'تقرير مخزون مطعم المندي والمأكولات اليمنية';
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF854D0E' }, // Amber 800
      };
      sheet.getRow(1).height = 36;

      // Sub-header Metadata
      sheet.mergeCells('A2:M2');
      const metaCell = sheet.getCell('A2');
      metaCell.value = `تاريخ ووقت استخراج التقرير: ${nowFormatted} | فرع: سوهاج (الكورنيش - نادي النيل)`;
      metaCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFE2E8F0' } };
      metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      metaCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      sheet.getRow(2).height = 20;

      // Summary Statistics Row
      const totalItemsCount = items.length;
      const lowStockCount = items.filter(
        (i) => i.currentStock > 0 && i.currentStock <= i.minStock
      ).length;
      const outOfStockCount = items.filter((i) => i.currentStock <= 0).length;
      const totalEstimatedValue = items.reduce(
        (sum, i) => sum + i.currentStock * (i.avgUnitPrice || 0),
        0
      );

      sheet.mergeCells('A3:M3');
      const statsCell = sheet.getCell('A3');
      statsCell.value = `إجمالي الأصناف: ${totalItemsCount} | أصناف منخفضة: ${lowStockCount} | أصناف نافدة: ${outOfStockCount} | إجمالي القيمة التقديرية للمخزون: ${totalEstimatedValue.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
      statsCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
      statsCell.alignment = { horizontal: 'center', vertical: 'middle' };
      statsCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };
      sheet.getRow(3).height = 24;

      sheet.getRow(4).height = 10; // Empty spacer row

      // Column Headers (Row 5)
      const headers = [
        'م',
        'اسم المادة',
        'التصنيف',
        'وحدة القياس',
        'الرصيد الحالي',
        'الحد الأدنى للمخزون',
        'الكمية المطلوب شراؤها',
        'متوسط سعر الوحدة',
        'القيمة التقديرية للمخزون',
        'آخر تاريخ شراء',
        'اسم المورد',
        'حالة المخزون',
        'ملاحظات',
      ];

      const headerRow = sheet.getRow(5);
      headerRow.values = headers;
      headerRow.height = 28;

      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0F172A' }, // Slate 900
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });

      // Data Rows
      items.forEach((item, index) => {
        const rowIndex = 6 + index;
        const row = sheet.getRow(rowIndex);

        // Required purchase quantity
        const needed =
          item.currentStock <= item.minStock
            ? Math.max(0, (item.targetStock || item.minStock * 2) - item.currentStock)
            : 0;

        // Estimated value
        const estValue =
          item.avgUnitPrice > 0 && item.currentStock > 0
            ? item.currentStock * item.avgUnitPrice
            : null;

        // Status
        let status = 'متوفر';
        if (item.currentStock <= 0) {
          status = 'نافد';
        } else if (item.currentStock <= item.minStock) {
          status = 'منخفض';
        }

        const lastDateFormatted = item.lastPurchaseDate
          ? new Date(item.lastPurchaseDate).toLocaleDateString('ar-EG')
          : '—';

        row.values = [
          index + 1,
          item.name,
          item.category.name,
          item.unit,
          item.currentStock,
          item.minStock,
          needed > 0 ? needed : 0,
          item.avgUnitPrice > 0 ? item.avgUnitPrice : null,
          estValue,
          lastDateFormatted,
          item.lastSupplier || '—',
          status,
          item.notes || '—',
        ];

        row.height = 22;

        // Number and currency formatting
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(7).numFmt = '#,##0.00';
        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

        // Average unit price
        if (item.avgUnitPrice > 0) {
          row.getCell(8).numFmt = '#,##0.00 "ج.م"';
        }
        row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

        // Estimated value
        if (estValue !== null) {
          row.getCell(9).numFmt = '#,##0.00 "ج.م"';
        }
        row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

        row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };

        // Cell borders & color highlighting for Out of Stock or Low Stock
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };

          if (status === 'نافد') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEE2E2' }, // Soft Red
            };
          } else if (status === 'منخفض') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEF3C7' }, // Soft Yellow
            };
          }
        });

        // Status badge font color
        if (status === 'نافد') {
          row.getCell(12).font = { bold: true, color: { argb: 'FFDC2626' } };
        } else if (status === 'منخفض') {
          row.getCell(12).font = { bold: true, color: { argb: 'FFD97706' } };
        } else {
          row.getCell(12).font = { bold: true, color: { argb: 'FF16A34A' } };
        }
      });

      // Total Row at bottom
      const totalRowIndex = 6 + items.length;
      const totalRow = sheet.getRow(totalRowIndex);
      totalRow.getCell(2).value = 'الإجمالي العام للمخزون';
      totalRow.getCell(2).font = { bold: true };
      totalRow.getCell(9).value = totalEstimatedValue;
      totalRow.getCell(9).numFmt = '#,##0.00 "ج.م"';
      totalRow.getCell(9).font = { bold: true };
      totalRow.height = 26;

      totalRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' },
        };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          bottom: { style: 'double', color: { argb: 'FF000000' } },
        };
      });

      // Enable AutoFilter on data table
      sheet.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: totalRowIndex - 1, column: 13 },
      };

      // Set explicit column widths for perfect print and view
      sheet.columns = [
        { key: 'index', width: 6 },
        { key: 'name', width: 28 },
        { key: 'category', width: 18 },
        { key: 'unit', width: 12 },
        { key: 'currentStock', width: 15 },
        { key: 'minStock', width: 15 },
        { key: 'needed', width: 16 },
        { key: 'avgPrice', width: 16 },
        { key: 'estValue', width: 20 },
        { key: 'lastDate', width: 16 },
        { key: 'supplier', width: 26 },
        { key: 'status', width: 14 },
        { key: 'notes', width: 26 },
      ];
    }

    // ==========================================
    // 2. ورقة سجل المشتريات (Purchases Log)
    // ==========================================
    if (type === 'all' || type === 'purchases') {
      const pSheet = workbook.addWorksheet('سجل المشتريات', {
        views: [{ state: 'frozen', ySplit: 4, rightToLeft: true } as any],
        pageSetup: {
          paperSize: 9,
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
        },
      });

      pSheet.mergeCells('A1:G1');
      const pTitle = pSheet.getCell('A1');
      pTitle.value = 'سجل مشتريات المواد الخام والتوريدات';
      pTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      pTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      pTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }, // Blue 900
      };
      pSheet.getRow(1).height = 32;

      pSheet.mergeCells('A2:G2');
      pSheet.getCell('A2').value = `تاريخ التصدير: ${nowFormatted}`;
      pSheet.getCell('A2').alignment = { horizontal: 'center' };
      pSheet.getCell('A2').font = { size: 9, italic: true };

      pSheet.getRow(4).values = [
        'م',
        'اسم المادة',
        'الكمية المشتراة',
        'سعر الوحدة',
        'الإجمالي',
        'تاريخ الشراء',
        'المورد / جهة الشراء',
      ];
      pSheet.getRow(4).height = 26;

      pSheet.getRow(4).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      purchases.forEach((p, idx) => {
        const row = pSheet.getRow(5 + idx);
        row.values = [
          idx + 1,
          p.item.name,
          `${p.quantity} ${p.item.unit}`,
          p.unitPrice,
          p.totalPrice,
          new Date(p.purchaseDate).toLocaleDateString('ar-EG'),
          p.supplier || '—',
        ];
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'right' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).numFmt = '#,##0.00 "ج.م"';
        row.getCell(5).numFmt = '#,##0.00 "ج.م"';
        row.getCell(6).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'right' };
      });

      pSheet.columns = [
        { width: 6 },
        { width: 30 },
        { width: 18 },
        { width: 16 },
        { width: 18 },
        { width: 18 },
        { width: 30 },
      ];
    }

    // ==========================================
    // 3. ورقة سجل الاستهلاك والتالف (Usage & Waste)
    // ==========================================
    if (type === 'all' || type === 'usage') {
      const uSheet = workbook.addWorksheet('سجل الاستهلاك والتالف', {
        views: [{ state: 'frozen', ySplit: 4, rightToLeft: true } as any],
        pageSetup: {
          paperSize: 9,
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
        },
      });

      uSheet.mergeCells('A1:G1');
      const uTitle = uSheet.getCell('A1');
      uTitle.value = 'سجل المنصرف للمطبخ والتالف والهدر';
      uTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      uTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      uTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF991B1B' }, // Red 800
      };
      uSheet.getRow(1).height = 32;

      uSheet.mergeCells('A2:G2');
      uSheet.getCell('A2').value = `تاريخ التصدير: ${nowFormatted}`;
      uSheet.getCell('A2').alignment = { horizontal: 'center' };
      uSheet.getCell('A2').font = { size: 9, italic: true };

      uSheet.getRow(4).values = [
        'م',
        'اسم المادة',
        'الكمية المخصومة',
        'نوع الخصم',
        'سبب الخصم والبيان',
        'التاريخ',
        'المسؤول',
      ];
      uSheet.getRow(4).height = 26;

      uSheet.getRow(4).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      transactions.forEach((t, idx) => {
        const row = uSheet.getRow(5 + idx);
        const typeLabel =
          t.type === 'USAGE' ? 'استخدام مطبخ' : t.type === 'WASTE' ? 'تالف / هدر' : 'تسوية جرد';

        row.values = [
          idx + 1,
          t.item.name,
          `${t.quantity} ${t.item.unit}`,
          typeLabel,
          t.reason,
          new Date(t.date).toLocaleDateString('ar-EG'),
          t.recordedBy || 'المدير',
        ];
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'right' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'right' };
        row.getCell(6).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'center' };
      });

      uSheet.columns = [
        { width: 6 },
        { width: 30 },
        { width: 18 },
        { width: 16 },
        { width: 30 },
        { width: 18 },
        { width: 18 },
      ];
    }

    // Write buffer and respond
    const buffer = await workbook.xlsx.writeBuffer();

    const fileName =
      type === 'inventory'
        ? `تقرير_المخزون_${currentDateStr}.xlsx`
        : type === 'purchases'
        ? `تقرير_المشتريات_${currentDateStr}.xlsx`
        : type === 'usage'
        ? `تقرير_الاستهلاك_${currentDateStr}.xlsx`
        : `تقرير_المخزون_الشامل_${currentDateStr}.xlsx`;

    const asciiFileName =
      type === 'inventory'
        ? 'inventory_report.xlsx'
        : type === 'purchases'
        ? 'purchases_report.xlsx'
        : type === 'usage'
        ? 'usage_report.xlsx'
        : 'yemeni_restaurant_full_inventory.xlsx';

    const encodedFileName = encodeURIComponent(fileName);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel report:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إنشاء ملف Excel' },
      { status: 500 }
    );
  }
}
