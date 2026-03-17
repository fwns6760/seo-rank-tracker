import { runNamedQuery } from "@/lib/bq/query-runner";
import type { WordPressPostRow } from "@/lib/bq/types";

export type WordPressPostUpsertInput = {
  wpPostId: number;
  url: string;
  slug: string;
  title: string | null;
  postType: string;
  postStatus: string;
  publishedAt: string | null;
  modifiedAt: string | null;
  categories: string[];
  tags: string[];
  contentHash: string | null;
  wordCount: number | null;
  fetchedAt: string;
  executionId: string;
};

function normalizeNullableFilter(value?: string | null) {
  return value && value.length > 0 ? value : null;
}

/**
 * Returns synced WordPress post rows for operational inspection and future joins.
 */
export async function getWordPressPosts({
  search,
  urlSearch,
  postStatus,
  limit = 50,
}: {
  search?: string | null;
  urlSearch?: string | null;
  postStatus?: string | null;
  limit?: number;
}) {
  const normalizedSearch =
    search?.trim() || urlSearch?.trim() ? (search?.trim() || urlSearch?.trim()) : null;

  return runNamedQuery<WordPressPostRow>("wp_post_list", {
    search: normalizeNullableFilter(normalizedSearch),
    post_status: normalizeNullableFilter(postStatus?.trim()),
    limit,
  });
}

/**
 * Returns one WordPress post row by its canonical URL.
 */
export async function getWordPressPostByUrl(url: string) {
  const rows = await runNamedQuery<WordPressPostRow>("wp_post_by_url", {
    url,
  });

  return rows[0] ?? null;
}

/**
 * Returns one WordPress post row by its stable WordPress post ID.
 */
export async function getWordPressPostById(wpPostId: number) {
  const rows = await runNamedQuery<WordPressPostRow>("wp_post_by_id", {
    wp_post_id: wpPostId,
  });

  return rows[0] ?? null;
}

/**
 * Upserts one canonical WordPress post row using wp_post_id as the logical key.
 */
export async function upsertWordPressPost(input: WordPressPostUpsertInput) {
  await runNamedQuery<Record<string, never>>("upsert_wp_post", {
    wp_post_id: input.wpPostId,
    url: input.url,
    slug: input.slug,
    title: input.title,
    post_type: input.postType,
    post_status: input.postStatus,
    published_at: input.publishedAt,
    modified_at: input.modifiedAt,
    categories: input.categories,
    tags: input.tags,
    content_hash: input.contentHash,
    word_count: input.wordCount,
    fetched_at: input.fetchedAt,
    execution_id: input.executionId,
  });

  return {
    wp_post_id: input.wpPostId,
    url: input.url,
    slug: input.slug,
    title: input.title,
    post_type: input.postType,
    post_status: input.postStatus,
    published_at: input.publishedAt,
    modified_at: input.modifiedAt,
    categories: input.categories,
    tags: input.tags,
    content_hash: input.contentHash,
    word_count: input.wordCount,
    fetched_at: input.fetchedAt,
    execution_id: input.executionId,
  } satisfies WordPressPostRow;
}
