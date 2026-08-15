const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

const { query } = require('../src/lib/db');

async function updateNonDeductableItems() {
  try {
    // 1. Ensure columns
    try { await query('ALTER TABLE inventory_items ADD COLUMN auto_deduct TINYINT(1) DEFAULT 1'); } catch (e) {}
    try { await query('ALTER TABLE product_ingredients ADD COLUMN auto_deduct TINYINT(1) DEFAULT 1'); } catch (e) {}

    // 2. Fetch all inventory items
    const res = await query('SELECT * FROM inventory_items');
    console.log(`Total inventory items in database: ${res.rows.length}`);

    const targetKeywords = [
      'بطاطس', 'بطاطا',
      'روزبيف', 'روست',
      'سلامى', 'سلامي',
      'سوسيس', 'سويسويس', 'هوت دوج',
      'تركى', 'تركي',
      'بسطرمة', 'بسكرمه', 'بسترمة',
      'مشروم', 'فطر',
      'شيدر'
    ];

    const matchedItems = res.rows.filter(item => {
      const name = (item.name || '').toLowerCase();
      return targetKeywords.some(kw => name.includes(kw));
    });

    console.log(`Found ${matchedItems.length} matching non-deductible items:`);
    matchedItems.forEach(i => console.log(` - [${i.id}] ${i.name} (${i.category || 'عام'})`));

    const matchedIds = matchedItems.map(i => i.id);

    if (matchedIds.length > 0) {
      for (const item of matchedItems) {
        await query('UPDATE inventory_items SET auto_deduct = 0 WHERE id = $1', [item.id]);
        console.log(`✅ Set auto_deduct = 0 on inventory_items for: ${item.name}`);

        const piRes = await query('UPDATE product_ingredients SET auto_deduct = 0 WHERE inventory_item_id = $1', [item.id]);
        console.log(`✅ Updated ${piRes.rowCount || 0} product_ingredients for: ${item.name}`);
      }
    }

    // Also check if any new inventory item needs to be added if not present
    const existingNames = res.rows.map(r => r.name);
    const requiredItems = [
      { name: 'بطاطس فارم فريتس', unit: 'كجم', category: 'خضروات' },
      { name: 'روزبيف مدخن', unit: 'كجم', category: 'لحوم' },
      { name: 'سلامي إيطالي', unit: 'كجم', category: 'لحوم' },
      { name: 'سوسيس كوكتيل', unit: 'كجم', category: 'لحوم' },
      { name: 'تركي مدخن', unit: 'كجم', category: 'لحوم' },
      { name: 'بسطرمة بلدي', unit: 'كجم', category: 'لحوم' },
      { name: 'مشروم فريش', unit: 'كجم', category: 'خضروات' },
      { name: 'جبنة شيدر أحمر/أصفر', unit: 'كجم', category: 'أجبان' },
    ];

    for (const reqItem of requiredItems) {
      const exists = existingNames.some(n => n.includes(reqItem.name) || targetKeywords.some(kw => n.includes(kw) && reqItem.name.includes(kw)));
      if (!exists) {
        const id = `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await query(
          'INSERT INTO inventory_items (id, name, unit, current_stock, min_stock, cost_per_unit, category, auto_deduct) VALUES ($1, $2, $3, 0, 0, 0, $4, 0)',
          [id, reqItem.name, reqItem.unit, reqItem.category]
        );
        console.log(`➕ Added missing item with auto_deduct=0: ${reqItem.name}`);
      }
    }

    console.log('🎉 Done updating non-deductible items!');
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

updateNonDeductableItems();
