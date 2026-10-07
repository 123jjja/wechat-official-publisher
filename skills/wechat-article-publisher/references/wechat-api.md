# WeChat Official Account API notes

## Required environment variables

- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- Optional `WECHAT_ACCESS_TOKEN` for a short-lived manually managed token

The server obtains a stable access token with the AppID and AppSecret when no explicit token is supplied. Never place secrets in article content, source files, logs, or the plugin manifest.

## Publishing chain

1. Upload body images with `/cgi-bin/media/uploadimg`; use the returned URL inside article HTML.
2. Upload the cover as permanent image material with `/cgi-bin/material/add_material`; use the returned `media_id` as `thumb_media_id`.
3. Create the draft with `/cgi-bin/draft/add`.
4. Submit the draft with `/cgi-bin/freepublish/submit` only after explicit confirmation.
5. Poll `/cgi-bin/freepublish/get` with the returned `publish_id`.

Publishing and mass messaging are different WeChat capabilities. This plugin implements the draft and free-publish chain, not targeted mass messaging to followers. Availability depends on the account type, certification, interface permissions, and IP allowlist configured in the WeChat admin console.
