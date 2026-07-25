import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';

export async function GET(req: NextRequest) {
  try {
    // Dynamic import — ExcelJS is 23MB, must not load on cold start
    const ExcelJS = (await import('exceljs')).default;
    const buildingId = req.nextUrl.searchParams.get('buildingId');
    const all = req.nextUrl.searchParams.get('all') === 'true';

    if (!buildingId && !all) {
      return NextResponse.json({ error: 'বিল্ডিং আইডি দরকার' }, { status: 400 });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'আবাসিক ম্যানেজমেন্ট';
    workbook.created = new Date();

    const floorNames: Record<number, string> = {
      1: '১ম তলা', 2: '২য় তলা', 3: '৩য় তলা', 4: '৪র্থ তলা', 5: '৫ম তলা',
    };

    const addBuildingSheet = async (bId: string) => {
      // Get building info
      const building = await queryOne<{ id: string; name: string }>(
        'SELECT id, name FROM "Building" WHERE id = ?',
        [bId]
      );
      if (!building) return null;

      // Get all floors → rooms → inventories in one JOIN query
      const rows = await query<{
        floorNumber: number;
        roomId: string;
        roomNumber: string;
        invId: string | null;
        itemName: string | null;
        quantity: number | null;
        condition: string | null;
      }>(
        `SELECT f."floorNumber", r.id as "roomId", r."roomNumber",
                i.id as "invId", i."itemName", i.quantity, i."condition"
         FROM "Floor" f
         JOIN "Room" r ON r."floorId" = f.id
         LEFT JOIN "Inventory" i ON i."roomId" = r.id
         WHERE f."buildingId" = ?
         ORDER BY f."floorNumber" ASC, r."roomNumber" ASC, i."createdAt" ASC`,
        [bId]
      );

      // Group rows into floors → rooms → inventories structure
      interface InventoryItem {
        itemName: string;
        quantity: number;
        condition: string;
      }
      interface RoomData {
        roomNumber: string;
        inventories: InventoryItem[];
      }
      interface FloorData {
        floorNumber: number;
        rooms: RoomData[];
      }

      const floorsMap = new Map<number, FloorData>();
      const roomsMap = new Map<string, RoomData>();

      for (const row of rows) {
        // Ensure floor entry
        if (!floorsMap.has(row.floorNumber)) {
          floorsMap.set(row.floorNumber, { floorNumber: row.floorNumber, rooms: [] });
        }
        const floor = floorsMap.get(row.floorNumber)!;

        // Ensure room entry
        if (!roomsMap.has(row.roomId)) {
          const roomData: RoomData = { roomNumber: row.roomNumber, inventories: [] };
          roomsMap.set(row.roomId, roomData);
          floor.rooms.push(roomData);
        }
        const room = roomsMap.get(row.roomId)!;

        // Add inventory if present
        if (row.invId && row.itemName) {
          room.inventories.push({
            itemName: row.itemName,
            quantity: row.quantity ?? 0,
            condition: row.condition ?? 'ভালো',
          });
        }
      }

      // Convert map to sorted array
      const floors = Array.from(floorsMap.values()).sort((a, b) => a.floorNumber - b.floorNumber);

      // Sheet name must be <= 31 chars and cannot contain special chars
      let sheetName = building.name.replace(/[^a-zA-Z0-9\u0980-\u09FF\s]/g, '').trim().substring(0, 31) || 'Sheet';
      // Ensure unique sheet name
      let suffix = 1;
      let finalSheetName = sheetName;
      while (workbook.worksheets.some(ws => ws.name === finalSheetName)) {
        finalSheetName = `${sheetName.substring(0, 27)}_${suffix++}`;
      }

      const sheet = workbook.addWorksheet(finalSheetName);

      // Title row (Row 1)
      sheet.mergeCells('A1', 'E1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = `${building.name} - সকল রুমের মালামাল তালিকা`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 28;

      // Date row (Row 2)
      sheet.mergeCells('A2', 'E2');
      const dateCell = sheet.getCell('A2');
      dateCell.value = `তারিখ: ${new Date().toLocaleDateString('bn-BD')}`;
      dateCell.alignment = { horizontal: 'center' };

      // Header row (Row 3) - manually set each cell to avoid addRow counter issues
      const headerLabels = ['তলার নাম', 'রুম নং', 'মালামাল বিবরণ', 'পরিমাণ', 'অবস্থা'];
      const headerRowNum = 3;
      for (let col = 1; col <= 5; col++) {
        const cell = sheet.getRow(headerRowNum).getCell(col);
        cell.value = headerLabels[col - 1];
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF10B981' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
      sheet.getRow(headerRowNum).height = 22;

      let currentRow = 4;

      for (const floor of floors) {
        const floorName = floorNames[floor.floorNumber] || `${floor.floorNumber} তলা`;

        for (const room of floor.rooms) {
          if (room.inventories.length === 0) {
            const row = sheet.getRow(currentRow);
            row.getCell(1).value = floorName;
            row.getCell(2).value = room.roomNumber;
            row.getCell(3).value = 'কোনো মালামাল নেই';
            row.getCell(4).value = '-';
            row.getCell(5).value = '-';
            row.alignment = { horizontal: 'center' };
            currentRow++;
          } else {
            for (let i = 0; i < room.inventories.length; i++) {
              const inv = room.inventories[i];
              const row = sheet.getRow(currentRow);
              row.getCell(1).value = i === 0 ? floorName : '';
              row.getCell(2).value = i === 0 ? room.roomNumber : '';
              row.getCell(3).value = inv.itemName;
              row.getCell(4).value = inv.quantity;
              row.getCell(5).value = inv.condition;
              row.alignment = { horizontal: 'center' };
              currentRow++;
            }
          }
        }
      }

      // Add thin borders to all cells
      for (let i = 1; i < currentRow; i++) {
        const row = sheet.getRow(i);
        for (let j = 1; j <= 5; j++) {
          const cell = row.getCell(j);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }
      }

      // Auto-fit column widths based on data content
      for (let colNum = 1; colNum <= 5; colNum++) {
        let maxLen = 0;
        for (let r = 3; r < currentRow; r++) {
          const cellVal = String(sheet.getRow(r).getCell(colNum).value || "");
          const len = cellVal.length;
          if (len > maxLen) maxLen = len;
        }
        const headerLen = (headerLabels[colNum - 1] || "").length;
        sheet.getColumn(colNum).width = Math.ceil(Math.max(headerLen, maxLen) * 1.3) + 1;
      }

      return building.name;
    };

    let fileNamePrefix = '';

    if (all) {
      // Download all buildings
      const buildings = await query<{ id: string; name: string }>(
        'SELECT id, name FROM "Building" ORDER BY "createdAt" ASC'
      );

      if (buildings.length === 0) {
        return NextResponse.json({ error: 'কোনো বিল্ডিং নেই' }, { status: 404 });
      }

      // Process buildings in parallel for faster download
      await Promise.all(buildings.map(b => addBuildingSheet(b.id)));

      fileNamePrefix = 'সকল_বিল্ডিং_মালামাল_তালিকা';
    } else {
      // Download single building
      const buildingName = await addBuildingSheet(buildingId!);
      if (!buildingName) {
        return NextResponse.json({ error: 'বিল্ডিং পাওয়া যায়নি' }, { status: 404 });
      }
      fileNamePrefix = `${buildingName}_মালামাল_তালিকা`;
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Properly encode filename for Content-Disposition header (RFC 5987)
    const encodedFilename = encodeURIComponent(fileNamePrefix + '.xlsx');

    // Return as downloadable file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Belongings download error:', error);
    return NextResponse.json({ error: 'ডাউনলোড করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
