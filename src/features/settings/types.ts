/** Who can see what. Each maps to one backend profile flag. */
export type Privacy = {
  /** Others can open your profile; private profiles also stay off leaderboards. */
  profilePublic: boolean;
  /** Your linked wallet address shows on your public profile. */
  showWallet: boolean;
  /** Your recent activity shows on your public profile. */
  showActivity: boolean;
  /** Your name shows on discoveries you share; off means "Anonymous contributor". */
  creditDiscoveries: boolean;
};

export type AccountSettings = {
  account: {
    username: string;
    email: string | null;
    emailVerified: boolean;
    hasPassword: boolean;
  };
  privacy: Privacy;
};
