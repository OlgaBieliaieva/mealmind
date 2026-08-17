"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { searchProducts } from "@/shared/api/products";

const PAGE_SIZE = 20;

export function useProductSearch(search: string) {
  const normalizedSearch = search.trim();

  return useInfiniteQuery({
    queryKey: ["products", "search", normalizedSearch],

    enabled: normalizedSearch.length >= 2,

    initialPageParam: 1,

    queryFn: ({ pageParam }) =>
      searchProducts({
        search: normalizedSearch,
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),

    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.pageSize;

      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },

    staleTime: 2 * 60 * 1000,
  });
}
