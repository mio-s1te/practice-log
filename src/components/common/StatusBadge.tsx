// src/components/common/StatusBadge.tsx
import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  type?: 'campaign' | 'affiliate' | 'commission' | 'purchase';
}

const statusConfig = {
  // Campaign status
  active: { label: '稼働中', class: 'badge-green' },
  recruiting: { label: '募集中', class: 'badge-blue' },
  paused: { label: '一時停止', class: 'badge-yellow' },
  ended: { label: '終了', class: 'badge-gray' },
  archived: { label: 'アーカイブ', class: 'badge-gray' },
  
  // Affiliate status
  pending: { label: '審査中', class: 'badge-yellow' },
  suspended: { label: '停止', class: 'badge-red' },
  
  // Commission status
  approved: { label: '承認済', class: 'badge-blue' },
  rejected: { label: '却下', class: 'badge-red' },
  payable: { label: '支払可', class: 'badge-green' },
  paid: { label: '支払済', class: 'badge-gray' },
  cancelled: { label: 'キャンセル', class: 'badge-red' },
  chargeback: { label: 'チャージバック', class: 'badge-red' },
  
  // Purchase status
  completed: { label: '完了', class: 'badge-green' },
  refunded: { label: '返金', class: 'badge-yellow' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) {
    return <span className="badge badge-gray">{status}</span>;
  }
  return <span className={`badge ${config.class}`}>{config.label}</span>;
}
