# Embed framing policy

AudioBlocks denies framing for every normal application route with CSP `frame-ancestors 'none'` and `X-Frame-Options: DENY`. Only `/embed` and its descendants are intentionally frameable; those responses use `frame-ancestors *` so generated embed snippets work on third-party sites.

Do not place authenticated account or dashboard functionality under `/embed`. Any future embed route should contain public, least-privilege content only.
