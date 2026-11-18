"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getProfileDataSource, type ProfileDataSource } from "./data/source";
import type { LeaderboardDimension, LeaderboardPeriod } from "./types";

export function useProfileSource() {
  return useQuery({ queryKey: ["profiles", "source"], queryFn: getProfileDataSource, staleTime: Infinity });
}

export function useProfile(source: ProfileDataSource, username: string) {
  return useQuery({
    queryKey: ["profiles", "profile", username],
    queryFn: ({ signal }) => source.getProfile(username, signal),
  });
}

export function useLeaderboard(
  source: ProfileDataSource,
  options: { dimension: LeaderboardDimension; period: LeaderboardPeriod },
) {
  return useQuery({
    queryKey: ["profiles", "leaderboard", options],
    queryFn: ({ signal }) => source.getLeaderboard(options, signal),
    placeholderData: keepPreviousData,
  });
}
