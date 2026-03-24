import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const db = getDb()

    const rules = db.prepare(`
      SELECT mr.id, mr.pattern, mr.category_id, mr.confidence, mr.source, mr.created_at,
             c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM merchant_rules mr
      LEFT JOIN categories c ON mr.category_id = c.id
      WHERE mr.user_id = ?
      ORDER BY mr.created_at DESC
    `).all(userId) as any[]

    return NextResponse.json({ rules })
  } catch (error) {
    return handleApiError(error, 'GET /api/categorize')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const body = await request.json()
    const { transaction_id, category_id } = body

    if (!transaction_id || !category_id) {
      return NextResponse.json({ error: 'transaction_id and category_id are required' }, { status: 400 })
    }

    // Verify the transaction belongs to this user
    const transaction = db.prepare(`
      SELECT id, description, category_id as old_category_id
      FROM transactions WHERE id = ? AND user_id = ?
    `).get(transaction_id, userId) as { id: number; description: string | null; old_category_id: number | null } | undefined

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Verify category exists
    const category = db.prepare(`
      SELECT id, name FROM categories
      WHERE id = ? AND (user_id IS NULL OR user_id = ?)
    `).get(category_id, userId) as { id: number; name: string } | undefined

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const result = db.transaction(() => {
      // Update the transaction's category
      db.prepare(`
        UPDATE transactions SET category_id = ? WHERE id = ? AND user_id = ?
      `).run(category_id, transaction_id, userId)

      // Create a merchant rule from the transaction description
      let ruleCreated = false
      if (transaction.description) {
        // Normalize description into a matching pattern:
        // lowercase, trim, collapse whitespace
        const pattern = transaction.description
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/[#]\d+/g, '') // strip order/reference numbers
          .replace(/\d{4,}/g, '') // strip long number sequences
          .trim()

        if (pattern.length >= 3) {
          // Upsert: if a rule for this pattern already exists for this user, update it
          const existing = db.prepare(`
            SELECT id FROM merchant_rules WHERE user_id = ? AND pattern = ?
          `).get(userId, pattern) as { id: number } | undefined

          if (existing) {
            db.prepare(`
              UPDATE merchant_rules SET category_id = ?, confidence = 1.0, source = 'user', created_at = datetime('now')
              WHERE id = ?
            `).run(category_id, existing.id)
          } else {
            db.prepare(`
              INSERT INTO merchant_rules (user_id, pattern, category_id, confidence, source)
              VALUES (?, ?, ?, 1.0, 'user')
            `).run(userId, pattern, category_id)
          }
          ruleCreated = true
        }
      }

      return { ruleCreated }
    })()

    // Also auto-apply the rule to other uncategorized transactions with matching description
    let autoApplied = 0
    if (result.ruleCreated && transaction.description) {
      const pattern = transaction.description.toLowerCase().trim().replace(/\s+/g, ' ')
      const matchResult = db.prepare(`
        UPDATE transactions
        SET category_id = ?
        WHERE user_id = ? AND id != ? AND category_id IS NULL
          AND LOWER(TRIM(description)) LIKE ?
      `).run(category_id, userId, transaction_id, `%${pattern}%`)
      autoApplied = matchResult.changes
    }

    return NextResponse.json({
      success: true,
      transaction_id,
      category_id,
      category_name: category.name,
      rule_created: result.ruleCreated,
      auto_applied_count: autoApplied,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/categorize')
  }
}
