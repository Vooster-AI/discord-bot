/**
 * 주어진 날짜로부터 경과된 시간을 한국어로 포맷팅하는 함수
 * @param date - 경과 시간을 계산할 기준 날짜
 * @returns 포맷된 시간 문자열 (예: "5분 전", "2시간 전", "3일 전")
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else {
    return `${diffDays}일 전`;
  }
}

/**
 * 리워드 타입에 따른 이모지를 반환하는 함수
 * @param type - 리워드 타입 ('message', 'forum_post', 'comment', 'manual')
 * @returns 해당 타입의 이모지
 */
export function getRewardTypeEmoji(type: string): string {
  switch (type) {
    case "message":
      return "💬";
    case "forum_post":
      return "📋";
    case "comment":
      return "💭";
    case "manual":
      return "🎁";
    default:
      return "🎁";
  }
}

/**
 * 콘텐츠를 지정된 길이로 잘라내는 함수
 * @param content - 원본 콘텐츠
 * @param maxLength - 최대 길이 (기본값: 10)
 * @returns 잘라낸 콘텐츠 (길이 초과 시 '...' 추가)
 */
export function truncateContent(
  content: string | null | undefined,
  maxLength: number = 30
): string {
  if (!content) return "내용 없음";

  return content.length > maxLength
    ? `${content.substring(0, maxLength)}...`
    : content;
}
