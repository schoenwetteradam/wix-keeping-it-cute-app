# Handling the `react-i18next` legacy `wait` warning

If the DevTools console shows:

```
react-i18next:: It seems you are still using the old wait option, you may migrate to the new useSuspense behaviour.
```

it means a dependency is still configured with the deprecated `wait` flag.

## Cause
- Older versions of `react-i18next` allowed `react.wait = true` to delay rendering until translations loaded.
- Newer versions expect you to use React `Suspense` via the `useSuspense` flag instead.

## Fix
1. Update your i18n initialization to remove the `wait` option.
2. Set `react.useSuspense` according to your preferred loading experience, for example:
   ```js
   i18n.init({
     react: {
       useSuspense: true, // or false if you handle loading manually
     },
   })
   ```
3. Wrap your app in `<Suspense>` if `useSuspense` is enabled so translation loading can be handled gracefully.

A friendly reminder about this migration now appears once in the console when the warning is detected.
