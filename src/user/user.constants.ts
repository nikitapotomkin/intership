export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  createdAt: true,
  profile: {
    select: {
      rating: true,
      level: true,
      avatar: true,
    },
  },
} as const;