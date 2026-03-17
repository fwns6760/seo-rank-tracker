ALTER TABLE `${PROJECT_ID}.${DATASET}.rewrites`
ADD COLUMN IF NOT EXISTS wp_post_id INT64;

UPDATE `${PROJECT_ID}.${DATASET}.rewrites` AS rewrites
SET wp_post_id = wp_posts.wp_post_id
FROM `${PROJECT_ID}.${DATASET}.wp_posts` AS wp_posts
WHERE rewrites.rewrite_date BETWEEN DATE '2000-01-01' AND DATE '2100-01-01'
  AND rewrites.wp_post_id IS NULL
  AND rewrites.url = wp_posts.url;
