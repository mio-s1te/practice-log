// 🐱以外の動物絵文字プール（同期内でユニークに割り当て）
export const ANIMAL_EMOJIS = [
  '🐯', '🐧', '🐥', '🐨', '🦊', '🐼', '🐸', '🦁',
  '🐮', '🐷', '🐔', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
  '🦎', '🐢', '🐍', '🦕', '🦖', '🦀', '🐡', '🐬',
]

/**
 * generation内でuser_idに対して絵文字を決定的に割り当てる
 * DBに保存済みなら返し、なければ空きを選んで保存する
 */
export async function getOrAssignEmoji(
  adminClient: any,
  userId: string,
  generation: string
): Promise<string> {
  // 既存割り当て確認
  const { data: existing } = await adminClient
    .from('emoji_assignments')
    .select('emoji')
    .eq('user_id', userId)
    .eq('generation', generation)
    .single()

  if (existing?.emoji) return existing.emoji

  // この世代で既に使われている絵文字を取得
  const { data: usedRows } = await adminClient
    .from('emoji_assignments')
    .select('emoji')
    .eq('generation', generation)

  const used = new Set((usedRows ?? []).map((r: any) => r.emoji))
  const available = ANIMAL_EMOJIS.filter(e => !used.has(e))

  // 空きがなければプールを循環（世代内で人数が多い場合）
  const emoji = available.length > 0
    ? available[0]
    : ANIMAL_EMOJIS[Array.from(used).length % ANIMAL_EMOJIS.length]

  // 保存
  await adminClient
    .from('emoji_assignments')
    .upsert({ user_id: userId, generation, emoji }, { onConflict: 'user_id,generation' })

  return emoji
}
